/**
 * tool-actionbar — Actionbar container tool.
 * Converted from tool/actionbar/tool-actionbar.js.
 */

import Tool from '../../tool'
import actionbarHtml from './actionbar.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any

const smkRef = SMK

const factory = Tool.define( 'ActionBarTool',
    function ( this: any ) {
        this.model = {
            widgets: [] as any[],
        }
    },
    function ( this: any, smk: any ) {
        const self = this

        this.vm = new Vue( {
            el:   smk.addToOverlay( actionbarHtml ),
            data: this.model,
            methods: {
                trigger( toolId: string, event: string, arg: any, comp: any ) {
                    smk.emit( toolId, event, arg, comp )
                },
            },
        } )

        // The status column is right-aligned and starts at the frame top, so
        // without this the scale and the legend draw under these buttons.
        const el = self.vm.$el as HTMLElement
        const publishHeight = function () {
            const h = self.model.widgets.length ? el.offsetHeight : 0
            smk.$container.style.setProperty( '--status-top', h + 'px' )
        }

        self.vm.$watch( 'widgets', () => self.vm.$nextTick( publishHeight ), { deep: true } )
        self.vm.$nextTick( publishHeight )

        if ( typeof ResizeObserver === 'function' )
            new ResizeObserver( publishHeight ).observe( el )
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

Tool.register( 'actionbar', factory )
export default factory
