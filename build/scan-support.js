/**
 * scan-support — read which Viewer implements which Tool and which Layer type.
 *
 * A Layer adapter registers itself as `Layer[ type ][ viewer ]`, so a browser
 * can read that pairing back. A Tool initializer registers nothing: it tests
 * `smk.$viewer.type` inside its own body, and some test the map object instead
 * (`if ( !smk.$viewer.map?.dragPan ) return`). So there is no run-time source
 * for tool support, and a hand-written table would go stale.
 *
 * The file tree is the source of truth, so read it at build time and ship the
 * answer as a constant. Both vite configs import this, so they cannot drift.
 *
 * Layout it reads:
 *   src/smk/tool/<name>/                        the shared half of a tool
 *   src/smk/viewer-<viewer>/tool/<name>/        the viewer half
 *   src/smk/viewer-<viewer>/layer/layer-<type>-<viewer>.ts
 */

import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

function dirs( path ) {
    if ( !existsSync( path ) ) return []
    return readdirSync( path, { withFileTypes: true } )
        .filter( e => e.isDirectory() )
        .map( e => e.name )
}

function files( path ) {
    if ( !existsSync( path ) ) return []
    return readdirSync( path, { withFileTypes: true } )
        .filter( e => e.isFile() )
        .map( e => e.name )
}

export function scanSupport( root ) {
    const smk = join( root, 'src', 'smk' )

    const viewers = dirs( smk )
        .filter( d => d.indexOf( 'viewer-' ) === 0 )
        .map( d => d.slice( 'viewer-'.length ) )
        .sort()

    // Every tool with a shared half. A tool with no viewer half runs everywhere.
    const tools = {}
    dirs( join( smk, 'tool' ) ).forEach( name => {
        tools[ name ] = { shared: true, viewers: [] }

        // A parent directory also holds its sub-tools as tool-<name>.ts files —
        // tool-identify-list.ts and so on. They register their own tool type, so
        // they show up in a tool list, and a directory scan alone misses them.
        files( join( smk, 'tool', name ) ).forEach( file => {
            if ( file.indexOf( 'tool-' ) !== 0 || !file.endsWith( '.ts' ) ) return
            const sub = file.slice( 'tool-'.length, file.length - '.ts'.length )
            if ( sub === name || tools[ sub ] ) return
            tools[ sub ] = { shared: true, viewers: [], parent: name }
        } )
    } )

    const layers = {}

    viewers.forEach( viewer => {
        const viewerTools = join( smk, 'viewer-' + viewer, 'tool' )

        dirs( viewerTools ).forEach( name => {
            if ( !tools[ name ] ) tools[ name ] = { shared: false, viewers: [] }
            tools[ name ].viewers.push( viewer )
        } )

        // A loose tool-<name>-<viewer>.ts beside those directories is a viewer
        // half with no directory of its own.
        files( viewerTools ).forEach( file => {
            if ( file.indexOf( 'tool-' ) !== 0 || !file.endsWith( '-' + viewer + '.ts' ) ) return
            const name = file.slice( 'tool-'.length, file.length - ( '-' + viewer + '.ts' ).length )
            // Some of these register their type with the viewer name still on it
            // (tool-feature-list-clustering-leaflet), so record both spellings.
            ;[ name, name + '-' + viewer ].forEach( key => {
                if ( !tools[ key ] ) tools[ key ] = { shared: false, viewers: [] }
                if ( tools[ key ].viewers.indexOf( viewer ) < 0 ) tools[ key ].viewers.push( viewer )
            } )
        } )

        // layer-<type>-<viewer>.ts — the type may hold dashes, so strip the ends.
        const prefix = 'layer-'
        const suffix = '-' + viewer + '.ts'
        files( join( smk, 'viewer-' + viewer, 'layer' ) ).forEach( file => {
            if ( file.indexOf( prefix ) !== 0 || !file.endsWith( suffix ) ) return
            const type = file.slice( prefix.length, file.length - suffix.length )
            if ( !layers[ type ] ) layers[ type ] = []
            layers[ type ].push( viewer )
        } )
    } )

    Object.keys( tools ).forEach( k => tools[ k ].viewers.sort() )
    Object.keys( layers ).forEach( k => layers[ k ].sort() )

    return { viewers, tools, layers }
}

export default scanSupport
