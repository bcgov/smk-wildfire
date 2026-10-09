/**
 * Run the harness project, unless this is CI.
 *
 * The harness drives real maps against four live BC services and the ArcGIS
 * API. CI has no route to them, and a suite that fails on a good day gets
 * switched off. So it runs locally, and the recorded results stay local too.
 *
 * Pass --coverage to collect V8 coverage as well.
 */
import { spawnSync } from 'child_process'
import { rmSync } from 'fs'
import { resolve } from 'path'

const coverage = process.argv.includes( '--coverage' )

if ( process.env.CI ) {
    console.log( 'harness project: skipped in CI - it needs the live map services.' )
    console.log( 'Run it locally with `npm run test:harness`.' )
    process.exit( 0 )
}

// A run must not add to the last one's ranges.
if ( coverage )
    rmSync( resolve( import.meta.dirname, '..', '.harness-coverage' ), { recursive: true, force: true } )

const r = spawnSync( 'npx', [ 'vitest', 'run', '--project', 'harness' ], {
    stdio: 'inherit',
    shell: true,
    env: coverage ? { ...process.env, SMK_COVERAGE: '1' } : process.env,
} )

process.exit( r.status ?? 1 )
