/**
 * Open one build in a browser and bring back a Record.
 *
 * v2 loads the harness page with a deep link. SMK 1.0 loads its own reference
 * page directly — the harness holds it in an iframe for a person, but a test
 * has no reason to go through one.
 */
import { chromium, type Browser, type Page } from 'playwright'
import { serveRepo, type Static } from './server'
import { PAGE_RECORD, normaliseRequests, type Record as SmkRecord } from './record'
import { startCoverage, stopCoverage } from './coverage'

export type Build  = 'v2' | '1.0' | 'host'
export type Viewer = 'leaflet' | 'maplibre'

export interface OpenOpts {
    build?:  Build
    viewer?: Viewer
    theme?:  string
    story?:  string
    /** Catalogue tool types to build. They restart the map, so they go in the link. */
    tools?:  string[]
    /** Config fragment urls, absolute from the server root. */
    config?: string[]
    /** Keep the Story as well. A scenario config replaces it by default. */
    merge?: boolean
}

export interface Run {
    record: SmkRecord
    state:  string
    errors: string[]
    page:   Page
    close(): Promise<void>
}

let server:  Static | null = null
let browser: Browser | null = null

/** One server and one browser for the whole file. */
export async function up() {
    if ( !server )  server  = await serveRepo()
    if ( !browser ) browser = await chromium.launch( { headless: true } )
    return { server, browser }
}

export async function down() {
    await browser?.close(); browser = null
    await server?.close();  server  = null
}

/** The harness Map height slider starts here, so a v2 pane frame is this tall. */
export const PANE_HEIGHT = 480

/** The four Sample layers, as the harness Story loads them. */
export const STORY_LAYERS = [
    '/debug/layer/prot-danger-rating.json',
    '/debug/layer/basemapping-gba-railway-tracks-sp-railway-tracks.json',
    '/debug/layer/forest-tenure-ften-recreation-poly.json',
    '/debug/layer/wms-imagery-and-base-maps-gsr-schools-k-to-12.json',
]

function url( base: string, o: OpenOpts ): string {
    const theme  = o.theme  || 'wf'
    const config = o.config || STORY_LAYERS

    // A Host of our own, doing what WFNEWS does: load a plugin script, add a
    // Layer type and a Tool, set handlers, then INIT with an element. It deliberately does not load the ArcGIS API.
    if ( o.build === 'host' )
        return `${ base }/debug/harness/host.html?viewer=${ o.viewer || 'leaflet' }` +
               `&theme=${ theme }&h=${ PANE_HEIGHT }`

    // The 1.0 pane must be the same box as a v2 pane, or the two fit one
    // extent to two zooms and the whole view comparison is meaningless.
    if ( o.build === '1.0' )
        return `${ base }/debug/harness/ref10.html?theme=${ theme }&h=${ PANE_HEIGHT }` +
               `&config=${ encodeURIComponent( config.join( ',' ) ) }` +
               ( o.tools?.length ? `&tools=${ encodeURIComponent( o.tools.join( ',' ) ) }` : '' )

    const q = new URLSearchParams( {
        build:  'v2',
        viewer: o.viewer || 'leaflet',
        story:  o.story  || 'layers',
        theme,
    } )
    if ( o.tools?.length ) q.set( 'tools', o.tools.join( ',' ) )
    if ( o.config ) {
        q.set( 'config', o.config.join( ',' ) )
        // One scenario at a time. Merged with the Story, every case would also
        // record the Story's four layers.
        if ( !o.merge ) q.set( 'merge', '0' )
    }
    return `${ base }/debug/harness/?${ q }`
}

/** SMK.MAP is keyed differently on the two pages. */
function mapId( o: OpenOpts ): string {
    if ( o.build === '1.0' )  return 'ref'
    if ( o.build === 'host' ) return 'host'
    return 'harness-' + ( o.viewer || 'leaflet' )
}

async function waitReady( page: Page, ms: number ): Promise<string> {
    const until = Date.now() + ms
    while ( Date.now() < until ) {
        const flag = await page.evaluate( () => document.body.dataset.harness || null ).catch( () => null )
        if ( flag && flag !== 'starting' ) return flag
        await page.waitForTimeout( 200 )
    }
    return 'TIMED OUT'
}

export async function open( o: OpenOpts = {}, timeout = 90000 ): Promise<Run> {
    const { server, browser } = await up()
    const page = await browser.newPage( { viewport: { width: 1400, height: 900 } } )

    const errors:   string[] = []
    const warnings: string[] = []
    const requests: string[] = []
    page.on( 'pageerror', e => errors.push( 'pageerror: ' + e.message ) )
    page.on( 'console', m => {
        if ( m.type() === 'error' ) return errors.push( 'console: ' + m.text() )
        // A layer that would not build only ever said so in a warning, so the
        // record keeps them. The GPU driver's own chatter is not ours.
        if ( m.type() === 'warning' && m.text().indexOf( '[.WebGL' ) < 0 )
            warnings.push( m.text() )
    } )
    page.on( 'request', r => requests.push( r.url() ) )

    await startCoverage( page )
    await page.goto( url( server.url, o ), { waitUntil: 'domcontentloaded' } )
    const state  = await waitReady( page, timeout )
    const record = await page.evaluate( PAGE_RECORD, mapId( o ) ) as SmkRecord

    record.requests = normaliseRequests( requests )
    record.console  = [ ...new Set( errors.map( e => e.slice( 0, 120 ) ) ) ].sort()
    record.warnings = [ ...new Set( warnings.map( w => w.slice( 0, 120 ) ) ) ].sort()

    return {
        record, state, errors, page,
        close: async () => { await stopCoverage( page ); await page.close() },
    }
}
