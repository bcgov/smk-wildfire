/**
 * The MapLibre viewer's esri-basemap table must match esri-leaflet's.
 *
 * It was read off L.esri.BasemapLayer.TILES at run time. D25 took Leaflet out
 * of the MapLibre viewer, so the table is a copy, and this test stops it drifting.
 */
import { describe, it, expect } from 'vitest'
import { BasemapLayer } from 'esri-leaflet'
import { esriBasemapTileUrl } from '../../src/smk/viewer-maplibre/esri-basemap-tiles'

const TILES = ( BasemapLayer as any ).TILES as Record<string, { urlTemplate: string }>

// What resolveTileUrl in viewer-maplibre.ts did to each template.
function resolved( template: string ) {
    return template
        .replace( /^\/\//, 'https://' )
        .replace( /^http:\/\//, 'https://' )
        .replace( /\{s\}\.arcgisonline\.com/, 'server.arcgisonline.com' )
}

describe( 'esri-basemap tile table', () => {
    it( 'has every key esri-leaflet has', () => {
        const missing = Object.keys( TILES ).filter( k => !esriBasemapTileUrl( k ) )
        expect( missing ).toEqual( [] )
    } )

    for ( const key of Object.keys( TILES ) ) {
        it( 'gives the same URL as esri-leaflet for ' + key, () => {
            expect( esriBasemapTileUrl( key ) ).toBe( resolved( TILES[ key ].urlTemplate ) )
        } )
    }

    it( 'gives nothing for an unknown key', () => {
        expect( esriBasemapTileUrl( 'NoSuchKey' ) ).toBeNull()
    } )
} )
