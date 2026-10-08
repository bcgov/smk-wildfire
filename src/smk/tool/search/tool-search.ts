/**
 * tool-search — Search composite tool.
 * Converted from tool/search/tool-search.js.
 */

import Tool from '../../tool'
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
} ) ) ) )
export default factory
