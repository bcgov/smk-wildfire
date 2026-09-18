/**
 * Fields and the option switch.
 *
 * A select was three to five pixels shorter than the input beside it, and the
 * wf theme dressed an option differently from base. Both were seen in the
 * Gallery, 2026-09-17.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

function mount( name: string, theme: string ) {
    const story = STORIES.find( s => s.name === name )!
    return mountStory( story, initialModel( story ), { theme } )
}

/** What a theme is allowed to change about an option is nothing. */
const SKIN = [ 'backgroundColor', 'color', 'fontWeight', 'borderColor', 'borderRadius' ] as const

afterEach( cleanup )

describe( 'an input and a select in one row are the same height', () => {
    for ( const name of [ 'enter-number', 'identify-panel' ] ) {
        it( name, async () => {
            const vm = mount( name, 'base' )
            await Vue.nextTick()

            const input = vm.$el.querySelector( 'input' ) as HTMLElement
            const select = vm.$el.querySelector( 'select' ) as HTMLElement
            expect( input, 'no input in this story' ).not.toBeNull()
            expect( select, 'no select in this story' ).not.toBeNull()

            expect( select.getBoundingClientRect().height )
                .toBe( input.getBoundingClientRect().height )
        } )
    }
} )

describe( 'no field is shorter than a command', () => {
    for ( const theme of THEMES ) {
        it( theme, async () => {
            for ( const story of STORIES.filter( s => !s.known ) ) {
                const vm = mountStory( story, initialModel( story ), { theme } )
                await Vue.nextTick()

                const want = parseFloat( getComputedStyle( vm.$el ).getPropertyValue( '--control-size' ) )
                for ( const el of vm.$el.querySelectorAll( 'input, select' ) )
                    expect( el.getBoundingClientRect().height, `${ story.name } ${ el.tagName }` )
                        .toBeGreaterThanOrEqual( want )
            }
        } )
    }
} )

describe( 'the option switch', () => {
    it( 'wears the same skin in wf as in base', async () => {
        const skin = ( theme: string ) => {
            const vm = mount( 'select-option', theme )
            return [ ...vm.$el.querySelectorAll( '.smk-options .smk-command' ) ]
                .map( el => SKIN.map( p => getComputedStyle( el )[ p ] ).join( '|' ) )
        }
        const base = skin( 'base' )
        await Vue.nextTick()
        const wf = skin( 'wf' )
        await Vue.nextTick()

        expect( wf.length ).toBeGreaterThan( 1 )
        expect( wf ).toEqual( base )
    } )

    it( 'fades between options rather than snapping', async () => {
        const vm = mount( 'select-option', 'base' )
        await Vue.nextTick()

        const option = vm.$el.querySelector( '.smk-options .smk-command' ) as HTMLElement
        const cs = getComputedStyle( option )
        expect( cs.transitionProperty ).toContain( 'background-color' )
        expect( parseFloat( cs.transitionDuration ) ).toBeGreaterThan( 0 )
    } )
} )
