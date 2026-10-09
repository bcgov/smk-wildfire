/**
 * Compiles SMK's Vue templates at build time.
 *
 * `import render from './panel.html?vue'` gives the template's render function,
 * so no bundle carries Vue's template compiler. A Config popupTemplate is data,
 * not source, and still compiles at run time (see src/smk/vue.ts).
 */

import fs from 'fs'
import { compile } from '@vue/compiler-dom'

const QUERY = /\?vue$/

export function compileTemplate( source, file ) {
    const { code } = compile( source, {
        mode:              'module',
        prefixIdentifiers: true,
        hoistStatic:       true,
        cacheHandlers:     true,
        comments:          false,
        // Vue 2 kept whitespace between tags; condensing it moves inline boxes (D13).
        whitespace:        'preserve',
        onError( e ) { throw new Error( `${ file }: ${ e.message }` ) },
    } )
    return code + '\nexport default render\n'
}

/** Vue 3's compile-time flags: the Options API, and no devtools or hydration detail. */
export const VUE_DEFINES = {
    __VUE_OPTIONS_API__:                     'true',
    __VUE_PROD_DEVTOOLS__:                   'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
}

/** Puts Vue's template compiler beside the bundle, for a Config popupTemplate only. */
export function templateCompilerAsset() {
    return {
        name: 'smk-template-compiler-asset',
        generateBundle() {
            this.emitFile( {
                type:     'asset',
                fileName: 'smk-template-compiler.js',
                source:   fs.readFileSync( new URL( '../node_modules/@vue/compiler-dom/dist/compiler-dom.global.prod.js', import.meta.url ) ),
            } )
        },
    }
}

export function vueTemplates() {
    return {
        name:    'smk-vue-templates',
        enforce: 'pre',

        async resolveId( source, importer ) {
            if ( !QUERY.test( source ) ) return null
            const found = await this.resolve( source.replace( QUERY, '' ), importer, { skipSelf: true } )
            return found && found.id + '?vue'
        },

        load( id ) {
            if ( !QUERY.test( id ) ) return null
            const file = id.replace( QUERY, '' )
            this.addWatchFile( file )
            return compileTemplate( fs.readFileSync( file, 'utf8' ), file )
        },
    }
}
