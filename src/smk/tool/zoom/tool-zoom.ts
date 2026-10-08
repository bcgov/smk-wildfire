/**
 * tool-zoom — Zoom tool.
 * Converted from tool/zoom/tool-zoom.js.
 */

import Tool from '../../tool'
import widgetZoomHtml from './widget-zoom.html?raw'
import { SMK } from '../../smk-ref'

declare const Vue: any

const smkRef = SMK

Vue.component( 'zoom-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
    template: widgetZoomHtml,
    props: [ 'control' ],
} )

const factory = Tool.define( 'ZoomTool', {
    construct( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'zoom-widget' )
        this.defineProp( 'control' )
    },
    initialize( _smk: any ) {},
} )

Tool.register( 'zoom', factory, {
    position: 'actionbar', order: 1,
    mouseWheel: true, doubleClick: true, box: true, control: true,
    icon:  { zoomIn: 'add',     zoomOut: 'remove'   },
    title: { zoomIn: 'Zoom In', zoomOut: 'Zoom Out' },
} )
export default factory
