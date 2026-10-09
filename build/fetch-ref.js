/**
 * Put the SMK 1.0 reference build, which git excludes, in ref/smk-1.0/. It is the
 * last release of the line v2 came from, not the WFNEWS build. See CONTEXT.md D20.
 */
import { execSync } from 'child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

const PKG = '@qqnluaq/smk@1.0.39'
const out = resolve( import.meta.dirname, '..', 'ref', 'smk-1.0' )
const tmp = mkdtempSync( join( tmpdir(), 'smk-ref-' ) )

try {
    const tgz = execSync( `npm pack ${ PKG } --silent`, { cwd: tmp } ).toString().trim().split( /\r?\n/ ).pop()
    execSync( `tar -xzf ${ tgz }`, { cwd: tmp } )

    // Empty the directory rather than remove it: a running dev server watches it,
    // and Windows refuses to remove a watched directory.
    mkdirSync( out, { recursive: true } )
    for ( const f of readdirSync( out ) ) rmSync( join( out, f ), { recursive: true, force: true } )
    cpSync( join( tmp, 'package', 'dist' ), out, { recursive: true } )

    console.log( `${ PKG } -> ref/smk-1.0/` )
} finally {
    rmSync( tmp, { recursive: true, force: true } )
}
