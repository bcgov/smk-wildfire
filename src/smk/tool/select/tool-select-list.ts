/**
 * tool-select-list — Select list tool (part of select composite).
 * Converted from tool/select/tool-select-list.js.
 */

import Tool from '../../tool'
import panelSelectRender from './panel-select.html?vue'
import { SMK } from '../../smk-ref'
import { highlightLayers } from '../../mixin/tool-feature-list/highlight-layers'
import { component } from '../../vue'


const smkRef = SMK

component( 'select-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'select-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelSelectRender,
    props: [ 'layers', 'highlightId', 'command' ],
} )

const factory = Tool.define( 'SelectListTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'select-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'select-panel' )
        smkRef.TYPE.ToolInternalLayers.call( this )
        smkRef.TYPE.ToolFeatureList.call( this, function ( smk: any ) { return smk.$viewer.selected } )

        this.internalLayers.push(
            ...highlightLayers(),
        )

        this.defineProp( 'command' )
    },
    function ( this: any, smk: any ) {
        const self = this

        self.showStatusMessage( 'Click on map to identify features and then add them to the selection.' )

        self.changedActive( function () {
            if ( self.active ) smk.$viewer.selected.pick()
        } )

        smk.on( this.id, {
            'clear': function () {
                self.showStatusMessage( 'Click on map to identify features and then add them to the selection.' )
            },
        } )

        self.featureSet
            .addedFeatures( updateMessage )
            .removedFeatures( updateMessage )

        function updateMessage() {
            const stat = smk.$viewer.selected.getStats()
            if ( stat.featureCount === 0 ) {
                self.showStatusMessage()
                return
            }
            self.showStatusMessage( '<div>Selection contains ' + smkRef.UTIL.grammaticalNumber( stat.featureCount, null, 'a feature', '{} features' ) + '</div>' )
        }
    }
)

smkRef.TYPE[ 'tool-select-list' ] = factory
export default factory
