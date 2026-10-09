/**
 * tool-current-location — Current location tool.
 * Converted from tool/current-location/tool-current-location.js.
 */

import Tool from '../../tool'
import myLocationPng from './config/my-location.png'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import widgetCurrentLocationRender from './widget-current-location.html?vue'
import { SMK } from '../../smk-ref'
import * as turf from '@turf/turf'
import { component } from '../../vue'

const smkRef = SMK

component( 'current-location-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
    render: widgetCurrentLocationRender,
} )

const factory = Tool.define( 'CurrentLocationTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'current-location-widget' )
        smkRef.TYPE.ToolInternalLayers.call( this )

    },
    function ( this: any, smk: any ) {
        const self = this

        smk.$viewer.displayContextInitialized.then( function () {
            self.setInternalLayerVisible( true )
        } )

        smk.on( this.id, {
            trigger( _ev: any ) {
                self.busy = true
                self.clearInternalLayer( 'current-location' )
                self.showStatusMessage( 'Locating...', 'progress', null )

                smk.$viewer.getCurrentLocation()
                    .then( function ( res: any ) {
                        if ( !res ) return
                        self.showStatusMessage( 'Current location found' )

                        // getCurrentLocation resolves with a geocoder site, not a
                        // view. setView reads extent, center or zoom only, so the
                        // site alone moved no viewer and reported nothing.
                        smk.$viewer.setView( { center: [ res.longitude, res.latitude ], zoom: self.zoom } )

                        self.loadInternalLayer( 'current-location', turf.point( [ res.longitude, res.latitude ] ) )
                        self.currentLocation = res
                    } )
                    .catch( function ( err: any ) {
                        console.warn( 'getCurrentLocation:', err )
                        self.showStatusMessage( 'Unable to get location', 'warning' )
                    } )
                    .finally( function () {
                        self.busy = false
                    } )
            },
        } )

        // Hand the position to the location tool, so it shows the coordinates.
        smk.$viewer.changedView( function () {
            if ( self.currentLocation && smk.hasToolType( 'location' ) )
                smk.$viewer.pickedLocation( { map: self.currentLocation } )

            self.currentLocation = null
        } )
    }
)

Tool.register( 'current-location', factory, widgetDefaults( internalLayersDefaults( {
    position: 'actionbar', order: 11, icon: 'my_location', title: 'Current Location', zoom: 17,
    internalLayers: [
        { id: 'current-location', title: 'Current Location',
          style: { markerUrl: myLocationPng, markerSize: [ 26, 26 ], markerOffset: [ 13, 13 ] },
          geometryType: 'point', legend: { point: true } },
    ],
} ) ) )
export default factory
