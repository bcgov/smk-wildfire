/**
 * The maplibre esri-tiled layer must read the service description.
 *
 * A tile cache holds tiles only for the levels and the extent it was built
 * with, and it may not use 256px tiles or serve from the base host. The adapter
 * built `serviceUrl + '/tile/{z}/{y}/{x}'` and guessed 256, so it asked for
 * tiles that do not exist and got a 404. Found by the harness project on axis
 * B, 2026-09-07.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'

let EsriTiledMapLibreLayer: any
let resetTileServiceCache: () => void

beforeAll( async () => {
    ( { EsriTiledMapLibreLayer, resetTileServiceCache } =
        await import( '../../src/smk/viewer-maplibre/layer/layer-esri-tiled-maplibre' ) )
} )

beforeEach( () => { resetTileServiceCache() } )
afterEach( () => { vi.restoreAllMocks() } )

const URL_ = 'https://tiles.example.com/arcgis/rest/services/Thing/MapServer'

/** What an ArcGIS tiled MapServer answers at ?f=json, trimmed to what we read. */
const INFO = {
    copyrightText: 'Government of British Columbia',
    tileServers: [ URL_.replace( 'tiles.', 'tiles1.' ), URL_.replace( 'tiles.', 'tiles2.' ) ],
    fullExtent: {
        xmin: -15028131.257, ymin: 6023011.906,
        xmax: -12210356.646, ymax: 8828216.485,
        spatialReference: { wkid: 102100, latestWkid: 3857 },
    },
    tileInfo: {
        rows: 512, cols: 512,
        spatialReference: { wkid: 102100, latestWkid: 3857 },
        lods: [
            { level: 3, scale: 36978595.474, resolution: 9783.94 },
            { level: 6, scale: 4622324.434,  resolution: 1222.99 },
            { level: 9, scale: 577790.554,   resolution: 152.87 },
            { level: 12, scale: 72223.819,   resolution: 19.11 },
        ],
    },
}

function stubFetch( body: any, ok = true ) {
    ( globalThis as any ).fetch = vi.fn( () =>
        Promise.resolve( { ok, json: () => Promise.resolve( body ) } ) )
}

const create = ( config: any = { id: 'thing', serviceUrl: URL_ } ) =>
    EsriTiledMapLibreLayer.create.call( {}, [ { config } ], 0 )

describe( 'esri-tiled in maplibre', () => {
    it( 'asks the service for its description', async () => {
        stubFetch( INFO )
        await create()
        expect( ( globalThis as any ).fetch ).toHaveBeenCalledWith( URL_ + '?f=json' )
    } )

    it( 'uses the tile servers the service names', async () => {
        stubFetch( INFO )
        const spec = await create()
        expect( spec.source.tiles ).toEqual( [
            'https://tiles1.example.com/arcgis/rest/services/Thing/MapServer/tile/{z}/{y}/{x}',
            'https://tiles2.example.com/arcgis/rest/services/Thing/MapServer/tile/{z}/{y}/{x}',
        ] )
    } )

    it( 'takes the tile size from the cache, not 256', async () => {
        stubFetch( INFO )
        expect( ( await create() ).source.tileSize ).toBe( 512 )
    } )

    it( 'asks only for the levels the cache holds', async () => {
        stubFetch( INFO )
        const spec = await create()
        expect( spec.source.minzoom ).toBe( 3 )
        expect( spec.source.maxzoom ).toBe( 12 )
    } )

    it( 'asks only inside the extent the cache covers', async () => {
        stubFetch( INFO )
        const [ w, s, e, n ] = ( await create() ).source.bounds
        expect( w ).toBeCloseTo( -135, 0 )
        expect( e ).toBeCloseTo( -109.7, 0 )
        expect( s ).toBeCloseTo( 47.3, 0 )
        expect( n ).toBeCloseTo( 61.6, 0 )
    } )

    it( 'narrows the range when the config sets a scale limit', async () => {
        stubFetch( INFO )
        // A bigger denominator is a smaller map, so minScale is the furthest out.
        const spec = await create( { id: 'thing', serviceUrl: URL_, minScale: 4622324, maxScale: 577790 } )
        expect( spec.source.minzoom ).toBe( 6 )
        expect( spec.source.maxzoom ).toBe( 9 )
    } )

    it( 'reads scaleMin and scaleMax too, which is what the wf layers use', async () => {
        stubFetch( INFO )
        const spec = await create( { id: 'thing', serviceUrl: URL_, scaleMin: 4622324 } )
        expect( spec.source.minzoom ).toBe( 6 )
    } )

    it( 'never widens the range past what the cache holds', async () => {
        stubFetch( INFO )
        const spec = await create( { id: 'thing', serviceUrl: URL_, minScale: 36978595, maxScale: 72223 } )
        expect( spec.source.minzoom ).toBe( 3 )
        expect( spec.source.maxzoom ).toBe( 12 )
    } )

    it( 'carries the service copyright, because maplibre shows only what a source declares', async () => {
        stubFetch( INFO )
        expect( ( await create() ).source.attribution ).toBe( 'Government of British Columbia' )
    } )

    it( 'spreads ArcGIS Online across tiles1-tiles4, which publishes no tileServers', async () => {
        stubFetch( { tileInfo: INFO.tileInfo } )
        const online = 'https://tiles.arcgis.com/tiles/abc/arcgis/rest/services/Thing/MapServer'
        const spec = await create( { id: 'thing', serviceUrl: online } )
        expect( spec.source.tiles ).toEqual( [ 1, 2, 3, 4 ].map( n =>
            `https://tiles${ n }.arcgis.com/tiles/abc/arcgis/rest/services/Thing/MapServer/tile/{z}/{y}/{x}` ) )
    } )

    it( 'still draws when the service will not answer', async () => {
        stubFetch( null, false )
        const spec = await create()
        expect( spec.source.tiles ).toEqual( [ URL_ + '/tile/{z}/{y}/{x}' ] )
        expect( spec.source.tileSize ).toBe( 256 )
        expect( spec.source.minzoom ).toBeUndefined()
        expect( spec.source.bounds ).toBeUndefined()
    } )

    it( 'ignores a cache that is not web mercator, because maplibre cannot draw it', async () => {
        stubFetch( { ...INFO, tileInfo: { ...INFO.tileInfo, spatialReference: { wkid: 3005 } } } )
        const spec = await create()
        expect( spec.source.minzoom ).toBeUndefined()
        expect( spec.source.maxzoom ).toBeUndefined()
    } )
} )
