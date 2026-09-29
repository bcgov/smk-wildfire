/**
 * tool-reset-view — Reset view tool.
 * Converted from tool/reset-view/tool-reset-view.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import widgetResetViewRender from './widget-reset-view.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'reset-view-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
    render: widgetResetViewRender,
} )

const factory = Tool.define( 'ResetViewTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'reset-view-widget' )
    },
    function ( this: any, smk: any ) {
        const self = this

        smk.on( this.id, {
            trigger( _ev: any ) {
                smk.$viewer.setView( smk.viewer.location )
            },
        } )
    }
)

Tool.register( 'reset-view', factory, widgetDefaults( {
    position: 'actionbar', order: 10, icon: 'zoom_out_map', title: 'Reset View',
} ) )
export default factory
