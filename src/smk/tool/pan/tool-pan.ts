/**
 * tool-pan — Pan tool.
 * Converted from tool/pan/tool-pan.js.
 */

import Tool from '../../tool'
import widgetPanRender from './widget-pan.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'pan-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
    render: widgetPanRender,
    props: [ 'control', 'navMode', 'compassStyle' ],
    computed: {
        navModePanClasses( this: any ) {
            const c = Object.assign( {}, this.classes )
            c[ 'smk-tool-active' ] = this.navMode === 'pan'
            return c
        },
        navModeRotateClasses( this: any ) {
            const c = Object.assign( {}, this.classes )
            c[ 'smk-tool-active' ] = this.navMode === 'rotate'
            return c
        },
    },
} )

const factory = Tool.define( 'PanTool', {
    construct( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'pan-widget' )
        this.defineProp( 'control' )
        this.defineProp( 'navMode' )
        this.defineProp( 'compassStyle' )
        this.navMode = 'pan'
    },
    initialize( _smk: any ) {},
} )

Tool.register( 'pan', factory, {
    position: 'actionbar', order: 2, control: true,
    icon:  { compass: 'navigation', navModePan: 'open_with', navModeRotate: '3d_rotation' },
    title: { compass: 'Reset Orientation', navModePan: 'Panning Mode', navModeRotate: 'Rotate Mode' },
} )
export default factory
