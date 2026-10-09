/**
 * The panel card and its header.
 *
 * Two faults seen in the Gallery, 2026-09-17. The modern theme left the
 * elastic panel transparent, so the panel gutter and the gap under the header
 * showed the map through the card. And an icon command inherited a line-height
 * taller than its own button, so the close button sat low beside the title.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

const CLEAR = [ 'rgba(0, 0, 0, 0)', 'transparent' ]

/** Where the glyphs actually sit, not where the box is. */
function inkCentre( el: Element ) {
    const range = document.createRange()
    range.selectNodeContents( el )
    const box = range.getBoundingClientRect()
    return box.top + box.height / 2
}

const story = STORIES.find( s => s.name === 'layers-panel' )!

function panel( theme: string ) {
    return mountStory( story, initialModel( story ), { theme } )
}

afterEach( cleanup )

describe( 'the panel is one solid card', () => {
    for ( const theme of THEMES ) {
        it( theme, async () => {
            const vm = panel( theme )
            await Vue.nextTick()

            const card = vm.$el.querySelector( '.smk-elastic-panel' ) as HTMLElement
            expect( CLEAR, 'the card is see-through, so the map shows through the gutter' )
                .not.toContain( getComputedStyle( card ).backgroundColor )
        } )
    }
} )

describe( 'an icon command-button centres its glyph', () => {
    const buttons = STORIES.find( s => s.name === 'command-button' )!

    for ( const theme of THEMES ) {
        it( theme, async () => {
            const vm = mountStory( buttons, initialModel( buttons ), { theme } )
            // Before the font loads, the glyph is the word "autorenew".
            await document.fonts.load( '24px "Material Icons"' )
            await Vue.nextTick()

            const button = vm.$el.querySelector( '.smk-command-button.smk-icon .smk-command' ) as HTMLElement
            const b = button.getBoundingClientRect()
            const g = button.querySelector( '.material-icons' )!.getBoundingClientRect()
            expect( Math.abs( ( g.left + g.width / 2 ) - ( b.left + b.width / 2 ) ), 'glyph sits left' )
                .toBeLessThanOrEqual( 0.5 )
            expect( Math.abs( ( g.top + g.height / 2 ) - ( b.top + b.height / 2 ) ), 'glyph sits high' )
                .toBeLessThanOrEqual( 0.5 )
        } )
    }
} )

// The user ruled 2026-09-18 to keep the 1.0 spread.
describe( 'the command row spreads to its edges, as in 1.0', () => {
    const buttons = STORIES.find( s => s.name === 'command-button' )!

    for ( const theme of THEMES ) {
        it( theme, async () => {
            const vm = mountStory( buttons, initialModel( buttons ), { theme } )
            await Vue.nextTick()

            const row = vm.$el.querySelector( '.smk-panel .smk-commands' ) as HTMLElement
            const kids = [ ...row.children ] as HTMLElement[]
            expect( kids.length ).toBe( 3 )
            const r = row.getBoundingClientRect()
            expect( Math.abs( kids[ 0 ].getBoundingClientRect().left - r.left ), 'first command' ).toBeLessThanOrEqual( 1 )
            expect( Math.abs( kids[ 2 ].getBoundingClientRect().right - r.right ), 'last command' ).toBeLessThanOrEqual( 1 )
        } )
    }
} )

describe( 'the header commands line up with the title', () => {
    for ( const theme of THEMES ) {
        it( theme, async () => {
            const vm = panel( theme )
            await Vue.nextTick()

            const header = vm.$el.querySelector( '.smk-panel .smk-header' ) as HTMLElement
            const title = inkCentre( header.querySelector( '.smk-panel-title' )! )

            for ( const sel of [ '.smk-panel-go-back', '.smk-panel-close' ] ) {
                const icon = header.querySelector( sel )
                if ( !icon ) continue
                // One pixel of rounding between a 16px label and a 24px glyph.
                expect( Math.abs( inkCentre( icon ) - title ), `${ sel } sits off the title` )
                    .toBeLessThanOrEqual( 1 )
            }
        } )
    }
} )
