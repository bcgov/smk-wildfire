/**
 * esri-vector-tile basemaps for the maplibre viewer.
 *
 * Two behaviours cost a long hunt when they were missing, and both are host
 * contracts that esri-leaflet-vector already honoured:
 *
 *   - option.style( style ) lets a host replace the service style. Without it
 *     the raw ESRI style is used, whose layers start at zoom 16, so the map
 *     looks empty at any normal zoom.
 *   - a host style names the service its source-layer names belong to. Forcing
 *     the tiles to cfg.url instead hands MapLibre another service's tiles and
 *     every source-layer reference misses, so nothing draws.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

;( globalThis as any ).maplibregl = { Marker: class { setLngLat() { return this } addTo() { return this } remove() {} } }

let ViewerMapLibre: any

beforeEach( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

// The style an ESRI VectorTileServer serves at /resources/styles/root.json:
// a relative source with no absolute tiles.
const ESRI_ROOT_STYLE = {
    version: 8,
    sources: { esri: { type: 'vector', url: '../../' } },
    layers: [ { id: 'Land', type: 'fill', source: 'esri', 'source-layer': 'Land', minzoom: 16 } ],
}

// A host style that names its own service, with absolute tiles.
const HOST_STYLE = {
    version: 8,
    sources: {
        esri: {
            type: 'vector',
            url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
            tiles: [ 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf' ],
        },
    },
    layers: [ { id: 'Land', type: 'fill', source: 'esri', 'source-layer': 'Land', minzoom: 0 } ],
}

function viewerWith( cfg: any ) {
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.basemapTracker = 0
    v.basemapLayerIds = []
    v.basemapSourceIds = []
    v.map = {
        sources: {} as Record<string, any>,
        layers: {} as Record<string, any>,
        getSource( id: string ) { return this.sources[ id ] },
        addSource( id: string, s: any ) { this.sources[ id ] = s },
        getLayer( id: string ) { return this.layers[ id ] },
        addLayer( l: any ) { this.layers[ l.id ] = l },
        removeLayer() {}, removeSource() {},
        getStyle() { return { layers: [] } },
        setGlyphs() {}, setSprite() {},
    }
    v.getBasemapConfig = () => cfg
    v.changedBaseMap = vi.fn()
    return v
}

const settle = async () => { for ( let i = 0; i < 8; i++ ) await new Promise( ( r ) => setTimeout( r, 0 ) ) }

function stubFetch( style: any ) {
    ;( globalThis as any ).fetch = vi.fn( () =>
        Promise.resolve( { ok: true, json: () => Promise.resolve( style ) } ),
    )
}

describe( 'esri-vector-tile basemap', () => {
    it( 'builds tiles from the service when the style has none', async () => {
        stubFetch( ESRI_ROOT_STYLE )
        const v = viewerWith( {
            id: 'topo', type: 'esri-vector-tile',
            url: 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Canada_Topographic/VectorTileServer',
        } )

        v.setBasemap( 'topo' )
        await settle()

        const src = v.map.sources[ 'smk-bm-topo__esri' ]
        expect( src.tiles[ 0 ] ).toContain( 'Canada_Topographic/VectorTileServer/tile/{z}/{y}/{x}.pbf' )
        expect( src.url ).toBeUndefined()
    } )

    it( 'keeps the tiles a host style already names', async () => {
        stubFetch( ESRI_ROOT_STYLE )
        const v = viewerWith( {
            id: 'navigation', type: 'esri-vector-tile',
            url: 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Canada_Topographic/VectorTileServer',
            option: { style: () => HOST_STYLE },
        } )

        v.setBasemap( 'navigation' )
        await settle()

        const src = v.map.sources[ 'smk-bm-navigation__esri' ]
        expect( src.tiles[ 0 ] ).toContain( 'World_Basemap_v2' )
        expect( src.tiles[ 0 ] ).not.toContain( 'Canada_Topographic' )
    } )

    it( 'uses the layers of the host style, not the service style', async () => {
        stubFetch( ESRI_ROOT_STYLE )
        const v = viewerWith( {
            id: 'navigation', type: 'esri-vector-tile',
            url: 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/X/VectorTileServer',
            option: { style: () => HOST_STYLE },
        } )

        v.setBasemap( 'navigation' )
        await settle()

        // The service style draws from zoom 16; the host style from zoom 0.
        const layer = v.map.layers[ 'smk-bm-navigation__Land' ]
        expect( layer.minzoom ).toBe( 0 )
    } )

    it( 'unwraps a style module namespace, as a JSON import gives', async () => {
        stubFetch( ESRI_ROOT_STYLE )
        const v = viewerWith( {
            id: 'navigation', type: 'esri-vector-tile',
            url: 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/X/VectorTileServer',
            option: { style: () => ( { default: HOST_STYLE } ) },
        } )

        v.setBasemap( 'navigation' )
        await settle()

        expect( v.map.sources[ 'smk-bm-navigation__esri' ].tiles[ 0 ] ).toContain( 'World_Basemap_v2' )
    } )

    it( 'falls back to the service style when style() throws', async () => {
        stubFetch( ESRI_ROOT_STYLE )
        const v = viewerWith( {
            id: 'topo', type: 'esri-vector-tile',
            url: 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Canada_Topographic/VectorTileServer',
            option: { style: () => { throw new Error( 'bad style' ) } },
        } )

        v.setBasemap( 'topo' )
        await settle()

        expect( v.map.sources[ 'smk-bm-topo__esri' ].tiles[ 0 ] ).toContain( 'Canada_Topographic' )
        expect( v.changedBaseMap ).toHaveBeenCalled()
    } )
} )
