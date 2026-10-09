/**
 * MapLibre build: dist/smk.maplibre.js + .css.
 *
 * The standalone build with the MapLibre viewer only. It holds no Leaflet,
 * no esri-leaflet and no ESRI 3D viewer. See D25 in CONTEXT.md.
 *
 * Run via `npm run build:maplibre`, or as part of `npm run build`.
 */

import { mergeConfig } from 'vite'
import standalone from './vite.config.standalone.js'
import { resolve } from 'path'
import { scanSupport } from './build/scan-support.js'

const DROPPED = /[\\/]src[\\/]smk[\\/]viewer-(leaflet|esri3d)[\\/]/
const EMPTY   = '\0smk-dropped-viewer'

// main.ts imports every viewer. Answer each import of a dropped one with an
// empty module; a kept module that needs a name from one fails the build.
function dropViewers() {
    return {
        name:    'smk-drop-viewers',
        enforce: 'pre',
        async resolveId( source, importer, options ) {
            if ( !importer || !/viewer-(leaflet|esri3d)/.test( source ) ) return null
            const found = await this.resolve( source, importer, { ...options, skipSelf: true } )
            return found && DROPPED.test( found.id ) ? EMPTY : null
        },
        load( id ) {
            return id === EMPTY ? 'export {}' : null
        },
    }
}

export default mergeConfig( standalone, {
    plugins: [ dropViewers() ],

    define: {
        __SMK_SUPPORT__: JSON.stringify( scanSupport( import.meta.dirname, [ 'maplibre' ] ) ),
    },

    build: {
        lib: {
            entry:    resolve( import.meta.dirname, 'src/maplibre-entry.ts' ),
            fileName: () => 'smk.maplibre.js',
        },
        rollupOptions: {
            output: {
                assetFileNames: ( info ) => {
                    if ( info.name && info.name.endsWith( '.css' ) ) return 'smk.maplibre.css'
                    return info.name || 'asset-[hash][extname]'
                },
            },
        },
    },
} )
