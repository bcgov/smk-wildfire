/**
 * tool-minimap — Minimap (placeholder) tool.
 * Converted from tool/minimap/tool-minimap.js.
 */

import Tool from '../../tool'
import { SMK } from '../../smk-ref'

const smkRef = SMK

/**
 * Calls `show` with the Basemap the map shows now, and again on each change.
 * `pinned` is the tool's own `baseMap` from the Config; it stops the follow.
 */
export function followBasemap( smk: any, pinned: string | undefined, show: ( id: string ) => void ): void {
    let current: string | undefined

    // A Viewer can announce the same Basemap twice, and a rebuild is a flash.
    function apply( id: string ) {
        if ( !id || id === current ) return
        current = id
        show( id )
    }

    if ( pinned ) {
        apply( pinned )
        return
    }

    apply( smk.$viewer.currentBasemapId || smk.viewer.baseMap )
    smk.$viewer.changedBaseMap( function ( ev: any ) { apply( ev.baseMap ) } )
}

/** How much more ground than the map the overview shows, in zoom levels. */
export const CONTEXT_LEVELS = 1

/**
 * A fixed zoom offset cannot work: it ignores the two box widths. The overview
 * is ~160px and the map can be 1400px, so three levels out still showed LESS
 * ground than the map, and the frame spilled past both edges.
 */
export function overviewZoom( mainZoom: number, mainPx: number, miniPx: number ): number {
    if ( !( mainPx > 0 ) || !( miniPx > 0 ) ) return Math.max( 0, mainZoom - 4 )
    return Math.max( 0, mainZoom + Math.log2( miniPx / mainPx ) - CONTEXT_LEVELS )
}

const factory = Tool.define( 'MinimapTool' )

// The status column is column-reverse, so a higher order sits higher:
// legend 4, minimap 3, coordinate 2, scale 1.
Tool.register( 'minimap', factory, { order: 3, baseMap: null, option: {} } )
export default factory
