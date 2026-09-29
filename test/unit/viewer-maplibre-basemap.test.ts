/**
 * Composite basemaps must resolve for the maplibre viewer.
 *
 * SMK defines its own imagery and topography as `composite` — a list of other
 * basemap ids stacked bottom first. specForConfig had no case for it, so the
 * default basemap produced an empty spec and the map painted white while
 * everything else looked healthy.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

const markerInstances: any[] = []
class FakeMarker {
    constructor( public opt: any ) { markerInstances.push( this ) }
    setLngLat() { return this }
    addTo()     { return this }
    remove()    { return this }
}
;( globalThis as any ).maplibregl = { Marker: FakeMarker }

// esri-basemap keys are read off the leaflet esri plugin.
;( globalThis as any ).L = {
    esri: { BasemapLayer: { TILES: {
        Imagery:  { urlTemplate: 'https://example.com/imagery/{z}/{y}/{x}' },
        Topographic: { urlTemplate: 'https://example.com/topo/{z}/{y}/{x}' },
    } } },
}

let ViewerMapLibre: any

beforeAll( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

// A registry shaped like the one SMK builds, with a composite over two children.
const REGISTRY: Record<string, any> = {
    imagery: {
        id: 'imagery', type: 'composite', title: 'Imagery',
        layers: [ 'imagery-esri', 'roads-raster' ],
    },
    'imagery-esri': { id: 'imagery-esri', type: 'esri-basemap', key: 'Imagery', title: 'Imagery' },
    'roads-raster':  {
        id: 'roads-raster', type: 'tile', title: 'Roads',
        url: 'https://example.com/roads/{z}/{y}/{x}',
    },
    broken: { id: 'broken', type: 'composite', layers: [ 'does-not-exist' ] },
    empty:  { id: 'empty', type: 'composite' },
}

function viewerWithRegistry() {
    const added: any[] = []
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.basemapTracker   = 0
    v.basemapLayerIds  = []
    v.basemapSourceIds = []
    v.map = {
        added,
        sources: {} as Record<string, any>,
        layers:  {} as Record<string, any>,
        getSource( id: string ) { return this.sources[ id ] },
        addSource( id: string, s: any ) { this.sources[ id ] = s },
        getLayer( id: string ) { return this.layers[ id ] },
        addLayer( l: any ) { this.layers[ l.id ] = l; added.push( l.id ) },
        removeLayer() {}, removeSource() {},
        getStyle() { return { layers: [] } },
        // The load fade listens for each basemap source.
        on() {}, off() {}, isSourceLoaded() { return false },
    }
    v.getBasemapConfig = ( id: string ) => {
        const c = REGISTRY[ id.toLowerCase() ]
        if ( !c ) throw new Error( 'no base map defined for ' + id )
        return c
    }
    v.changedBaseMap = vi.fn()
    return v
}

const settle = () => new Promise( ( r ) => setTimeout( r, 0 ) )

describe( 'maplibre basemaps — composite', () => {
    it( 'builds a layer for each child of a composite', async () => {
        const v = viewerWithRegistry()
        v.setBasemap( 'imagery' )
        await settle(); await settle()

        expect( v.basemapLayerIds.length ).toBe( 2 )
        expect( Object.keys( v.map.sources ).length ).toBe( 2 )
    } )

    it( 'stacks the children in order, first at the bottom', async () => {
        const v = viewerWithRegistry()
        v.setBasemap( 'imagery' )
        await settle(); await settle()

        // Each layer is inserted before the same anchor, so add order is
        // bottom-to-top: the first child must be added first.
        expect( v.map.added[ 0 ] ).toContain( 'imagery-esri' )
        expect( v.map.added[ 1 ] ).toContain( 'roads-raster' )
    } )

    it( 'still reports the basemap change', async () => {
        const v = viewerWithRegistry()
        v.setBasemap( 'imagery' )
        await settle(); await settle()

        expect( v.changedBaseMap ).toHaveBeenCalled()
    } )

    it( 'skips a child that is not defined instead of failing the whole basemap', async () => {
        const v = viewerWithRegistry()
        v.setBasemap( 'broken' )
        await settle(); await settle()

        expect( v.basemapLayerIds ).toEqual( [] )
        expect( v.changedBaseMap ).toHaveBeenCalled()
    } )

    it( 'survives a composite with no layers list', async () => {
        const v = viewerWithRegistry()
        expect( () => v.setBasemap( 'empty' ) ).not.toThrow()
        await settle(); await settle()

        expect( v.changedBaseMap ).toHaveBeenCalled()
    } )

    it( 'resolves a plain child type on its own', async () => {
        const v = viewerWithRegistry()
        v.setBasemap( 'roads-raster' )
        await settle(); await settle()

        expect( v.basemapLayerIds.length ).toBe( 1 )
    } )
} )
