/**
 * The credits an Esri source must show in the maplibre viewer.
 *
 * esri-leaflet gave SMK 1.0 two things for free: each service's copyrightText,
 * and "Powered by Esri" in front of the credits. MapLibre shows only what a
 * source declares, so the WFNEWS map showed neither. Found 2026-09-29.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

;( globalThis as any ).maplibregl = { Marker: class { setLngLat() { return this } addTo() { return this } remove() {} } }

let ViewerMapLibre: any

beforeEach( async () => {
    ( { ViewerMapLibre } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

const SERVICE = 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer'
const CREDIT  = 'Sources: Esri, TomTom, Garmin'

const STYLE = {
    version: 8,
    sources: { esri: { type: 'vector', url: '../../' } },
    layers: [ { id: 'Land', type: 'fill', source: 'esri', 'source-layer': 'Land' } ],
}

/** The style for a style url, the service description for `?f=json`. */
function stubFetch() {
    ;( globalThis as any ).fetch = vi.fn( ( url: string ) => Promise.resolve( {
        ok: true,
        json: () => Promise.resolve( /\?f=json$/.test( url ) ? { copyrightText: CREDIT } : STYLE ),
    } ) )
}

function viewerWith( cfg: any ) {
    const v: any = Object.create( ViewerMapLibre.prototype )
    v.basemapTracker = 0
    v.basemapLayerIds = []
    v.basemapSourceIds = []
    v.attribution = { options: {} as any, _updateAttributions: vi.fn() }
    v.map = {
        style: {},
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

describe( 'Esri credits in maplibre', () => {
    it( 'gives an Esri vector basemap its service copyright', async () => {
        stubFetch()
        const v = viewerWith( { id: 'nav', type: 'esri-vector-tile', url: SERVICE } )

        v.setBasemap( 'nav' )
        await settle()

        expect( v.map.sources[ 'smk-bm-nav__esri' ].attribution ).toBe( CREDIT )
    } )

    it( 'keeps a basemap Config attribution over the service copyright', async () => {
        stubFetch()
        const v = viewerWith( { id: 'nav', type: 'esri-vector-tile', url: SERVICE, attribution: 'Mine' } )

        v.setBasemap( 'nav' )
        await settle()

        expect( v.map.sources[ 'smk-bm-nav__esri' ].attribution ).toBe( 'Mine' )
    } )

    it( 'puts "Powered by Esri" in front once an Esri basemap is on the map', async () => {
        stubFetch()
        const v = viewerWith( { id: 'nav', type: 'esri-vector-tile', url: SERVICE } )

        v.setBasemap( 'nav' )
        await settle()

        expect( v.attribution.options.customAttribution ).toContain( 'Powered by' )
        expect( v.attribution._updateAttributions ).toHaveBeenCalledTimes( 1 )
    } )

    it( 'does not credit Esri for a basemap from elsewhere', async () => {
        stubFetch()
        const v = viewerWith( { id: 'osm', type: 'tile', url: 'https://tile.example.org/{z}/{x}/{y}.png' } )

        v.setBasemap( 'osm' )
        await settle()

        expect( v.attribution.options.customAttribution ).toBeUndefined()
    } )

    it( 'credits Esri for an Esri layer', () => {
        const v = viewerWith( {} )
        v.addViewerLayer( { esri: true } )
        expect( v.attribution.options.customAttribution ).toContain( 'Esri' )
    } )
} )
