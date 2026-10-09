/**
 * The legend pane's labels.
 *
 * `smk-legend-title` does two jobs: it names a layer, and it captions one
 * swatch. They were styled by different rules, so a layer name came out 14px
 * bold and a caption 11px normal, and the name was centred against a stack of
 * swatches rather than beside the first one. Seen in the Gallery, 2026-09-17.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

function legend( theme: string ) {
    const story = STORIES.find( s => s.name === 'legend' )!
    return mountStory( story, initialModel( story ), { theme } )
}

/** Only the labels that render; an inline legend hides its captions. */
function labels( root: Element ) {
    return [ ...root.querySelectorAll( '.smk-legend-title' ) ]
        .filter( el => el.getBoundingClientRect().height > 0 )
}

afterEach( cleanup )

describe( 'every legend label is the same size', () => {
    for ( const theme of THEMES ) {
        it( theme, async () => {
            const vm = legend( theme )
            await Vue.nextTick()

            const seen = labels( vm.$el )
            expect( seen.length, 'no legend label rendered' ).toBeGreaterThan( 1 )

            const sizes = new Set( seen.map( el => getComputedStyle( el ).fontSize ) )
            expect( [ ...sizes ], 'a layer name and a caption are different sizes' )
                .toHaveLength( 1 )
        } )
    }
} )

describe( 'the legend pane reads top down', () => {
    it( 'gives its header the larger text', async () => {
        const vm = legend( 'base' )
        await Vue.nextTick()

        const header = vm.$el.querySelector( '.smk-legend-header' ) as HTMLElement
        const label = labels( vm.$el )[ 0 ]
        expect( parseFloat( getComputedStyle( header ).fontSize ) )
            .toBeGreaterThan( parseFloat( getComputedStyle( label ).fontSize ) )
    } )

    it( 'starts every label at the same left edge', async () => {
        const vm = legend( 'base' )
        await Vue.nextTick()

        const lefts = new Set( labels( vm.$el )
            .map( el => Math.round( el.getBoundingClientRect().left ) ) )
        expect( [ ...lefts ], 'the labels do not share a left edge' ).toHaveLength( 1 )
    } )

    it( 'puts a layer name beside its first swatch, not the middle of the stack', async () => {
        const vm = legend( 'base' )
        await Vue.nextTick()

        const item = vm.$el.querySelector( '.smk-inline-legend > .smk-item' )
        expect( item, 'the story has no inline legend any more' ).not.toBeNull()

        const mid = ( el: Element ) => {
            const box = el.getBoundingClientRect()
            return box.top + box.height / 2
        }
        const name = item!.querySelector( ':scope > .smk-legend-title' )!
        const first = item!.querySelector( '.smk-legend-item' )!
        expect( Math.abs( mid( name ) - mid( first ) ) ).toBeLessThanOrEqual( 1 )
    } )
} )
