/**
 * Merge the harness project's raw V8 ranges into one report.
 *
 * The bundle is minified, so dist/smk.es.js.map does the work — it carries 133
 * source files with their content. Attach the source and the map here rather
 * than writing 2.5MB beside every page's ranges.
 */
import { readdirSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import MCR from 'monocart-coverage-reports'

const ROOT = resolve( import.meta.dirname, '..' )
const RAW  = resolve( ROOT, '.harness-coverage' )
const JS   = resolve( ROOT, 'dist', 'smk.es.js' )
const MAP  = resolve( ROOT, 'dist', 'smk.es.js.map' )

if ( process.env.CI ) {
    console.log( 'harness coverage: skipped in CI - the suite it measures does not run there.' )
    process.exit( 0 )
}

if ( !existsSync( RAW ) ) {
    console.log( 'no raw coverage - run `npm run coverage:harness` first' )
    process.exit( 0 )
}

const source    = readFileSync( JS, 'utf8' )
const sourceMap = JSON.parse( readFileSync( MAP, 'utf8' ) )

const entries = []
for ( const f of readdirSync( RAW ).filter( n => n.endsWith( '.json' ) ) )
    for ( const e of JSON.parse( readFileSync( join( RAW, f ), 'utf8' ) ) )
        entries.push( { ...e, source, sourceMap } )

if ( !entries.length ) {
    console.log( 'no coverage entries' )
    process.exit( 0 )
}

const mcr = MCR( {
    name:      'SMK harness project',
    outputDir: resolve( ROOT, 'coverage', 'harness' ),
    reports:   [ 'v8', 'console-summary', 'json-summary' ],
    logging:   'error',
    // Ours only. The bundle also holds the libraries a host supplies.
    sourceFilter: p => /(^|\/)src\//.test( p ) && p.endsWith( '.ts' ),
} )

await mcr.add( entries )
const result = await mcr.generate()

/*
 * The two projects are reported side by side, not as one figure.
 *
 * A single number would need both to emit raw V8 ranges. vitest's v8 provider
 * writes an istanbul report instead, and feeding that to this reporter makes it
 * read istanbul data as V8 and throw. Adding it up by hand would be worse than
 * useless: the two sets hardly overlap, so a sum would double-count nothing and
 * still not be a coverage figure.
 */
const SUMMARY = resolve( ROOT, 'coverage', 'coverage-summary.json' )
if ( existsSync( SUMMARY ) ) {
    try {
        const t = JSON.parse( readFileSync( SUMMARY, 'utf8' ) ).total
        const pct = k => ( t[ k ] ? t[ k ].pct : '?' ) + '%'
        console.log( `
unit project    statements ${ pct( 'statements' ) }  ` +
            `branches ${ pct( 'branches' ) }  functions ${ pct( 'functions' ) }  lines ${ pct( 'lines' ) }` )
        console.log( 'harness project the table above' )
    } catch ( e ) {
        console.warn( 'could not read the unit summary:', e.message )
    }
} else {
    console.log( '\nrun `npm run coverage` to see the unit project beside this' )
}

console.log( `\n${ entries.length } page recordings, ${ result.files.length } source files` )
