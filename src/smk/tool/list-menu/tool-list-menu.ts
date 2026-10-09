/**
 * tool-list-menu — List menu container tool.
 * Converted from tool/list-menu/tool-list-menu.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import panelListMenuRender from './panel-list-menu.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'list-menu-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'list-menu-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelListMenuRender,
    props: [ 'subWidgets' ],
} )

const factory = Tool.define( 'ListMenuTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'list-menu-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'list-menu-panel' )
        this.defineProp( 'subWidgets' )
        this.subWidgets = []
    },
    function ( this: any, smk: any ) {
        smk.on( this.id, {
            'swipe-up': function ( _ev: any ) {
                smk.$sidepanel.setExpand( 2 )
            },
            'swipe-down': function ( _ev: any ) {
                smk.$sidepanel.incrExpand( -1 )
            },
        } )
    },
    {
        addTool( this: any, tool: any, smk: any, setParentId: any ) {
            if ( !tool.parentId ) {
                setParentId( tool, this.id )
                this.subWidgets.push( tool.makeWidgetComponent() )
            }
            smk.getSidepanel().addTool( tool, smk )
            tool.showTitle = true
            return true
        },
    }
)

Tool.register( 'list-menu', factory, widgetDefaults( panelDefaults( {
    icon: 'menu', position: 'toolbar',
} ) ) )
export default factory
