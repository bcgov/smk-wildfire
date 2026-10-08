/**
 * tool-version — Version info tool.
 * Converted from tool/version/tool-version.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { BUILD } from '../../build-info'
import panelVersionHtml from './panel-version.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any

const smkRef = SMK

Vue.component( 'version-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

Vue.component( 'version-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    template: panelVersionHtml,
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
