/**
 * The MapLibre viewer obeys viewer.zoomSnap, as the Leaflet viewer does. SMK 1.0
 * rounded a fit down to a whole level, so a fitted area kept a margin.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let created: any[] = []

// Only what initialize calls before the map loads.
class FakeMap {
    options: any
    touchZoomRotate = { disableRotation() {} }
    keyboard        = { disable() {}, disableRotation() {} }
    scrollZoom      = { disable() {}, setWheelZoomRate() {} }
    boxZoom         = { disable() {} }
    doubleClickZoom = { disable() {} }
    dragPan         = { disable() {} }
    constructor( options: any ) { this.options = options; created.push( this ) }
    addControl() {}
    once() {}
}

let ViewerMapLibre: any

beforeAll( async () => {
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( globalThis as any ).maplibregl = { Map: FakeMap, AttributionControl: class {} }
    ;( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

function mapOptions( viewer: any ) {
    created = []
    new ViewerMapLibre().initialize( {
        lmfId:           1,
        viewer:          { type: 'maplibre', baseMapConfig: [], ...viewer },
        $option:         { id: 'zoom-snap' },
        resolveAssetUrl: ( u: string ) => u,
        hasToolType:     () => false,
        addToContainer:  () => document.createElement( 'div' ),
    } )
    return created[ 0 ].options
}

describe( 'viewer.zoomSnap', () => {
    it( 'reaches the MapLibre map', () => {
        expect( mapOptions( { zoomSnap: 1 } ).zoomSnap ).toBe( 1 )
        expect( mapOptions( { zoomSnap: 0.5 } ).zoomSnap ).toBe( 0.5 )
    } )

    it( 'is 0 when the Config turns it off or leaves it out', () => {
        expect( mapOptions( { zoomSnap: 0 } ).zoomSnap ).toBe( 0 )
        // MapLibre makes a NaN zoom from an undefined snap.
        expect( mapOptions( {} ).zoomSnap ).toBe( 0 )
    } )
} )
