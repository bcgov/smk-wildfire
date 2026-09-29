/**
 * tool-measure — Measure tool.
 * Converted from tool/measure/tool-measure.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import panelMeasureRender from './panel-measure.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'
import { dimensionalNumber } from '../../vue-config'


const smkRef = SMK

component( 'measure-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'measure-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelMeasureRender,
    props: [ 'results', 'viewer', 'content', 'unit' ],
    data() {
        return {
            unitProp: this.unit,
        }
    },
    computed: {
        dimensionalNumber() {
            return dimensionalNumber
        },
    },
} )

const factory = Tool.define( 'MeasureTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'measure-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'measure-panel' )
        this.defineProp( 'results' )
        this.defineProp( 'viewer' )
        this.defineProp( 'content' )
        this.defineProp( 'unit' )
        this.results = []
        this.viewer  = {}
        this.unit    = 'metric'
        this.$propFilter.dimensionalNumber = false
    },
    function ( this: any, smk: any ) {
        const self = this
        this.content = {
            createContent( el: HTMLElement ) {
                smkRef.HANDLER.get( self.id, 'activated' )( smk, self, el )
            },
        }
    }
)

Tool.register( 'measure', factory, widgetDefaults( panelDefaults( {
    order: 6, position: [ 'shortcut-menu', 'list-menu' ], icon: 'straighten', title: 'Measurement',
    unit: 'metric',
} ) ) )
export default factory
