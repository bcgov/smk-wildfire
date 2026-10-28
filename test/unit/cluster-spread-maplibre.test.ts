/**
 * A cluster click spreads the cluster as SMK 1.0's Leaflet.markercluster did:
 * the parts move out from it while the map zooms in, then the real parts take over.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clusterParts, hideable, spreadCluster, SPREAD_MS } from '../../src/smk/viewer-maplibre/layer/cluster-spread-maplibre'

const CLUSTER = { id: 41, geometry: { type: 'Point', coordinates: [ -122, 59 ] }, properties: { cluster: true, cluster_id: 41, point_count: 2 } }
const PARTS = [
    { geometry: { type: 'Point', coordinates: [ -121, 59 ] }, properties: { name: 'a' } },
    { geometry: { type: 'Point', coordinates: [ -123, 60 ] }, properties: { name: 'b' } },
]
const LAYERS = [
    { id: 'c', type: 'circle', source: 's', paint: { 'circle-opacity': 1, 'circle-stroke-opacity': 0.5 } },
    { id: 'p', type: 'symbol', source: 's', layout: {}, paint: {} },
]

// The part of a MapLibre map that a spread uses.
function fakeMap() {
    const handlers: Record<string, Function[]> = {}
    const sources: Record<string, any> = {}
    const layers: string[] = [ 'c', 'p', 'above' ]
    const map: any = {
        zoom: 7,
        state: {} as Record<string, any>,
        on: ( type: string, fn: Function ) => { ( handlers[ type ] ||= [] ).push( fn ) },
        once: ( type: string, fn: Function ) => {
            const once = ( e: any ) => { map.off( type, once ); fn( e ) }
            map.on( type, once )
        },
        off: ( type: string, fn: Function ) => { handlers[ type ] = ( handlers[ type ] || [] ).filter( ( h ) => h !== fn ) },
        fire: ( type: string, e: any = {} ) => ( handlers[ type ] || [] ).slice().forEach( ( h ) => h( e ) ),
        addSource: ( id: string, s: any ) => { sources[ id ] = { data: s.data, setData: ( d: any ) => { sources[ id ].data = d } } },
        getSource: ( id: string ) => sources[ id ],
        removeSource: ( id: string ) => { delete sources[ id ] },
        addLayer: vi.fn( ( l: any, before: string ) => { layers.splice( layers.indexOf( before ), 0, l.id ) } ),
        getLayer: ( id: string ) => layers.includes( id ),
        removeLayer: ( id: string ) => { layers.splice( layers.indexOf( id ), 1 ) },
        getStyle: () => ( { layers: layers.map( ( id ) => ( { id } ) ) } ),
        setFeatureState: ( f: any, s: any ) => { map.state[ f.id ] = { ...map.state[ f.id ], ...s } },
        removeFeatureState: ( f: any, key: string ) => { delete map.state[ f.id ]?.[ key ] },
        getZoom: () => map.zoom,
        easeTo: vi.fn(),
        layers,
        sources,
    }
    return map
}

const spread = ( map: any ) =>
    spreadCluster( { map, sourceId: 's', layers: LAYERS, cluster: CLUSTER, parts: PARTS, zoom: 9 } )

beforeEach( () => {
    vi.useFakeTimers()
    vi.stubGlobal( 'requestAnimationFrame', ( fn: Function ) => setTimeout( () => fn( performance.now() ), 16 ) )
    vi.stubGlobal( 'cancelAnimationFrame', ( id: any ) => clearTimeout( id ) )
} )
afterEach( () => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
} )

describe( 'hideable', () => {
    it( 'keeps the opacity at rest and drops it to 0 for a hidden cluster', () => {
        const paint = hideable( LAYERS[ 0 ] ).paint

        expect( paint[ 'circle-opacity' ] ).toEqual( [ 'case', [ 'boolean', [ 'feature-state', 'smk_hidden' ], false ], 0, 1 ] )
        expect( paint[ 'circle-stroke-opacity' ].at( -1 ) ).toBe( 0.5 )
    } )
} )

describe( 'clusterParts', () => {
    it( 'goes down past a cluster with one child, as the expansion zoom does', async () => {
        const children: Record<number, any[]> = {
            41: [ { properties: { cluster: true, cluster_id: 42 } } ],
            42: PARTS,
        }
        const source = { getClusterChildren: ( id: number ) => Promise.resolve( children[ id ] ) }

        expect( await clusterParts( source, 41 ) ).toBe( PARTS )
    } )
} )

describe( 'spreadCluster', () => {
    it( 'draws the spread under the next layer and zooms with it', () => {
        const map = fakeMap()
        spread( map )

        expect( map.layers ).toEqual( [ 'c', 'p', 'c_spread', 'p_spread', 'above' ] )
        expect( map.easeTo ).toHaveBeenCalledWith( { center: [ -122, 59 ], zoom: 9, duration: SPREAD_MS } )
    } )

    it( 'hides the cluster only once the spread is drawn', () => {
        const map = fakeMap()
        spread( map )
        expect( map.state[ 41 ] ).toBeUndefined()

        map.fire( 'sourcedata', { sourceId: 's_spread', isSourceLoaded: true } )

        expect( map.state[ 41 ].smk_hidden ).toBe( true )
    } )

    it( 'moves the parts from the cluster to their places', () => {
        const map = fakeMap()
        spread( map )
        const at = () => map.sources.s_spread.data.features.map( ( f: any ) => f.geometry.coordinates )

        expect( at().slice( 0, 2 ) ).toEqual( [ [ -122, 59 ], [ -122, 59 ] ] )
        vi.advanceTimersByTime( SPREAD_MS + 50 )
        expect( at().slice( 0, 2 ) ).toEqual( [ [ -121, 59 ], [ -123, 60 ] ] )
        // The cluster itself has faded.
        expect( map.sources.s_spread.data.features[ 2 ].properties._smk_alpha ).toBe( 0 )
    } )

    it( 'keeps the spread until the real parts draw, then removes it', () => {
        const map = fakeMap()
        spread( map )
        map.fire( 'sourcedata', { sourceId: 's_spread', isSourceLoaded: true } )
        map.zoom = 9

        map.fire( 'moveend' )
        expect( map.getLayer( 'c_spread' ) ).toBe( true )
        map.fire( 'idle' )

        expect( map.getLayer( 'c_spread' ) ).toBe( false )
        expect( map.getSource( 's_spread' ) ).toBeUndefined()
        expect( map.state[ 41 ].smk_hidden ).toBeUndefined()
    } )

    it( 'shows the real cluster again at once when a drag stops the zoom', () => {
        const map = fakeMap()
        spread( map )
        map.fire( 'sourcedata', { sourceId: 's_spread', isSourceLoaded: true } )
        map.zoom = 7.6

        map.fire( 'moveend' )

        expect( map.getLayer( 'c_spread' ) ).toBe( false )
        expect( map.state[ 41 ].smk_hidden ).toBeUndefined()
    } )
} )
