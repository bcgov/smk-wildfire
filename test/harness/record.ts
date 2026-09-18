/**
 * The Record — everything a Host can observe from one run.
 *
 * The suite compares Records; it does not assert. See CONTEXT.md D8.
 *
 * PAGE_RECORD runs inside the browser, on SMK 1.0 and on v2 alike, so it must
 * stay plain and defensive: 1.0 publishes less than v2, and a missing branch
 * must give null, not throw.
 */

export interface Record {
    globals:        string[]
    typeKeys:       string[]
    viewerKeys:     string[]
    layerKeys:      string[]
    hasInclude:     boolean
    configTools:    string[]
    configToolKeys: { [ type: string ]: string }
    built:          string[] | null
    /** Per tool, the flags a Host and a Theme can see. */
    toolState:      { [ id: string ]: string } | null
    builtTypes:     string[] | null
    viewerType:     string | null
    layerIds:       string[] | null
    widgets:        string[]
    domClasses:     string[]
    view:           { zoom: number; lon: number; lat: number } | string | null
    /** The map's box. Two panes of different sizes fit one extent to two zooms. */
    screen:         { width: number; height: number } | null
    requests?:      string[]
    console?:       string[]
    /** SMK's own warnings. A layer that will not build used to hide in here. */
    warnings?:      string[]
}

/** Read the Host surface. Evaluated in the page. */
export const PAGE_RECORD = ( mapId: string ) => {
    const S: any = ( window as any ).SMK
    const map = S && S.MAP && S.MAP[ mapId ]
    const keys = ( o: any ) => o ? Object.keys( o ).sort() : []

    // The tool list a map starts from. v2 keeps each type's defaults with the
    // Tool; 1.0 kept them all in SMK.CONFIG.tools.
    const startTools: any[] = S && S.TYPE && S.TYPE.Tool && S.TYPE.Tool.defaults
        ? S.TYPE.mergeConfigs( [] ).tools
        : ( S && S.CONFIG && S.CONFIG.tools ) || []

    const rec: any = {
        globals:    keys( S ).filter( ( k: string ) => k === k.toUpperCase() ),
        typeKeys:   keys( S && S.TYPE ),
        viewerKeys: keys( S && S.TYPE && S.TYPE.Viewer ).filter( ( k: string ) => /^[a-z]/.test( k ) ),
        layerKeys:  keys( S && S.TYPE && S.TYPE.Layer ).filter( ( k: string ) => /^[a-z]/.test( k ) ),
        hasInclude: typeof ( window as any ).include === 'function',
        configTools: startTools
            .map( ( t: any ) => t.type + ( t.enabled === true ? '!' : '' ) ).sort(),
        configToolKeys: {},
        built:      map ? keys( map.$tool ) : null,
        builtTypes: map ? keys( map.$toolType ) : null,
        viewerType: ( map && map.$viewer && map.$viewer.type ) || null,
        layerIds:   map && map.$viewer && map.$viewer.layerId ? keys( map.$viewer.layerId ) : null,
    }

    // The flags that reach the DOM as classes, so a difference names the tool
    // rather than leaving a bare class to hunt for.
    rec.toolState = null
    if ( map ) {
        rec.toolState = {}
        for ( const id of Object.keys( map.$tool ).sort() ) {
            const t = map.$tool[ id ]
            rec.toolState[ id ] = [ 'enabled', 'active', 'visible', 'showWidget', 'status' ]
                .filter( k => k in ( t.$prop || {} ) || t[ k ] !== undefined )
                .map( k => k + '=' + JSON.stringify( t[ k ] ) ).join( ' ' )
        }
    }

    // Which keys each default entry carries. The audit found eight losses here.
    startTools.forEach( ( t: any ) => {
        rec.configToolKeys[ t.type ] = Object.keys( t ).sort().join( ' ' )
    } )

    const frame = document.querySelector( '.smk-map-frame' ) || document.body

    // A tool that builds and renders nothing is the Vue compiler fault. Name the
    // widgets rather than count them, so the diff says which one went.
    rec.widgets = [ ...frame.querySelectorAll( '[class*="smk-"]' ) ]
        .map( e => String( e.className ) )
        .filter( c => c.indexOf( 'widget' ) >= 0 )
        .sort()

    rec.domClasses = [ ...new Set( [ ...frame.querySelectorAll( '[class]' ) ]
        .flatMap( e => String( e.className ).split( /\s+/ ) )
        .filter( c => c.indexOf( 'smk-' ) === 0 ) ) ].sort()

    if ( map && map.$viewer && map.$viewer.getView ) {
        try {
            const v = map.$viewer.getView()
            rec.view = {
                zoom: Math.round( v.zoom * 100 ) / 100,
                lon:  Math.round( v.center.longitude * 1000 ) / 1000,
                lat:  Math.round( v.center.latitude * 1000 ) / 1000,
            }
            // Comparing the view of two panes of different sizes says nothing.
            rec.screen = v.screen
                ? { width: Math.round( v.screen.width ), height: Math.round( v.screen.height ) }
                : null
        } catch ( e: any ) { rec.view = 'threw: ' + e.message }
    } else { rec.view = null; rec.screen = null }

    return rec
}

/**
 * Make a request url comparable.
 *
 * Two runs never ask for the same thing twice the same way: the host and port
 * move, a bbox differs in the last decimal, and a cache buster is pure noise.
 * An unstable field is a false failure, and a suite that cries wolf is turned
 * off, so normalise hard.
 */
const NOISE = [ '_', 'cacheBust', 'timestamp', 'token', 'f', 'callback' ]

/**
 * Host page furniture, not SMK behaviour.
 *
 * The v2 harness loads the ArcGIS API and a web font; the 1.0 reference page
 * loads neither. Comparing those would report the two documents, not the two
 * builds.
 */
const FURNITURE = [ 'js.arcgis.com', 'fonts.googleapis.com', 'fonts.gstatic.com' ]

export function normaliseUrl( raw: string ): string | null {
    // MapLibre fetches its workers as blobs, which name nothing.
    if ( /^(blob|data):/.test( raw ) ) return null

    let u: URL
    try { u = new URL( raw ) } catch { return null }

    // Only service traffic is interesting. The page's own files are not.
    if ( u.hostname === '127.0.0.1' || u.hostname === 'localhost' ) return null
    if ( FURNITURE.indexOf( u.hostname ) >= 0 ) return null

    const params: string[] = []
    u.searchParams.forEach( ( value, key ) => {
        const k = key.toLowerCase()
        if ( NOISE.indexOf( key ) >= 0 ) return

        // "include" is CQL for no filter. Leaflet sends it and MapLibre skips
        // it, and both send a real filter, so it is noise, not a difference.
        if ( k === 'cql_filter' && value === 'include' ) return

        // A bbox or a size differs run to run by fractions. Keep the shape.
        if ( k === 'bbox' )   return params.push( 'bbox=' + value.split( ',' ).length + ' numbers' )
        if ( k === 'size' )   return params.push( 'size=<size>' )
        if ( /^(width|height)$/.test( k ) ) return params.push( k + '=<px>' )
        params.push( key + '=' + value )
    } )

    // A tile path holds z/x/y, which changes with the fit. A trailing slash
    // names the same resource, and the two adapters spell it differently.
    const path = u.pathname
        .replace( /\/\d+\/\d+\/\d+(\.\w+)?$/, '/{z}/{y}/{x}$1' )
        .replace( /(.)\/$/, '$1' )
    return u.hostname + path + ( params.length ? '?' + params.sort().join( '&' ) : '' )
}

/** Drop duplicates and sort, so a record does not depend on request order. */
export function normaliseRequests( urls: string[] ): string[] {
    return [ ...new Set( urls.map( normaliseUrl ).filter( Boolean ) as string[] ) ].sort()
}
