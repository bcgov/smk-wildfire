/**
 * tool-legend — Legend (status bar) tool.
 * Converted from tool/legend/tool-legend.js.
 */

import Tool from '../../tool'
import legendRender from './legend.html?vue'
import legendDisplayRender from './legend-display.html?vue'
import { SMK } from '../../smk-ref'
import { component, mountRoot, nextTick, reactive } from '../../vue'

const smkRef = SMK

component( 'legend-display', {
    render: legendDisplayRender,
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
    nextTick( function () {
        smk.$viewer.setDisplayContextLegendsVisible( false )
    } )
}

const factory = Tool.define( 'LegendTool',
    null,
    function ( this: any, smk: any ) {
        const self = this

        // The pane floats over the map with nothing to say what it is. A host
        // that wants no header sets title to null in its config.
        const model = reactive( {
            contexts: [] as any[],
            title:    self.title == null ? 'Legend' : self.title,
        } )

        this.vm = mountRoot( smk.addToStatus( '<div>' ), {
            render: legendRender,
            data: model,
        } )

        smk.$viewer.changedDisplayContext( function () {
            model.contexts = smk.$viewer.getDisplayContexts()
            showOwnLegends( smk )
        } )
    }
)

// The status column is column-reverse, so a higher order sits higher:
// legend 4, minimap 3, coordinate 2, scale 1.
Tool.register( 'legend', factory, { order: 4 } )
export default factory
