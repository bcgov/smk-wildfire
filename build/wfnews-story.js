/**
 * Write debug/config/wfnews.json, the WFNEWS main map config, for the Harness "WFNEWS" Story.
 *
 * It runs WFNEWS's own mapConfig() against the values in WFNEWS's appConfig.json, so the
 * layers, their default visibility and the tools stay the same as WFNEWS. Run it again after
 * a WFNEWS map config change:  npm run story:wfnews [path-to-nr-bcws-wfnews]
 */
import ts from 'typescript'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'

const ROOT    = resolve( import.meta.dirname, '..' )
const WFNEWS  = resolve( process.argv[ 2 ] || join( ROOT, '..', 'nr-bcws-wfnews' ) )
const ANGULAR = join( WFNEWS, 'client/wfnews-war/src/main/angular/src' )
const SRC     = join( ANGULAR, 'app/services/map-config.service' )
const OUT     = join( ROOT, 'debug/config/wfnews.json' )
const TMP     = join( ROOT, 'node_modules/.cache/wfnews-story' )

// The Harness has none of WFNEWS's plugins, so these cannot build there.
const PLUGIN_TOOLS = [ 'time-dimension' ]

const isDir = p => { try { return statSync( p ).isDirectory() } catch { return false } }

function transpile( from, to ) {
    for ( const name of readdirSync( from, { withFileTypes: true } ) ) {
        const src = join( from, name.name )
        if ( name.isDirectory() ) { transpile( src, join( to, name.name ) ); continue }
        if ( !name.name.endsWith( '.ts' ) || name.name.endsWith( '.spec.ts' ) ) continue

        let js = ts.transpileModule( readFileSync( src, 'utf8' ), {
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
        } ).outputText
        // Node needs file extensions; the one value import from the app gets a stub.
        js = js.replace( /from '(\.{1,2}(?:\/[^']*)?)'/g, ( m, p ) =>
            `from '${ isDir( join( from, p ) ) ? p + '/index' : p }.js'` )
        js = js.replace( /from '@app\/utils'/, `from '${ pathToFileURL( join( TMP, 'utils-stub.js' ) ) }'` )
        js = js.replace( /^import[^;]*from '@(wf1|angular)\/[^']*';?\s*$/gm, '' )

        const out = join( to, name.name.replace( /\.ts$/, '.js' ) )
        mkdirSync( dirname( out ), { recursive: true } )
        writeFileSync( out, js )
    }
}

rmSync( TMP, { recursive: true, force: true } )
mkdirSync( TMP, { recursive: true } )
writeFileSync( join( TMP, 'utils-stub.js' ), 'export const isAndroidViaNavigator = () => false\n' )
writeFileSync( join( TMP, 'package.json' ), '{ "type": "module" }\n' )
transpile( SRC, join( TMP, 'map-config' ) )

// The layer files build SLD urls from window.location. A marker host lets them be rewritten below.
globalThis.window = { location: { protocol: 'wfnews:', host: 'HOST' }, innerWidth: 0 }

const appConfig = JSON.parse( readFileSync( join( ANGULAR, 'assets/data/appConfig.json' ), 'utf8' ) )
const appConfigService = { getConfig: () => appConfig }
const { mapConfig } = await import( pathToFileURL( join( TMP, 'map-config/map.config.js' ) ) )

const config = mapConfig( appConfig.mapServices, { useSecure: true, token: null }, 'desktop', appConfigService )

// The Harness picks the Viewer and the device, and navigation is a WFNEWS basemap.
delete config.viewer.type
delete config.viewer.device
delete config.viewer.baseMap
config.tools = config.tools.filter( t => !PLUGIN_TOOLS.includes( t.type ) )
// wms-time is a WFNEWS plugin type. As plain WMS it draws the service's default time.
config.layers.forEach( ly => { if ( ly.type === 'wms-time' ) ly.type = 'wms' } )

// Serve the SLD files that WFNEWS serves itself, from beside the config. WFNEWS names some
// that it does not ship; its fetch fails and SMK draws without them, so leave them out here.
const SLD_DIR = join( dirname( OUT ), 'wfnews' )
rmSync( SLD_DIR, { recursive: true, force: true } )
mkdirSync( SLD_DIR, { recursive: true } )
config.layers.forEach( ly => {
    const m = /^@wfnews:\/\/HOST\/assets\/js\/smk\/(.+\.sld)$/.exec( ly.sld || '' )
    if ( !m ) return
    const from = join( ANGULAR, 'assets/js/smk', m[ 1 ] )
    if ( !existsSync( from ) ) {
        console.warn( `WFNEWS has no ${ m[ 1 ] } (layer ${ ly.id }); left out` )
        delete ly.sld
        return
    }
    writeFileSync( join( SLD_DIR, m[ 1 ] ), readFileSync( from ) )
    ly.sld = '@../config/wfnews/' + m[ 1 ]
} )

// Marker and legend images are WFNEWS site files ("/assets/..."), so copy them too.
const copyAssets = v => {
    if ( Array.isArray( v ) ) return v.map( copyAssets )
    if ( v && typeof v === 'object' ) {
        Object.keys( v ).forEach( k => { v[ k ] = copyAssets( v[ k ] ) } )
        return v
    }
    if ( typeof v !== 'string' || !v.startsWith( '/assets/' ) ) return v
    const from = join( ANGULAR, v )
    if ( !existsSync( from ) ) { console.warn( `WFNEWS has no ${ v }; left as it is` ); return v }
    const to = join( SLD_DIR, v )
    mkdirSync( dirname( to ), { recursive: true } )
    writeFileSync( to, readFileSync( from ) )
    return '../config/wfnews' + v
}
copyAssets( config )

const json = JSON.stringify( config, null, 4 )
if ( /wfnews:\/\/HOST/.test( json ) ) throw new Error( 'a window.location url is left in the config' )
writeFileSync( OUT, json + '\n' )
rmSync( TMP, { recursive: true, force: true } )
console.log( `wrote ${ OUT }: ${ config.layers.length } layers, ${ config.tools.length } tools, from ${ WFNEWS }` )
