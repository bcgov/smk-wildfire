/**
 * A basemap style's background layer must reach the map.
 *
 * Both style loaders dropped every layer of type 'background'. In the BC
 * Wildfire navigation style that layer is the only thing that paints the
 * ocean, so at any zoom where the tiles do not cover the view the sea came
 * out white.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

;( globalThis as any ).maplibregl = {
    Marker: class { setLngLat() { return this } addTo() { return this } remove() {} },
}

let ViewerMapLibre: any

beforeEach( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

const STYLE_WITH_BACKGROUND = {
    version: 8,
    sources: {
        esri: {
            type:  'vector',
            url:   'https://example.com/VectorTileServer',
            tiles: [ 'https://example.com/VectorTileServer/tile/{z}/{y}/{x}.pbf' ],
        },
    },
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#a7d6fe' } },
        { id: 'Land', type: 'fill', source: 'esri', 'source-layer': 'Land' },
    ],
}

function viewerWith( cfg: any ) {
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.basemapTracker   = 0
    v.basemapLayerIds  = []
    v.basemapSourceIds = []
    v.map = {
        layers: {} as Record<string, any>,
        sources: {} as Record<string, any>,
        getSource( id: string ) { return this.sources[ id ] },
        addSource( id: string, s: any ) { this.sources[ id ] = s },
        getLayer( id: string ) { return this.layers[ id ] },
        addLayer( l: any ) { this.layers[ l.id ] = l },
        removeLayer() {}, removeSource() {},
        getStyle() { return { layers: [] } },
        setGlyphs() {}, setSprite() {},
    }
    v.getBasemapConfig = () => cfg
    v.changedBaseMap   = vi.fn()
    return v
}

const settle = async () => { for ( let i = 0; i < 8; i++ ) await new Promise( r => setTimeout( r, 0 ) ) }

function stubFetch( style: any ) {
    ;( globalThis as any ).fetch = vi.fn( () =>
        Promise.resolve( { ok: true, json: () => Promise.resolve( style ) } ),
    )
}

function backgroundOf( v: any ) {
    return Object.values( v.map.layers ).find( ( l: any ) => l.type === 'background' ) as any
}

describe( 'basemap background layer', () => {
    it( 'keeps it for an esri-vector-tile basemap', async () => {
        stubFetch( STYLE_WITH_BACKGROUND )
        const v = viewerWith( {
            id: 'navigation', type: 'esri-vector-tile', url: 'https://example.com/VectorTileServer',
        } )

        v.setBasemap( 'navigation' )
        await settle()

        expect( backgroundOf( v ).paint[ 'background-color' ] ).toBe( '#a7d6fe' )
    } )

    it( 'keeps it for a maplibre-style basemap', async () => {
        stubFetch( STYLE_WITH_BACKGROUND )
        const v = viewerWith( {
            id: 'navigation', type: 'maplibre-style', url: 'https://example.com/style.json',
        } )

        v.setBasemap( 'navigation' )
        await settle()

        expect( backgroundOf( v ).paint[ 'background-color' ] ).toBe( '#a7d6fe' )
    } )
} )
