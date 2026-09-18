/**
 * tool-minimap-maplibre — MapLibre initializer for MinimapTool.
 *
 * Renders a small overview map in the status area, kept in sync with the
 * main map.  The minimap shows the map's current basemap, and a rectangle
 * indicating the main map's current viewport.  Clicking inside the
 * minimap recentres the main map.
 *
 * Hidden on mobile devices (matches the leaflet implementation).
 */

import { basemapSpecForConfig } from '../../viewer-maplibre'
import { followBasemap, overviewZoom } from '../../../tool/minimap/tool-minimap'

declare const SMK:        any
declare const maplibregl: any

const SIZE_PX        = 160      // square minimap
const FRAME_SOURCE   = 'smk-mm-frame'
const FRAME_FILL_ID  = 'smk-mm-frame-fill'
const FRAME_LINE_ID  = 'smk-mm-frame-line'

const FRAME_COLOR    = '#ff5252'

SMK.TYPE.MinimapTool.addInitializer( function ( this: any, smk: any ) {
    if ( smk.$viewer.type !== 'maplibre' ) return
    if ( smk.$device === 'mobile' )         return

    const self = this

    // Container in the status area.
    const wrap = document.createElement( 'div' )
    wrap.className = 'smk-minimap smk-minimap-maplibre'
    Object.assign( wrap.style, {
        position:      'relative',
        width:         SIZE_PX + 'px',
        height:        SIZE_PX + 'px',
        border:        '1px solid rgba(0,0,0,0.4)',
        borderRadius:  '3px',
        overflow:      'hidden',
        background:    '#eee',
        margin:        '4px',
    } )
    smk.addToStatus( wrap )

    // ------------------------------------------------------------------
    // Build the minimap
    // ------------------------------------------------------------------
    const main   = smk.$viewer.map
    const center = main.getCenter()

    // Start empty and add the basemap once it resolves. Building the style from
    // the spec inline could never work: every basemap type the product actually
    // uses - composite, esri-vector-tile, esri-tiled-map - returns a promise,
    // and calling .forEach on it threw before the map was ever constructed.
    let mini: any
    try {
        mini = new maplibregl.Map( {
            container:          wrap,
            style:              {
                version: 8,
                sources: {},
                layers:  [],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            },
            attributionControl: false,
            interactive:        false,
            dragRotate:         false,
            pitchWithRotate:    false,
            touchPitch:         false,
            projection:         'mercator',
            center:             [ center.lng, center.lat ],
            zoom:               overviewZoom( main.getZoom(), main.getCanvas().clientWidth, SIZE_PX ),
            minZoom:            0,
            maxZoom:            22,
        } )
    } catch ( e ) {
        console.warn( 'maplibre minimap: failed to construct overview map', e )
        return
    }

    // The overview is otherwise unreachable, so nothing could test it.
    ;( wrap as any )._smkMinimap = mini

    // Allow click-to-recenter even though the mini map is non-interactive.
    wrap.addEventListener( 'click', function ( ev: MouseEvent ) {
        const rect = wrap.getBoundingClientRect()
        const px   = ev.clientX - rect.left
        const py   = ev.clientY - rect.top
        try {
            const ll = mini.unproject( [ px, py ] )
            main.easeTo( { center: [ ll.lng, ll.lat ], duration: 300 } )
        } catch { /* ignore */ }
    } )

    function emptyFC() { return { type: 'FeatureCollection' as const, features: [] as any[] } }

    function ensureFrameLayers() {
        if ( mini.getSource( FRAME_SOURCE ) ) return
        mini.addSource( FRAME_SOURCE, { type: 'geojson', data: emptyFC() } )
        mini.addLayer( {
            id:     FRAME_FILL_ID,
            type:   'fill',
            source: FRAME_SOURCE,
            paint:  { 'fill-color': FRAME_COLOR, 'fill-opacity': 0.1 },
        } )
        mini.addLayer( {
            id:     FRAME_LINE_ID,
            type:   'line',
            source: FRAME_SOURCE,
            paint:  { 'line-color': FRAME_COLOR, 'line-width': 2 },
        } )
    }

    function updateFrame() {
        try {
            const b   = main.getBounds()
            const w   = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth()
            const ring = [ [ w, s ], [ e, s ], [ e, n ], [ w, n ], [ w, s ] ]
            const fc: any = {
                type: 'FeatureCollection',
                features: [ { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ ring ] } } ],
            }
            const src = mini.getSource( FRAME_SOURCE )
            if ( src ) src.setData( fc )

            // Recentre the mini map and adjust zoom so the frame stays visible.
            const c = main.getCenter()
            mini.jumpTo( {
                center: [ c.lng, c.lat ],
                zoom:   overviewZoom( main.getZoom(), main.getCanvas().clientWidth, mini.getCanvas().clientWidth ),
            } )
        } catch { /* ignore */ }
    }

    // A spec resolves late, so a quick second change could land first.
    let basemapTracker = 0

    /** Resolve a basemap id and put it under the frame. */
    function showBasemap( id: string ) {
        const cfg = smk.$viewer.getBasemapConfig( id )
        if ( !cfg ) return

        const token = ++basemapTracker
        const ready = typeof mini.isStyleLoaded === 'function' && mini.isStyleLoaded()
            ? Promise.resolve()
            : new Promise<void>( done => mini.once( 'load', () => done() ) )

        ready
            // A composite resolves its children by id, so it needs the lookup.
            .then( () => basemapSpecForConfig( cfg, ( cid: string ) => smk.$viewer.getBasemapConfig( cid ) ) )
            .then( ( specs: any ) => {
                if ( token === basemapTracker ) applyBasemap( specs || [] )
            } )
            .catch( ( e: any ) => console.warn( 'minimap: base map not applied:', e ) )
    }

    /** Swap the overview's basemap layers. Mirrors ViewerMapLibre.setBasemap. */
    function applyBasemap( specs: any[] ) {
        try {
            const style = mini.getStyle()
            ;( style.layers || [] ).forEach( ( ly: any ) => {
                if ( ly.id.indexOf( 'smk-bm-' ) === 0 && mini.getLayer( ly.id ) ) mini.removeLayer( ly.id )
            } )
            Object.keys( style.sources || {} ).forEach( ( sid: string ) => {
                if ( sid.indexOf( 'smk-bm-' ) === 0 && mini.getSource( sid ) ) mini.removeSource( sid )
            } )
        } catch { /* ignore */ }

        const beforeId = mini.getLayer( FRAME_FILL_ID ) ? FRAME_FILL_ID : undefined

        specs.forEach( ( spec: any ) => {
            // A vector basemap carries its own glyphs and sprite, and reports
            // sources/layers rather than sourceId/layer. Reading only the
            // single-layer shape left every vector basemap invisible here.
            if ( spec.glyphs && typeof mini.setGlyphs === 'function' )
                try { mini.setGlyphs( spec.glyphs ) } catch { /* ignore */ }
            if ( spec.sprite && typeof mini.setSprite === 'function' )
                try { mini.setSprite( spec.sprite ) } catch { /* ignore */ }

            const sources = spec.sources
                ? Object.entries( spec.sources )
                : ( spec.sourceId && spec.source ? [ [ spec.sourceId, spec.source ] ] : [] )
            sources.forEach( ( [ sid, src ]: any ) => {
                if ( !mini.getSource( sid ) ) mini.addSource( sid, src )
            } )

            const layers = spec.layers || ( spec.layer ? [ spec.layer ] : [] )
            layers.forEach( ( ly: any ) => {
                if ( !mini.getLayer( ly.id ) ) mini.addLayer( ly, beforeId )
            } )
        } )
    }

    mini.on( 'load', function () {
        ensureFrameLayers()
        updateFrame()
    } )

    // Demote tile decode errors (matches main viewer's handling)
    mini.on( 'error', function ( e: any ) {
        const err = e?.error
        const msg = err?.message || String( err || '' )
        if (
            /could not be decoded/i.test( msg ) ||
            /Failed to fetch|NetworkError|AbortError/i.test( msg ) ||
            err?.name === 'InvalidStateError'
        ) return
        console.warn( 'maplibre minimap:', err || e )
    } )

    main.on( 'move', updateFrame )
    main.on( 'zoom', updateFrame )

    // After the 'load' handler above, so the frame is there to go under.
    followBasemap( smk, self.baseMap, showBasemap )
} )
