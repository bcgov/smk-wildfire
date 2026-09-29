/**
 * tool-about — About tool.
 * Converted from tool/about/tool-about.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import panelAboutRender from './panel-about.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'about-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'about-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelAboutRender,
    props: [ 'content' ],
} )

const factory = Tool.define( 'AboutTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'about-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'about-panel' )

        this.defineProp( 'content' )
    }
)

Tool.register( 'about', factory, widgetDefaults( panelDefaults( {
    order: 1, position: 'list-menu', icon: 'help',
    title: 'About SMK', content: 'Welcome to SMK',
} ) ) )
export default factory
