/**
 * layer-esri-tiled-maplibre — MapLibre Esri tiled map layer adapter.
 * Renders an ArcGIS MapServer tile cache as a MapLibre raster source.
 *
 * The service description is not optional — see esri-tile-info.ts, which the
 * esri-tiled-map basemap uses as well so the two cannot drift.
 *
 * A service that will not answer keeps the old behaviour, so a map still draws
 * with no network to the description.
 */

import { EsriTiledLayer } from '../../layer/layer-types'
import { Layer }          from '../../layer/layer'
import { readEsriTileInfo, tileSourceFromInfo, zoomForScale, resetEsriTileInfoCache } from '../esri-tile-info'

export class EsriTiledMapLibreLayer extends EsriTiledLayer {}

;( Layer as any )[ 'esri-tiled' ][ 'maplibre' ] = EsriTiledMapLibreLayer

/** Kept for the tests that stub one url with different answers. */
export function resetTileServiceCache(): void { resetEsriTileInfoCache() }

;( EsriTiledMapLibreLayer as any ).create = function ( layers: any[], _zIndex: number ) {
    if ( layers.length !== 1 ) throw new Error( 'only 1 config allowed' )
    const cfg = layers[ 0 ].config

    const base    = ( cfg.serviceUrl || '' ).replace( /\/$/, '' )
    const id      = '_smk_esri_tiled_' + cfg.id
    const opacity = cfg.opacity != null ? cfg.opacity : 1

    return readEsriTileInfo( base ).then( ( info: any ) => {
        const from = tileSourceFromInfo( base, info )

        const source: any = {
            type:        'raster',
            tiles:       from.tiles,
            // A cache may be built with 512px tiles. Asking at 256 stretches it.
            tileSize:    from.tileSize || 256,
            attribution: cfg.attribution || from.attribution || '',
        }
        if ( from.minzoom != null ) source.minzoom = from.minzoom
        if ( from.maxzoom != null ) source.maxzoom = from.maxzoom
        if ( from.bounds )          source.bounds  = from.bounds

        // The config may narrow the range further. It never widens it.
        const outer = zoomForScale( info, cfg.minScale || cfg.scaleMin )
        if ( outer != null ) source.minzoom = Math.max( source.minzoom ?? 0, outer )

        const inner = zoomForScale( info, cfg.maxScale || cfg.scaleMax )
        if ( inner != null ) source.maxzoom = Math.min( source.maxzoom ?? 24, inner )

        return {
            sourceId: id,
            source,
            layer: {
                id,
                type:   'raster',
                source: id,
                paint:  { 'raster-opacity': opacity },
            },
        }
    } )
}

export default EsriTiledMapLibreLayer
