/**
 * Standalone "batteries-included" build.
 *
 * Produces dist/smk.standalone.js + dist/smk.standalone.css — a single drop-in
 * UMD bundle that contains SMK *and* every external library it depends on
 * (Vue, Leaflet, MapLibre GL, esri-leaflet, esri-leaflet-vector, proj4,
 * @turf/turf, Terraformer).
 *
 * The lite build (`vite.config.js` → smk.es.js / smk.umd.js / smk.css) keeps
 * those libs `external` and expects the host page to load them via <script>
 * tags from src/lib/*.  This standalone build is for consumers who'd rather
 * include a single file.
 *
 * Run via `npm run build:standalone`, or as part of `npm run build`.
 */

import { defineConfig } from 'vite'
import { resolve } from 'path'
import { scanSupport } from './build/scan-support.js'
import { execSync } from 'child_process'
import { createRequire } from 'module'
import { vueTemplates, templateCompilerAsset, VUE_DEFINES } from './build/vue-templates.js'

const pkg = createRequire( import.meta.url )( './package.json' )
const version = pkg.version || 'unknown'

function git( cmd ) {
    try {
        return execSync( `git ${ cmd }`, { cwd: import.meta.dirname, stdio: [ 'pipe', 'pipe', 'ignore' ] } )
            .toString()
            .trim()
    } catch {
        return 'unknown'
    }
}

export default defineConfig( {
    plugins: [ vueTemplates(), templateCompilerAsset() ],

    define: {
        ...VUE_DEFINES,
        // Vue reads process.env.NODE_ENV, which does not exist in a browser.
        'process.env.NODE_ENV': JSON.stringify( 'production' ),

        // Which viewer implements which tool and layer type. Read from the
        // file tree at build time, because nothing registers it at run time.
        __SMK_SUPPORT__:     JSON.stringify( scanSupport( import.meta.dirname ) ),

        __SMK_COMMIT__:      JSON.stringify( git( 'rev-parse HEAD' ) ),
        __SMK_BRANCH__:      JSON.stringify( git( 'rev-parse --abbrev-ref HEAD' ) ),
        __SMK_LAST_COMMIT__: JSON.stringify( git( 'log -1 --format=%ci' ) ),
        __SMK_ORIGIN__:      JSON.stringify( git( 'remote get-url origin' ) ),
        __SMK_VERSION__:     JSON.stringify( process.env.npm_package_version || version ),
    },

    build: {
        lib: {
            entry: resolve( import.meta.dirname, 'src/standalone-entry.ts' ),
            name: 'SMK',
            // A stable name: the version lives in package.json, so a consumer's
            // build config does not change with every SMK release.
            fileName: () => 'smk.standalone.js',
            formats: [ 'umd' ],
        },
        outDir: 'dist',
        minify: 'terser',
        // Don't wipe the lite build that ran first
        emptyOutDir: false,
        sourcemap: true,
        // Bigger bundle — raise warning threshold so it doesn't spam logs
        chunkSizeWarningLimit: 6000,
        rollupOptions: {
            // No externals — bundle everything
            output: {
                assetFileNames: ( info ) => {
                    if ( info.name && info.name.endsWith( '.css' ) ) return 'smk.standalone.css'
                    return info.name || 'asset-[hash][extname]'
                },
            },
        },
    },

    resolve: {
        extensions: [ '.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs' ],
        alias: {
            '@': resolve( import.meta.dirname, 'src' ),
            // The package's `browser` field is the whole UMD bundle, which
            // cannot be tree-shaken. SMK calls about 30 of turf's functions.
            '@turf/turf': '@turf/turf/turf.es.js',
        },
    },
} )
