/**
 * The leaflet esri-feature layer must still get a legend.
 *
 * esri-leaflet 2.x had featureLayer.legend() and SMK 1.0 used it. 3.x removed
 * it, so the call threw, createViewerLayer disabled the layer, and it never
 * drew. Axis A then showed 1.0 fetching a legend v2 had stopped asking for.
 * Found by the harness project, 2026-09-07.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'

let EsriFeatureLeafletLayer: any

const URL_ = 'https://example.com/FeatureServer/0'
const LEGEND = [ { label: 'Trailhead', url: 'abc', contentType: 'image/png' } ]

/** esri-leaflet 3: a feature manager, with no legend() and no setZIndex(). */
function stubLeaflet() {
    ( globalThis as any ).L = {
        esri: { featureLayer: () => ( { on() {} } ) },
    }
}

beforeAll( async () => {
    stubLeaflet()
    ;( { EsriFeatureLeafletLayer } =
        await import( '../../src/smk/viewer-leaflet/layer/layer-esri-feature-leaflet' ) )
} )

beforeEach( stubLeaflet )
afterEach( () => { vi.restoreAllMocks() } )

/** Create the layer and give back whatever the legend cache was resolved with. */
function createAndAwaitLegend( ok = true, body: any = { layers: [ { legend: LEGEND } ] } ) {
    ( globalThis as any ).fetch = vi.fn( () =>
        Promise.resolve( { ok, json: () => Promise.resolve( body ) } ) )

    return new Promise( resolve => {
        EsriFeatureLeafletLayer.create.call( {}, [ {
            config: { id: 'trailheads', serviceUrl: URL_ },
            legendCacheResolve: resolve,
        } ], 0 )
    } )
}

describe( 'esri-feature legend in leaflet', () => {
    it( 'does not throw when the layer has no legend method', () => {
        expect( () => EsriFeatureLeafletLayer.create.call( {}, [ {
            config: { id: 'trailheads', serviceUrl: URL_ },
        } ], 0 ) ).not.toThrow()
    } )

    it( 'asks the service for the legend instead', async () => {
        await createAndAwaitLegend()
        expect( ( globalThis as any ).fetch )
            .toHaveBeenCalledWith( URL_ + '/legend?f=json' )
    } )

    it( 'gives the first layer legend to the cache', async () => {
        expect( await createAndAwaitLegend() ).toEqual( LEGEND )
    } )

    it( 'resolves with nothing when the service will not answer', async () => {
        expect( await createAndAwaitLegend( false, null ) ).toBe( null )
    } )

    it( 'resolves with nothing when the answer has no layers', async () => {
        expect( await createAndAwaitLegend( true, { layers: [] } ) ).toBe( null )
    } )

    it( 'still uses legend() when the library has one', async () => {
        ( globalThis as any ).L.esri.featureLayer = () => ( {
            on() {},
            legend( cb: any ) { cb( null, { layers: [ { legend: LEGEND } ] } ) },
        } )
        ;( globalThis as any ).fetch = vi.fn()

        const got = await new Promise( resolve => {
            EsriFeatureLeafletLayer.create.call( {}, [ {
                config: { id: 'trailheads', serviceUrl: URL_ },
                legendCacheResolve: resolve,
            } ], 0 )
        } )

        expect( got ).toEqual( LEGEND )
        expect( ( globalThis as any ).fetch ).not.toHaveBeenCalled()
    } )
} )
