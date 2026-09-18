/**
 * tool-minimap — Minimap (placeholder) tool.
 * Converted from tool/minimap/tool-minimap.js.
 */

import Tool from '../../tool'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.define( 'MinimapTool' )

Tool.register( 'minimap', factory, { order: 1 } )
export default factory
