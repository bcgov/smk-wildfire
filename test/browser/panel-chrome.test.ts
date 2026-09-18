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
