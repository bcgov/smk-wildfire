/**
 * tool-legend — Legend (status bar) tool.
 * Converted from tool/legend/tool-legend.js.
 */

import Tool from '../../tool'
import legendHtml from './legend.html?raw'
import legendDisplayHtml from './legend-display.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any

const smkRef = SMK

Vue.component( 'legend-display', {
    template: legendDisplayHtml,
    props: {
        display: { type: Object },
        inGroup: { type: Boolean, default: false },
    },
} )

/**
 * Ask for this pane's own legend images.
 *
 * `item.legends` is lazy, and only this call fetches it. SMK 1.0 asked at
 * boot; without it the pane stays empty until the Layers panel asks.
 * Turning it off again leaves the Layers tree as it was.
 */
export function showOwnLegends( smk: any ): void {
    smk.$viewer.setDisplayContextLegendsVisible( true )
    Vue.nextTick( function () {
        smk.$viewer.setDisplayContextLegendsVisible( false )
    } )
}

const factory = Tool.define( 'LegendTool',
    null,
    function ( this: any, smk: any ) {
        const self = this

        // The pane floats over the map with nothing to say what it is. A host
        // that wants no header sets title to null in its config.
        const model = {
            contexts: [],
            title:    self.title == null ? 'Legend' : self.title,
        }

        this.vm = new Vue( {
            el:   smk.addToStatus( legendHtml ),
            data: model,
        } )

        smk.$viewer.changedDisplayContext( function () {
            model.contexts = smk.$viewer.getDisplayContexts()
            showOwnLegends( smk )
        } )
    }
)

Tool.register( 'legend', factory )
export default factory
