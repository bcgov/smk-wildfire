/**
 * A Config popupTemplate compiles at run time.
 *
 * SMK's own templates are compiled at build time, so no bundle has Vue's
 * compiler. A popupTemplate is data in a Config, so SMK fetches the compiler
 * the first time one is shown, and every other map pays nothing.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { Vue, mountPanel, cleanup } from './fixture'
import { component, runtimeTemplateComponent } from '../../src/smk/vue'

beforeAll( async () => {
    // In a page SMK loads this from beside the bundle; here the module stands in.
    ;( window as any ).VueCompilerDOM = await import( '@vue/compiler-dom/dist/compiler-dom.esm-browser.prod.js' )
} )

afterEach( cleanup )

describe( 'a run-time popupTemplate', () => {
    it( 'compiles on first show and renders the feature', async () => {
        component( 'feature-template-probe', runtimeTemplateComponent(
            '<p class="smk-probe">{{ feature.properties.name }} - {{ layer.id }}</p>',
            ( window as any ).SMK.COMPONENT.FeatureBase ) )

        const el = mountPanel( 'smk-probe-panel', `<feature-template-probe v-bind:feature="feature" v-bind:layer="layer"></feature-template-probe>`,
            { feature: { properties: { name: 'Big Fire' } }, layer: { id: 'fires' } } )

        for ( let i = 0; i < 20 && !el.querySelector( '.smk-probe' ); i++ )
            await new Promise( r => setTimeout( r, 25 ) )
        await Vue.nextTick()

        expect( el.querySelector( '.smk-probe' )?.textContent ).toBe( 'Big Fire - fires' )
    } )
} )
