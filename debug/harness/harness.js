/**
 * SMK harness — the maps on top, every switch beside or under them.
 *
 * Four ideas carry the page:
 *   1. Tool rows are generated from `smk.$tool` and each tool's own `$prop`
 *      map. Nothing is hard-coded, so a new tool appears by itself.
 *   2. Anything SMK reads only at start needs a Restart. Those controls say so.
 *   3. "all three" builds one map per viewer, side by side, from one config.
 *      The panels drive whichever pane holds the Drive radio.
 *   4. Layout is the window's business, not a control: past 1800px the console
 *      moves beside the maps and the tabs become a vertical rail.
 */
( function () {
'use strict'

var $  = function ( s ) { return document.querySelector( s ) }
var $$ = function ( s ) { return [].slice.call( document.querySelectorAll( s ) ) }

// ---------------------------------------------------------------------------
// The test contract
//
// Three things a test needs and a person does not mind having: a deep link, so
// one goto replaces four selects and four restarts; a ready flag, because
// matching the words "ready - 5 tools" is a bad contract; and the events as
// data, not only as lines in the Actions log.
//
// Do not gate readiness on the viewer's own signal. When this page says ready,
// MapLibre still reports loaded: false and isStyleLoaded: false. `idle` is the
// one that arrives.
// ---------------------------------------------------------------------------

var QUERY = new URLSearchParams( location.search )

window.HARNESS = {
    maps:    {},          // viewer name -> SmkMap, the same object the panels drive
    events:  [],          // { t, viewer, event, payload }
    restart: function () { return restart() },
    state:   'starting',
}

function setReady( state, why ) {
    window.HARNESS.state  = state
    document.body.dataset.harness = state
    if ( why ) window.HARNESS.why = why
}

// ---------------------------------------------------------------------------
// Stories — the starting configs
//
// A story adds data and nothing else, so what you see is what SMK does with its
// own defaults. To change a tool, use the Tools panel, or paste a config into
// the Config tab.
// ---------------------------------------------------------------------------

var L = '../layer/'

// The first key is the one the page opens with.
var STORIES = {
    'layers': {
        title: 'Sample layers',
        config: [
            // Danger Rating first: the service draws it out to 1:37,500,000, so
            // it is the one layer here that shows in every pane at the scale
            // each viewer opens at. The other three cut off between 1:1M and
            // 1:12M — press "scale range" on a row to see each limit.
            L + 'prot-danger-rating.json',
            L + 'basemapping-gba-railway-tracks-sp-railway-tracks.json',
            L + 'forest-tenure-ften-recreation-poly.json',
            L + 'wms-imagery-and-base-maps-gsr-schools-k-to-12.json'
        ]
    },

    // 764 BC parks from one GeoJSON. Both 2D viewers cluster them from
    // `useClustering`.
    'cluster': {
        title: 'Clustered points',
        config: [ L + 'cluster-provincial-parks.json' ]
    },

    'defaults': {
        title:  'SMK defaults (no config)',
        config: []
    }
}

// ---------------------------------------------------------------------------
// Examples
//
// Some tools show nothing until the host writes code for them. bespoke has no
// content of its own; list-menu is an empty container. An example puts a
// working config in the Config tab, registers the handlers it needs, and
// restarts. Handlers live on SMK.HANDLER, so they survive every later restart.
// ---------------------------------------------------------------------------

function bespokePanel( id, title, html ) {
    // The id is the FACTORY name plus the instance - BespokeTool--about, not
    // bespoke--about. bespoke also calls initialized and deactivated whether or
    // not you want them, and a missing handler warns, so register all three.
    SMK.HANDLER.set( id, 'initialized', function () {} )
    SMK.HANDLER.set( id, 'deactivated', function () {} )
    SMK.HANDLER.set( id, 'activated', function ( smk, tool, el ) {
        if ( !el ) return
        el.innerHTML = '<h3 style="margin-top:0">' + title + '</h3>' + html
    } )
}

var EXAMPLES = {
    'bespoke': {
        note: 'Two panels in the toolbar, filled by SMK.HANDLER',
        config: [ { tools: [
            { type: 'bespoke', instance: 'about',    enabled: true, position: 'toolbar', title: 'About',    icon: 'help',      order: 90 },
            { type: 'bespoke', instance: 'glossary', enabled: true, position: 'toolbar', title: 'Glossary', icon: 'menu_book', order: 91 }
        ] } ],
        handlers: function () {
            bespokePanel( 'BespokeTool--about', 'About',
                '<p>This panel is not part of SMK. The harness wrote it in the ' +
                '<code>activated</code> handler for <code>BespokeTool--about</code>. ' +
                'The id is the factory name and the instance, not the config type.</p>' )
            bespokePanel( 'BespokeTool--glossary', 'Glossary',
                '<dl><dt>Pane</dt><dd>One viewer in the harness.</dd>' +
                '<dt>Story</dt><dd>The starting config.</dd></dl>' )
        }
    },

    'bookmarks': {
        note: 'The six BC fire centres, as extents',
        config: [ { tools: [ {
            type: 'bookmarks', enabled: true, position: 'toolbar',
            title: 'Bookmarks', icon: 'bookmark', order: 92,
            // Each entry goes straight to setView, so an extent works in the two
            // 2D viewers. esri3d ignores it - see CONTEXT.md 8.1.
            bookmarks: [
                { title: 'Cariboo',       extent: [ -126.3043, 50.8580, -119.8554, 53.5403 ] },
                { title: 'Coastal',       extent: [ -133.9014, 48.1972, -120.4926, 54.8893 ] },
                { title: 'Kamloops',      extent: [ -124.0686, 48.8286, -117.8503, 52.9817 ] },
                { title: 'Northwest',     extent: [ -139.5923, 51.7746, -124.6179, 60.2289 ] },
                { title: 'Prince George', extent: [ -129.6607, 51.9036, -117.6196, 60.2507 ] },
                { title: 'Southeast',     extent: [ -119.4873, 48.8864, -113.8294, 52.6897 ] }
            ]
        } ] } ]
    },

    'directions': {
        note: 'Directions wired to the BC Route Planner and the BC Geocoder',
        config: [ { tools: [ {
            type: 'directions', enabled: true, position: 'toolbar', order: 93,
            // See Route Details is disabled until the service answers with a
            // route, so the tool needs a key. The route layers are in the
            // defaults. Same keys as debug/config/tool/directions.json.
            routePlannerService: {
                url:    'https://router.api.gov.bc.ca/',
                apiKey: '11dd756f680c47b5aef5093d95543738'
            },
            geocoderService: {
                url: 'https://geocoder.api.gov.bc.ca/',
                parameter: { maxDistance: 50, locationMode: 'input' }
            }
        } ] } ]
    },

    // markup and query build only with a named instance, so neither has a
    // Catalogue row. Their examples sit in the footnote under the list.
    'markup': {
        note: 'A drawing tool in the toolbar. SMK hands each shape to a handler',
        config: [ { tools: [
            { type: 'markup', instance: 'draw', enabled: true, position: 'toolbar', title: 'Markup', icon: 'edit', order: 96 }
        ] } ],
        handlers: function () {
            var id = 'MarkupTool--draw'
            SMK.HANDLER.set( id, 'initialized', function () {} )
            SMK.HANDLER.set( id, 'activated',   function () {} )
            SMK.HANDLER.set( id, 'deactivated', function () {} )
            SMK.HANDLER.set( id, 'markup-created', function ( smk, tool, geojson ) {
                log( 'markup', ( geojson && geojson.geometry && geojson.geometry.type ) || 'shape' )
            } )
        }
    },

    'query': {
        note: 'A query on BC survey parcels, run through WFS',
        config: [ {
            layers: [ {
                id: 'survey-parcels', type: 'wms', isVisible: true,
                title: 'Land Act Survey Parcels',
                // /ows answers WMS and WFS. /wms refuses WFS: "No service: ( WFS )".
                serviceUrl: 'https://openmaps.gov.bc.ca/geo/pub/ows',
                layerName: 'WHSE_TANTALIS.TA_SURVEY_PARCELS_SVW',
                styleName: 'Land_Act_Survey_Parcels_Tantalis_Outlined',
                titleAttribute: 'PARCEL_SHORT_DESCRIPTION', geometryAttribute: 'SHAPE',
                queries: [ {
                    id: 'by-type', title: 'Find parcels', description: 'Survey parcels by type and description',
                    parameters: [
                        { id: 'type', type: 'select', title: 'Parcel type is',
                          choices: [ { title: 'Primary', value: 'Primary' }, { title: 'Subdivision', value: 'Subdivision' } ] },
                        { id: 'text', type: 'input', title: 'description contains', value: '' }
                    ],
                    predicate: { operator: 'and', arguments: [
                        { operator: 'equals',   arguments: [ { operand: 'attribute', name: 'PARCEL_TYPE' }, { operand: 'parameter', id: 'type' } ] },
                        { operator: 'contains', arguments: [ { operand: 'attribute', name: 'PARCEL_SHORT_DESCRIPTION' }, { operand: 'parameter', id: 'text' } ] }
                    ] }
                } ]
            } ],
            // The default query entry is enabled: false, so the instance must say true.
            tools: [ { type: 'query', instance: 'survey-parcels--by-type', enabled: true, position: 'toolbar', icon: 'manage_search', order: 97 } ]
        } ]
    },

    'list-menu': {
        note: 'A menu in the toolbar holding two bespoke panels',
        config: [ { tools: [
            { type: 'list-menu', enabled: true, position: 'toolbar', title: 'More', icon: 'menu', order: 95 },
            { type: 'bespoke', instance: 'glossary', enabled: true, position: 'list-menu', title: 'Glossary', icon: 'menu_book' },
            { type: 'bespoke', instance: 'contacts', enabled: true, position: 'list-menu', title: 'Contacts', icon: 'email' }
        ] } ],
        handlers: function () {
            bespokePanel( 'BespokeTool--glossary', 'Glossary',
                '<p>A child of the list menu. Its config says ' +
                '<code>"position": "list-menu"</code>.</p>' )
            bespokePanel( 'BespokeTool--contacts', 'Contacts',
                '<p>A second child. The menu holds as many as you give it.</p>' )
        }
    }
}

function insertExample( type ) {
    var ex = EXAMPLES[ type ]
    if ( !ex ) return

    if ( ex.handlers ) ex.handlers()

    dropped = ex.config.slice()
    $( '#config' ).value  = safeJson( dropped )
    $( '#merge' ).checked = true
    showPanel( 'config' )
    log( 'example', type + ' - restarting' )
    restart()
}

/** An example button, or null for a tool that has no example. */
function exampleButton( type ) {
    var ex = EXAMPLES[ type ]
    if ( !ex ) return null

    var b = el( 'button', 'example', 'example' )
    b.title = ex.note + '. Puts it in the Config tab and restarts.'
    b.onclick = function () { insertExample( type ) }
    return b
}

// ---------------------------------------------------------------------------
// Panes, start and restart
// ---------------------------------------------------------------------------

var ALL_VIEWERS = [ 'maplibre', 'leaflet', 'esri3d' ]

var maps    = {}              // viewer name -> SmkMap, for the panes that started
var smk     = null            // the map the panels drive
var driving = null            // its viewer name
var dropped = null            // config from a dropped file or the textarea
var extraTools = {}           // catalogue types switched on, applied at the next start
var removedTools = {}         // built tools taken out ("type" or "type--instance"), applied at the next start
var argEdit = {}              // tool args edited in the Tools panel, applied at the next start
var logView = false
var refReady    = Promise.resolve()   // settles when the 1.0 pane has answered
var refSettled  = null                // its resolve function, or null when there is no ref pane

function viewerList() {
    var v = $( '#viewer' ).value
    return v === 'all' ? ALL_VIEWERS.slice() : [ v ]
}

/** Which builds get a pane. 1.0 is the axis A reference. */
function buildHas( which ) {
    var b = $( '#build' ) ? $( '#build' ).value : 'v2'
    return b === which || b === 'both'
}

/**
 * The story fragments the 1.0 pane can take.
 *
 * It gets them through a query string, so only the url fragments travel. An
 * object from the Config tab cannot, and the pane header says so.
 *
 * Make them absolute. 1.0's `include` resolves anything that is not "./x"
 * against its own baseUrl, which is <build>/assets/src/ - so "../layer/x.json"
 * is looked for inside the 1.0 build and 404s.
 */
function refConfigUrls() {
    return currentConfig( 'leaflet' )
        .filter( function ( f ) { return typeof f === 'string' } )
        .map( function ( u ) { return new URL( u, document.baseURI ).pathname } )
}

function currentConfig( viewerType ) {
    var story = STORIES[ $( '#story' ).value ] || STORIES.layers
    var head  = { viewer: {
        type:   viewerType,
        themes: [ $( '#theme' ).value ],
        device: $( '#mobile' ).checked ? 'mobile' : 'auto'
    } }

    // SMK builds only the tools a config enables, so a catalogue tick has to
    // become config and wait for a restart. See buildCatalogue.
    var defaults = {}
    startTools().forEach( function ( d ) { defaults[ d.type ] = d } )

    // Only a tool with no default position gets one. tool-base skips the whole
    // adopt step when position is empty, so such a tool builds, sits in $tool
    // and never renders a widget. Forcing it on the rest is a lie: it moved the
    // actionbar tools into the toolbar, and gave a tool that deliberately has
    // no position - location - a second panel in the sidepanel.
    var extra = Object.keys( extraTools )
    var tail  = extra.length ? [ { tools: extra.map( function ( t ) {
        var d = defaults[ t ]
        var e = { type: t, enabled: true }
        if ( !d || !d.position ) e.position = 'toolbar'
        return e
    } ) } ] : []

    var args = argEditConfig().concat( removedToolConfig() )

    if ( dropped && !$( '#merge' ).checked )
        return [ head ].concat( dropped, tail, args )

    return [ head ].concat( story.config, dropped || [], tail, args )
}

/** The tools taken out with a remove button, as one fragment that turns each off. */
function removedToolConfig() {
    var keys = Object.keys( removedTools )
    if ( !keys.length ) return []
    return [ { tools: keys.map( function ( k ) {
        var part = k.split( '--' )
        var e = { type: part[ 0 ], enabled: false }
        if ( part[ 1 ] ) e.instance = part[ 1 ]
        return e
    } ) } ]
}

/** Take one built tool out. SMK builds tools only at start, so this restarts, and keeps the rest. */
function removeTool( tool, id ) {
    var key = argEditKey( tool )
    if ( extraTools[ tool.type ] && !tool.instance ) delete extraTools[ tool.type ]
    else removedTools[ key ] = true
    log( 'remove', id + ' - restarting' )
    writeQuery()
    restart()
}

/** The merge key of one built tool. Bespoke tools repeat a type per instance. */
function argEditKey( tool ) {
    return tool.type + ( tool.instance ? '--' + tool.instance : '' )
}

/**
 * The args edited in the Tools panel, as config fragments.
 *
 * fillArgs writes to the live tool, and restart() destroys it. Config is the
 * only thing a restart re-reads, so every edit is kept here and merged last.
 * Tools match on type and instance - see updateToolSet in merge-config.
 *
 * An array or an object arg needs two fragments. merge-config concats an array
 * and deep-merges an object, so one fragment would append to the story value
 * instead of replacing it. A null deletes, so clear first, then set.
 */
function argEditConfig() {
    var keys = Object.keys( argEdit )
    if ( !keys.length ) return []

    var clear = [], set = []

    keys.forEach( function ( k ) {
        var o = argEdit[ k ]
        var c = { type: o.type }, s = { type: o.type }
        if ( o.instance ) c.instance = s.instance = o.instance

        Object.keys( o.args ).forEach( function ( a ) {
            var v = o.args[ a ]
            if ( v !== null && typeof v === 'object' ) c[ a ] = null
            s[ a ] = v
        } )

        if ( Object.keys( c ).length > ( c.instance ? 2 : 1 ) ) clear.push( c )
        set.push( s )
    } )

    return ( clear.length ? [ { tools: clear } ] : [] ).concat( [ { tools: set } ] )
}

function setState( s ) {
    lastState = s
    $( '#state' ).textContent = s
}

var lastState  = ''
var needRestart = false

/**
 * Which controls need a restart, and which do not.
 *
 * Story, Viewer, Theme, mobile and a catalogue tick all restart by themselves,
 * so they never raise this. The Config text and a dropped file cannot: you may
 * still be typing. Those set the flag, and the bar says so until you press it.
 */
function setNeedRestart( why ) {
    needRestart = !!why
    var chip = $( '#pending' )
    chip.textContent = why || ''
    chip.hidden      = !why
    $( '#restart' ).classList.toggle( 'wants', needRestart )
}

/** One pane for each viewer, each with its own frame for SMK to fill. */
function buildPanes( names ) {
    var host = $( '#maps' )
    host.innerHTML = ''
    host.dataset.count = names.length

    names.forEach( function ( name ) {
        var pane = el( 'div', 'pane' )
        pane.dataset.viewer = name

        var head = el( 'header' )
        head.appendChild( el( 'strong', '', name ) )

        // With one pane there is nothing to choose, so the radio is only noise.
        if ( names.length > 1 ) {
            var lab = el( 'label', 'drive' )
            lab.title = 'Point the Tools, Layers and Actions panels at this map'
            var radio = document.createElement( 'input' )
            radio.type    = 'radio'
            radio.name    = 'drive'
            radio.value   = name
            radio.onchange = function () { drive( name ) }
            lab.appendChild( radio )
            lab.appendChild( document.createTextNode( 'drive the panels' ) )
            head.appendChild( lab )
        }

        head.appendChild( el( 'span', 'pane-state', 'starting...' ) )
        pane.appendChild( head )

        var frame = el( 'div', 'frame' )
        frame.id = frameId( name )
        pane.appendChild( frame )

        host.appendChild( pane )
    } )

    if ( buildHas( '1.0' ) ) buildRefPane( host, names.length > 0 )
}

/**
 * The SMK 1.0 pane, in an iframe.
 *
 * It must be its own document: 1.0 defines its own `include`, claims
 * window.SMK, and derives SMK.BASE_URL from its own script src. The panels do
 * not drive it, and it is Leaflet only, because 1.0 has no other 2D viewer.
 */
function buildRefPane( host, withOthers ) {
    refReady = new Promise( function ( done ) {
        refSettled = done
        setTimeout( done, 30000 )      // a missing build must not hang the page
    } )

    var pane = el( 'div', 'pane ref' )
    pane.dataset.viewer = 'ref10'
    pane.dataset.build  = '1.0'

    var head = el( 'header' )
    head.appendChild( el( 'strong', '', 'SMK 1.0 - leaflet' ) )
    head.appendChild( el( 'span', 'pane-state', 'starting...' ) )
    pane.appendChild( head )

    var urls = refConfigUrls()
    var frame = document.createElement( 'iframe' )
    frame.className = 'frame'
    frame.id  = 'frame-ref10'
    frame.src = 'ref10.html?theme=' + encodeURIComponent( $( '#theme' ).value ) +
                '&config=' + encodeURIComponent( urls.join( ',' ) )
    pane.appendChild( frame )

    if ( urls.length < currentConfig( 'leaflet' ).length - 1 )
        head.title = 'Only url fragments reach this pane. An object from the Config tab does not.'

    host.appendChild( pane )
    host.dataset.count = ( withOthers ? Number( host.dataset.count ) : 0 ) + 1

    // Same origin, so a test reaches the 1.0 map through here.
    window.HARNESS.ref = function () { return frame.contentWindow && frame.contentWindow.REF }
}

window.addEventListener( 'message', function ( ev ) {
    if ( !ev.data || ev.data.harness !== 'ref10' ) return
    paneState( 'ref10', ev.data.state === 'ready' ? 'ready' : 'FAILED: ' + ev.data.error )
    log( 'ref10', 'SMK 1.0 ' + ev.data.state + ( ev.data.error ? ' - ' + ev.data.error : '' ) )
    if ( refSettled ) refSettled()
} )

function frameId( name ) { return 'frame-' + name }

function paneState( name, text ) {
    var node = document.querySelector( '.pane[data-viewer="' + name + '"] .pane-state' )
    if ( node ) node.textContent = text
}

/** Point the Tools, Layers and Actions panels at one pane. */
function drive( name ) {
    if ( !maps[ name ] ) return

    driving = name
    smk     = maps[ name ]

    $$( '.pane' ).forEach( function ( p ) {
        p.classList.toggle( 'driving', p.dataset.viewer === name )
    } )
    var radio = document.querySelector( 'input[name=drive][value="' + name + '"]' )
    if ( radio ) radio.checked = true

    buildTools()
    buildLayers()
    setState( 'driving ' + name + ' - ' + Object.keys( smk.$tool ).length + ' tools' )
    syncViews()
}

/**
 * SMK.INIT returns the shared SMK.BOOT promise and chains onto it, so a map
 * that fails leaves BOOT rejected and every later INIT fails with it. Reset
 * BOOT for each pane and start them one at a time, or one broken viewer takes
 * the other two down with it.
 */
function startOne( name ) {
    SMK.BOOT = Promise.resolve()

    return SMK.INIT( {
        id:           'harness-' + name,
        containerSel: '#' + frameId( name ),
        config:       currentConfig( name )
    } )
    .then( function ( map ) {
        maps[ name ] = map || SMK.MAP[ 'harness-' + name ]
        paneState( name, 'ready - ' + Object.keys( maps[ name ].$tool ).length + ' tools' )
        wireEvents( name, maps[ name ] )
        log( 'started', name + ' / ' + $( '#theme' ).value )
    } )
    .catch( function ( e ) {
        paneState( name, 'FAILED: ' + e.message )
        log( 'error', name + ': ' + e.message )
        console.error( name, e )
    } )
}

function start() {
    setNeedRestart( null )
    setReady( 'starting' )
    var names = buildHas( 'v2' ) ? viewerList() : []

    maps    = {}
    smk     = null
    driving = null
    refReady   = Promise.resolve()
    refSettled = null
    window.HARNESS.maps   = maps
    window.HARNESS.events = []
    setState( 'starting ' + ( names.join( ', ' ) || 'the 1.0 reference' ) + '...' )
    buildPanes( names )

    return names.reduce( function ( chain, name ) {
        return chain.then( function () { return startOne( name ) } )
    }, Promise.resolve() )
    .then( function () {
        var started = names.filter( function ( n ) { return maps[ n ] } )

        if ( started.length ) {
            // MapLibre leads: its getView is correct, so sync follows it cleanly.
            // Leaflet next, because the other SMK products still use it.
            var lead = [ 'maplibre', 'leaflet' ].filter( function ( v ) {
                return started.indexOf( v ) >= 0
            } )[ 0 ]
            drive( lead || started[ 0 ] )
            resizeAll()
            syncViews()
        }
        else if ( names.length ) {
            setState( 'FAILED - no viewer started' )
            return setReady( 'failed', 'no viewer started' )
        }
        else {
            // Build "1.0 only" has no v2 map. That is not a failure.
            setState( '1.0 reference only' )
        }

        // The flag must not go up while the 1.0 iframe is still starting.
        return Promise.all( [ settle( started ), refReady ] )
            .then( function () { setReady( 'ready' ) } )
    } )
}

/**
 * Wait until each pane has drawn, not until it says it has loaded.
 *
 * MapLibre reports loaded: false and isStyleLoaded: false long after the map is
 * on screen and painting, because a WMS source of ours never reports loaded.
 * `idle` does arrive. Leaflet has no equivalent, so it settles at once.
 */
function settle( names ) {
    return Promise.all( names.map( function ( name ) {
        var m = maps[ name ] && maps[ name ].$viewer && maps[ name ].$viewer.map
        if ( !m || typeof m.once !== 'function' || typeof m.getCanvas !== 'function' )
            return Promise.resolve()

        return new Promise( function ( done ) {
            var t = setTimeout( done, 8000 )
            m.once( 'idle', function () { clearTimeout( t ); done() } )
        } )
    } ) )
}

function restart() {
    Object.keys( SMK.MAP || {} ).forEach( function ( k ) {
        try { SMK.MAP[ k ].destroy() } catch ( e ) { console.warn( 'destroy', e ) }
    } )
    return start()
}

/**
 * Give every pane the driving pane's extent.
 *
 * The three viewers do not fit the same config to the same scale. Measured on
 * one 527x1231 pane: maplibre 1:3.5M, leaflet 1:5.7M, esri3d 1:22.9M — a spread
 * of 6.5x. maplibre counts zoom for 512px tiles and leaflet for 256, leaflet
 * snaps to whole levels, and the SceneView camera fits differently again. A
 * scale-dependent WMS then draws almost nothing in the widest pane, which reads
 * as a layer that failed to load.
 *
 * Extent is the one instruction all three read the same way, so sync on that,
 * never on zoom.
 */
var syncing = false

/**
 * Match the other panes to the driving pane's scale and centre.
 *
 * Not by extent: leaflet is built with zoomSnap 1, so fitBounds rounds to a
 * whole level and can land back where it started, and the esri3d setView builds
 * its Extent with no spatial reference, so it ignores one. Both were measured
 * doing nothing.
 *
 * Not by zoom: maplibre counts zoom for 512px tiles and leaflet for 256, so one
 * number means two scales.
 *
 * Metres per pixel is the one figure every viewer reports the same way, so
 * correct each pane by the ratio of its own figure to the lead's. That cancels
 * whatever convention it uses. It takes more than one pass: leaflet snaps to a
 * whole level, and a 3D camera's metres per pixel is not a clean power of two of
 * its zoom, so the first correction overshoots. Each pane stops when it is close
 * enough or when a pass stops helping.
 */
var SYNC_TOLERANCE = 0.05   // within 5% of the lead is close enough
var SYNC_PASSES    = 5

/**
 * Metres per ground pixel, worked out from the reported extent.
 *
 * Do NOT use view.metersPerPixel. The esri3d viewer reports it wrongly: its
 * getView measures the ground distance across 100 pixels at the four corners
 * and the centre, and falls back to view.scale when those disagree by too much.
 * A tall pane on a globe always makes the corners disagree, so the fallback runs
 * — and it converts the ArcGIS cartographic scale as if it were SMK's nominal
 * one. Measured on a 527x1231 pane: extent says 3,526 m/px, its own
 * screenToGroundDistance at the centre says 3,499, and getView reports 22,573.
 *
 * The extent is right in all three viewers, and agrees with the two 2D ones to
 * within 0.2%, so it is the honest common currency.
 */
var EARTH_R = 6378137
var DEG2RAD = Math.PI / 180

function groundMpp( view ) {
    if ( !view || !view.extent || !view.screen || !view.screen.width ) return null

    var west = view.extent[ 0 ], east = view.extent[ 2 ]
    var span = east - west
    if ( span <= 0 ) span += 360                       // crossed the antimeridian

    var lat = view.center.latitude
    return ( span * DEG2RAD * EARTH_R * Math.cos( lat * DEG2RAD ) ) / view.screen.width
}

function syncViews() {
    if ( syncing || !$( '#sync' ).checked ) return
    if ( !smk || Object.keys( maps ).length < 2 ) return
    if ( !groundMpp( smk.$viewer.getView() ) ) return

    syncing = true

    var lastError  = {}    // viewer name -> how wrong it was on the pass before
    var startView  = {}    // to put a pane back if the passes made it worse
    var startError = {}
    var passes     = 0

    var lead0 = smk.$viewer.getView()
    Object.keys( maps ).forEach( function ( name ) {
        if ( name === driving ) return
        try {
            var w = maps[ name ].$viewer.getView()
            if ( !w ) return
            startView[ name ]  = { center: [ w.center.longitude, w.center.latitude ], zoom: w.zoom }
            startError[ name ] = Math.abs( Math.log( groundMpp( w ) / groundMpp( lead0 ) ) )
        } catch ( e ) { /* nothing to restore */ }
    } )

    /**
     * Stop working on a pane. Put it back only if the passes left it further off
     * than it began — leaflet snaps to whole levels, so it often stops short of
     * the lead while still much closer than it started, and that is worth
     * keeping.
     */
    function giveUp( name, error ) {
        lastError[ name ] = 'stop'

        // Keep the result only when it is a real improvement. esri3d overshoots
        // from 6.5x too wide to 6.5x too tight, which is no better to look at,
        // so it must go back rather than sit at a scale nobody chose.
        var worse = startError[ name ] != null && error > startError[ name ] * 0.7
        if ( worse && startView[ name ] ) {
            try { maps[ name ].$viewer.setView( startView[ name ] ) } catch ( e ) { /* ignore */ }
        }

        // Report where it ended up, not whether the loop was happy. Leaflet often
        // stops one zoom snap short, which is a fine place to be.
        var off  = Math.exp( worse ? startError[ name ] : error )
        var text = off < 1.05 ? 'view synced'
                 : off < 2    ? 'view within ' + off.toFixed( 2 ) + 'x of the lead'
                 :              'will not sync - ' + off.toFixed( 1 ) + 'x off the lead'

        paneState( name, 'ready - ' + text )
        log( 'sync', name + ': ' + text )
    }

    function pass() {
        var lead    = smk.$viewer.getView()
        var leadMpp = groundMpp( lead )
        var again   = false

        Object.keys( maps ).forEach( function ( name ) {
            if ( name === driving || lastError[ name ] === 'stop' ) return

            var v = maps[ name ].$viewer
            try {
                var own    = v.getView()
                var ownMpp = groundMpp( own )
                if ( !ownMpp || !leadMpp ) return

                var ratio = ownMpp / leadMpp
                var error = Math.abs( Math.log( ratio ) )

                if ( error < SYNC_TOLERANCE ) return

                // A pass that did not improve things will not improve them next
                // time either — leaflet's zoom snap is the usual reason.
                if ( lastError[ name ] != null && error >= lastError[ name ] * 0.9 )
                    return giveUp( name, error )
                lastError[ name ] = error
                again = true

                v.setView( {
                    center: [ lead.center.longitude, lead.center.latitude ],
                    zoom:   Math.max( 0, Math.min( 22, own.zoom + Math.log( ratio ) / Math.LN2 ) ),
                } )
            } catch ( e ) {
                console.warn( 'sync', name, e )
                giveUp( name, Infinity )
            }
        } )

        passes++
        if ( again && passes < SYNC_PASSES ) return setTimeout( pass, 700 )

        if ( again ) Object.keys( maps ).forEach( function ( name ) {
            if ( name === driving || lastError[ name ] === 'stop' || lastError[ name ] == null ) return
            giveUp( name, lastError[ name ] )
        } )

        // Let the panes settle before listening again, or the three chase
        // each other through changedView.
        setTimeout( function () { syncing = false }, 500 )
    }

    pass()
}

/** MapLibre and Leaflet both need telling when their box changes. */
function resizeAll() {
    Object.keys( maps ).forEach( function ( name ) {
        var m = maps[ name ] && maps[ name ].$viewer && maps[ name ].$viewer.map
        if ( m && typeof m.resize === 'function' )     m.resize()
        if ( m && typeof m.invalidateSize === 'function' ) m.invalidateSize()
    } )
}

// ---------------------------------------------------------------------------
// Tools — one row per tool, args read from the tool's own $prop map
// ---------------------------------------------------------------------------

// These need no restart. They do different jobs: showWidget renders the button,
// enabled greys it and blocks activation, active opens the panel.
var LIVE = { showWidget: 1, enabled: 1, visible: 1, active: 1 }

// What each live flag means, shown as the column label's tooltip.
var FLAG_HELP = {
    showWidget: 'showWidget: is the button in the page at all? (v-if on the widget template)',
    enabled:    'enabled: does clicking the button do anything? In a config the same word means "build this tool".',
    visible:    "visible: is the tool's own output showing? Most tools set this themselves.",
    active:     'active: is the tool operating now - its panel open, its mode engaged?'
}

function viewerNames() {
    return ( window.SMK.SUPPORT || {} ).viewers || VIEWERS
}

/** One header for a tool grid. The labels are short; the tooltips say what they mean. */
function toolGridHead( lastCols ) {
    var head = el( 'div', 'grid-head' )
    head.appendChild( el( 'span', 'name', 'tool' ) )
    head.appendChild( el( 'span' ) )    // the example column
    viewerNames().forEach( function ( v ) {
        var s = el( 'span', 'v', v )
        s.title = 'Does ' + v + ' have an implementation?'
        head.appendChild( s )
    } )
    lastCols.forEach( function ( c ) {
        var s = el( 'span', 'v', c[ 0 ] )
        s.title = c[ 1 ]
        head.appendChild( s )
    } )
    return head
}

/** One cell per viewer, a tick or a cross, from SMK.SUPPORT. Empty when it knows nothing. */
function supportCells( type ) {
    var t = ( ( window.SMK.SUPPORT || {} ).tools || {} )[ type ]
    return viewerNames().map( function ( v ) {
        if ( !t ) return el( 'span', 'cell' )
        var has = ( t.shared && !t.viewers.length ) || t.viewers.indexOf( v ) >= 0
        var c = el( 'span', 'cell mark ' + ( has ? 'yes' : 'no' ), has ? '\u2713' : '\u2715' )
        c.title = v + ( has ? ' has an implementation' : ' has NO implementation' )
        return c
    } )
}

function buildTools() {
    var host = $( '#tools' )
    host.innerHTML = ''

    if ( !smk ) { host.appendChild( el( 'div', 'ro', 'no map is driving' ) ); buildCatalogue(); return }

    host.appendChild( toolGridHead( Object.keys( LIVE ).map( function ( f ) { return [ f, FLAG_HELP[ f ] ] } ) ) )

    Object.keys( smk.$tool ).sort().forEach( function ( id ) {
        var tool = smk.$tool[ id ]

        var row = el( 'div', 'row' )
        row.dataset.name = ( id + ' ' + ( tool.type || '' ) ).toLowerCase()

        var name = el( 'div', 'name', id )
        name.appendChild( el( 'small', '', tool.type || '' ) )
        name.title = id + ' (' + tool.type + ')'
        row.appendChild( name )

        row.appendChild( exampleButton( tool.type ) || el( 'span' ) )
        supportCells( tool.type ).forEach( function ( c ) { row.appendChild( c ) } )

        // Every flag has its own column, so a tool without one leaves the cell empty.
        Object.keys( LIVE ).forEach( function ( f ) {
            var cell = el( 'span', 'cell' )
            if ( f in tool.$prop ) {
                var box = document.createElement( 'input' )
                box.type    = 'checkbox'
                box.title   = FLAG_HELP[ f ]
                box.checked = !!tool[ f ]
                box.onchange = function () {
                    tool[ f ] = box.checked
                    log( 'set', id + '.' + f + ' = ' + box.checked )
                }
                cell.appendChild( box )
            }
            row.appendChild( cell )
        } )

        var args = el( 'div', 'args' )
        var more = el( 'button', 'more', 'args' )
        more.onclick = function () {
            args.classList.toggle( 'on' )
            if ( args.classList.contains( 'on' ) && !args.childElementCount ) fillArgs( args, tool, id )
        }
        row.appendChild( more )

        var rm = el( 'button', 'remove', '\u00d7' )
        rm.title = 'Remove ' + id + ' and restart. Tick it under Not built to bring it back.'
        rm.onclick = function () { removeTool( tool, id ) }
        row.appendChild( rm )

        host.appendChild( row )
        host.appendChild( args )
    } )

    buildCatalogue()
}

// The tool list a map starts from: each type's own defaults, with the default
// tool set in SMK.CONFIG.tools switched on.
function startTools() {
    var T = window.SMK && window.SMK.TYPE
    return T && T.mergeConfigs ? T.mergeConfigs( [] ).tools : []
}

/**
 * The tools SMK bundles but this map did not build.
 *
 * smk-map's loadTools filters `t.enabled !== false`, so a tool that is off in
 * the config is never constructed. It is not in `smk.$tool`, and no amount of
 * clicking can bring it back — only a restart with it enabled in the config.
 * That is why these are checkboxes that restart, not the live flags above.
 */
function buildCatalogue() {
    var host = $( '#catalogue' )
    host.innerHTML = ''

    var smkGlobal = window.SMK || {}
    var defaults  = startTools()
    var builtType = {}
    if ( smk && smk.$toolType ) Object.keys( smk.$toolType ).forEach( function ( t ) { builtType[ t ] = true } )

    // Everything SMK registered a factory for, whether or not it has a default.
    var registered = Object.keys( smkGlobal.TYPE || {} )
        .filter( function ( k ) { return k.indexOf( 'tool-' ) === 0 } )
        .map( function ( k ) { return k.slice( 5 ) } )

    var inDefaults = {}
    defaults.forEach( function ( d ) { inDefaults[ d.type ] = d } )

    var types = {}
    defaults.forEach( function ( d ) { types[ d.type ] = true } )
    registered.forEach( function ( t ) { types[ t ] = true } )

    var manifestTools = ( ( window.SMK.SUPPORT || {} ).tools ) || {}

    // A sub-tool's instance carries its PARENT's type, so it never appears in
    // $toolType. One config entry runs Tool.defineComposite and makes the family.
    function isBuilt( type ) {
        if ( builtType[ type ] ) return true
        var m = manifestTools[ type ]
        return !!( m && m.parent && builtType[ m.parent ] )
    }

    // Which children each parent brings, so a parent row can name them.
    var children = {}
    Object.keys( manifestTools ).forEach( function ( t ) {
        var pa = manifestTools[ t ].parent
        if ( !pa ) return
        if ( !children[ pa ] ) children[ pa ] = []
        children[ pa ].push( t )
    } )

    /*
     * Only rows you can act on.
     *
     * A sub-tool has no config entry — its parent builds it. An instance-only
     * tool is skipped by loadTools (`t.instance !== true`) until a layer query
     * names an instance for it, so `enabled: true` alone does nothing. A
     * checkbox on either is a lie, so neither gets a row. They are named under
     * the list instead.
     *
     * A helper can register as tool-<name> too, and a default can have no code.
     * A real factory has addInitializer, or is a composite; every composite has
     * a default entry.
     */
    var rows = []
    var byParent = {}     // parent -> its unbuilt children
    var instanceOnly = []

    function hasFactory( t ) {
        var f = smkGlobal.TYPE[ 'tool-' + t ]
        return !!f && ( !!f.addInitializer || !!inDefaults[ t ] )
    }

    Object.keys( types ).sort().forEach( function ( t ) {
        if ( isBuilt( t ) ) return

        var d  = inDefaults[ t ]
        var pa = ( manifestTools[ t ] || {} ).parent

        if ( pa ) {
            if ( !byParent[ pa ] ) byParent[ pa ] = []
            return byParent[ pa ].push( t )
        }
        if ( !hasFactory( t ) ) return
        if ( d && d.instance === true ) return instanceOnly.push( t )

        rows.push( t )
    } )

    if ( !rows.length ) host.appendChild( el( 'div', 'ro', 'every bundled tool you can switch on is built' ) )
    else host.appendChild( toolGridHead( [ [ 'build', 'build: turns it on in the config and restarts' ] ] ) )

    rows.forEach( function ( type ) {
        var d = inDefaults[ type ]

        // Most rows "have defaults, are off, and have their own position"; say only what differs.
        var notes = []
        if ( !d ) notes.push( 'no default config' )
        if ( children[ type ] ) notes.push( 'also builds ' + children[ type ].join( ', ' ) )
        if ( !d || !d.position ) notes.push( 'goes in the toolbar' )

        var row = el( 'div', 'row' )
        row.dataset.name = type.toLowerCase()

        var name = el( 'div', 'name', type )
        if ( notes.length ) name.appendChild( el( 'small', '', notes.join( '; ' ) ) )
        name.title = type + ( notes.length ? ' - ' + notes.join( '; ' ) : '' )
        row.appendChild( name )

        row.appendChild( exampleButton( type ) || el( 'span' ) )
        supportCells( type ).forEach( function ( c ) { row.appendChild( c ) } )

        var lab = el( 'span', 'cell' )
        var box = document.createElement( 'input' )
        box.type    = 'checkbox'
        box.title   = 'Build ' + type + ' and restart'
        box.checked = !!extraTools[ type ]
        box.onchange = function () {
            if ( !box.checked )          delete extraTools[ type ]
            else if ( removedTools[ type ] ) delete removedTools[ type ]
            else                         extraTools[ type ] = true
            log( 'catalogue', type + ( box.checked ? ' on' : ' off' ) + ' - restarting' )
            writeQuery()
            restart()
        }
        lab.appendChild( box )
        row.appendChild( lab )
        host.appendChild( row )
    } )

    var parents = Object.keys( byParent ).sort()
    if ( parents.length || instanceOnly.length ) {
        var note = el( 'div', 'footnote' )
        note.appendChild( el( 'strong', '', 'Bundled, but no control here can switch them on' ) )

        var dl = document.createElement( 'dl' )
        parents.forEach( function ( pa ) {
            dl.appendChild( el( 'dt', '', 'built by ' + pa ) )
            dl.appendChild( el( 'dd', '', byParent[ pa ].sort().join( ', ' ) ) )
        } )
        if ( instanceOnly.length ) {
            dl.appendChild( el( 'dt', '', 'need a named instance in the config' ) )
            var dd = el( 'dd', '' )
            instanceOnly.sort().forEach( function ( t, i ) {
                if ( i ) dd.appendChild( document.createTextNode( ', ' ) )
                dd.appendChild( el( 'span', '', t + ' ' ) )
                var b = exampleButton( t )
                if ( b ) { b.dataset.type = t; dd.appendChild( b ) }
            } )
            dl.appendChild( dd )
        }
        note.appendChild( dl )
        host.appendChild( note )
    }
}

/** Every prop the tool declared, editable where the type allows. */
function fillArgs( host, tool, id ) {
    var kept = argEdit[ argEditKey( tool ) ]

    Object.keys( tool.$prop ).sort().forEach( function ( key ) {
        if ( key in LIVE ) return

        var val = tool[ key ]
        host.appendChild( el( 'label', '', key ) )

        if ( typeof val === 'function' ) {
            host.appendChild( el( 'div', 'ro', 'function - not editable' ) )
            return
        }

        var isObj = val !== null && typeof val === 'object'
        var input = document.createElement( isObj ? 'textarea' : 'input' )
        input.value = isObj ? safeJson( val )
                    : ( val === null || val === undefined ? '' : String( val ) )
        if ( kept && key in kept.args ) input.classList.add( 'edited' )

        input.onchange = function () {
            var text = input.value.trim(), next
            try {
                next = ( isObj || text.charAt( 0 ) === '[' || text.charAt( 0 ) === '{' ) ? JSON.parse( text )
                     : text === 'true'  ? true
                     : text === 'false' ? false
                     : text === ''      ? null
                     : ( text !== '' && isFinite( text ) ) ? Number( text )
                     : text
            } catch ( e ) { log( 'error', key + ': ' + e.message ); return }

            tool[ key ] = next

            // Kept by type, not by tool id: the id is the factory name, and
            // only the type matches a config entry.
            var k = argEditKey( tool )
            if ( !kept ) kept = argEdit[ k ] = { type: tool.type, instance: tool.instance, args: {} }
            kept.args[ key ] = next
            input.classList.add( 'edited' )

            log( 'set', id + '.' + key + ' = ' + text.slice( 0, 60 ) )
        }
        host.appendChild( input )
    } )

    if ( !host.childElementCount ) host.appendChild( el( 'div', 'ro', 'no props' ) )
    else {
        var note = el( 'div', 'ro', 'An edit writes to the live tool and is kept as config, so it survives Restart. SMK reads most args only when it builds the tool, so press Restart to be sure a change took.' )
        note.style.gridColumn = '1 / -1'
        host.appendChild( note )

        var drop = el( 'button', 'more', 'drop edits' )
        drop.title = 'Forget every arg edited on this tool, then restart on the story value'
        drop.onclick = function () {
            delete argEdit[ argEditKey( tool ) ]
            log( 'args', tool.type + ' - edits dropped, restarting' )
            restart()
        }
        drop.style.gridColumn = '1 / -1'
        drop.style.justifySelf = 'start'
        host.appendChild( drop )
    }
}

/**
 * Viewer-support chips, from SMK.SUPPORT — a manifest the build reads off the
 * file tree. A tool initializer registers nothing at run time, so this is the
 * only honest source; see build/scan-support.js.
 */
function supportChips( viewersWithIt, sharedEverywhere ) {
    var flags = el( 'div', 'flags' )

    // Always one chip per viewer, never a single summary chip. A row that is
    // green three times and a row that is green once must be read the same way.
    ;( ( window.SMK.SUPPORT || {} ).viewers || VIEWERS ).forEach( function ( v ) {
        var has = sharedEverywhere || viewersWithIt.indexOf( v ) >= 0
        var t = el( 'span', 'support ' + ( has ? 'yes' : 'no' ), v )
        t.title = sharedEverywhere ? 'Shared code only - no viewer half, so every viewer gets it'
                : has              ? v + ' has an implementation for this'
                :                    v + ' has NO implementation for this'
        flags.appendChild( t )
    } )
    return flags
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

function layerContext() {
    return smk && smk.$viewer && smk.$viewer.displayContext && smk.$viewer.displayContext.layers
}

function repaintLayers() {
    if ( smk.$viewer.updateLayersVisible ) smk.$viewer.updateLayersVisible()
    else                                   smk.$viewer.refreshLayers()
}

function buildLayers() {
    var host = $( '#layers' )
    host.innerHTML = ''

    var dc = layerContext()
    if ( !dc ) {
        host.appendChild( el( 'div', 'ro', 'no display context' ) )
        buildLayerTypes()
        return
    }

    var ids = dc.getLayerIds()

    if ( !ids.length ) {
        host.appendChild( el( 'div', 'ro', 'no layers - this story loads none. Pick "Sample layers", or add layers in the Config tab.' ) )
    }

    ids.forEach( function ( id ) { layerRow( host, dc, id, false ) } )

    // Tool layers. They live in the viewer but not in the display context, so
    // the panel used to hide them and an acetate looked like nothing at all.
    var internal = Object.keys( smk.$viewer.layerId || {} ).filter( function ( id ) {
        return ids.indexOf( id ) < 0 && smk.$viewer.layerId[ id ]
    } )
    internal.forEach( function ( id ) { layerRow( host, dc, id, true ) } )

    buildLayerTypes()
}

function layerRow( host, dc, id, isInternal ) {
    var layer = smk.$viewer.layerId[ id ]
    var cfg   = ( layer && layer.config ) || {}

    var row = el( 'div', 'row' )
    row.dataset.name = ( id + ' ' + ( cfg.type || '' ) ).toLowerCase()

    // The title as well as the id: a config names a layer by title, and the
    // two rarely match, so an id alone sends you looking for the wrong string.
    var name = el( 'div', 'name', id )
    name.appendChild( el( 'small', '', ( cfg.type || 'unknown type' ) +
        ( cfg.title && cfg.title !== id ? ' - ' + cfg.title : '' ) +
        ( isInternal ? ' - internal, made by a tool' : '' ) ) )
    row.appendChild( name )

    var flags = el( 'div', 'flags' )

    // An internal layer is not in the display context, so it has no toggle.
    if ( !isInternal ) {
        var lab = el( 'label' )
        var box = document.createElement( 'input' )
        box.type = 'checkbox'
        box.checked = dc.isItemVisible( id )
        box.onchange = function () {
            dc.setItemVisible( id, box.checked )
            repaintLayers()
            log( 'layer', id + ' visible = ' + box.checked )
        }
        lab.appendChild( box )
        lab.appendChild( document.createTextNode( 'visible' ) )
        flags.appendChild( lab )
    }
    row.appendChild( flags )

    var args = el( 'div', 'args' )
    var more = el( 'button', 'more', 'config' )
    more.onclick = function () {
        args.classList.toggle( 'on' )
        if ( args.classList.contains( 'on' ) && !args.childElementCount ) fillLayerConfig( args, cfg )
    }
    row.appendChild( more )

    // The scale range is the usual reason a layer is loaded and yet blank, and
    // only the service knows it. Fetch on demand — a busy GeoServer's generic
    // endpoint answers with its whole catalogue.
    if ( cfg.type === 'wms' && cfg.serviceUrl && cfg.layerName ) {
        var out   = el( 'div', 'ro scale-range' )
        var range = el( 'button', 'more', 'scale range' )
        range.onclick = function () {
            range.disabled = true
            out.textContent = 'asking the service...'
            readScaleRange( cfg )
                .then( function ( r ) {
                    var view = smk.$viewer.getView()
                    out.textContent = describeScaleRange( r, view && view.scale )
                    out.classList.toggle( 'out-of-range', !!( r && view && (
                        ( r.max && view.scale > r.max ) || ( r.min && view.scale < r.min ) ) ) )
                } )
                .catch( function ( e ) { out.textContent = 'could not read the capabilities: ' + e.message } )
                .then( function () { range.disabled = false } )
        }
        row.appendChild( range )
        row.appendChild( out )
    }

    host.appendChild( row )
    host.appendChild( args )
}

/**
 * The scale range the WMS service itself declares for a layer.
 *
 * This is the answer to "the layer loaded but nothing is drawn". Nothing in the
 * SMK config says so: `minScale` and `maxScale` are honoured by SMK when a
 * config sets them, but the sample layers set neither. The limit lives in the
 * service. Recreation Polygons, for one, declares 1:1,000,000 — so it draws
 * nothing at the 1:3.5M the map opens at.
 *
 * WMS reads the wrong way round to most people: MaxScaleDenominator is the
 * FURTHEST OUT it will draw, because a bigger denominator is a smaller map.
 */
var capsCache = {}

function capabilitiesUrl( serviceUrl ) {
    return serviceUrl + ( serviceUrl.indexOf( '?' ) >= 0 ? '&' : '?' ) +
        'service=WMS&version=1.3.0&request=GetCapabilities'
}

function firstChildNumber( node, tag ) {
    for ( var i = 0; i < node.childNodes.length; i++ ) {
        var c = node.childNodes[ i ]
        if ( c.nodeType === 1 && c.localName === tag ) return Number( c.textContent )
    }
    return null
}

function readScaleRange( cfg ) {
    var url = capabilitiesUrl( cfg.serviceUrl )

    // One fetch per service, however many layers ask. The generic endpoint of a
    // large GeoServer answers with the whole catalogue, which can be megabytes.
    if ( !capsCache[ url ] )
        capsCache[ url ] = fetch( url )
            .then( function ( r ) {
                if ( !r.ok ) throw new Error( 'HTTP ' + r.status )
                return r.text()
            } )
            .then( function ( t ) { return new DOMParser().parseFromString( t, 'text/xml' ) } )

    return capsCache[ url ].then( function ( doc ) {
        var names = doc.getElementsByTagNameNS( '*', 'Name' )
        for ( var i = 0; i < names.length; i++ ) {
            if ( names[ i ].textContent !== cfg.layerName ) continue

            var layer = names[ i ].parentNode
            return {
                min: firstChildNumber( layer, 'MinScaleDenominator' ),
                max: firstChildNumber( layer, 'MaxScaleDenominator' ),
            }
        }
        return null
    } )
}

/** Say it in words, and say whether the pane is inside it right now. */
function describeScaleRange( range, viewScale ) {
    if ( !range ) return 'the service declares no scale range - it draws at every scale'

    var round = function ( n ) { return Math.round( n ).toLocaleString() }
    var text

    if ( range.max && range.min )      text = 'drawn between 1:' + round( range.min ) + ' and 1:' + round( range.max )
    else if ( range.max )              text = 'drawn at 1:' + round( range.max ) + ' and closer'
    else if ( range.min )              text = 'drawn at 1:' + round( range.min ) + ' and further out'
    else                               return 'the service declares no scale range - it draws at every scale'

    if ( !viewScale ) return text

    var tooFarOut = range.max && viewScale > range.max
    var tooFarIn  = range.min && viewScale < range.min

    return text + '. This pane is at 1:' + round( viewScale ) + ' - ' +
        ( tooFarOut ? 'too far out, so it draws nothing'
        : tooFarIn  ? 'too far in, so it draws nothing'
        :             'inside the range' )
}

/** A layer config is read when the map is built, so this is read-only. */
function fillLayerConfig( host, cfg ) {
    var keys = Object.keys( cfg ).sort()
    if ( !keys.length ) { host.appendChild( el( 'div', 'ro', 'no config' ) ); return }

    keys.forEach( function ( k ) {
        var v = cfg[ k ]
        host.appendChild( el( 'label', '', k ) )
        host.appendChild( el( 'div', 'ro',
            v !== null && typeof v === 'object' ? safeJson( v ).slice( 0, 400 ) : String( v ) ) )
    } )

    var note = el( 'div', 'ro', 'Read-only. SMK reads a layer config when it builds the map, so change it in the Config tab and Restart.' )
    note.style.gridColumn = '1 / -1'
    host.appendChild( note )
}

/**
 * Which layer types SMK bundles, and which viewer can actually draw each one.
 *
 * An adapter registers itself as Layer[ type ][ viewerType ], so this is the
 * real answer, not a list someone wrote down. The three viewers do not agree,
 * and a config that names a type the running viewer lacks draws nothing.
 */
var VIEWERS = [ 'leaflet', 'maplibre', 'esri3d' ]

/**
 * Where the matrix alone would mislead.
 *
 * A missing adapter does not always mean a missing capability. Clustering is
 * the case: Leaflet and MapLibre each do it inside their vector layer, so they
 * never needed a `cluster` type. Only the ArcGIS API had nothing to do it with.
 */
var TYPE_NOTE = {
    'cluster': 'esri3d only - but Leaflet and MapLibre cluster inside a vector layer instead. Set useClustering on a vector layer there.'
}

function buildLayerTypes() {
    var host = $( '#layer-types' )
    host.innerHTML = ''

    var Layer = ( window.SMK || {} ).TYPE && window.SMK.TYPE.Layer
    if ( !Layer ) { host.appendChild( el( 'div', 'ro', 'SMK.TYPE.Layer not available' ) ); return }

    var types = Object.keys( Layer ).filter( function ( k ) {
        return /^[a-z][a-z0-9-]*$/.test( k ) && VIEWERS.some( function ( v ) { return Layer[ k ] && Layer[ k ][ v ] } )
    } ).sort()

    types.forEach( function ( type ) {
        var row = el( 'div', 'row' )
        row.dataset.name = type

        var name = el( 'div', 'name', type )
        row.appendChild( name )

        var flags = el( 'div', 'flags' )
        var missing = []
        var manifest = ( ( window.SMK.SUPPORT || {} ).layers || {} )[ type ] || []

        VIEWERS.forEach( function ( v ) {
            var has = !!Layer[ type ][ v ]
            if ( !has ) missing.push( v )

            var tag = el( 'span', 'support ' + ( has ? 'yes' : 'no' ), v )
            tag.title = has ? v + ' has an adapter for ' + type : v + ' has NO adapter for ' + type

            // Two sources: what registered in this browser, and what the build
            // found on disk. They must agree. If they do not, an adapter file
            // exists but never reached the bundle, which is worth seeing.
            if ( has !== ( manifest.indexOf( v ) >= 0 ) ) {
                tag.classList.add( 'disagree' )
                tag.title += ' - but the build manifest disagrees'
            }
            flags.appendChild( tag )
        } )
        row.appendChild( flags )

        name.appendChild( el( 'small', '', TYPE_NOTE[ type ]
            || ( missing.length ? 'not drawn by ' + missing.join( ', ' ) : 'every viewer draws it' ) ) )

        host.appendChild( row )
    } )
}

// ---------------------------------------------------------------------------
// Actions log
// ---------------------------------------------------------------------------

var VIEWER_EVENTS = [
    'changedView', 'changedBaseMap', 'startedLoading', 'finishedLoading',
    'pickedLocation', 'changedLocation', 'changedPopup',
    'changedLayerVisibility', 'changedDevice', 'changedDisplayContext'
]

var syncSoon = debounce( syncViews, 250 )

function wireEvents( viewerName, map ) {
    if ( typeof map.$viewer.changedView === 'function' )
        map.$viewer.changedView( function () { if ( viewerName === driving ) syncSoon() } )

    VIEWER_EVENTS.forEach( function ( name ) {
        if ( typeof map.$viewer[ name ] !== 'function' ) return
        map.$viewer[ name ]( function ( ev ) {
            // The list is the record a test reads, so it keeps every event.
            // The log on screen is for a person, and changedView floods it.
            window.HARNESS.events.push( { t: Date.now(), viewer: viewerName, event: name, payload: ev } )
            if ( window.HARNESS.events.length > 2000 ) window.HARNESS.events.shift()

            if ( name === 'changedView' && !logView ) return
            log( name, prefix( viewerName ) + brief( ev ) )
        } )
    } )
}

/** Name the pane in the log only when more than one is running. */
function prefix( viewerName ) {
    return Object.keys( maps ).length > 1 ? viewerName + ' ' : ''
}

function log( event, detail ) {
    var host = $( '#log' )
    var line = el( 'div' )
    line.appendChild( el( 'span', 't', new Date().toLocaleTimeString() ) )
    line.appendChild( el( 'span', 'e', event ) )
    line.appendChild( document.createTextNode( ' ' + ( detail === undefined ? '' : detail ) ) )
    host.insertBefore( line, host.firstChild )
    while ( host.childElementCount > 400 ) host.removeChild( host.lastChild )
}

function brief( ev ) {
    if ( ev === undefined || ev === null ) return ''
    if ( typeof ev !== 'object' ) return String( ev )
    return safeJson( ev ).slice( 0, 160 )
}

// ---------------------------------------------------------------------------
// Inspect — the numbers the Puppeteer probes print, for a person
// ---------------------------------------------------------------------------

var INTERESTING = [
    'display', 'position', 'flexWrap', 'flexDirection', 'justifyContent', 'alignItems',
    'width', 'height', 'top', 'right', 'bottom', 'left', 'zIndex',
    'margin', 'padding', 'border', 'borderRadius',
    'color', 'backgroundColor', 'fontSize', 'fontWeight', 'whiteSpace', 'overflow', 'opacity'
]

function nameOf( node ) {
    var cls = String( node.className || '' ).trim()
    return node.tagName.toLowerCase() + ( cls ? '.' + cls.split( /\s+/ ).join( '.' ) : '' )
}

function describe( node ) {
    var r  = node.getBoundingClientRect()
    var cs = getComputedStyle( node )

    var out = nameOf( node )
        + '\n\nbox   x=' + Math.round( r.x ) + ' y=' + Math.round( r.y )
        + ' w=' + Math.round( r.width ) + ' h=' + Math.round( r.height ) + '\n\n'

    INTERESTING.forEach( function ( k ) { out += pad( k ) + cs[ k ] + '\n' } )

    var chain = [], e = node
    while ( e && e !== document.body ) { chain.push( nameOf( e ) ); e = e.parentElement }
    return out + '\nancestors\n  ' + chain.join( '\n  ' )
}

function pad( s ) { while ( s.length < 18 ) s += ' '; return s }

function startPicking() {
    document.body.classList.add( 'picking' )
    var last = null

    function over( ev ) {
        if ( last ) last.classList.remove( 'pick-hi' )
        last = ev.target
        last.classList.add( 'pick-hi' )
    }
    function click( ev ) {
        ev.preventDefault(); ev.stopPropagation()
        $( '#inspect' ).textContent = describe( ev.target )
        stop()
    }
    function stop() {
        if ( last ) last.classList.remove( 'pick-hi' )
        document.body.classList.remove( 'picking' )
        document.removeEventListener( 'mouseover', over, true )
        document.removeEventListener( 'click', click, true )
    }

    document.addEventListener( 'mouseover', over, true )
    document.addEventListener( 'click', click, true )
}

// ---------------------------------------------------------------------------
// Config in and out
// ---------------------------------------------------------------------------

function useConfigText() {
    var text = $( '#config' ).value.trim()
    if ( !text ) { dropped = null; return }

    var parsed = JSON.parse( text )       // throws to the caller, which reports
    dropped = Array.isArray( parsed ) ? parsed : [ parsed ]
    log( 'config', 'using ' + dropped.length + ' fragment(s)' )
}

function readFile( f ) {
    return new Promise( function ( resolve, reject ) {
        var r = new FileReader()
        r.onload  = function () { try { resolve( JSON.parse( r.result ) ) } catch ( e ) { reject( e ) } }
        r.onerror = function () { reject( r.error ) }
        r.readAsText( f )
    } )
}

function loadFiles( files ) {
    Promise.all( [].slice.call( files ).map( readFile ) )
        .then( function ( parts ) {
            // A file may itself hold a list of fragments; flatten one level.
            var flat = []
            parts.forEach( function ( p ) { flat = flat.concat( Array.isArray( p ) ? p : [ p ] ) } )

            $( '#config' ).value = safeJson( flat )
            dropped = flat
            showPanel( 'config' )
            log( 'config', 'loaded ' + files.length + ' file(s)' )
            setNeedRestart( 'config loaded' )
        } )
        .catch( function ( e ) { log( 'error', 'file: ' + e.message ) } )
}

function safeJson( v ) {
    var seen = []
    return JSON.stringify( v, function ( k, val ) {
        if ( typeof val === 'function' ) return '[function]'
        if ( val && typeof val === 'object' ) {
            if ( seen.indexOf( val ) >= 0 ) return '[circular]'
            seen.push( val )
        }
        return val
    }, 2 )
}

// ---------------------------------------------------------------------------
// Page wiring
// ---------------------------------------------------------------------------

/** A custom property, so the side layout's `height: auto` can still win. */
function setFrameHeight( px ) {
    document.documentElement.style.setProperty( '--frame-h', px + 'px' )
}

function debounce( fn, ms ) {
    var t = null
    return function () { clearTimeout( t ); t = setTimeout( fn, ms ) }
}

function el( tag, cls, text ) {
    var e = document.createElement( tag )
    if ( cls ) e.className = cls
    if ( text !== undefined ) e.textContent = text
    return e
}

function showPanel( name ) {
    $$( '#tabs button' ).forEach( function ( b ) { b.classList.toggle( 'on', b.dataset.panel === name ) } )
    $$( '#panels > section' ).forEach( function ( s ) { s.classList.toggle( 'on', s.dataset.panel === name ) } )
}

/** hostSel may name more than one host; one input drives them all. */
function wireFilter( inputSel, hostSel ) {
    var rowSel = hostSel.split( ',' ).map( function ( h ) { return h.trim() + ' .row' } ).join( ', ' )

    $( inputSel ).oninput = function () {
        var q = this.value.toLowerCase()
        $$( rowSel ).forEach( function ( row ) {
            var hit = !q || ( row.dataset.name || '' ).indexOf( q ) >= 0
            row.style.display = hit ? '' : 'none'
            var args = row.nextElementSibling
            if ( args && args.classList.contains( 'args' ) ) args.style.display = hit ? '' : 'none'
        } )
    }
}

/**
 * The deep link.
 *
 * One goto sets the whole page, so a test does not drive four selects and wait
 * for four restarts. The controls write it back, so a link is copyable.
 *
 *   ?build=both&viewer=leaflet&story=layers&theme=wf&mobile=1&sync=1
 *   &tools=measure,identify&config=../layer/prot-danger-rating.json
 */
var LINKED = [
    [ '#build', 'build' ], [ '#viewer', 'viewer' ], [ '#story', 'story' ],
    [ '#theme', 'theme' ], [ '#mobile', 'mobile' ], [ '#sync', 'sync' ],
]

function readQuery() {
    LINKED.forEach( function ( pair ) {
        var v = QUERY.get( pair[ 1 ] )
        if ( v === null ) return
        var node = $( pair[ 0 ] )
        if ( node.type === 'checkbox' ) { node.checked = v !== '0' && v !== 'false'; return }

        // A value no option carries used to be dropped in silence, so the page
        // ran the first Story and the link looked as if it had worked. A stale
        // cached harness.js does exactly this.
        if ( [].some.call( node.options, function ( o ) { return o.value === v } ) ) node.value = v
        else console.warn( 'harness: ?' + pair[ 1 ] + '=' + v + ' is not an option here - using "' +
                           node.value + '". A cached harness.js does this.' )
    } )

    ;( QUERY.get( 'remove' ) || '' ).split( ',' ).filter( Boolean )
        .forEach( function ( t ) { removedTools[ t ] = true } )

    ;( QUERY.get( 'tools' ) || '' ).split( ',' ).filter( Boolean )
        .forEach( function ( t ) { extraTools[ t ] = true } )

    var cfg = ( QUERY.get( 'config' ) || '' ).split( ',' ).filter( Boolean )
    if ( cfg.length ) {
        dropped = cfg
        $( '#config' ).value  = safeJson( cfg )
        $( '#merge' ).checked = QUERY.get( 'merge' ) !== '0'
    }
}

function writeQuery() {
    var q = new URLSearchParams()
    LINKED.forEach( function ( pair ) {
        var node = $( pair[ 0 ] )
        var v = node.type === 'checkbox' ? ( node.checked ? '1' : '' ) : node.value
        if ( v ) q.set( pair[ 1 ], v )
    } )
    var extra = Object.keys( extraTools )
    if ( extra.length ) q.set( 'tools', extra.join( ',' ) )
    var removed = Object.keys( removedTools )
    if ( removed.length ) q.set( 'remove', removed.join( ',' ) )

    history.replaceState( null, '', location.pathname + '?' + q )
}

document.addEventListener( 'DOMContentLoaded', function () {
    var sel = $( '#story' )
    Object.keys( STORIES ).forEach( function ( k ) {
        var o = document.createElement( 'option' )
        o.value = k
        o.textContent = STORIES[ k ].title
        sel.appendChild( o )
    } )

    readQuery()

    $$( '#tabs button' ).forEach( function ( b ) {
        b.onclick = function () { showPanel( b.dataset.panel ) }
    } )

    $( '#restart' ).onclick = function () {
        try { useConfigText() } catch ( e ) { log( 'error', 'config: ' + e.message ); return }
        restart()
    }

    ;[ '#story', '#viewer', '#build', '#theme', '#mobile' ].forEach( function ( s ) {
        $( s ).onchange = function () { writeQuery(); restart() }
    } )

    // No restart needed - it only moves the panes that are already running.
    $( '#sync' ).onchange = function () { writeQuery(); syncViews() }

    // The side layout gives the frame its height in CSS, so this does nothing
    // there. That is why the label says so.
    $( '#height' ).oninput = function () {
        setFrameHeight( this.value )
        resizeAll()
    }
    setFrameHeight( $( '#height' ).value )

    // The layout flips at a width breakpoint, which changes every map's box.
    window.addEventListener( 'resize', debounce( resizeAll, 150 ) )

    $$( '#panels [data-all]' ).forEach( function ( b ) {
        b.onclick = function () {
            if ( !smk ) return
            var part = b.dataset.all.split( ':' )
            var on = part[ 1 ] === '1'
            Object.keys( smk.$tool ).forEach( function ( id ) {
                if ( part[ 0 ] in smk.$tool[ id ].$prop ) smk.$tool[ id ][ part[ 0 ] ] = on
            } )
            buildTools()
            log( 'set', 'all ' + part[ 0 ] + ' = ' + on )
        }
    } )

    $$( '#panels [data-layers]' ).forEach( function ( b ) {
        b.onclick = function () {
            var dc = layerContext()
            if ( !dc ) return
            var on = b.dataset.layers === '1'
            dc.getLayerIds().forEach( function ( id ) { dc.setItemVisible( id, on ) } )
            repaintLayers()
            buildLayers()
        }
    } )

    wireFilter( '#tool-filter',  '#tools, #catalogue' )
    wireFilter( '#layer-filter', '#layers, #layer-types' )

    $( '#clear-log' ).onclick = function () { $( '#log' ).innerHTML = '' }
    $( '#log-view' ).onchange = function () { logView = this.checked }

    $( '#pick' ).onclick = startPicking
    $( '#measure' ).onclick = function () {
        var q = $( '#sel' ).value.trim()
        var node = null
        try { node = q && document.querySelector( q ) } catch ( e ) {
            $( '#inspect' ).textContent = 'bad selector: ' + e.message
            return
        }
        $( '#inspect' ).textContent = node ? describe( node ) : 'no element matches that selector'
    }

    $( '#config' ).oninput  = function () { setNeedRestart( 'config changed' ) }
    $( '#merge' ).onchange  = function () { setNeedRestart( 'merge changed' ) }

    $( '#dump' ).onclick = function () {
        $( '#config' ).value = safeJson( smk && smk.getConfig ? smk.getConfig() : currentConfig() )
    }

    $( '#pick-file' ).onclick = function () { $( '#file' ).click() }
    $( '#file' ).onchange     = function () { loadFiles( this.files ) }

    var drop = $( '#drop' )
    ;[ 'dragenter', 'dragover' ].forEach( function ( e ) {
        drop.addEventListener( e, function ( ev ) { ev.preventDefault(); drop.classList.add( 'over' ) } )
    } )
    ;[ 'dragleave', 'drop' ].forEach( function ( e ) {
        drop.addEventListener( e, function ( ev ) { ev.preventDefault(); drop.classList.remove( 'over' ) } )
    } )
    drop.addEventListener( 'drop', function ( ev ) { loadFiles( ev.dataTransfer.files ) } )

    start()
} )

} )()
