/**
 * tool-baseMaps — Base maps switcher tool.
 * Converted from tool/baseMaps/tool-baseMaps.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import panelBaseMapsHtml from './panel-base-maps.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any
declare const L: any

const smkRef = SMK

Vue.component( 'baseMaps-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

Vue.component( 'baseMaps-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    template: panelBaseMapsHtml,
    props: [ 'current', 'basemaps', 'mapStyle' ],
} )

const factory = Tool.define( 'BaseMapsTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'baseMaps-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'baseMaps-panel' )
        this.defineProp( 'current' )
        this.defineProp( 'basemaps' )
        this.defineProp( 'mapStyle' )
        this.basemaps = []
        this.mapStyle = { width: '110px', height: '110px' }
    },
    function ( this: any, smk: any ) {
        const self = this

        // The picker still shows the current Basemap, so the user can see it is on.
        const current = ( smk.viewer.baseMap || '' ).toLowerCase()
        if ( self.choices?.length && current && !self.choices.some( ( c: string ) => c.toLowerCase() === current ) )
            console.warn( `base map "${ smk.viewer.baseMap }" is not in the baseMaps tool choices, so the picker adds it` )

        this.basemaps = smk.$viewer.getBasemapIds()
            .map( function ( id: string ) {
                return smk.$viewer.getBasemapConfig( id )
            } )
            .filter( function ( config: any ) {
                if ( !self.choices || self.choices.length === 0 ) return !config.internal && !config.deprecated
                if ( self.choices.some( ( c: string ) => c.toLowerCase() === config.id ) ) return true
                if ( smk.viewer.baseMap.toLowerCase() === config.id ) return true
                return false
            } )
            .sort( ( a: any, b: any ) => a.order - b.order )
            .map( function ( config: any ) {
                if ( config.optionImageUrl ) {
                    return { id: config.id, title: config.title, optionImageUrl: config.optionImageUrl, update() {} }
                }

                // The live preview is a Leaflet map, and MapLibre runs no Leaflet (D25).
                if ( smk.$viewer.type === 'maplibre' ) {
                    return { id: config.id, title: config.title, update() {} }
                }

                let map: any
                return {
                    id: config.id,
                    title: config.title,
                    createContent( el: HTMLElement ) {
                        map = L.map( el, {
                            attributionControl: false,
                            zoomControl:        false,
                            dragging:           false,
                            keyboard:           false,
                            scrollWheelZoom:    false,
                            zoom:               10,
                            zoomSnap:           0,
                        } )
                        const bmLayers = smk.$viewer.createBasemapLayer( config.id )
                        map.addLayer( bmLayers[ 0 ] )
                    },
                    update() {
                        if ( !map ) return
                        const v = smk.$viewer.getView()
                        if ( !v ) return
                        map.invalidateSize()
                        map.setView( [ v.center.latitude, v.center.longitude ], v.zoom )
                    },
                }
            } )

        this.current = smk.viewer.baseMap

        this.changedActive( function () {
            if ( self.active ) {
                if ( self.showPanel === false ) {
                    smkRef.HANDLER.get( self.id, 'triggered' )( smk, self )
                } else {
                    smkRef.HANDLER.get( self.id, 'activated' )( smk, self )
                    Vue.nextTick( function () {
                        self.basemaps.forEach( ( bm: any ) => bm.update() )
                    } )
                }
            } else {
                smkRef.HANDLER.get( self.id, 'deactivated' )( smk, self )
            }
        } )

        smk.on( this.id, {
            'activate': function () {
                if ( !self.enabled ) return
                if ( self.showPanel === false ) {
                    self.active = false
                    const i = self.basemaps.findIndex( ( b: any ) => b.id === self.current )
                    setBasemap( self.basemaps[ ( i + 1 ) % self.basemaps.length ].id )
                }
            },
            'set-base-map': function ( ev: any ) {
                setBasemap( ev )
            },
        } )

        function setBasemap( basemapId: string ) {
            smk.$viewer.setBasemap( basemapId )
        }

        function showBasemap( id: string ) {
            self.current = id
            const bm = self.basemaps.find( ( b: any ) => b.id === id )
            if ( bm ) {
                self.status = 'basemap-' + bm.id
                self.title  = 'Base Map: ' + bm.title
            }
        }

        smk.$viewer.changedBaseMap( function ( ev: any ) { showBasemap( ev.baseMap ) } )

        smk.$viewer.changedView( function () {
            if ( !self.active ) return
            self.basemaps.forEach( ( bm: any ) => bm.update() )
        } )

        smk.$viewer.setBasemap( smk.viewer.baseMap )

        // The maplibre viewer builds a basemap asynchronously, so its
        // changedBaseMap can be lost in the start-up race when many tools
        // build, and the tool then shows no status and no title. It knows the
        // configured id without being told.
        showBasemap( smk.viewer.baseMap )
    }
)

Tool.register( 'baseMaps', factory, widgetDefaults( panelDefaults( {
    order: 3, position: [ 'shortcut-menu', 'list-menu' ], icon: 'map', title: 'Base Maps',
    mapStyle: { width: '110px', height: '110px' },
} ) ) )
export default factory
