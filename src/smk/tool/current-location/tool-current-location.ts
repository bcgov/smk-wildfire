/**
 * tool-current-location — Current location tool.
 * Converted from tool/current-location/tool-current-location.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import widgetCurrentLocationHtml from './widget-current-location.html?raw'
import myLocationPng from './config/my-location.png'
import { SMK } from '../../smk-ref'

declare const Vue: any
declare const turf: any

const smkRef = SMK

Vue.component( 'current-location-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
    template: widgetCurrentLocationHtml,
} )

const factory = Tool.define( 'CurrentLocationTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'current-location-widget' )
        smkRef.TYPE.ToolInternalLayers.call( this )

        this.internalLayers.push(
            {
                id: 'current-location', title: 'Current Location',
                style: { markerUrl: myLocationPng, markerSize: [ 26, 26 ], markerOffset: [ 13, 13 ] },
                geometryType: 'point', legend: { point: true },
            },
        )
    },
    function ( this: any, smk: any ) {
        const self = this

        // Register the display context so setInternalLayerVisible can use it.
        // In the old AMD build tool-current-location-config.js pushed this to
        // SMK.CONFIG.viewer.displayContext; here the tool does it, as identify does.
        smk.$viewer.setDisplayContextItems( this.type, [ {
            id:         this.id,
            type:       'group',
            title:      this.title,
            class:      'smk-inline-legend',
            isVisible:  false,
            isInternal: true,
            showItem:   false,
            items:      this.internalLayers.map( ( ly: any ) => ( { id: ly.id } ) ),
        } ] )

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
} ) ) )
export default factory
