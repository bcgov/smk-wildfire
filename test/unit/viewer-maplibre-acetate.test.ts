/**
 * Unit tests for ViewerMapLibre.prototype.temporaryFeature
 *
 * temporaryFeature is what SmkMap.showFeature calls. The leaflet viewer hands
 * its options to L.geoJSON, so pointToLayer works there. MapLibre has no such
 * hook, so this viewer takes htmlMarker instead and makes a DOM marker.
 *
 * These tests cover the marker path, the layer path, and the boundary between
 * them, because a caller mixing points and lines must get both.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// temporaryFeature reads maplibregl from the global, so stand one up first.
const markerInstances: any[] = []

class FakeMarker {
    opt:      any
    lngLat:   any
    added:    any    = null
    removed:  boolean = false

    constructor( opt: any ) {
        this.opt = opt
        markerInstances.push( this )
    }
    setLngLat( ll: any ) { this.lngLat = ll; return this }
    addTo( map: any )    { this.added = map; return this }
    remove()             { this.removed = true; return this }
}

;( globalThis as any ).maplibregl = { Marker: FakeMarker }

const { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' )

// ---------------------------------------------------------------------------
// A MapLibre map stub with just the source/layer surface temporaryFeature uses
// ---------------------------------------------------------------------------

function fakeMap() {
    const sources: Record<string, any> = {}
    const layers:  Record<string, any> = {}

    return {
        sources,
        layers,
        getSource: ( id: string ) => sources[ id ],
        addSource: ( id: string, spec: any ) => {
            sources[ id ] = { spec, data: spec.data, setData( d: any ) { this.data = d } }
        },
        getLayer: ( id: string ) => layers[ id ],
        addLayer: ( spec: any ) => { layers[ spec.id ] = spec },
    }
}

function viewer() {
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.acetate = {}
    v.map     = fakeMap()
    return v
}

const point = ( lng: number, lat: number ) => ( { type: 'Point', coordinates: [ lng, lat ] } )
const line  = ( a: number[], b: number[] ) => ( { type: 'LineString', coordinates: [ a, b ] } )

beforeEach( () => { markerInstances.length = 0 } )

// ---------------------------------------------------------------------------
// htmlMarker — the pointToLayer replacement
// ---------------------------------------------------------------------------

describe( 'temporaryFeature — htmlMarker', () => {
    it( 'calls htmlMarker for a Point and uses the element it returns', () => {
        const v  = viewer()
        const el = document.createElement( 'div' )
        el.className = 'rof-arrow-head'

        const htmlMarker = vi.fn( () => el )
        v.temporaryFeature( 'arrow-head', point( -123, 49 ), { htmlMarker } )

        expect( htmlMarker ).toHaveBeenCalledTimes( 1 )
        expect( markerInstances ).toHaveLength( 1 )
        expect( markerInstances[ 0 ].opt.element ).toBe( el )
    } )

    it( 'passes the element through untouched, so caller markup survives', () => {
        const v  = viewer()
        const el = document.createElement( 'div' )
        el.innerHTML = '<i style="transform:rotateZ(42deg);">navigation</i>'

        v.temporaryFeature( 'arrow-head', point( -123, 49 ), { htmlMarker: () => el } )

        expect( markerInstances[ 0 ].opt.element.innerHTML ).toContain( 'rotateZ(42deg)' )
    } )

    it( 'places the marker at the coordinates in lng,lat order', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), { htmlMarker: () => document.createElement( 'div' ) } )

        expect( markerInstances[ 0 ].lngLat ).toEqual( [ -123, 49 ] )
    } )

    it( 'adds the marker to the map', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), { htmlMarker: () => document.createElement( 'div' ) } )

        expect( markerInstances[ 0 ].added ).toBe( v.map )
    } )

    it( 'merges markerOptions into the marker', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), {
            htmlMarker:    () => document.createElement( 'div' ),
            markerOptions: { anchor: 'bottom' },
        } )

        expect( markerInstances[ 0 ].opt.anchor ).toBe( 'bottom' )
    } )

    it( 'skips the marker when htmlMarker returns nothing', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), { htmlMarker: () => null } )

        expect( markerInstances ).toHaveLength( 0 )
    } )

    it( 'accepts a Feature as well as a bare geometry', () => {
        const v = viewer()
        v.temporaryFeature(
            'here',
            { type: 'Feature', geometry: point( -123, 49 ), properties: {} },
            { htmlMarker: () => document.createElement( 'div' ) },
        )

        expect( markerInstances ).toHaveLength( 1 )
        expect( markerInstances[ 0 ].lngLat ).toEqual( [ -123, 49 ] )
    } )

    it( 'makes one marker per point in a FeatureCollection', () => {
        const v = viewer()
        v.temporaryFeature( 'here', {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: point( -123, 49 ), properties: {} },
                { type: 'Feature', geometry: point( -124, 50 ), properties: {} },
            ],
        }, { htmlMarker: () => document.createElement( 'div' ) } )

        expect( markerInstances ).toHaveLength( 2 )
    } )
} )

// ---------------------------------------------------------------------------
// Redraw — an acetate is replaced, never appended to
// ---------------------------------------------------------------------------

describe( 'temporaryFeature — redraw', () => {
    it( 'removes the markers from the previous call', () => {
        const v = viewer()
        const opt = { htmlMarker: () => document.createElement( 'div' ) }

        v.temporaryFeature( 'arrow-head', point( -123, 49 ), opt )
        v.temporaryFeature( 'arrow-head', point( -124, 50 ), opt )

        expect( markerInstances ).toHaveLength( 2 )
        expect( markerInstances[ 0 ].removed ).toBe( true )
        expect( markerInstances[ 1 ].removed ).toBe( false )
    } )

    it( 'keeps acetates apart, so one does not clear another', () => {
        const v = viewer()
        const opt = { htmlMarker: () => document.createElement( 'div' ) }

        v.temporaryFeature( 'location',   point( -123, 49 ), opt )
        v.temporaryFeature( 'arrow-head', point( -124, 50 ), opt )

        expect( markerInstances[ 0 ].removed ).toBe( false )
        expect( markerInstances[ 1 ].removed ).toBe( false )
    } )

    it( 'clears the markers when the geometry goes away', () => {
        const v = viewer()
        v.temporaryFeature( 'location', point( -123, 49 ), { htmlMarker: () => document.createElement( 'div' ) } )
        v.temporaryFeature( 'location', null, { htmlMarker: () => document.createElement( 'div' ) } )

        expect( markerInstances[ 0 ].removed ).toBe( true )
        expect( markerInstances ).toHaveLength( 1 )
    } )
} )

// ---------------------------------------------------------------------------
// The layer path — unchanged behaviour for callers with no htmlMarker
// ---------------------------------------------------------------------------

describe( 'temporaryFeature — layers', () => {
    it( 'draws a Point as a circle layer when there is no htmlMarker', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), {} )

        expect( v.map.layers[ 'smk-acetate-here' ].type ).toBe( 'circle' )
        expect( markerInstances ).toHaveLength( 0 )
    } )

    it( 'draws a LineString as a line layer and takes paint overrides', () => {
        const v = viewer()
        v.temporaryFeature( 'arrow-line', line( [ -123, 49 ], [ -124, 50 ] ), {
            paint: { 'line-color': 'yellow', 'line-width': 5 },
        } )

        const layer = v.map.layers[ 'smk-acetate-arrow-line' ]
        expect( layer.type ).toBe( 'line' )
        expect( layer.paint[ 'line-color' ] ).toBe( 'yellow' )
        expect( layer.paint[ 'line-width' ] ).toBe( 5 )
    } )

    it( 'sets the source data for the layer path', () => {
        const v = viewer()
        v.temporaryFeature( 'arrow-line', line( [ -123, 49 ], [ -124, 50 ] ), {} )

        const src = v.map.sources[ 'smk-acetate-arrow-line' ]
        expect( src.data.features ).toHaveLength( 1 )
        expect( src.data.features[ 0 ].geometry.type ).toBe( 'LineString' )
    } )

    it( 'adds no layer when only markers are drawn', () => {
        const v = viewer()
        v.temporaryFeature( 'here', point( -123, 49 ), { htmlMarker: () => document.createElement( 'div' ) } )

        expect( Object.keys( v.map.layers ) ).toHaveLength( 0 )
        expect( Object.keys( v.map.sources ) ).toHaveLength( 0 )
    } )

    it( 'splits a mixed collection: point to a marker, line to the layer', () => {
        const v = viewer()
        v.temporaryFeature( 'mixed', {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: point( -123, 49 ), properties: {} },
                { type: 'Feature', geometry: line( [ -123, 49 ], [ -124, 50 ] ), properties: {} },
            ],
        }, { htmlMarker: () => document.createElement( 'div' ) } )

        expect( markerInstances ).toHaveLength( 1 )

        const layer = v.map.layers[ 'smk-acetate-mixed' ]
        expect( layer.type ).toBe( 'line' )
        expect( v.map.sources[ 'smk-acetate-mixed' ].data.features ).toHaveLength( 1 )
    } )
} )
