/**
 * tool-identify — Identify composite tool.
 * Converted from tool/identify/tool-identify.js.
 */

import Tool from '../../tool'
import { highlightLayers } from '../../mixin/tool-feature-list/highlight-layers'
import crosshairPng from './config/crosshair.png'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { panelFeatureDefaults } from '../../mixin/tool-panel-feature/tool-panel-feature'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import IdentifyListFactory from './tool-identify-list'
import IdentifyFeatureFactory from './tool-identify-feature'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.defineComposite( [
    IdentifyListFactory,
    IdentifyFeatureFactory,
] )

Tool.register( 'identify', factory, widgetDefaults( panelDefaults( panelFeatureDefaults( internalLayersDefaults( {
    order: 5, position: 'list-menu', icon: 'info_outline', title: 'Identify Features',
    command: { select: true, radius: false, radiusUnit: false, nearBy: true },
    radius: 5, radiusUnit: 'px',
    internalLayers: [
        ...highlightLayers(),
        { id: 'search-area',      style: { stroke: false, fill: true, fillColor: 'white', fillOpacity: 0.5 } },
        { id: 'search-border-1',  style: { strokeWidth: 6, strokeColor: 'black', strokeOpacity: 1, strokeCap: 'butt' } },
        { id: 'search-border-2',  style: { strokeWidth: 6, strokeColor: 'white', strokeOpacity: 1, strokeCap: 'butt' } },
        { id: 'location',         title: 'Identify Location', style: { markerUrl: crosshairPng, markerSize: [ 40, 40 ], markerOffset: [ 20, 20 ] }, legend: { point: true } },
        { id: 'edit-search-area', style: { strokeWidth: 3, strokeColor: 'red', strokeOpacity: 1 } },
    ],
} ) ) ) ) )
export default factory
