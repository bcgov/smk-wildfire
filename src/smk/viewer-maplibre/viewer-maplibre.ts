/**
 * viewer-maplibre — MapLibre GL JS-based viewer implementation.
 *
 * Provides a viewer that mirrors the public surface of other SMK viewers 
 * so the SMK tools and layers can drive the map through a consistent interface.
 * Includes a 2D / 3D mode toggle (pitch + terrain).
 *
 * Expects window.maplibregl (loaded via <script src="…/maplibre-gl-x.y.z.min.js">).
 * But we may want to change this to a project dependency and import it directly 
 * if that becomes more convenient.
 */

import { Viewer } from '../viewer'
import { readEsriTileInfo, tileSourceFromInfo } from './esri-tile-info'
import { esriBasemapTileUrl } from './esri-basemap-tiles'
import { SMK } from '../smk-ref'

declare const maplibregl: any
declare const turf:       any

// ---------------------------------------------------------------------------
// ViewerMapLibre constructor
// ---------------------------------------------------------------------------

export class ViewerMapLibre extends Viewer {
    constructor() { super() }
}

// Register on SMK.TYPE.Viewer.maplibre
const smkRef = SMK
if ( smkRef ) {
    if ( !smkRef.TYPE )         smkRef.TYPE = {}
    if ( !smkRef.TYPE.Viewer )  smkRef.TYPE.Viewer = {}
    smkRef.TYPE.Viewer.maplibre = ViewerMapLibre
}

// Default empty style — basemap layers are added via setBasemap().
const EMPTY_STYLE: any = {
    version: 8,
    sources: {},
    layers:  [],
    glyphs:  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
}

// Public DEM tileset used when 3D mode is enabled (no API key required).
// Overridable via the viewer config:
//   "viewer": { "type": "maplibre", "dem": { "url": "...", "encoding": "mapbox", "tileSize": 512, "maxzoom": 14, "exaggeration": 1.5 } }
// Note that MapLibre GL JS supports only a single DEM source, so this is a
// global default rather than a per-basemap option.
const DEFAULT_DEM_URL         = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'
const DEFAULT_DEM_ENCODING    = 'terrarium'
const DEFAULT_DEM_TILE_SIZE   = 256
const DEFAULT_DEM_MAX_ZOOM    = 15
const DEFAULT_DEM_EXAGGERATION = 1.2

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

ViewerMapLibre.prototype.initialize = function ( smk: any ) {
    const self = this

    Viewer.prototype.initialize.apply( this, arguments )

    this.mark = function ( step: string ) {
        try { performance.mark( 'smk:' + smk.$option.id + ':' + step ) } catch { /* no timeline */ }
    }

    this.deadViewerLayer  = {}
    this.basemapSourceIds = []      // tracks current basemap source ids
    this.basemapLayerIds  = []      // tracks current basemap layer ids
    this.basemapTracker     = 0       // increments each setBasemap; async builders ignore stale results
    this.viewerLayers     = {}      // id -> spec
    this.acetate          = {}
    this.mode             = '2d'    // '2d' | '3d'
    this.demSourceId      = null
    this.demConfig        = Object.assign( {
        url:          DEFAULT_DEM_URL,
        encoding:     DEFAULT_DEM_ENCODING,
        tileSize:     DEFAULT_DEM_TILE_SIZE,
        maxzoom:      DEFAULT_DEM_MAX_ZOOM,
        exaggeration: DEFAULT_DEM_EXAGGERATION,
    }, smk.viewer && smk.viewer.dem )

    const el = smk.addToContainer( '<div class="smk-viewer">' )

    // MapLibre needs a sized container.  smk-viewer sets width/height via CSS.
    self.map = new maplibregl.Map( {
        container:           el,
        style:               EMPTY_STYLE,
        // Leaflet showed attribution by default. Compact keeps the credit in
        // an 'i' button, which the crowded bottom-right corner can hold.
        attributionControl:  { compact: true },
        interactive:         true,
        dragRotate:          false,
        pitchWithRotate:     false,
        touchPitch:          false,
        // v5 supports a globe projection; keep mercator so behaviour matches
        // the leaflet viewer until/unless 3D mode is engaged.
        // may want to consider adding a toggle?
        projection:          'mercator',
        minZoom:             smk.viewer.minZoom || 0,
        maxZoom:             smk.viewer.maxZoom || 22,
        center:              [ 0, 0 ],
        zoom:                2,
    } )

    // Begin with everything off; tool initializers re-enable based on config.
    self.map.scrollZoom.disable()
    self.map.boxZoom.disable()
    self.map.doubleClickZoom.disable()
    self.map.dragPan.disable()
    self.map.keyboard.disable()

    return new Promise<void>( ( resolve ) => {
        self.map.once( 'load', function () {

            // The credit must stay readable, so it is not collapsed. It wraps
            // to two or three lines on a narrow frame, so tell the status
            // column how much room to leave instead.
            publishAttributionHeight( smk, el )

            // Demote tile-decode/network errors so a single bad raster tile
            // (e.g. an Esri MapServer / WMS returning an HTML error page that
            // can't be decoded as an image) doesn't surface as an uncaught
            // "InvalidStateError: The source image could not be decoded".
            self.map.on( 'error', function ( e: any ) {
                const err  = e?.error
                const msg  = err?.message || String( err || '' )
                const url  = e?.sourceId || e?.source?.id || ''
                if (
                    /could not be decoded/i.test( msg ) ||
                    /Failed to fetch|NetworkError|AbortError/i.test( msg ) ||
                    err?.name === 'InvalidStateError'
                ) {
                    console.debug( 'maplibre tile error suppressed', url, msg )
                    return
                }
                console.warn( 'maplibre:', err || e )
            } )

            self.setView( smk.viewer.location )

            if ( smk.viewer.baseMap ) {
                self.setBasemap( smk.viewer.baseMap )
            }

            self.changedViewDebounced = SMK.UTIL.makeDelayedCall( function () {
                self.changedView()
            }, { delay: 500 } )

            self.map.on( 'movestart', self.changedViewDebounced )
            self.map.on( 'moveend',   self.changedViewDebounced )
            self.map.on( 'zoomstart', self.changedViewDebounced )
            self.map.on( 'zoomend',   self.changedViewDebounced )
            self.changedViewDebounced()

            self.finishedLoading( function () {
                Object.keys( self.deadViewerLayer ).forEach( function ( id: string ) {
                    removeViewerLayer( self, id )
                    delete self.deadViewerLayer[ id ]
                    delete self.visibleLayer[ id ]
                } )
            } )

            self.map.on( 'click', function ( ev: any ) {
                if ( self.clickTimeout ) clearTimeout( self.clickTimeout )
                self.clickTimeout = setTimeout( function () {
                    self.pickedLocation( {
                        map:    { latitude: ev.lngLat.lat, longitude: ev.lngLat.lng },
                        screen: { x: ev.point.x, y: ev.point.y },
                    } )
                }, 300 )
            } )

            self.map.on( 'dblclick', function () {
                if ( self.clickTimeout ) clearTimeout( self.clickTimeout )
            } )

            self.map.on( 'mousemove', function ( ev: any ) {
                self.changedLocation( {
                    map:    { latitude: ev.lngLat.lat, longitude: ev.lngLat.lng },
                    screen: { x: ev.point.x, y: ev.point.y },
                } )
            } )

            self.getVar = function () { return smk.getVar.apply( smk, arguments ) }

            // The 2D / 3D mode toggle is provided as an SMK actionbar tool;
            // see src/smk/viewer-maplibre/tool/mode/tool-mode-maplibre.ts.

            resolve()
        } )
    } )
}

/**
 * Keep the status column clear of the attribution.
 *
 * The credit sits bottom-right, the same corner as the scale and the minimap,
 * and it wraps to two or three lines on a narrow frame. Its height is the only
 * honest source for --status-bottom.
 */
function publishAttributionHeight( smk: any, el: HTMLElement ) {
    const corner = el.querySelector( '.maplibregl-ctrl-bottom-right' ) as HTMLElement | null
    if ( !corner ) return

    const set = () => {
        const h = Math.round( corner.getBoundingClientRect().height )
        smk.$container.style.setProperty( '--status-bottom', ( h + 6 ) + 'px' )
    }

    set()
    if ( typeof ResizeObserver === 'function' ) new ResizeObserver( set ).observe( corner )
}

ViewerMapLibre.prototype.destroy = function () {
    const self = this

    // Each layer adapter's cleanup cancels its queued frame and pending image.
    // Without it they run after map.remove() and throw inside map.getSource.
    Object.keys( self.viewerLayers || {} ).forEach( function ( id: string ) {
        const vl = self.viewerLayers[ id ]
        if ( !vl || typeof vl._smk_cleanup !== 'function' ) return
        try { vl._smk_cleanup() } catch ( err ) { console.warn( err ) }
        vl._smk_cleanup = null
    } )

    if ( self.map ) self.map.remove()
    Viewer.prototype.destroy.call( self )
}

// ---------------------------------------------------------------------------
// MapLibre style spec builders used by setBasemap()
// ---------------------------------------------------------------------------

/**
 * `lookup` resolves a composite's child ids. Without it a composite - which is
 * what the default basemap is - warns and returns nothing.
 */
export function basemapSpecForConfig(
    cfg: any,
    lookup?: ( id: string ) => any,
): MapLibreBasemapSpec[] | Promise<MapLibreBasemapSpec[]> {
    return specForConfig( cfg, undefined, lookup )
}

function specForConfig( cfg: any, _map?: any, lookup?: ( id: string ) => any ): MapLibreBasemapSpec[] | Promise<MapLibreBasemapSpec[]> {
    switch ( cfg.type ) {
        // A composite stacks other basemaps by id, bottom first. It is how SMK
        // defines its own imagery and topography, so without this the default
        // basemap produces no spec and the map paints empty.
        case 'composite': {
            if ( !lookup || !Array.isArray( cfg.layers ) ) {
                console.warn( 'maplibre viewer: composite basemap "' + cfg.id + '" has no layers to resolve' )
                return []
            }

            const parts = cfg.layers.map( function ( id: string ) {
                let child: any
                try {
                    child = lookup( id )
                } catch {
                    child = null
                }
                if ( !child ) {
                    console.warn( 'maplibre viewer: composite "' + cfg.id + '" references unknown basemap "' + id + '"' )
                    return []
                }
                return specForConfig( child, _map, lookup )
            } )

            return Promise.all( parts.map( ( p: any ) => Promise.resolve( p ).catch( () => [] ) ) )
                .then( ( arrs: any[] ) => arrs.reduce( ( acc, a ) => acc.concat( a || [] ), [] ) )
        }

        case 'tile':
            return [ rasterSpec( cfg.id, [ resolveTileUrl( cfg.url ) ], cfg ) ]

        case 'esri-basemap': {
            const url = esriBasemapTileUrl( cfg.key )
            if ( !url ) {
                console.warn( 'maplibre viewer: no URL for esri-basemap key "' + cfg.key + '"' )
                return []
            }
            return [ rasterSpec( cfg.id, [ url ], cfg ) ]
        }

        case 'esri-tiled-map': {
            if ( !cfg.url ) return []
            const base = String( cfg.url ).replace( /\/$/, '' )

            // Read the cache's own extent, levels, tile size and hosts, the way
            // esri-leaflet does. Without the extent MapLibre asks for tiles the
            // cache does not hold: the Canada hillshade in the topography
            // composite 404d five times on every start.
            return readEsriTileInfo( base ).then( ( info: any ) => {
                const from = tileSourceFromInfo( base, info )
                const spec = rasterSpec( cfg.id, from.tiles, cfg )
                const src  = spec.source as any

                if ( from.tileSize ) src.tileSize = from.tileSize
                if ( from.bounds )   src.bounds   = from.bounds

                // The config may narrow the cache's range. Neither widens it.
                if ( from.minzoom != null ) src.minzoom = Math.max( src.minzoom ?? 0, from.minzoom )
                if ( from.maxzoom != null ) src.maxzoom = Math.min( src.maxzoom ?? 22, from.maxzoom )

                return [ spec ]
            } )
        }

        // Direct vector tile source — provide either `tiles: [ '...{z}/{x}/{y}.pbf' ]`
        // or `url: '...{z}/{x}/{y}.pbf'`, plus the `layers` array of
        // MapLibre style layers (each must reference the source by its
        // generated id, e.g. `'smk-bm-' + cfg.id`).
        case 'vector-tile':
            return [ vectorTileSpec( cfg ) ]

        // Full MapLibre / Mapbox style.json — fetched, parsed, and merged
        // (sources + layers + glyphs + sprite) into the running map.
        // Config: { id, type:'maplibre-style', url, transformLayers? (fn) }
        case 'maplibre-style':
            return loadStyleSpec( cfg )

        // ESRI vector tile service — points at the VectorTileServer root,
        // e.g. https://.../arcgis/rest/services/.../VectorTileServer
        // We discover the style at /resources/styles/root.json (override
        // with cfg.styleUrl) and reuse the maplibre-style plumbing, with
        // ESRI-specific URL fix-ups so source/glyphs/sprite resolve and
        // the TileJSON-ish source root returns JSON (`?f=json`).
        case 'esri-vector-tile':
            return loadEsriVectorTileSpec( cfg )

        case 'esri-vector-basemap':
        case 'esri-static-basemap-tile':
            console.warn( 'maplibre viewer: basemap type "' + cfg.type + '" (' + cfg.id + ') not yet supported' )
            return []

        default:
            console.warn( 'maplibre viewer: unknown basemap type "' + cfg.type + '"' )
            return []
    }
}

interface MapLibreBasemapSpec {
    sourceId?: string
    source?:   any
    sources?:  Record<string, any>
    layer?:    any
    layers?:   any[]
    glyphs?:   string
    sprite?:   string
}

/**
 * A config writes minZoom and maxZoom; a MapLibre source spells them minzoom
 * and maxzoom. Reading only one spelling drops the other silently.
 */
function zoomOpt( opt: any, which: 'min' | 'max' ): number | undefined {
    const v = which === 'min'
        ? ( opt.minZoom ?? opt.minzoom ?? opt.minNativeZoom )
        : ( opt.maxNativeZoom ?? opt.maxZoom ?? opt.maxzoom )
    return v == null ? undefined : Number( v )
}

function rasterSpec( id: string, tiles: string[], cfg: any ): MapLibreBasemapSpec {
    const opt = cfg.option || {}

    const source: any = {
        type:        'raster',
        tiles,
        tileSize:    opt.tileSize || 256,
        attribution: cfg.attribution || opt.attribution || '',
        maxzoom:     zoomOpt( opt, 'max' ) ?? 22,
    }

    // Without this the hillshade in the topography composite is asked for tiles
    // at zoom 0-3, which its cache does not hold, and every one is a 404.
    const min = zoomOpt( opt, 'min' )
    if ( min != null ) source.minzoom = min

    return {
        sourceId: 'smk-bm-' + id,
        source,
        layer: {
            id:     'smk-bm-' + id,
            type:   'raster',
            source: 'smk-bm-' + id,
            // Leaflet honoured the configured opacity. Without it a hillshade
            // stacked over a basemap paints solid and hides what is beneath.
            paint:  { 'raster-opacity': rasterOpacity( cfg ) },
        },
    }
}

function rasterOpacity( cfg: any ): number {
    const opt = cfg.option || {}
    const v   = cfg.opacity != null ? cfg.opacity : opt.opacity
    return v != null ? Number( v ) : 1
}

// vector-tile: synchronous; caller supplies a `layers` array with style for
// each `source-layer` they want to render (matching Mapbox/MapLibre layer
// spec). Source id defaults to `smk-bm-<id>`; if your layers use a different
// `source` name, set `cfg.sourceId`.
function vectorTileSpec( cfg: any ): MapLibreBasemapSpec {
    const sourceId = cfg.sourceId || ( 'smk-bm-' + cfg.id )
    const opt      = cfg.option || {}
    const tiles: string[] = Array.isArray( cfg.tiles )
        ? cfg.tiles.map( resolveTileUrl )
        : ( cfg.url ? [ resolveTileUrl( cfg.url ) ] : [] )

    const source: any = { type: 'vector', attribution: cfg.attribution || '' }
    if ( cfg.tileJsonUrl ) source.url = cfg.tileJsonUrl       // TileJSON discovery
    else                   source.tiles = tiles
    const vMin = zoomOpt( opt, 'min' ), vMax = zoomOpt( opt, 'max' )
    if ( vMin != null ) source.minzoom = vMin
    if ( vMax != null ) source.maxzoom = vMax
    if ( cfg.scheme )          source.scheme  = cfg.scheme    // 'tms' for y-flipped

    // Auto-bind each style layer to our source id unless caller specified one.
    const layers = ( cfg.layers || [] ).map( ( ly: any ) => Object.assign(
        { source: sourceId }, ly,
        ly.id ? null : { id: 'smk-bm-' + cfg.id + '-' + Math.random().toString( 36 ).slice( 2, 7 ) },
    ) )

    return {
        sourceId,
        source,
        layers,
        glyphs: cfg.glyphs,
        sprite: cfg.sprite,
    }
}

// maplibre-style: fetch and merge a remote style.json. Sources are namespaced
// with our basemap id so they can't collide with viewer layer source ids.
function loadStyleSpec( cfg: any ): Promise<MapLibreBasemapSpec[]> {
    if ( !cfg.url ) return Promise.resolve( [] )
    return fetch( cfg.url, { credentials: 'omit' } )
        .then( ( r ) => {
            if ( !r.ok ) throw new Error( 'style.json fetch ' + r.status + ' ' + cfg.url )
            return r.json()
        } )
        .then( ( style: any ) => {
            const prefix    = 'smk-bm-' + cfg.id + '__'
            const sources: Record<string, any> = {}
            const sourceMap: Record<string, string> = {}
            Object.keys( style.sources || {} ).forEach( ( sid: string ) => {
                const newId = prefix + sid
                sources[ newId ] = resolveStyleUrls( style.sources[ sid ], cfg.url )
                sourceMap[ sid ] = newId
            } )

            // Keep the background layer: it is the only thing that paints the
            // ocean and the void outside the tiles' coverage.
            let layers = ( style.layers || [] )
                .map( ( ly: any ) => {
                    const out = Object.assign( {}, ly, { id: prefix + ly.id } )
                    if ( ly.source && sourceMap[ ly.source ] ) out.source = sourceMap[ ly.source ]
                    return out
                } )
            if ( typeof cfg.transformLayers === 'function' ) {
                try { layers = cfg.transformLayers( layers ) || layers }
                catch ( e ) { console.warn( 'maplibre viewer: transformLayers failed', e ) }
            }

            return [ {
                sources,
                layers,
                glyphs: style.glyphs ? resolveStyleUrl( style.glyphs, cfg.url ) : undefined,
                sprite: style.sprite ? resolveStyleUrl( style.sprite, cfg.url ) : undefined,
            } as MapLibreBasemapSpec ]
        } )
}

// esri-vector-tile: discover the style at <root>/resources/styles/root.json
// (override with cfg.styleUrl), then reuse the maplibre-style merge logic.
// ESRI vector sources have `url: "../../"` (the VectorTileServer root); we
// rewrite each vector source to explicit `tiles` because MapLibre's TileJSON
// discovery doesn't understand ESRI's VectorTileServer JSON response shape.
/** esri-leaflet-vector reads an item style from the CDN, so ask the same host. */
const ITEM_STYLE_URL = 'https://cdn.arcgis.com/sharing/rest/content/items/{id}/resources/styles/root.json'

function loadEsriVectorTileSpec( cfg: any ): Promise<MapLibreBasemapSpec[]> {
    if ( !cfg.url && !cfg.itemId ) return Promise.resolve( [] )
    const root     = String( cfg.url || '' ).replace( /\/+$/, '' )
    // An item carries the style its publisher designed, which is not the
    // service's own: it can add sources and rename every layer.
    const styleUrl = cfg.styleUrl
        || ( cfg.itemId ? ITEM_STYLE_URL.replace( '{id}', cfg.itemId ) : root + '/resources/styles/root.json' )
    return fetch( styleUrl, { credentials: 'omit' } )
        .then( ( r ) => {
            if ( !r.ok ) throw new Error( 'esri vector style fetch ' + r.status + ' ' + styleUrl )
            return r.json()
        } )
        .then( ( fetched: any ) => {
            // esri-leaflet-vector lets the host restyle the service through
            // option.style( style ). Honour the same hook, or a host's custom
            // basemap silently renders the raw service style instead — whose
            // layers start at zoom 16, so the map looks empty.
            let style = fetched
            const restyle = cfg.option?.style
            if ( typeof restyle === 'function' ) {
                try {
                    const out = restyle( fetched )
                    if ( out ) style = ( out as any ).default || out
                } catch ( e ) {
                    console.warn( 'maplibre viewer: basemap style() failed for "' + cfg.id + '"', e )
                }
            }

            const prefix    = 'smk-bm-' + cfg.id + '__'
            const sources: Record<string, any> = {}
            const sourceMap: Record<string, string> = {}
            Object.keys( style.sources || {} ).forEach( ( sid: string ) => {
                const newId = prefix + sid
                const src   = Object.assign( {}, style.sources[ sid ] )
                if ( src.type === 'vector' ) {
                    // A host style names the service its source-layer names belong
                    // to, which need not be cfg.url. Overriding it hands MapLibre
                    // tiles from another service whose layer names match nothing,
                    // and the basemap comes out empty.
                    const hasOwnTiles = Array.isArray( src.tiles ) && src.tiles.length > 0
                        && /^https?:\/\//.test( src.tiles[ 0 ] )

                    // Otherwise force an explicit tile URL — ESRI's root is not TileJSON.
                    // An absolute source url names its own service, as tiles do.
                    const service = /^https?:\/\//.test( src.url || '' ) ? src.url.replace( /\/+$/, '' ) : root
                    if ( !hasOwnTiles ) src.tiles = [ service + '/tile/{z}/{y}/{x}.pbf' ]
                    delete src.url
                    if ( cfg.attribution && !src.attribution ) src.attribution = cfg.attribution
                    if ( src.minzoom == null ) src.minzoom = 0
                    if ( src.maxzoom == null ) src.maxzoom = 22
                }
                else {
                    Object.assign( src, resolveStyleUrls( src, styleUrl ) )
                }
                sources[ newId ] = src
                sourceMap[ sid ] = newId
            } )

            // Keep the background layer: it is the only thing that paints the
            // ocean and the void outside the tiles' coverage.
            let layers = ( style.layers || [] )
                .map( ( ly: any ) => {
                    const out = Object.assign( {}, ly, { id: prefix + ly.id } )
                    if ( ly.source && sourceMap[ ly.source ] ) out.source = sourceMap[ ly.source ]
                    return out
                } )
            if ( typeof cfg.transformLayers === 'function' ) {
                try { layers = cfg.transformLayers( layers ) || layers }
                catch ( e ) { console.warn( 'maplibre viewer: transformLayers failed', e ) }
            }

            return [ {
                sources,
                layers,
                glyphs: style.glyphs ? resolveStyleUrl( style.glyphs, styleUrl ) : undefined,
                sprite: style.sprite ? resolveStyleUrl( style.sprite, styleUrl ) : undefined,
            } as MapLibreBasemapSpec ]
        } )
}

function resolveStyleUrl( u: string, baseUrl: string ): string {
    try {
        // new URL percent-encodes braces, which destroys the {fontstack},
        // {range} and {z}/{x}/{y} placeholders MapLibre has to substitute. It
        // then cannot use the value at all: the glyphs stayed on the empty
        // style's font server and every label layer rendered nothing, silently.
        // Sprite URLs carry no braces, which is why only the labels went.
        return new URL( u, baseUrl ).toString()
            .replace( /%7B/g, '{' )
            .replace( /%7D/g, '}' )
    } catch { return u }
}

function resolveStyleUrls( source: any, baseUrl: string ): any {
    const out = Object.assign( {}, source )
    if ( typeof out.url === 'string' )  out.url = resolveStyleUrl( out.url, baseUrl )
    if ( Array.isArray( out.tiles ) )   out.tiles = out.tiles.map( ( t: string ) => resolveStyleUrl( t, baseUrl ) )
    return out
}

function resolveTileUrl( url: string ): string {
    // Esri's `{s}.arcgisonline.com` subdomain rotation has been retired
    // collapse to the canonical `server.arcgisonline.com` host.  Other `{s}`
    // patterns fall back to a single subdomain ("a").
    let out = url.replace( /\{s\}\.arcgisonline\.com/g, 'server.arcgisonline.com' )
    out     = out.replace( /\{s\}/g, 'a' )
    // Force https for Esri basemaps
    out     = out.replace( /^http:\/\//, 'https://' )
    return out
}

// ---------------------------------------------------------------------------
// setBasemap / setView / getView / screenToMap / getScale
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Load fade: a layer is added at opacity 0 and MapLibre's own paint transition
// brings it to its styled opacity when its data is on the map, so the map fills
// in smoothly instead of tile by tile.
// ---------------------------------------------------------------------------

const FADE_MS         = 300
const FADE_WAIT_MS    = 1000    // after a source's first tile, stop waiting for the rest
const FADE_GIVE_UP_MS = 4000    // a source that never reports is shown anyway

const FADE_PROPS: Record<string, string[]> = {
    'background':     [ 'background-opacity' ],
    'fill':           [ 'fill-opacity' ],
    'line':           [ 'line-opacity' ],
    'circle':         [ 'circle-opacity', 'circle-stroke-opacity' ],
    'symbol':         [ 'icon-opacity', 'text-opacity' ],
    'raster':         [ 'raster-opacity' ],
    'fill-extrusion': [ 'fill-extrusion-opacity' ],
    'heatmap':        [ 'heatmap-opacity' ],
}

function fadeEnabled(): boolean {
    try { return !window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches } catch { return true }
}

/** A copy of a layer spec at opacity 0. The spec keeps the styled values for fadeIn. */
function atZeroOpacity( ly: any ): any {
    const props = FADE_PROPS[ ly.type ]
    if ( !props || !fadeEnabled() ) return ly
    const paint = Object.assign( {}, ly.paint )
    props.forEach( ( p: string ) => {
        paint[ p ] = 0
        paint[ p + '-transition' ] = { duration: FADE_MS, delay: 0 }
    } )
    return Object.assign( {}, ly, { paint } )
}

/** isSourceLoaded reports a missing source as a map error, so ask only about one that exists. */
function sourceLoaded( map: any, sid: string ): boolean {
    return !map.getSource( sid ) || !!map.isSourceLoaded( sid )
}

function fadeIn( map: any, layers: any[] ) {
    layers.forEach( ( ly: any ) => {
        ( FADE_PROPS[ ly.type ] || [] ).forEach( ( p: string ) => {
            // Anything but our 0 means someone set the opacity since; leave it.
            if ( !map.getLayer( ly.id ) || map.getPaintProperty( ly.id, p ) !== 0 ) return
            try { map.setPaintProperty( ly.id, p, ly.paint?.[ p ], { validate: false } ) } catch { /* removed */ }
        } )
    } )
}

/**
 * Fade the layers in when their tiled or GeoJSON sources are loaded, or a second after the
 * first tile. An image source cannot say (WMS starts on a blank image), so its adapter calls
 * the returned function when the real image is on the map.
 */
function fadeInWhenLoaded( map: any, layers: any[], sources: Array<[ string, any ]> ): () => void {
    let done = false
    let waitTimer: any = null
    const pending: Record<string, boolean> = {}
    sources.forEach( ( [ sid, src ] ) => { if ( src?.type !== 'image' ) pending[ sid ] = true } )

    const finish = function () {
        if ( done ) return
        done = true
        map.off( 'sourcedata', onData )
        clearTimeout( waitTimer )
        clearTimeout( giveUp )
        fadeIn( map, layers )
    }
    const onData = function ( e: any ) {
        if ( !pending[ e.sourceId ] ) return
        if ( e.tile && !waitTimer ) waitTimer = setTimeout( finish, FADE_WAIT_MS )
        if ( !sourceLoaded( map, e.sourceId ) ) return
        delete pending[ e.sourceId ]
        if ( !Object.keys( pending ).length ) finish()
    }
    const giveUp = setTimeout( finish, FADE_GIVE_UP_MS )
    if ( Object.keys( pending ).length ) map.on( 'sourcedata', onData )
    // A source another layer already loaded sends no more events.
    Promise.resolve().then( () => {
        try {
            if ( Object.keys( pending ).length && Object.keys( pending ).every( sid => sourceLoaded( map, sid ) ) ) finish()
        } catch { /* removed */ }
    } )
    return finish
}

/**
 * Map.addLayer checks each layer against a serialised copy of the whole style, so a
 * 255-layer basemap cost 255 serialisations. The last goes through Map.addLayer to mark the redraw.
 */
function addBasemapLayers( map: any, layers: any[], before: string | undefined ) {
    const fresh = layers.filter( ( ly: any ) => !map.getLayer( ly.id ) ).map( atZeroOpacity )
    fresh.forEach( ( ly: any, i: number ) => {
        try {
            if ( i < fresh.length - 1 && map.style?.addLayer ) map.style.addLayer( ly, before, { validate: false } )
            else map.addLayer( ly, before )
        } catch ( e ) {
            console.warn( 'maplibre viewer: basemap layer "' + ly.id + '" skipped:', e )
        }
    } )
}

/** Mark the first time every basemap source has its tiles, so a Host can time the first picture. */
function markBasemapDrawn( self: any ) {
    if ( self.basemapDrawnMarked ) return
    self.basemapDrawnMarked = true
    // A frame drawn with every basemap source loaded is the first whole picture.
    const check = function () {
        try {
            if ( !self.basemapSourceIds.every( ( sid: string ) => sourceLoaded( self.map, sid ) ) ) return
        } catch { /* the basemap changed; its sources are gone */ }
        self.map.off( 'render', check )
        self.mark?.( 'basemap-drawn' )
    }
    self.map.on( 'render', check )
}

ViewerMapLibre.prototype.setBasemap = function ( basemapId: string ) {
    const self = this

    // Bump token; any in-flight async spec build will be ignored once a newer
    // setBasemap() supersedes it.
    const token = ++this.basemapTracker

    this.basemapLayerIds.forEach( ( lid: string ) => {
        if ( self.map.getLayer( lid ) ) self.map.removeLayer( lid )
    } )
    this.basemapSourceIds.forEach( ( sid: string ) => {
        if ( self.map.getSource( sid ) ) self.map.removeSource( sid )
    } )
    this.basemapLayerIds  = []
    this.basemapSourceIds = []

    // Reset glyphs/sprite to the empty-style defaults whenever we switch
    // basemaps (a previous maplibre-style basemap may have set them).
    try {
        if ( typeof self.map.setSprite === 'function' ) self.map.setSprite( null )
        if ( typeof self.map.setGlyphs === 'function' )
            self.map.setGlyphs( EMPTY_STYLE.glyphs )
    } catch { /* ignore — older versions */ }

    const cfg    = this.getBasemapConfig( basemapId )
    const builder = specForConfig( cfg, self.map, function ( id: string ) {
        return self.getBasemapConfig( id )
    } )

    Promise.resolve( builder ).then( ( specs: MapLibreBasemapSpec[] ) => {
        if ( token !== self.basemapTracker ) return         // superseded
        self.mark?.( 'basemap-style' )
        if ( !specs || specs.length === 0 ) {
            console.warn( 'maplibre viewer: no basemap spec produced for "' + basemapId + '"' )
            self.changedBaseMap( { baseMap: basemapId } )
            return
        }

        // Insert basemap layers at the bottom (before the first existing layer).
        const firstId = self.map.getStyle()?.layers?.[ 0 ]?.id
        specs.forEach( ( spec: any ) => {
            // Optional style-level resources for vector basemaps
            if ( spec.glyphs && typeof self.map.setGlyphs === 'function' ) {
                try { self.map.setGlyphs( spec.glyphs ) } catch { /* ignore */ }
            }
            if ( spec.sprite && typeof self.map.setSprite === 'function' ) {
                try { self.map.setSprite( spec.sprite ) } catch { /* ignore */ }
            }
            const sources = spec.sources
                ? Object.entries( spec.sources )
                : ( spec.sourceId && spec.source ? [ [ spec.sourceId, spec.source ] ] : [] )
            sources.forEach( ( [ sid, src ]: any ) => {
                if ( !self.map.getSource( sid ) ) self.map.addSource( sid, src )
                self.basemapSourceIds.push( sid )
            } )
            const layers = spec.layers || ( spec.layer ? [ spec.layer ] : [] )
            addBasemapLayers( self.map, layers, firstId )
            layers.forEach( ( ly: any ) => { self.basemapLayerIds.push( ly.id ) } )

            // Each source fades in on its own data; a background with no source goes with the first.
            if ( !sources.length ) fadeIn( self.map, layers )
            sources.forEach( ( entry: any, i: number ) => {
                const own = layers.filter( ( ly: any ) => ly.source === entry[ 0 ] || ( i === 0 && !ly.source ) )
                fadeInWhenLoaded( self.map, own, [ entry ] )
            } )
        } )

        self.mark?.( 'basemap-added' )
        markBasemapDrawn( self )
        self.changedBaseMap( { baseMap: basemapId } )
    } ).catch( ( e: any ) => {
        if ( token !== self.basemapTracker ) return
        console.warn( 'maplibre viewer: basemap "' + basemapId + '" failed to load:', e )
        self.changedBaseMap( { baseMap: basemapId } )
    } )
}

ViewerMapLibre.prototype.setView = function ( opt: any ) {
    if ( !opt ) return

    if ( opt.extent ) {
        const bx = opt.extent
        this.map.fitBounds(
            [ [ bx[ 0 ], bx[ 1 ] ], [ bx[ 2 ], bx[ 3 ] ] ],
            { animate: false, padding: 0 },
        )
        return
    }

    if ( opt.center ) {
        this.map.jumpTo( {
            center: [ opt.center[ 0 ], opt.center[ 1 ] ],
            zoom:   opt.zoom != null ? opt.zoom : this.map.getZoom(),
        } )
    } else if ( opt.zoom != null ) {
        this.map.setZoom( opt.zoom )
    }
}

ViewerMapLibre.prototype.getView = function () {
    if ( !this.map ) return

    const c       = this.map.getCenter()
    const b       = this.map.getBounds()
    const canvas  = this.map.getCanvas()
    const width   = canvas.clientWidth  || canvas.width
    const height  = canvas.clientHeight || canvas.height
    const vert    = height / 2

    let metersPerPixel = 1
    try {
        const ll1 = this.map.unproject( [ 0,   vert ] )
        const ll2 = this.map.unproject( [ 100, vert ] )
        const tu  = ( window as any ).turf
        if ( tu ) {
            metersPerPixel = ( tu.distance(
                tu.point( [ ll1.lng, ll1.lat ] ),
                tu.point( [ ll2.lng, ll2.lat ] ),
                { units: 'meters' }
            ) ) / 100
        }
    } catch { /* ignore */ }

    return {
        center:         { latitude: c.lat, longitude: c.lng },
        zoom:           this.map.getZoom(),
        extent:         [ b.getWest(), b.getSouth(), b.getEast(), b.getNorth() ],
        scale:          ( metersPerPixel * 100 ) / ( this.screenpixelsToMeters || 1 ),
        metersPerPixel,
        screen:         { width, height },
    }
}

ViewerMapLibre.prototype.getScale = function () {
    return this.getView().scale
}

ViewerMapLibre.prototype.screenToMap = function ( screen: any ) {
    const ll = Array.isArray( screen )
        ? this.map.unproject( screen )
        : this.map.unproject( [ screen.x, screen.y ] )
    return [ ll.lng, ll.lat ]
}

// ---------------------------------------------------------------------------
// Layer management
// ---------------------------------------------------------------------------
//
// Layer factories that target the maplibre viewer should produce "spec"
// objects in one of these forms:
//   { sourceId, source, layer }           — single layer
//   { sourceId, source, layers: [ ... ] } — multiple layers on one source
//   { sourceId, source, layers: [...], sources: { id: src, ... } }
//                                         — extra additional sources
//
// addViewerLayer also accepts a bare maplibre layer object as a fallback.
// ---------------------------------------------------------------------------

function specLayers( spec: any ): any[] {
    if ( spec.layers ) return spec.layers
    if ( spec.layer  ) return [ spec.layer ]
    return []
}

function specSources( spec: any ): Array<[ string, any ]> {
    const out: Array<[ string, any ]> = []
    if ( spec.sourceId && spec.source ) out.push( [ spec.sourceId, spec.source ] )
    if ( spec.sources ) {
        Object.keys( spec.sources ).forEach( ( id: string ) => out.push( [ id, spec.sources[ id ] ] ) )
    }
    return out
}

ViewerMapLibre.prototype.addViewerLayer = function ( viewerLayer: any ) {
    if ( !viewerLayer ) return
    const self = this

    const layers  = specLayers( viewerLayer )
    const sources = specSources( viewerLayer )

    if ( layers.length > 0 || sources.length > 0 ) {
        sources.forEach( ( [ sid, src ] ) => {
            if ( !self.map.getSource( sid ) ) self.map.addSource( sid, src )
        } )
        layers.forEach( ( ly: any ) => {
            if ( !self.map.getLayer( ly.id ) ) self.map.addLayer( atZeroOpacity( ly ) )
        } )
        // Set before onAdd: an image adapter calls it when its first real image is shown.
        viewerLayer._smk_ready = fadeInWhenLoaded( self.map, layers, sources )
        if ( typeof viewerLayer._smk_onAdd === 'function' ) {
            viewerLayer._smk_cleanup = viewerLayer._smk_onAdd( self.map )
        }
        self.viewerLayers[ viewerLayer._smk_id || layers[ 0 ]?.id || viewerLayer.sourceId ] = viewerLayer
        return
    }

    if ( viewerLayer.id && viewerLayer.type && !self.map.getLayer( viewerLayer.id ) ) {
        self.map.addLayer( atZeroOpacity( viewerLayer ) )
        const src = typeof viewerLayer.source === 'string' ? self.map.getSource( viewerLayer.source ) : null
        fadeInWhenLoaded( self.map, [ viewerLayer ], src ? [ [ viewerLayer.source, src ] ] : [] )
        self.viewerLayers[ viewerLayer._smk_id || viewerLayer.id ] = viewerLayer
    }
}

ViewerMapLibre.prototype.positionViewerLayer = function ( viewerLayer: any, zOrder: number ) {
    if ( !viewerLayer ) return
    const self = this

    // Remember the layer stacking, Higher zOrder == on top.
    viewerLayer._smk_zOrder = zOrder

    const layers = specLayers( viewerLayer )
    const ids: string[] = layers.length
        ? layers.map( ( l: any ) => l.id )
        : ( viewerLayer.id ? [ viewerLayer.id ] : [] )

    if ( !ids.length ) return

    // Find the next-higher-zOrder viewer layer; we want the layer
    // to render directly below. use maplibres moveLayer( id, beforeId )
    let beforeId: string | undefined
    let bestZ = Infinity
    Object.keys( self.viewerLayers ).forEach( ( key: string ) => {
        const vl = self.viewerLayers[ key ]
        if ( vl === viewerLayer ) return
        const z = vl._smk_zOrder
        if ( typeof z !== 'number' || z <= zOrder ) return
        if ( z >= bestZ ) return
        const otherIds = specLayers( vl ).map( ( l: any ) => l.id )
        const firstId  = otherIds[ 0 ] || vl.id
        if ( firstId && self.map.getLayer( firstId ) ) {
            bestZ    = z
            beforeId = firstId
        }
    } )

    // With no Host layer above, stay under what SMK did not place: the acetate and the tool layers.
    if ( beforeId === undefined ) beforeId = lowestUnplacedLayerId( self )

    // moveLayer is a no-op if the layer is already in the right position
    ids.forEach( ( id: string ) => {
        if ( !self_hasLayer( self, id ) ) return
        try { self.map.moveLayer( id, beforeId ) } catch ( e ) { /* ignore */ }
    } )
}

/** The lowest style layer that is neither a basemap layer nor part of a viewer layer. */
function lowestUnplacedLayerId( self: any ): string | undefined {
    const placed = new Set<string>( self.basemapLayerIds )
    Object.keys( self.viewerLayers ).forEach( ( key: string ) => {
        const vl = self.viewerLayers[ key ]
        specLayers( vl ).forEach( ( l: any ) => placed.add( l.id ) )
        if ( vl.id ) placed.add( vl.id )
    } )
    const order: string[] = typeof self.map.getLayersOrder === 'function'
        ? self.map.getLayersOrder()
        : ( self.map.getStyle()?.layers || [] ).map( ( l: any ) => l.id )
    return order.find( ( id: string ) => !placed.has( id ) )
}

function self_hasLayer( self: any, id: string ): boolean {
    return !!( id && self.map.getLayer( id ) )
}

function removeViewerLayer( self: any, id: string ) {
    const vl = self.viewerLayers[ id ]
    if ( !vl ) return

    if ( typeof vl._smk_cleanup === 'function' ) {
        try { vl._smk_cleanup() } catch ( err ) { console.warn( err ) }
        vl._smk_cleanup = null
    }

    specLayers( vl ).forEach( ( ly: any ) => {
        if ( ly.id && self.map.getLayer( ly.id ) ) self.map.removeLayer( ly.id )
    } )
    specSources( vl ).forEach( ( [ sid ]: any ) => {
        if ( sid && self.map.getSource( sid ) ) self.map.removeSource( sid )
    } )

    if ( vl.id && self.map.getLayer( vl.id ) ) self.map.removeLayer( vl.id )

    delete self.viewerLayers[ id ]
}

// ---------------------------------------------------------------------------
// Panel / display context
// ---------------------------------------------------------------------------

ViewerMapLibre.prototype.getPanelPadding = function () {
    const sbp    = this.getSidepanelPosition()
    const canvas = this.map.getCanvas()
    const width  = canvas.clientWidth  || canvas.width
    const height = canvas.clientHeight || canvas.height

    const aboveH = sbp.top
    const belowH = height - sbp.top - sbp.height
    const leftW  = sbp.left
    const rightW = width - sbp.left - sbp.width

    if ( Math.max( aboveH, belowH ) > Math.max( leftW, rightW ) ) {
        return aboveH > belowH
            ? { topLeft: { x: 0, y: 0 },                       bottomRight: { x: 0, y: height - sbp.top } }
            : { topLeft: { x: 0, y: sbp.top + sbp.height },    bottomRight: { x: 0, y: 0 } }
    } else {
        return leftW > rightW
            ? { topLeft: { x: 0, y: 0 },                       bottomRight: { x: width - sbp.left, y: 0 } }
            : { topLeft: { x: sbp.left + sbp.width, y: 0 },    bottomRight: { x: 0, y: 0 } }
    }
}

// ---------------------------------------------------------------------------
// Acetate / temporary features
// ---------------------------------------------------------------------------

ViewerMapLibre.prototype.temporaryFeature = function ( acetate: string, geometry: any, opt: any ) {
    const sourceId = 'smk-acetate-' + acetate
    const layerId  = sourceId

    if ( !this.acetate[ acetate ] ) this.acetate[ acetate ] = { sourceId, layerId, markers: [] }

    const ac = this.acetate[ acetate ]
    if ( !ac.markers ) ac.markers = []

    // MapLibre has no layer group to clear, so drop the markers from the last call.
    ac.markers.forEach( function ( m: any ) { m.remove() } )
    ac.markers = []

    const all = toFeatureCollection( geometry )

    // htmlMarker is the MapLibre answer to Leaflet's pointToLayer. A circle layer
    // cannot draw a rotated icon, so a caller that needs one supplies an element.
    const useMarkers     = typeof opt?.htmlMarker === 'function'
    const markerFeatures = useMarkers ? all.features.filter( isPointFeature ) : []
    const layerFeatures  = useMarkers ? all.features.filter( function ( f: any ) { return !isPointFeature( f ) } ) : all.features

    markerFeatures.forEach( function ( this: any, f: any ) {
        const el = opt.htmlMarker( f )
        if ( !el ) return

        ac.markers.push(
            new maplibregl.Marker( Object.assign( { element: el }, opt.markerOptions ) )
                .setLngLat( f.geometry.coordinates )
                .addTo( this.map )
        )
    }, this )

    // Skip the source and layer while only markers are drawn, so an empty
    // acetate does not leave a stray layer of the wrong type behind.
    if ( !layerFeatures.length && !this.map.getSource( sourceId ) ) return

    if ( !this.map.getSource( sourceId ) ) {
        this.map.addSource( sourceId, { type: 'geojson', data: emptyFC() } )
    }

    if ( !this.map.getLayer( layerId ) ) {
        const geomType = layerFeatures[ 0 ]?.geometry?.type || ''
        const isPoint  = /Point/.test( geomType )
        const isLine   = /LineString/.test( geomType )

        const layerSpec: any = isPoint
            ? { id: layerId, type: 'circle', source: sourceId,
                paint: Object.assign( { 'circle-radius': 6, 'circle-color': '#3388ff', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }, opt?.paint ) }
            : isLine
            ? { id: layerId, type: 'line', source: sourceId,
                paint: Object.assign( { 'line-color': '#3388ff', 'line-width': 3 }, opt?.paint ) }
            : { id: layerId, type: 'fill', source: sourceId,
                paint: Object.assign( { 'fill-color': '#3388ff', 'fill-opacity': 0.3, 'fill-outline-color': '#3388ff' }, opt?.paint ) }

        this.map.addLayer( layerSpec )
    }

    this.map.getSource( sourceId )?.setData( { type: 'FeatureCollection', features: layerFeatures } )
}

function emptyFC() { return { type: 'FeatureCollection', features: [] } }

function isPointFeature( f: any ) { return f?.geometry?.type === 'Point' }

function toFeatureCollection( geometry: any ): any {
    if ( !geometry )                             return emptyFC()
    if ( geometry.type === 'FeatureCollection' ) return geometry
    if ( geometry.type === 'Feature' )           return { type: 'FeatureCollection', features: [ geometry ] }
    return { type: 'FeatureCollection', features: [ { type: 'Feature', geometry, properties: {} } ] }
}

ViewerMapLibre.prototype.panToFeature = function ( feature: any, zoomIn: any ) {
    let bbox: number[]
    if ( !feature ) return
    try {
        if ( turf.getType( feature ) === 'Point' ) {
            const c = feature.geometry.coordinates
            bbox = [ c[ 0 ], c[ 1 ], c[ 0 ], c[ 1 ] ]
        } else {
            bbox = turf.bbox( feature )
        }
    } catch { return }

    const padding = this.getPanelPadding()

    let maxZoom: number | undefined
    if ( !zoomIn )              maxZoom = this.map.getZoom()
    else if ( zoomIn !== true ) maxZoom = parseFloat( zoomIn )

    this.map.fitBounds(
        [ [ bbox[ 0 ], bbox[ 1 ] ], [ bbox[ 2 ], bbox[ 3 ] ] ],
        {
            padding: {
                top:    padding.topLeft.y,
                left:   padding.topLeft.x,
                bottom: padding.bottomRight.y,
                right:  padding.bottomRight.x,
            },
            maxZoom,
            animate: true,
        },
    )
}

// ---------------------------------------------------------------------------
// 2D / 3D mode toggle
// ---------------------------------------------------------------------------

ViewerMapLibre.prototype.getMode = function (): '2d' | '3d' {
    return this.mode
}

ViewerMapLibre.prototype.setMode = function ( mode: '2d' | '3d' ) {
    if ( mode === this.mode ) return

    if ( mode === '3d' ) {
        const dem = this.demConfig || {
            url:          DEFAULT_DEM_URL,
            encoding:     DEFAULT_DEM_ENCODING,
            tileSize:     DEFAULT_DEM_TILE_SIZE,
            maxzoom:      DEFAULT_DEM_MAX_ZOOM,
            exaggeration: DEFAULT_DEM_EXAGGERATION,
        }

        if ( !this.demSourceId ) {
            this.demSourceId = 'smk-dem'
            if ( !this.map.getSource( this.demSourceId ) ) {
                this.map.addSource( this.demSourceId, {
                    type:     'raster-dem',
                    tiles:    [ dem.url ],
                    tileSize: dem.tileSize,
                    encoding: dem.encoding,
                    maxzoom:  dem.maxzoom,
                } )
            }
        }
        try {
            this.map.setTerrain( { source: this.demSourceId, exaggeration: dem.exaggeration } )
        } catch ( e ) {
            console.warn( 'maplibre viewer: terrain not supported by this version', e )
        }
        this.map.dragRotate.enable()
        this.map.touchPitch?.enable()
        this.map.easeTo( { pitch: 60, duration: 500 } )
        this.mode = '3d'
    } else {
        try { this.map.setTerrain( null ) } catch { /* ignore */ }
        this.map.easeTo( { pitch: 0, bearing: 0, duration: 500 } )
        this.map.dragRotate.disable()
        this.map.touchPitch?.disable()
        this.mode = '2d'
    }

    if ( typeof this.changedMode === 'function' ) this.changedMode( { mode: this.mode } )
}

ViewerMapLibre.prototype.toggleMode = function () {
    this.setMode( this.mode === '3d' ? '2d' : '3d' )
}

export default ViewerMapLibre
