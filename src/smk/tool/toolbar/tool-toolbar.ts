/**
 * tool-toolbar — Toolbar container tool.
 * Converted from tool/toolbar/tool-toolbar.js.
 */

import Tool from '../../tool'
import toolbarRender from './toolbar.html?vue'
import { SMK } from '../../smk-ref'
import { mountRoot, reactive } from '../../vue'


const smkRef = SMK

const factory = Tool.define( 'ToolBarTool',
    function ( this: any ) {
        this.model = reactive( {
            widgets: [] as any[],
        } )
    },
    function ( this: any, smk: any ) {
        const container = smk.addToOverlay( '<div>' )

        this.vm = mountRoot( container, {
            render: toolbarRender,
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
            if ( tool.makeWidgetComponent ) {
                this.model.widgets.push( tool.makeWidgetComponent() )
            }

            smk.getSidepanel().addTool( tool, smk )

            return true
        },
    }
)

Tool.register( 'toolbar', factory )
export default factory
