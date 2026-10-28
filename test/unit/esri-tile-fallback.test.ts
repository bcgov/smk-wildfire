/**
 * An Esri cache past its deepest level at a place sends a grey "Map data not yet
 * available" tile. The fallback enlarges the deepest level the tilemap says exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    hasTile, levelsUp, loadTile, enlargeRect, fallbackUrl, registerTileFallback, resetTileFallback, FALLBACK_PROTOCOL,
} from '../../src/smk/viewer-maplibre/esri-tile-fallback'
import { resetEsriTileInfoCache } from '../../src/smk/viewer-maplibre/esri-tile-info'
import { basemapSpecForConfig } from '../../src/smk/viewer-maplibre/viewer-maplibre'

const SERVICE = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'

// A tilemap that holds level `deepest` and every level above it, everywhere.
function stubService( deepest: number, onTile = ( _url: string ) => {} ) {
    const fetch = vi.fn( ( url: string ) => {
        const m = /\/tilemap\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)/.exec( url )
        if ( m ) {
            const [ z, top, left, h, w ] = m.slice( 1 ).map( Number )
            return Promise.resolve( { ok: true, json: () => Promise.resolve( {
                valid: true, location: { top, left, width: w, height: h }, data: new Array( w * h ).fill( z <= deepest ? 1 : 0 ),
            } ) } )
        }
        onTile( url )
        return Promise.resolve( {
            ok: true, blob: () => Promise.resolve( url ), arrayBuffer: () => Promise.resolve( new ArrayBuffer( 8 ) ),
        } )
    } )
    vi.stubGlobal( 'fetch', fetch )
    return fetch
}

beforeEach( () => { resetTileFallback(); resetEsriTileInfoCache() } )
afterEach( () => { vi.unstubAllGlobals(); vi.restoreAllMocks() } )

describe( 'esri tile fallback', () => {
    it( 'reads a tile from the tilemap block that holds it', async () => {
        const fetch = stubService( 19 )

        expect( await hasTile( SERVICE, '', 19, 181356, 82548 ) ).toBe( true )
        expect( await hasTile( SERVICE, '', 20, 362712, 165096 ) ).toBe( false )
        expect( fetch.mock.calls[ 0 ][ 0 ] ).toBe( SERVICE + '/tilemap/19/181344/82528/32/32' )
    } )

    it( 'asks one block for the tiles beside each other', async () => {
        const fetch = stubService( 19 )

        await Promise.all( [ 0, 1, 2, 3 ].map( i => hasTile( SERVICE, '', 19, 181356 + i, 82548 ) ) )

        expect( fetch ).toHaveBeenCalledTimes( 1 )
    } )

    it( 'does not say when the service will not answer', async () => {
        vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( { ok: false } ) ) )

        expect( await hasTile( SERVICE, '', 19, 0, 0 ) ).toBeNull()
        expect( await levelsUp( SERVICE, '', 19, 0, 0 ) ).toBe( 0 )
    } )

    it( 'counts the levels up to the deepest the cache holds', async () => {
        stubService( 18 )

        expect( await levelsUp( SERVICE, '', 20, 362712, 165096 ) ).toBe( 2 )
        expect( await levelsUp( SERVICE, '', 18, 90678, 41274 ) ).toBe( 0 )
    } )

    it( 'asks the tile as before when the cache holds it', async () => {
        const asked: string[] = []
        stubService( 20, url => asked.push( url ) )

        const out = await loadTile( { url: fallbackUrl( SERVICE + '/tile/20/362712/165096' ) }, new AbortController() )

        expect( asked ).toEqual( [ SERVICE + '/tile/20/362712/165096' ] )
        expect( out.data ).toBeInstanceOf( ArrayBuffer )
    } )

    it( 'enlarges the right part of the deepest tile the cache holds', async () => {
        const asked: string[] = []
        stubService( 18, url => asked.push( url ) )
        vi.stubGlobal( 'createImageBitmap', vi.fn( ( from: any ) => Promise.resolve( from instanceof HTMLCanvasElement ? from : { width: 256 } ) ) )
        const drawImage = vi.fn()
        vi.spyOn( HTMLCanvasElement.prototype, 'getContext' ).mockReturnValue( { drawImage } as any )

        // Level 20, two levels below 18: the second column and fourth row of four.
        const out: any = await loadTile( { url: fallbackUrl( SERVICE + '/tile/20/362715/165093' ) }, new AbortController() )

        expect( asked ).toEqual( [ SERVICE + '/tile/18/90678/41273' ] )
        expect( drawImage.mock.calls[ 0 ].slice( 1 ) ).toEqual( enlargeRect( 256, 2, 165093, 362715 ) )
        expect( out.data.width ).toBe( 256 )
    } )

    it( 'takes one pixel past each edge and still fills the tile exactly', () => {
        // Second column, fourth row of four: source 64,192 to 128,256; each pixel drawn 4 wide.
        const [ sx, sy, sw, sh, dx, dy, dw, dh ] = enlargeRect( 256, 2, 165093, 362715 )

        expect( [ sx, sy, sw, sh ] ).toEqual( [ 63, 191, 66, 66 ] )
        expect( [ dx, dy ] ).toEqual( [ -4, -4 ] )
        expect( dx + dw ).toBe( 256 + 4 )
        expect( dy + dh ).toBe( 256 + 4 )
    } )

    it( 'fetches a shared ancestor once', async () => {
        const asked: string[] = []
        stubService( 18, url => asked.push( url ) )
        vi.stubGlobal( 'createImageBitmap', vi.fn( () => Promise.resolve( { width: 256 } ) ) )
        vi.spyOn( HTMLCanvasElement.prototype, 'getContext' ).mockReturnValue( { drawImage() {} } as any )

        await Promise.all( [ 0, 1, 2, 3 ].map( i =>
            loadTile( { url: fallbackUrl( SERVICE + '/tile/20/362712/' + ( 165096 + i ) ) }, new AbortController() ) ) )

        expect( asked ).toHaveLength( 1 )
    } )
} )

describe( 'esri-tiled-map basemap', () => {
    const info = ( capabilities: string ) => ( {
        capabilities,
        tileInfo: { rows: 256, spatialReference: { wkid: 102100 }, lods: [ { level: 0 }, { level: 23 } ] },
    } )
    const sourceFor = async ( capabilities: string ) => {
        vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( { ok: true, json: () => Promise.resolve( info( capabilities ) ) } ) ) )
        const [ spec ]: any = await basemapSpecForConfig( { id: 'imagery', type: 'esri-tiled-map', url: SERVICE } )
        return spec.source
    }

    it( 'goes through the fallback when the service has a tilemap', async () => {
        const addProtocol = vi.fn()
        vi.stubGlobal( 'maplibregl', { addProtocol } )

        const src = await sourceFor( 'Map,Query,Data,Tilemap' )

        expect( src.tiles[ 0 ] ).toBe( FALLBACK_PROTOCOL + '://' + SERVICE + '/tile/{z}/{y}/{x}' )
        expect( registerTileFallback() ).toBe( true )
    } )

    it( 'asks the tiles directly when the service has no tilemap', async () => {
        vi.stubGlobal( 'maplibregl', { addProtocol: vi.fn() } )

        const src = await sourceFor( 'Map,Query,Data' )

        expect( src.tiles[ 0 ] ).toBe( SERVICE + '/tile/{z}/{y}/{x}' )
    } )
} )
