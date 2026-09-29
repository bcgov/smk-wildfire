/**
 * tool-bookmarks — Bookmarks tool.
 * Converted from tool/bookmarks/tool-bookmarks.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import panelBookmarksRender from './panel-bookmarks.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'bookmarks-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'bookmarks-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelBookmarksRender,
    props: [ 'bookmarks' ],
} )

const factory = Tool.define( 'BookmarksTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'bookmarks-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'bookmarks-panel' )
        this.defineProp( 'bookmarks' )
        this.bookmarks = []
    },
    function ( this: any, smk: any ) {
        const self = this

        smk.on( this.id, {
            'activate': function () {
                if ( !self.enabled ) return
            },

            'show-bookmark': function ( ev: any ) {
                smk.$viewer.setView( ev )
            },
        } )
    }
)

Tool.register( 'bookmarks', factory, widgetDefaults( panelDefaults( {
    order: 3, position: [ 'shortcut-menu', 'list-menu' ], icon: 'bookmark', title: 'Bookmarks',
} ) ) )
export default factory
