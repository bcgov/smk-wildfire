/**
 * layer-esri-feature-leaflet — Leaflet ESRI feature layer.
 * Converted from layer-esri-feature-leaflet.js.
 */

declare const L: any

import { EsriFeatureLayer } from '../../layer/layer-types'
import { Layer }            from '../../layer/layer'

export class EsriFeatureLeafletLayer extends EsriFeatureLayer {}

;( Layer as any )[ 'esri-feature' ][ 'leaflet' ] = EsriFeatureLeafletLayer

// ---------------------------------------------------------------------------

;( EsriFeatureLeafletLayer as any ).create = function ( layers: any[], zIndex: number ) {
    if ( layers.length !== 1 ) throw new Error( 'only 1 config allowed' )

    const cfg: any = { url: layers[ 0 ].config.serviceUrl }

    if ( layers[ 0 ].config.scaleMin )
        cfg.minZoom = this.getZoomBracketForScale( layers[ 0 ].config.scaleMin )[ 1 ]

    if ( layers[ 0 ].config.scaleMax )
        cfg.maxZoom = this.getZoomBracketForScale( layers[ 0 ].config.scaleMax )[ 1 ]

    if ( layers[ 0 ].config.where )
        cfg.where = layers[ 0 ].config.where

    if ( layers[ 0 ].config.drawingInfo ) {
        cfg.drawingInfo = layers[ 0 ].config.drawingInfo
        if ( cfg.drawingInfo.renderer?.symbol?.url )
            cfg.drawingInfo.renderer.symbol.url = ( new URL(
                cfg.drawingInfo.renderer.symbol.url, document.location as any
            ) ).toString()
    }

    const layer = L.esri.featureLayer( cfg )

    // esri-leaflet 2.x had featureLayer.legend(), and SMK 1.0 used it. 3.x
    // removed it, so this threw `a.legend is not a function` for EVERY
    // esri-feature layer: createViewerLayer caught it, disabled the display
    // item and warned, and the layer never drew. Found by the harness project
    // on axis B, 2026-09-07; axis A then showed 1.0 fetching the legend that v2
    // had stopped asking for. Ask the service directly and keep the legend.
    if ( layers[ 0 ].legendCacheResolve ) {
        const done = ( leg: any ) => {
            if ( !layers[ 0 ].legendCacheResolve ) return
            layers[ 0 ].legendCacheResolve( leg )
            layers[ 0 ].legendCacheResolve = null
        }

        if ( typeof layer.legend === 'function' ) {
            layer.legend( ( err: any, leg: any ) => done( err ? null : leg.layers[ 0 ].legend ) )
        } else {
            fetch( String( cfg.url ).replace( /\/$/, '' ) + '/legend?f=json' )
                .then( r => r.ok ? r.json() : null )
                .then( d => done( d && d.layers && d.layers[ 0 ] ? d.layers[ 0 ].legend : null ) )
                // Nothing must wait for a legend that cannot come.
                .catch( () => done( null ) )
        }
    }

    layer.on( 'load', () => {
        if ( layer._currentImage ) layer._currentImage.setZIndex( zIndex )
        layers[ 0 ].loading = false
    } )
    layer.on( 'loading', () => { layers[ 0 ].loading = true } )

    return layer
}

export default EsriFeatureLeafletLayer
