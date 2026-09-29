/**
 * tool-search — Search composite tool.
 * Converted from tool/search/tool-search.js.
 */

import Tool from '../../tool'
import markerIconYellow from './config/marker-icon-yellow.png'
import starIconYellow   from './config/star-icon-yellow.png'
import searchShadow     from './config/marker-shadow.png'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { internalLayersDefaults } from '../../mixin/tool-internal-layers/tool-internal-layers'
import SearchListFactory from './tool-search-list'
import SearchLocationFactory from './tool-search-location'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.defineComposite( [
    SearchListFactory,
    SearchLocationFactory,
] )

Tool.register( 'search', factory, widgetDefaults( panelDefaults( internalLayersDefaults( {
    order: 2, position: 'toolbar', icon: 'search', title: 'Search for Location',
    showPanel: true, showLocation: true,
    command: { identify: true, measure: true, directions: true },
    internalLayers: [
        { id: 'result-selected',  title: 'Selected Search Result',    style: { markerUrl: markerIconYellow, markerSize: [ 25, 41 ], markerOffset: [ 12, 41 ], shadowUrl: searchShadow, shadowSize: [ 41, 41 ] }, legend: { point: true } },
        { id: 'result-highlight', title: 'Highlighted Search Result', style: { markerUrl: starIconYellow,   markerSize: [ 40, 36 ], markerOffset: [ 20, 18 ], shadowUrl: searchShadow, shadowSize: [ 31, 31 ] }, legend: { point: true } },
        { id: 'results',          title: 'Search Results',            style: { markerUrl: starIconYellow,   markerSize: [ 20, 19 ], markerOffset: [ 10,  9 ], shadowUrl: searchShadow, shadowSize: [ 21, 21 ] }, legend: { point: true } },
    ],
} ) ) ) )
export default factory
