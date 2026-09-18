/**
 * tool-select — Select composite tool.
 * Converted from tool/select/tool-select.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import { panelFeatureDefaults } from '../../mixin/tool-panel-feature/tool-panel-feature'
import SelectListFactory from './tool-select-list'
import SelectFeatureFactory from './tool-select-feature'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.defineComposite( [
    SelectListFactory,
    SelectFeatureFactory,
] )

Tool.register( 'select', factory, widgetDefaults( panelDefaults( panelFeatureDefaults( {
    order: 6, position: 'list-menu', icon: 'select_all', title: 'Selected Features',
    command: { clear: true, remove: true },
} ) ) ) )
export default factory
