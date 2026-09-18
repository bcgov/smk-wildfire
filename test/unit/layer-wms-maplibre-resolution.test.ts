/**
 * A WMS image may be asked for smaller than the screen.
 *
 * A weather model grid is far coarser than the display. Asked for at screen
 * size, each grid cell comes back as a hard square and nothing interpolates
 * it, so the BC Wildfire smoke forecast looked pixelated. A smaller image,
 * stretched by MapLibre with linear resampling, blends the cells.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

let WmsMapLibreLayer: any

beforeAll( async () => {
    ( { WmsMapLibreLayer } =
        await import( '../../src/smk/viewer-maplibre/layer/layer-wms-maplibre' ) )
} )

/**
 * Records every URL the adapter asks the network for.
 *
 * It fetches the image itself and hands updateImage a blob url. Pointing
 * updateImage at the WMS url instead made maplibre download the same image a
 * second time, so counting these urls is what holds the fix.
 */
function stubFetch(): string[] {
    const urls: string[] = []
    ;( globalThis as any ).fetch = ( url: string ) => {
        urls.push( url )
        return Promise.resolve( {
            ok: true, status: 200, statusText: 'OK',
            blob: () => Promise.resolve( { type: 'image/png' } ),
        } )
    }
    ;( globalThis as any ).URL.createObjectURL = () => 'blob:stub'
    ;( globalThis as any ).URL.revokeObjectURL = () => {}
    return urls
}

function fakeMap() {
    return {
        sources: { } as Record<string, any>,
        getBounds: () => ( {
            getSouthWest: () => ( { lng: -130, lat: 48 } ),
            getNorthEast: () => ( { lng: -114, lat: 60 } ),
        } ),
        getCanvas: () => ( { clientWidth: 1000, clientHeight: 775, width: 2000, height: 1550 } ),
        getSource: () => ( { updateImage: () => {} } ),
        on: () => {}, off: () => {},
    }
}

async function requestFor( config: any ) {
    const urls = stubFetch()
    ;( globalThis as any ).requestAnimationFrame = ( fn: any ) => { fn(); return 1 }
    ;( globalThis as any ).cancelAnimationFrame  = () => {}

    const spec = await WmsMapLibreLayer.create.call( {}, [ { config } ], 0 )
    spec._smk_onAdd( fakeMap() )
    await Promise.resolve()
    return { spec, urls, url: urls[ urls.length - 1 ] }
}

const CONFIG = {
    id: 'smoke', serviceUrl: 'https://geo.weather.gc.ca/geomet',
    version: '1.3.0', layerName: 'RAQDPS.Sfc_PM2.5-WildfireSmokePlume',
}

function sizeOf( url: string ) {
    const m = url.match( /width=(\d+)&height=(\d+)/ )
    return m ? [ Number( m[ 1 ] ), Number( m[ 2 ] ) ] : null
}

describe( 'resolutionDivisor', () => {
    it( 'asks for the image at screen size when it is not set', async () => {
        const { url } = await requestFor( CONFIG )
        expect( sizeOf( url ) ).toEqual( [ 1000, 775 ] )
    } )

    it( 'divides the requested image by the divisor', async () => {
        const { url } = await requestFor( { ...CONFIG, resolutionDivisor: 3 } )
        expect( sizeOf( url ) ).toEqual( [ 333, 258 ] )
    } )

    it( 'never asks for less than one pixel', async () => {
        const { url } = await requestFor( { ...CONFIG, resolutionDivisor: 100000 } )
        expect( sizeOf( url ) ).toEqual( [ 1, 1 ] )
    } )

    it( 'ignores a divisor below one', async () => {
        const { url } = await requestFor( { ...CONFIG, resolutionDivisor: 0.25 } )
        expect( sizeOf( url ) ).toEqual( [ 1000, 775 ] )
    } )

    it( 'keeps the bounding box, so a smaller image still covers the map', async () => {
        const a = await requestFor( CONFIG )
        const b = await requestFor( { ...CONFIG, resolutionDivisor: 3 } )
        const bbox = ( u: string ) => u.match( /&bbox=([^&]+)/ )![ 1 ]
        expect( bbox( b.url ) ).toBe( bbox( a.url ) )
    } )
} )

describe( 'the number of downloads', () => {
    it( 'asks the service for the image once per update', async () => {
        const { urls } = await requestFor( CONFIG )
        expect( urls.length ).toBe( 1 )
    } )

    it( 'gives updateImage a blob url, never the service url again', async () => {
        const seen: string[] = []
        const urls = stubFetch()
        ;( globalThis as any ).requestAnimationFrame = ( fn: any ) => { fn(); return 1 }
        ;( globalThis as any ).cancelAnimationFrame  = () => {}

        const map = fakeMap()
        map.getSource = () => ( { updateImage: ( o: any ) => seen.push( o.url ) } )

        const spec = await WmsMapLibreLayer.create.call( {}, [ { config: CONFIG } ], 0 )
        spec._smk_onAdd( map )
        await new Promise( r => setTimeout( r, 0 ) )

        expect( seen ).toEqual( [ 'blob:stub' ] )
        expect( urls.length ).toBe( 1 )
    } )
} )

describe( 'raster paint', () => {
    it( 'states linear resampling, which is what smooths the stretch', async () => {
        const { spec } = await requestFor( { ...CONFIG, resolutionDivisor: 3 } )
        expect( spec.layer.paint[ 'raster-resampling' ] ).toBe( 'linear' )
    } )

    it( 'keeps the layer opacity', async () => {
        const { spec } = await requestFor( { ...CONFIG, opacity: 0.8 } )
        expect( spec.layer.paint[ 'raster-opacity' ] ).toBe( 0.8 )
    } )
} )

/**
 * The image source's placeholder corners must be a real quad.
 *
 * Four identical corners are a zero-area quad. MapLibre's tile maths then gives
 * `x=Infinity, y=Infinity, z=Infinity outside of bounds` and refuses it - one
 * error per WMS layer on every start. Found by the harness project on axis B,
 * 2026-09-08.
 */
describe( 'the placeholder coordinates', () => {
    const create = () => WmsMapLibreLayer.create.call( {}, [ { config: {
        id: 'x', serviceUrl: 'https://example.com/ows', layerName: 'a', styleName: 's',
    } } ], 0 )

    it( 'gives four different corners', async () => {
        const spec = await create()
        const corners = spec.source.coordinates.map( ( c: number[] ) => c.join( ',' ) )
        expect( new Set( corners ).size, 'a zero-area quad' ).toBe( 4 )
    } )

    it( 'stays inside what web mercator can hold', async () => {
        const spec = await create()
        for ( const [ lon, lat ] of spec.source.coordinates ) {
            expect( Math.abs( lon ) ).toBeLessThanOrEqual( 180 )
            expect( Math.abs( lat ) ).toBeLessThanOrEqual( 85.0511287798 )
        }
    } )

    it( 'covers an area, so the maths cannot divide by zero', async () => {
        const [ tl, tr, br ] = ( await create() ).source.coordinates
        expect( Math.abs( tr[ 0 ] - tl[ 0 ] ) ).toBeGreaterThan( 0 )
        expect( Math.abs( tr[ 1 ] - br[ 1 ] ) ).toBeGreaterThan( 0 )
    } )
} )
