/**
 * refreshLayers must not lose a change, and must not wedge.
 *
 * Two faults, and together they stopped the layer tool working on the BC
 * Wildfire map: a change that arrived while a pass was running returned the
 * running pass and scheduled nothing, and a pass that waited on a layer which
 * never reported finished never ended — so every later change was dropped.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'

;( globalThis as any ).maplibregl = {
    Marker: class { setLngLat() { return this } addTo() { return this } remove() {} },
}

let Viewer: any

beforeAll( async () => {
    ( { Viewer } = await import( '../../src/smk/viewer' ) )
} )

beforeEach( () => { vi.useFakeTimers() } )
afterEach( () => { vi.useRealTimers() } )

/** A viewer with only the surface refreshLayers touches. */
function fakeViewer( option: { passMs?: number; loading?: boolean; stuck?: boolean } = {} ) {
    const v: any = Object.create( Viewer.prototype )
    v.passes = 0
    v.loading = !!option.loading
    v.updateLayersVisible = () => {
        v.passes++
        return new Promise( res => setTimeout( res, option.passMs ?? 100 ) )
    }
    v.waitFinishedLoading = () => option.stuck
        ? new Promise( () => {} )
        : Promise.resolve()
    return v
}

describe( 'refreshLayers', () => {
    it( 'runs a second pass for a change that arrives during the first', async () => {
        const v = fakeViewer( { passMs: 500 } )

        const p = v.refreshLayers( 0 )
        // A delay of 0 falls back to the 200ms coalescing window.
        await vi.advanceTimersByTimeAsync( 250 )    // the first pass is running
        expect( v.passes ).toBe( 1 )

        v.refreshLayers( 0 )                        // a layer is switched on
        await vi.advanceTimersByTimeAsync( 2000 )
        await p

        expect( v.passes ).toBe( 2 )
    } )

    it( 'coalesces changes that arrive before the pass starts', async () => {
        const v = fakeViewer()

        v.refreshLayers( 200 )
        v.refreshLayers( 200 )
        v.refreshLayers( 200 )
        await vi.advanceTimersByTimeAsync( 2000 )

        expect( v.passes ).toBe( 1 )
    } )

    it( 'ends a pass whose layers never report finished', async () => {
        const v = fakeViewer( { loading: true, stuck: true } )

        const p = v.refreshLayers( 0 )
        await vi.advanceTimersByTimeAsync( 31000 )
        await p

        expect( v.refreshLayersPromise ).toBeUndefined()
    } )

    it( 'accepts a change after a pass that waited out its layers', async () => {
        const v = fakeViewer( { loading: true, stuck: true } )

        const p = v.refreshLayers( 0 )
        await vi.advanceTimersByTimeAsync( 31000 )
        await p

        v.loading = false
        v.refreshLayers( 0 )
        await vi.advanceTimersByTimeAsync( 1000 )

        expect( v.passes ).toBe( 2 )
    } )
} )
