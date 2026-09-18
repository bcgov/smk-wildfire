import { defineConfig } from 'vite'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { playwright } from '@vitest/browser-playwright'

/// <reference types="vitest/config" />

// Helper: run a git command and return its trimmed output, or a fallback
// string if git is unavailable (e.g. in a CI environment without a clone).
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
    // Build-time constants substituted into src/smk/bootstrap.ts
    define: {
        __SMK_COMMIT__:      JSON.stringify( git( 'rev-parse HEAD' ) ),
        __SMK_BRANCH__:      JSON.stringify( git( 'rev-parse --abbrev-ref HEAD' ) ),
        __SMK_LAST_COMMIT__: JSON.stringify( git( 'log -1 --format=%ci' ) ),
        __SMK_ORIGIN__:      JSON.stringify( git( 'remote get-url origin' ) ),
        __SMK_VERSION__:     JSON.stringify( process.env.npm_package_version || 'unknown' ),
    },

    build: {
        lib: {
            entry: resolve( import.meta.dirname, 'src/main.ts' ),
            name: 'SMK',
            // Produces dist/smk.es.js (tree-shakeable) and dist/smk.umd.js (script tag drop-in)
            fileName: ( format ) => `smk.${ format }.js`,
            formats: [ 'es', 'umd' ],
        },
        outDir: 'dist',
        minify: 'terser',
        // During transition: Grunt also writes dist/smk.js; keep emptyOutDir off to keep
        // original smk.js in place  (should be functionally the same as the new versions)
        emptyOutDir: false,
        sourcemap: true,
        rollupOptions: {
            // External dependencies that are expected to be provided by the host
            // page (loaded via <script> tags from src/lib/*).  Listed here so that
            // any future `import 'leaflet'` etc. resolves to the global rather
            // than bundling a second copy.
            external: [
                'vue',
                'leaflet',
                'maplibre-gl',
                'proj4',
                '@turf/turf',
                'esri-leaflet',
                'esri-leaflet-vector',
            ],
            output: {
                globals: {
                    'vue':                 'Vue',
                    'leaflet':             'L',
                    'maplibre-gl':         'maplibregl',
                    'proj4':               'proj4',
                    '@turf/turf':          'turf',
                    'esri-leaflet':        'L.esri',
                    'esri-leaflet-vector': 'L.esri.Vector',
                },
            },
        },
    },

    server: {
        port: 8080,
        open: '/debug',
    },

    resolve: {
        // Prefer .ts over .js so that converted modules shadow their .js originals
        // during the incremental migration. Remove once all .js sources are gone.
        extensions: [ '.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs' ],
        alias: {
            '@': resolve( import.meta.dirname, 'src' ),
        },
    },

    test: {
        globals: true,

        coverage: {
            provider: 'v8',
            // json-summary so build/coverage-report.js can print the unit
            // number beside the harness one.
            reporter: [ 'text-summary', 'html', 'json-summary' ],
            reportsDirectory: 'coverage',
            include: [ 'src/**/*.ts' ],
            // Vendored libraries and the entry barrel are not ours to test.
            exclude: [ 'src/lib/**', 'src/main.ts', 'src/styles.ts' ],
        },

        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    // jsdom gives us window/document so browser code runs in Node
                    environment: 'jsdom',
                    include: [ 'test/unit/**/*.test.ts' ],
                },
            },
            {
                extends: true,
                test: {
                    name: 'harness',
                    // It drives a real browser itself, so it runs in node.
                    // It needs dist/ built - `npm run test:harness` does that.
                    environment: 'node',
                    // Nothing here in CI. The harness drives real maps against
                    // live BC services and the ArcGIS API, and a suite that
                    // fails on a good day gets switched off. Run it locally.
                    include: process.env.CI ? [] : [ 'test/harness/**/*.test.ts' ],
                    testTimeout: 120000,
                    hookTimeout: 300000,
                    // One browser and one server per file, so files cannot share.
                    fileParallelism: false,
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser',
                    include: [ 'test/browser/**/*.test.ts' ],
                    // Layout and the CSS cascade have no answer in jsdom.
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        instances: [ { browser: 'chromium' } ],
                    },
                },
            },
        ],
    },
} )
