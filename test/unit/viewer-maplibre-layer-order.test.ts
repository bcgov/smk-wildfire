/**
 * Host layers keep Display Context order, and a refresh pass must not lift
 * them over the acetate or a tool's own layers.
 */
import { describe, it, expect, beforeAll } from 'vitest'

class FakeMarker {
    setLngLat() { return this }
    addTo()     { return this }
    remove()    { return this }
}
;( globalThis as any ).maplibregl = { Marker: FakeMarker }

let ViewerMapLibre: any

beforeAll( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

// Keeps the real stack order, bottom first, as MapLibre does.
function viewer() {
    const stack: string[] = []
    const sources: Record<string, any> = {}
    const put = ( id: string, before?: string ) => {
        const i = before ? stack.indexOf( before ) : -1
        if ( i < 0 ) stack.push( id ); else stack.splice( i, 0, id )
    }
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.viewerLayers     = {}
    v.acetate          = {}
    v.basemapLayerIds  = []
    v.basemapSourceIds = []
    v.map = {
        stack,
        getSource( id: string ) { return sources[ id ] && { setData() {} } },
        addSource( id: string, s: any ) { sources[ id ] = s },
        getLayer( id: string ) { return stack.includes( id ) ? { id } : undefined },
        addLayer( l: any, before?: string ) { put( l.id, before ) },
        moveLayer( id: string, before?: string ) { stack.splice( stack.indexOf( id ), 1 ); put( id, before ) },
        getLayersOrder() { return stack.slice() },
        on() {}, off() {}, isSourceLoaded() { return false }, setPaintProperty() {},
    }
    return v
}

function hostLayer( id: string ) {
    return {
        _smk_id: id, sourceId: id, source: { type: 'geojson' },
        layers: [ { id: id + '-fill', type: 'fill', source: id }, { id: id + '-line', type: 'line', source: id } ],
    }
}

function show( v: any, ly: any, z: number ) {
    v.addViewerLayer( ly )
    v.positionViewerLayer( ly, z )
}

const LINE = { type: 'LineString', coordinates: [ [ 0, 0 ], [ 1, 1 ] ] }

describe( 'maplibre viewer — layer order', () => {
    it( 'stacks Host layers by zOrder whatever order they resolve in', () => {
        const v = viewer()
        const a = hostLayer( 'a' ), b = hostLayer( 'b' ), c = hostLayer( 'c' )
        show( v, b, 1 ); show( v, c, 0 ); show( v, a, 2 )

        expect( v.map.stack ).toEqual( [ 'c-fill', 'c-line', 'b-fill', 'b-line', 'a-fill', 'a-line' ] )
    } )

    it( 'keeps the acetate on top through a refresh pass', () => {
        const v = viewer()
        v.map.addLayer( { id: 'bm-land' } )
        v.basemapLayerIds = [ 'bm-land' ]
        const a = hostLayer( 'a' ), b = hostLayer( 'b' )
        show( v, b, 0 ); show( v, a, 1 )
        v.temporaryFeature( 'identify', LINE, {} )

        // What updateLayersVisible does for layers already on the map.
        v.positionViewerLayer( a, 1 )
        v.positionViewerLayer( b, 0 )

        expect( v.map.stack ).toEqual( [ 'bm-land', 'b-fill', 'b-line', 'a-fill', 'a-line', 'smk-acetate-identify' ] )
    } )

    it( 'puts a new Host layer under a tool layer added before it', () => {
        const v = viewer()
        v.map.addLayer( { id: 'measure-line' } )
        show( v, hostLayer( 'a' ), 0 )

        expect( v.map.stack ).toEqual( [ 'a-fill', 'a-line', 'measure-line' ] )
    } )
} )
