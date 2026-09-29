/**
 * tool-select-leaflet — Leaflet initializer for SelectListTool.
 */

import { toolFeatureListClusteringLeaflet } from '../tool-feature-list-clustering-leaflet'

declare const L:    any
import '../../../tool/select/tool-select-list'
import { SMK } from '../../../smk-ref'
import * as turf from '@turf/turf'

const smkRef = SMK

smkRef.TYPE.SelectListTool.addInitializer( function ( this: any ) {
    this.styleFeature = function () {
        const self = this
        return function () {
            return Object.assign( {
                color:       'blue',
                weight:      3,
                opacity:     0.7,
                dashArray:   '6,6',
                lineCap:     'butt',
                fillOpacity: 0.0,
            }, self.style )
        }
    }
} )

smkRef.TYPE.SelectListTool.addInitializer( function ( this: any, smk: any ) {
    if ( smk.$viewer.type !== 'leaflet' ) return

    const self = this
    // SMK 1.0 wrote into this without making it, so every add threw.
    self.highlight = {}

    self.featureSet.addedFeatures( function ( ev: any ) {
        ev.features.forEach( function ( f: any ) {
            switch ( turf.getType( f ) ) {
            case 'Point':
                self.highlight[ f.id ] = L.circleMarker(
                    L.GeoJSON.coordsToLatLng( f.geometry.coordinates ),
                    { radius: 20 }
                ).setStyle( self.styleFeature()() )
                break
            case 'MultiPoint':
                break
            default:
                self.highlight[ f.id ] = L.geoJSON( f.geometry, { style: self.styleFeature() } )
            }
        } )
    } )
} )

