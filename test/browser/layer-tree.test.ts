/**
 * The layers panel reads as a tree: a child row and a legend both start under
 * the title of the row that owns them. Before 2026-09-17 a child moved 12px and
 * a legend 32px, so a child check box overlapped its parent's.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel, clone } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

// The 12px gutter plus the 8px row padding. SMK 1.0 put the top level here.
const TOP_LEVEL_BOX = 20

const story = STORIES.find( s => s.name === 'layers-panel' )!

const left = ( el: Element | null ) => el!.getBoundingClientRect().left

/** The `.smk-item` of a row, found by its title. */
function row( root: Element, title: string ) {
    const item = [ ...root.querySelectorAll( '.smk-item' ) ]
        .find( it => it.querySelector( '.smk-layer-title' )?.textContent?.trim() == title )
    expect( item, `no row titled "${ title }"` ).toBeTruthy()
    return item!
}

/** The sample tree with a group added under the folder, to test the deepest case. */
function withGroup() {
    const model = clone( initialModel( story ) )
    const folder = model.contexts[ 0 ].items[ 0 ]
    const layer = folder.items[ 1 ]
    folder.items.push( { ...layer, id: 'fire-centres', type: 'group', title: 'Fire Centres',
        legends: null, isExpanded: true, items: [ { ...layer, id: 'centre-a' } ] } )
    return model
}

afterEach( cleanup )

for ( const theme of THEMES ) {
    describe( theme, () => {
        it( 'leaves the top level where it was', async () => {
            const vm = mountStory( story, initialModel( story ), { theme } )
            await Vue.nextTick()

            const root = vm.$el.querySelector( '.smk-display' )
            for ( const title of [ 'Wildfire', 'Area Restrictions' ] )
                expect( left( row( vm.$el, title ).querySelector( '.smk-visibility' ) ) - left( root ) )
                    .toBeCloseTo( TOP_LEVEL_BOX, 0 )
        } )

        it( 'starts a child check box under its folder title', async () => {
            const vm = mountStory( story, initialModel( story ), { theme } )
            await Vue.nextTick()

            const folder = row( vm.$el, 'Wildfire' )
            const child  = row( vm.$el, 'Fire Perimeters' )
            expect( left( child.querySelector( '.smk-visibility' ) ) )
                .toBeCloseTo( left( folder.querySelector( '.smk-layer-title' ) ), 0 )
        } )

        it( 'starts a legend swatch under its layer title', async () => {
            const vm = mountStory( story, initialModel( story ), { theme } )
            await Vue.nextTick()

            const layer = row( vm.$el, 'Active Fire Locations' )
            const title = left( layer.querySelector( '.smk-layer-title' ) )
            for ( const swatch of layer.querySelectorAll( '.smk-legend-graphic' ) )
                expect( left( swatch ) ).toBeCloseTo( title, 0 )
        } )

        it( 'starts a group member legend under the group title, not one step further', async () => {
            const vm = mountStory( story, withGroup(), { theme } )
            await Vue.nextTick()

            const group  = vm.$el.querySelector( '.smk-display-group' )!
            const title  = left( row( vm.$el, 'Fire Centres' ).querySelector( '.smk-layer-title' ) )
            const swatches = group.querySelectorAll( '.smk-legend-graphic' )
            expect( swatches.length ).toBe( 3 )
            for ( const swatch of swatches )
                expect( left( swatch ) ).toBeCloseTo( title, 0 )
        } )
    } )
}
