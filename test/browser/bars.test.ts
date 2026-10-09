/**
 * The toolbar and the actionbar.
 *
 * A bar icon is a 24px glyph in a 28px box, and nothing centred it, so every
 * icon sat at the top left of its own button. The buttons also carried 4px of
 * margin, which made them 36px inside a 32px bar. And the Base Maps tool's
 * label wrapped, so that button was 41px tall. Seen in the Gallery, 2026-09-17.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

function bar( name: 'toolbar' | 'actionbar', theme: string ) {
    const story = STORIES.find( s => s.name === name )!
    return mountStory( story, initialModel( story ), { theme } )
}

const centre = ( el: Element ) => {
    const box = el.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Where the glyph paints, which a rotated or padded box does not tell you. */
function glyphCentre( el: Element ) {
    const range = document.createRange()
    range.selectNodeContents( el )
    const box = range.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

afterEach( cleanup )

describe( 'a bar icon is centred in its own button', () => {
    for ( const name of [ 'toolbar', 'actionbar' ] as const ) {
        it( name, async () => {
            const vm = bar( name, 'base' )
            await Vue.nextTick()

            const icons = [ ...vm.$el.querySelectorAll( '.smk-tool i.material-icons' ) ]
            expect( icons.length ).toBeGreaterThan( 1 )

            for ( const icon of icons ) {
                // The compass carries an inline rotate, so its box measures
                // wider than it is. Its glyph still centres on the same point.
                const box = centre( icon ), glyph = glyphCentre( icon )
                expect( Math.abs( glyph.x - box.x ), 'glyph sits off centre across' ).toBeLessThanOrEqual( 1 )
                expect( Math.abs( glyph.y - box.y ), 'glyph sits off centre down' ).toBeLessThanOrEqual( 1 )
            }
        } )
    }
} )

describe( 'the bar centres its buttons on its own axis', () => {
    for ( const theme of THEMES ) {
        it( `toolbar, ${ theme }`, async () => {
            const vm = bar( 'toolbar', theme )
            await Vue.nextTick()

            const el = vm.$el.querySelector( '.smk-toolbar' )!
            for ( const icon of el.querySelectorAll( '.smk-tool i.material-icons' ) )
                expect( Math.abs( glyphCentre( icon ).y - centre( el ).y ), 'glyph is not on the bar axis' )
                    .toBeLessThanOrEqual( 1 )
        } )

        it( `actionbar, ${ theme }`, async () => {
            const vm = bar( 'actionbar', theme )
            await Vue.nextTick()

            const el = vm.$el.querySelector( '.smk-actionbar' )!
            for ( const icon of el.querySelectorAll( '.smk-tool i.material-icons' ) )
                expect( Math.abs( glyphCentre( icon ).x - centre( el ).x ), 'glyph is not on the bar axis' )
                    .toBeLessThanOrEqual( 1 )
        } )
    }
} )

describe( 'a tool with a label', () => {
    it( 'keeps it on one line and inside the bar', async () => {
        const vm = bar( 'toolbar', 'base' )
        await Vue.nextTick()

        const el = vm.$el.querySelector( '.smk-toolbar' ) as HTMLElement
        const title = el.querySelector( '.smk-tool-title' ) as HTMLElement
        expect( title, 'the toolbar story has no titled tool any more' ).not.toBeNull()

        const label = title.querySelector( 'span' ) as HTMLElement
        const line = parseFloat( getComputedStyle( label ).lineHeight )
        expect( label.getBoundingClientRect().height, 'the label wrapped' )
            .toBeLessThanOrEqual( line + 1 )

        expect( title.getBoundingClientRect().height, 'the tool is taller than the bar' )
            .toBeLessThanOrEqual( el.getBoundingClientRect().height )
    } )
} )

// A widget whose props are wrong still renders, with no Vue error, so the
// Gallery's own test cannot see it. Not fitting the bar is visible.
describe( 'every widget fits its bar', () => {
    for ( const story of STORIES.filter( s => s.kind === 'bar' && !s.known ) ) {
        it( story.name, async () => {
            const vm = mountStory( story, initialModel( story ), { theme: 'base' } )
            await Vue.nextTick()

            const el = vm.$el.querySelector( '.smk-toolbar, .smk-actionbar' ) as HTMLElement
            const bar = el.getBoundingClientRect()
            const column = el.classList.contains( 'smk-actionbar' )

            for ( const tool of el.querySelectorAll( '.smk-tool' ) ) {
                const box = tool.getBoundingClientRect()
                const across = column ? box.width : box.height
                const room = column ? bar.width : bar.height
                expect( across, `${ String( tool.className ) } is bigger than its bar` )
                    .toBeLessThanOrEqual( room )
            }
        } )
    }
} )

// The id carries the instance, so CSS needs a hook for the kind of tool. It
// used to live in one component, and two stylesheets written for it never
// matched. Every tool carries it now.
describe( 'every tool carries its type as a class', () => {
    for ( const story of STORIES.filter( s => s.kind === 'bar' && !s.known ) ) {
        it( story.name, async () => {
            const vm = mountStory( story, initialModel( story ), { theme: 'base' } )
            await Vue.nextTick()

            for ( const w of ( story as any ).widgets ) {
                const want = 'smk-' + w.prop.type + '-tool'
                expect( vm.$el.querySelector( '.' + want ), `no ${ want }` ).not.toBeNull()
            }
        } )
    }
} )
