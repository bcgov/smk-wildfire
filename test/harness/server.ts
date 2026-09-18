/**
 * A static server on the repository root.
 *
 * The harness reads ../../src/lib/, ../../dist/ and ../../ref/, so the root has
 * to be the repository, not debug/.
 */
import { createServer, type Server } from 'http'
import { readFile, statSync } from 'fs'
import { join, extname, resolve } from 'path'

const ROOT = resolve( import.meta.dirname, '..', '..' )

const MIME: Record<string, string> = {
    '.html': 'text/html',       '.js':   'text/javascript', '.mjs':  'text/javascript',
    '.css':  'text/css',        '.json': 'application/json', '.map': 'application/json',
    '.png':  'image/png',       '.jpg':  'image/jpeg',      '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',       '.svg':  'image/svg+xml',   '.ico':  'image/x-icon',
    '.woff': 'font/woff',       '.woff2':'font/woff2',      '.ttf':  'font/ttf',
    '.wasm': 'application/wasm',
}

export interface Static { url: string; close(): Promise<void> }

export function serveRepo(): Promise<Static> {
    const server: Server = createServer( ( req, res ) => {
        const path = decodeURIComponent( ( req.url || '/' ).split( '?' )[ 0 ] )
        let file = join( ROOT, path )

        try { if ( statSync( file ).isDirectory() ) file = join( file, 'index.html' ) } catch { /* 404 below */ }

        readFile( file, ( err, buf ) => {
            if ( err ) { res.writeHead( 404 ); return res.end( 'no ' + path ) }
            res.writeHead( 200, { 'content-type': MIME[ extname( file ).toLowerCase() ] || 'application/octet-stream' } )
            res.end( buf )
        } )
    } )

    return new Promise( done => server.listen( 0, '127.0.0.1', () => {
        const { port } = server.address() as { port: number }
        done( {
            url: `http://127.0.0.1:${ port }`,
            close: () => new Promise<void>( r => server.close( () => r() ) ),
        } )
    } ) )
}
