/**
 * A MapLibre layer fades in when its data is on the map.
 *
 * Added 2026-09-23 at the user's request, to make the map load look smoother.
 * The layer starts at opacity 0 with a paint transition, and MapLibre does the
 * fade when the viewer sets the styled opacity back.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

;( globalThis as any ).maplibregl = { Marker: class { setLngLat() { return this } addTo() { return this } remove() {} } }

let ViewerMapLibre: any

beforeAll( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

afterEach( () => { vi.useRealTimers() } )

function viewer() {
    const handlers: Record<string, Function[]> = {}
    const layers: Record<string, any> = {}
    const loaded: Record<string, boolean> = {}
    const map = {
        layers, loaded,
        getSource: ( id: string ) => ( { type: 'geojson', id } ),
        addSource: () => {},
        getLayer:  ( id: string ) => layers[ id ],
        addLayer:  ( l: any ) => { layers[ l.id ] = JSON.parse( JSON.stringify( l ) ) },
        getPaintProperty: ( id: string, p: string ) => layers[ id ]?.paint?.[ p ],
        setPaintProperty: ( id: string, p: string, v: any ) => { layers[ id ].paint[ p ] = v },
        isSourceLoaded: ( id: string ) => !!loaded[ id ],
        on:  ( ev: string, fn: Function ) => { ( handlers[ ev ] = handlers[ ev ] || [] ).push( fn ) },
        off: ( ev: string, fn: Function ) => { handlers[ ev ] = ( handlers[ ev ] || [] ).filter( f => f !== fn ) },
        fire: ( ev: string, e: any ) => ( handlers[ ev ] || [] ).forEach( f => f( e ) ),
    }
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.map = map
    v.viewerLayers = {}
    return v
}

const fill = ( src: string ) => ( {
    sourceId: src,
    source:   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    layers:   [ { id: src + '_fill', type: 'fill', source: src, paint: { 'fill-opacity': 0.4 } } ],
} )

describe( 'the load fade', () => {
    it( 'adds a layer at opacity 0, with a transition', () => {
        const v = viewer()
        v.addViewerLayer( fill( 'a' ) )
        expect( v.map.layers.a_fill.paint[ 'fill-opacity' ] ).toBe( 0 )
        expect( v.map.layers.a_fill.paint[ 'fill-opacity-transition' ] ).toEqual( { duration: 300, delay: 0 } )
    } )

    it( 'sets the styled opacity back when the source is loaded', () => {
        const v = viewer()
        v.addViewerLayer( fill( 'a' ) )
        v.map.loaded.a = true
        v.map.fire( 'sourcedata', { sourceId: 'a' } )
        expect( v.map.layers.a_fill.paint[ 'fill-opacity' ] ).toBe( 0.4 )
    } )

    it( 'waits for an image layer to say its real image is shown', () => {
        vi.useFakeTimers()
        const v = viewer()
        const wms = {
            sourceId: 'w', source: { type: 'image' },
            layer: { id: 'w', type: 'raster', source: 'w', paint: { 'raster-opacity': 0.8 } },
        }
        v.addViewerLayer( wms )
        v.map.loaded.w = true
        v.map.fire( 'sourcedata', { sourceId: 'w' } )     // the blank seed image
        expect( v.map.layers.w.paint[ 'raster-opacity' ] ).toBe( 0 )

        ;( wms as any )._smk_ready()
        expect( v.map.layers.w.paint[ 'raster-opacity' ] ).toBe( 0.8 )
    } )

    it( 'shows a layer whose source never reports', () => {
        vi.useFakeTimers()
        const v = viewer()
        v.addViewerLayer( fill( 'a' ) )
        vi.advanceTimersByTime( 4000 )
        expect( v.map.layers.a_fill.paint[ 'fill-opacity' ] ).toBe( 0.4 )
    } )

    it( 'keeps an opacity someone set while it waited', () => {
        const v = viewer()
        v.addViewerLayer( fill( 'a' ) )
        v.map.layers.a_fill.paint[ 'fill-opacity' ] = 0.9
        v.map.loaded.a = true
        v.map.fire( 'sourcedata', { sourceId: 'a' } )
        expect( v.map.layers.a_fill.paint[ 'fill-opacity' ] ).toBe( 0.9 )
    } )
} )
