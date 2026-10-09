/**
 * The Gallery mounts through the Fixture. These tests keep both honest: each
 * entry renders with no Vue error, and real tool chrome reaches `trigger`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { Vue, cleanup, mountSidepanel, mountBar } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

afterEach( cleanup )

async function mountCollecting( fn: () => any ) {
    const errors: string[] = []
    const saved = [ Vue.config.errorHandler, Vue.config.warnHandler ]
    Vue.config.errorHandler = ( e: any ) => { errors.push( String( e?.message ?? e ) ) }
    Vue.config.warnHandler  = ( m: string ) => { errors.push( m ) }
    try {
        const vm = fn()
        await Vue.nextTick()
        return { vm, errors }
    } finally {
        ;[ Vue.config.errorHandler, Vue.config.warnHandler ] = saved
    }
}

describe( 'every Gallery entry', () => {
    for ( const story of STORIES ) {
        const what = story.known ? 'shows its known fault' : 'renders with no Vue error'

        it( `${ story.name } ${ what }`, async () => {
            const { vm, errors } = await mountCollecting( () => mountStory( story, initialModel( story ), {} ) )

            if ( story.known ) {
                expect( errors.length, 'fixed? then remove `known` from the entry' ).toBeGreaterThan( 0 )
                return
            }
            expect( errors ).toEqual( [] )
            expect( vm.$el.querySelector( '.smk-overlay' ).textContent.trim() ).not.toBe( '' )
        } )
    }
} )

describe( 'the Fixture mounts real tool chrome', () => {
    it( 'puts a tool panel in the chain sidepanel.css selects on', async () => {
        const { vm, errors } = await mountCollecting( () => mountSidepanel( {
            component: 'measure-panel',
            prop: { id: 'MeasureTool', title: 'Measurement', showHeader: true, viewer: { maplibre: true }, results: [] },
        } ) )
        expect( errors ).toEqual( [] )

        const panel = vm.$el.querySelector( '.smk-overlay > .smk-sidepanel > .smk-elastic-panel.smk-measure-panel' )
        expect( panel ).not.toBeNull()
        expect( panel.querySelector( '.smk-panel > .smk-commands > .smk-area' ) ).not.toBeNull()
        expect( panel.querySelector( '.smk-panel-title' ).textContent ).toBe( 'Measurement' )
    } )

    it( 'routes $$emit to trigger, the way SmkMap.emit gets it', async () => {
        const trigger = vi.fn()
        const vm = mountSidepanel( {
            component: 'measure-panel',
            prop: { id: 'MeasureTool', showHeader: true, viewer: { maplibre: true }, results: [] },
        }, { trigger } )
        await Vue.nextTick()

        ;( vm.$el.querySelector( '.smk-area .smk-command' ) as HTMLElement ).click()
        expect( trigger ).toHaveBeenCalledWith( 'MeasureTool', 'start-area', undefined )
    } )

    it( 'puts widgets in the toolbar', async () => {
        const vm = mountBar( 'toolbar', [ { component: 'layers-widget',
            prop: { id: 'LayersTool', icon: 'layers', title: 'Layers', showWidget: true } } ] )
        await Vue.nextTick()

        const tool = vm.$el.querySelector( '.smk-overlay > .smk-toolbar > .smk-tool' )
        expect( tool?.textContent.trim() ).toBe( 'layers' )
    } )
} )

// A control that keeps the browser default font sits beside a label in the
// frame font. The Gallery shows every control SMK has, so sweep them all.
describe( 'every form control wears the frame font', () => {
    for ( const story of STORIES.filter( s => !s.known ) ) {
        it( story.name, async () => {
            const { vm } = await mountCollecting( () => mountStory( story, initialModel( story ), {} ) )
            const frame = vm.$el as HTMLElement
            const want = getComputedStyle( frame ).fontFamily

            for ( const el of frame.querySelectorAll( 'input, select, textarea, button' ) ) {
                const got = getComputedStyle( el )
                // Only the family. The sizes are set on purpose and differ.
                expect( got.fontFamily, `${ el.tagName } font` ).toBe( want )
            }
        } )
    }
} )

// The Gallery page is dark when the machine is. Nothing of its chrome may
// inherit into the stage, or the page lies about what SMK renders.
describe( 'the Gallery stage takes no colour from the page', () => {
    it( 'keeps the panel text black under dark page chrome', async () => {
        await import( '../../debug/gallery/gallery.css' )

        const stage = document.body.appendChild( document.createElement( 'div' ) )
        stage.className = 'g-stage'
        document.body.style.color = 'rgb(228, 231, 236)'
        document.documentElement.style.colorScheme = 'dark'

        const story = STORIES.find( s => s.name === 'feature-attributes' )!
        const vm = mountStory( story, initialModel( story ), { host: stage.appendChild( document.createElement( 'div' ) ) } )
        await Vue.nextTick()

        const title = vm.$el.querySelector( '.smk-panel-title' ) as HTMLElement
        expect( getComputedStyle( title ).color ).toBe( 'rgb(0, 0, 0)' )
        expect( getComputedStyle( vm.$el.querySelector( 'a' ) ).color ).toBe( 'rgb(0, 0, 238)' )

        document.body.style.color = ''
        document.documentElement.style.colorScheme = ''
        stage.remove()
    } )
} )
