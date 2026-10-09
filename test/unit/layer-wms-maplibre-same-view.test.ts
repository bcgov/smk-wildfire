/**
 * A WMS image is asked for once per view.
 *
 * Found 2026-09-23 in the Harness. A resize with no change of size or view
 * downloaded every WMS image again: the Harness resized after SMK.INIT, and the
 * slowest image then held the network for another 2 seconds.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let WmsMapLibreLayer: any

beforeAll( async () => {
    ( { WmsMapLibreLayer } =
        await import( '../../src/smk/viewer-maplibre/layer/layer-wms-maplibre' ) )
} )

const CONFIG = { id: 'wms', serviceUrl: 'https://openmaps.gov.bc.ca/geo/pub/ows', layerName: 'pub:A' }

async function mount( extra: Record<string, unknown> = {} ) {
    const urls: string[] = []
    ;( globalThis as any ).fetch = ( url: string ) => {
        urls.push( url )
        return Promise.resolve( { ok: true, blob: () => Promise.resolve( { type: 'image/png' } ) } )
    }
    ;( globalThis as any ).URL.createObjectURL = () => 'blob:stub'
    ;( globalThis as any ).URL.revokeObjectURL = () => {}
    // Queued, as in a browser: the adapter sets its frame id after it asks.
    const frames: Array<() => void> = []
    ;( globalThis as any ).requestAnimationFrame = ( fn: any ) => frames.push( fn )
    ;( globalThis as any ).cancelAnimationFrame  = () => {}
    const flush = () => { while ( frames.length ) frames.shift()!() }

    const on: Record<string, () => void> = {}
    const view = { west: -130 }
    const map = {
        getBounds: () => ( {
            getSouthWest: () => ( { lng: view.west, lat: 48 } ),
            getNorthEast: () => ( { lng: -114, lat: 60 } ),
        } ),
        getCanvas: () => ( { clientWidth: 1000, clientHeight: 775 } ),
        getSource: () => ( { updateImage: () => {} } ),
        on: ( ev: string, fn: () => void ) => { on[ ev ] = fn },
        off: () => {},
    }

    const layer = new WmsMapLibreLayer( { ...CONFIG, ...extra } )
    const spec = await WmsMapLibreLayer.create.call( {}, [ layer ], 0 )
    spec._smk_onAdd( map )
    flush()
    const fire = ( ev: string ) => { on[ ev ](); flush() }
    return { urls, fire, view, layer, flush }
}

describe( 'WMS image requests', () => {
    it( 'does not ask again when a resize keeps the view', async () => {
        const { urls, fire } = await mount()
        fire( 'resize' )
        fire( 'moveend' )
        expect( urls.length ).toBe( 1 )
    } )

    it( 'asks again when the view changes', async () => {
        const { urls, fire, view } = await mount()
        view.west = -125
        fire( 'moveend' )
        expect( urls.length ).toBe( 2 )
    } )

    it( 'asks again when a Host forces a refresh', async () => {
        const { urls, layer, flush } = await mount()
        layer.refresh()
        flush()
        expect( urls.length ).toBe( 2 )
    } )

    it( 'sends the params a Host sets, and drops one set to null', async () => {
        const { urls, layer, flush } = await mount()
        layer.setParams( { time: '2026-09-29T00:00:00Z' } )
        flush()
        expect( urls[ 1 ] ).toContain( '&time=2026-09-29T00%3A00%3A00Z' )

        layer.setParams( { time: null } )
        flush()
        expect( urls[ 2 ] ).not.toContain( 'time=' )
    } )

    it( 'sends the Config params from the first request', async () => {
        const { urls } = await mount( { params: { elevation: 500 } } )
        expect( urls[ 0 ] ).toContain( '&elevation=500' )
    } )
} )
