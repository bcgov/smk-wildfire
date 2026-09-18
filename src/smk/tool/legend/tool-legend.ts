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
        } )
    }
)

Tool.register( 'legend', factory )
export default factory
