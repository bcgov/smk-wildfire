/**
 * layer-esri-dynamic-leaflet — Leaflet ESRI dynamic map layer.
 * Converted from layer-esri-dynamic-leaflet.js.
 */

declare const L: any

import { EsriDynamicLayer } from '../../layer/layer-types'
import { Layer }            from '../../layer/layer'

export class EsriDynamicLeafletLayer extends EsriDynamicLayer {}

;( Layer as any )[ 'esri-dynamic' ][ 'leaflet' ] = EsriDynamicLeafletLayer

// ---------------------------------------------------------------------------

;( EsriDynamicLeafletLayer as any ).create = function ( layers: any[], zIndex: number ) {
    if ( layers.length !== 1 ) throw new Error( 'only 1 config allowed' )

    const serviceUrl  = layers[ 0 ].config.serviceUrl
    const dynamicLayers = layers[ 0 ].config.dynamicLayers
        ? layers[ 0 ].config.dynamicLayers.map( ( dl: string ) => JSON.parse( dl ) )
        : undefined
    const opacity = layers[ 0 ].config.opacity

    let minZoom: number | undefined
    if ( layers[ 0 ].config.minScale )
        minZoom = this.getZoomBracketForScale( layers[ 0 ].config.minScale )[ 1 ]

    let maxZoom: number | undefined
    if ( layers[ 0 ].config.maxScale )
        maxZoom = this.getZoomBracketForScale( layers[ 0 ].config.maxScale )[ 1 ]

    // An esri-dynamic layer is a dynamic map service, so export it.
    //
    // SMK 1.0 fell back to a featureLayer whenever the config named no
    // dynamicLayers, and the conversion kept that. It only works when the
    // service url already ends in a layer index. Against a MapServer root it
    // queries an endpoint that does not exist, tiles the whole world, and sends
    // `where=undefined` as a literal string. Found by the harness project on
    // axis B, 2026-09-07: maplibre sent one /export, leaflet sent eight /query.
    const url = String( serviceUrl || '' ).replace( /\/$/, '' )
    const isLayerIndex = /\/\d+$/.test( url )

    let layer: any
    if ( !dynamicLayers && isLayerIndex ) {
        const opt: any = { url: serviceUrl }
        if ( layers[ 0 ].config.where ) opt.where = layers[ 0 ].config.where
        layer = L.esri.featureLayer( opt )
    } else {
        layer = L.esri.dynamicMapLayer( { url: serviceUrl, opacity, dynamicLayers, maxZoom, minZoom } )
    }

    layer.on( 'load', () => {
        if ( layer._currentImage ) layer._currentImage.setZIndex( zIndex )
        layers[ 0 ].loading = false
    } )
    layer.on( 'loading', () => { layers[ 0 ].loading = true } )

    return layer
}

export default EsriDynamicLeafletLayer
