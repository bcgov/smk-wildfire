/**
 * tool-shortcut-menu — Shortcut menu tool (status bar).
 * Converted from tool/shortcut-menu/tool-shortcut-menu.js.
 */

import Tool from '../../tool'
import shortcutMenuHtml from './shortcut-menu.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any

const smkRef = SMK

const factory = Tool.define( 'ShortcutMenuTool',
    function ( this: any ) {
        this.model = { widgets: [] as any[] }
    },
    function ( this: any, smk: any ) {
        this.vm = new Vue( {
            el:   smk.addToStatus( shortcutMenuHtml ),
            data: this.model,
            methods: {
                trigger( toolId: string, event: string, arg: any, comp: any ) {
                    smk.emit( toolId, event, arg, comp )
                },
            },
        } )
    },
    {
        addTool( this: any, tool: any, smk: any ) {
            smk.getSidepanel().addTool( tool, smk )
            // A composite child carries its parent's position and has no
            // widget, so the call threw and killed the child's initializer.
            if ( tool.makeWidgetComponent )
                this.model.widgets.push( tool.makeWidgetComponent() )
            return true
        },
    }
)

Tool.register( 'shortcut-menu', factory, { order: 10 } )
export default factory
