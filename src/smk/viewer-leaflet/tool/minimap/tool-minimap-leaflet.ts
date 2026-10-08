/**
 * tool-minimap-leaflet — Leaflet initializer for MinimapTool.
 * Converted from viewer-leaflet/tool/minimap/tool-minimap-leaflet.js.
 */

import { followBasemap, CONTEXT_LEVELS } from '../../../tool/minimap/tool-minimap'
import './lib/Control.MiniMap-3.6.1.min.css'
import './lib/Control.MiniMap-3.6.1.min.js'
import { SMK } from '../../../smk-ref'

declare const L: any

const smkRef = SMK

const MINI_PX = 150     // L.Control.MiniMap's own default box

smkRef.TYPE.MinimapTool.addInitializer( function ( this: any, smk: any ) {
    if ( smk.$viewer.type !== 'leaflet' ) return

    if ( smk.$device === 'mobile' ) return

    // L.Control.MiniMap puts itself on the map, so the status area only holds
    // the room. The neutral class is the contract: a theme styles the minimap
    // without knowing which viewer is running.
    const wrap = document.createElement( 'div' )
    // smk-spacer stays: SMK 1.0 rendered it, a theme may select on it, and a
    // class a Host can see is a contract - D9. The neutral smk-minimap is added
    // beside it, not in place of it.
    wrap.className    = 'smk-minimap smk-minimap-leaflet smk-spacer'
    wrap.style.height = '170px'
    smk.addToStatus( wrap )

    // L.Control.MiniMap defaults to -5 and takes no account of the two box
    // widths. Work the offset out from them, so the overview really is wider
    // than the map instead of narrower.
    const mainPx = ( smk.$viewer.map.getSize && smk.$viewer.map.getSize().x ) || 0
    const offset = mainPx > 0
        ? Math.round( Math.log2( MINI_PX / mainPx ) ) - CONTEXT_LEVELS
        : -5

    const option = Object.assign( { toggleDisplay: true, zoomLevelOffset: offset }, this.option )

    let control: any
    followBasemap( smk, this.baseMap, function ( id: string ) {
        // A layer instance can sit on one map only, so the overview gets its own.
        const ly = smk.$viewer.createBasemapLayer( id )

        if ( !control ) {
            control = new L.Control.MiniMap( ly[ 0 ], option )
            control.addTo( smk.$viewer.map )
            return
        }

        // A vector basemap that is still loading can throw on removal.
        try { control.changeLayer( ly[ 0 ] ) }
        catch ( e ) { console.warn( 'leaflet minimap: base map would not change:', e ) }
    } )
} )
