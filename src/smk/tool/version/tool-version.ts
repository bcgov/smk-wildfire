/**
 * tool-version — Version info tool.
 * Converted from tool/version/tool-version.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { BUILD } from '../../build-info'
import panelVersionRender from './panel-version.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'version-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'version-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelVersionRender,
    props: [ 'build', 'config' ],
} )

const factory = Tool.define( 'VersionTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'version-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'version-panel' )
        this.defineProp( 'build' )
        this.defineProp( 'config' )
    },
    function ( this: any, smk: any ) {
        this.config = smkRef.UTIL.projection( 'lmfId', 'lmfRevision', 'createdBy', '_rev', 'published' )( smk )
        this.config.enabledTools = Object.keys( smk.$toolType ).sort()
    }
)

// The panel reads build.version, and does not mount without it.
Tool.register( 'version', factory, widgetDefaults( panelDefaults( {
    order: 99, position: 'list-menu', icon: 'build', title: 'Version Info', build: BUILD,
} ) ) )
export default factory
