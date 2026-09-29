/**
 * tool-scale — Scale indicator tool.
 * Converted from tool/scale/tool-scale.js.
 */

import Tool from '../../tool'
import scaleRender from './scale.html?vue'
import { SMK } from '../../smk-ref'
import { mountRoot, reactive } from '../../vue'


const smkRef = SMK

const factory = Tool.define( 'ScaleTool',
    function ( this: any ) {
        this.defineProp( 'showFactor' )
        this.defineProp( 'showBar' )
        this.defineProp( 'showZoom' )
    },
    function ( this: any, smk: any ) {
        const self = this

        this.model = reactive( {
            scaleDenom:        null,
            rulerSectionWidth: null,
            rulerLength:       null,
            rulerUnit:         null,
            zoomLevel:         null,
        } )

        this.vm = mountRoot( smk.addToStatus( '<div>' ), {
            render: scaleRender,
            data: this.model,
        } )

        smk.$viewer.changedView( () => { self.refresh() } )

        this.refresh = function () {
            this.model.scaleDenom       = null
            this.model.rulerSectionWidth = null
            this.model.rulerLength      = null

            const view = smk.$viewer.getView()
            if ( !view ) return

            if ( this.showFactor !== false && view.scale )
                this.model.scaleDenom = view.scale

            if ( this.showZoom !== false )
                this.model.zoomLevel = view.zoom

            if ( this.showBar !== false && view.metersPerPixel ) {
                const rulerMM = rounded( 200 * view.metersPerPixel * 1000 )
                this.model.rulerSectionWidth = rulerMM / 1000 / view.metersPerPixel / 4

                const dist = appropriateUnit( rulerMM )
                this.model.rulerLength = dist.value
                this.model.rulerUnit   = dist.unit
            }
        }

        const firstDigit = [ null, 1, 2, 3, 5, 5, 5, 5, 10, 10 ]

        function rounded( s: number ) {
            // The index is the first DIGIT. The conversion from 1.0 read
            // `(s+'')[0]` as parseInt(s), so every lookup ran off the end of
            // the table, the width was NaN and the ruler never drew.
            const f = firstDigit[ Number( ( s + '' )[ 0 ] ) ] as number
            return f * Math.pow( 10, ( Math.floor( s ) + '' ).length - 1 )
        }

        function appropriateUnit( mm: number ) {
            if ( mm <= 500 * 1000 ) return { value: mm / 1000, unit: 'm' }
            return { value: mm / 1000 / 1000, unit: 'km' }
        }

        self.refresh()
    }
)

// The status column is column-reverse, so a higher order sits higher:
// legend 4, minimap 3, coordinate 2, scale 1.
Tool.register( 'scale', factory, { order: 1, showFactor: true, showBar: true, showZoom: false } )
export default factory
