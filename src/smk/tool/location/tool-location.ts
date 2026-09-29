/**
 * tool-location — Location / geocoder tool.
 * Ported from the 1.0 tool/location/tool-location.js (git d06bb57^).
 */

import Tool from '../../tool'
import locationIconBlue from './config/marker-icon-blue.png'
import locationShadow   from './config/marker-shadow.png'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import panelLocationHtml from './panel-location.html?raw'
import { SMK } from '../../smk-ref'
import * as turf from '@turf/turf'

declare const Vue: any
const smkRef = SMK

Vue.component( 'location-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

Vue.component( 'location-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    template: panelLocationHtml,
    props: [ 'site', 'tool' ],
} )

const factory = Tool.define( 'LocationTool',
    function ( this: any ) {
        smkRef.TYPE.ToolPanel.call( this, 'location-panel' )
        smkRef.TYPE.ToolInternalLayers.call( this )

        this.defineProp( 'site' )
        this.defineProp( 'tool' )

        this.site = {}
        // The keys exist from the start, so Vue sees a handler switch a command on.
        this.tool = { identify: false, measure: false, directions: false }
    },
    function ( this: any, smk: any ) {
        const self = this

        smk.$viewer.displayContextInitialized.then( function () {
            self.setInternalLayerVisible( true )
        } )

        // No position and no parent, so tool-base does not add this panel.
        smk.getSidepanel().addTool( this, smk )

        this.geocoder = new smkRef.TYPE.Geocoder( this.geocoderService )

        this.setIdentifyHandler = function ( handler?: () => void ) {
            if ( !smk.$tool.identify ) return

            self.tool.identify = !!handler

            self.identifyHandler = handler || function () {}
        }
        self.identifyHandler = function () {}

        this.setDirectionsHandler = function ( handler?: () => void ) {
            if ( !smk.$tool.directions ) return

            self.tool.directions = !!handler

            self.directionsHandler = handler || function () {}
        }
        self.directionsHandler = function () {}

        smk.on( this.id, {
            'identify': function () {
                self.identifyHandler()
            },

            'measure': function () {
            },

            'directions': function () {
                self.directionsHandler()
            },
        } )

        smk.$viewer.handlePick( 1, function ( location: any ) {
            if ( !self.enabled ) return

            self.active = true
            self.site = location.map
            self.pickLocation( location )

            self.setDirectionsHandler()
            self.setIdentifyHandler( function () {
                self.reset()
                smk.$viewer.identifyFeatures( location )
            } )

            return self.geocoder.fetchNearestSite( location.map )
                .then( function ( site: any ) {
                    self.site = site

                    self.setDirectionsHandler( function () {
                        self.reset()
                        smk.$tool.directions.active = true

                        smk.$tool.directions.activating
                            .then( function () {
                                return smk.$tool.directions.startAtCurrentLocation()
                            } )
                            .then( function () {
                                return smk.$tool.directions.addWaypoint( site )
                            } )
                    } )

                    return true
                } )
                .catch( function () {
                    return true
                } )
        } )

        this.pickLocation = function ( location: any ) {
            self.clearInternalLayer( 'location' )
            self.loadInternalLayer( 'location', turf.point( [
                location.map.longitude,
                location.map.latitude,
            ] ) )
        }

        this.reset = function () {
            self.site = {}
            self.active = false
            self.setDirectionsHandler()
            self.setIdentifyHandler()
            self.clearInternalLayer( 'location' )
        }

        smk.$viewer.changedView( function () {
            self.reset()
        } )

        self.changedActive( function () {
            if ( !self.active )
                self.reset()
        } )
    }
)

Tool.register( 'location', factory, panelDefaults( internalLayersDefaults( {
    showHeader: false,
    internalLayers: [
        { id: 'location', style: { markerUrl: locationIconBlue, markerSize: [ 25, 41 ], markerOffset: [ 12, 41 ], shadowUrl: locationShadow, shadowSize: [ 41, 41 ] }, legend: { point: true } },
    ],
} ) ) )
export default factory
