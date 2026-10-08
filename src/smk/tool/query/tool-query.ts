/**
 * tool-query — Query composite tool.
 * Converted from tool/query/tool-query.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { panelFeatureDefaults } from '../../mixin/tool-panel-feature/tool-panel-feature'
import QueryParametersFactory from './tool-query-parameters'
import QueryResultsFactory from './tool-query-results'
import QueryFeatureFactory from './tool-query-feature'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.defineComposite( [
    QueryParametersFactory,
    QueryResultsFactory,
    QueryFeatureFactory,
] )

// instance: true keeps this out of the tool list until a layer query names
// an instance for it.
Tool.register( 'query', factory, widgetDefaults( panelDefaults( panelFeatureDefaults( {
    instance: true, order: 5, within: false,
    command: { within: true, select: true },
} ) ) ) )
export default factory
