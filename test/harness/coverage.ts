/**
 * V8 coverage from the harness runs, mapped back to src/**\/*.ts.
 *
 * Each test file has its own browser and its own module state, so a file that
 * wrote the report itself would overwrite the file before it and the number
 * would be the last file's alone. Each page drops its raw ranges in
 * coverage/harness-raw/ instead, and build/coverage-report.js merges them once.
 *
 * The ranges alone are kept: the bundle's source and its map are read back at
 * report time, so a run does not write 2.5MB per page.
 *
 * Off unless SMK_COVERAGE is set. Collecting costs time on every page, and the
 * suite is about behaviour, not the number.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import type { Page } from 'playwright'

const ROOT = resolve( import.meta.dirname, '..', '..' )

// NOT under coverage/: `npm run coverage` empties that directory, and it
// runs before the harness in `npm run coverage:all`.
export const RAW_DIR   = resolve( ROOT, '.harness-coverage' )
export const collecting = !!process.env.SMK_COVERAGE

let written = 0

export async function startCoverage( page: Page ): Promise<void> {
    if ( !collecting ) return
    // resetOnNavigation false: the harness restarts the map in place, and a
    // restart must not throw away what the first start covered.
    await page.coverage.startJSCoverage( { resetOnNavigation: false } ).catch( () => {} )
}

export async function stopCoverage( page: Page ): Promise<void> {
    if ( !collecting ) return

    const list = await page.coverage.stopJSCoverage().catch( () => [] )
    const ours = list
        .filter( ( e: any ) => e.url.indexOf( 'smk.es.js' ) >= 0 )
        .map( ( e: any ) => ( { url: e.url, functions: e.functions } ) )

    if ( !ours.length ) return

    mkdirSync( RAW_DIR, { recursive: true } )
    written += 1
    writeFileSync( join( RAW_DIR, `${ process.pid }-${ Date.now() }-${ written }.json` ),
        JSON.stringify( ours ) )
}
