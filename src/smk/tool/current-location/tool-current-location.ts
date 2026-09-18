/**
 * tool-current-location — Current location tool.
 * Converted from tool/current-location/tool-current-location.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import widgetCurrentLocationHtml from './widget-current-location.html?raw'
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
            { id: 'location', title: 'Current Location', style: { markerSize: [ 26, 26 ], markerOffset: [ 13, 13 ] }, geometryType: 'point', legend: { point: true } },
        )
    },
    function ( this: any, smk: any ) {
        const self = this

        smk.on( this.id, {
            trigger( _ev: any ) {
                self.busy = true
                smk.$viewer.getCurrentLocation()
                    .then( function ( res: any ) {
                        if ( !res ) return
                        self.clearInternalLayer( 'location' )
                        self.loadInternalLayer( 'location', turf.point( [ res.longitude, res.latitude ] ) )
                        smk.$viewer.setView( res )
                    } )
                    .catch( function ( err: any ) {
                        console.warn( 'getCurrentLocation:', err )
                    } )
                    .finally( function () {
                        self.busy = false
                    } )
            },
        } )
    }
)

Tool.register( 'current-location', factory, widgetDefaults( internalLayersDefaults( {
    position: 'actionbar', order: 11, icon: 'my_location', title: 'Current Location', zoom: 17,
} ) ) )
export default factory
