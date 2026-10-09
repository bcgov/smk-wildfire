/**
 * <draggable>, the directions waypoint list.
 *
 * vuedraggable 2.16 runs on Vue 2 only, so SMK has its own over SortableJS.
 * Sortable moves the dragged node itself; the component puts it back and
 * moves the list item, so Vue owns the DOM and the order is the list's.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, mountPanel, cleanup } from './fixture'
import '../../src/smk/tool/directions/draggable'

afterEach( cleanup )

function mount() {
    const data = { list: [ 'A', 'B', 'C', 'D' ], ended: 0 }
    const el = mountPanel( 'smk-drag-test', `
        <draggable class="smk-waypoints" v-bind:list="list" v-on:end="ended++">
            <div class="smk-waypoint" v-for="w in list" v-bind:key="w">{{ w }}</div>
        </draggable>`, data )
    const root = el.querySelector( '.smk-waypoints' ) as HTMLElement
    const texts = () => [ ...root.querySelectorAll( '.smk-waypoint' ) ].map( e => e.textContent )
    return { root, texts, data }
}

/** Sortable 1.7 has no Sortable.get; it keeps the instance on the element. */
const sortableOf = ( el: any ) => el[ Object.keys( el ).find( k => k.startsWith( 'Sortable' ) )! ]

/** What Sortable does at the end of a drag: move the node, then call onEnd. */
function drag( root: HTMLElement, oldIndex: number, newIndex: number ) {
    const kids = [ ...root.children ]
    const item = kids[ oldIndex ]
    const rest = kids.filter( k => k !== item )
    root.insertBefore( item, rest[ newIndex ] || null )
    sortableOf( root ).options.onEnd( { oldIndex, newIndex, from: root, item } )
}

describe( 'draggable', () => {
    it( 'makes a Sortable on its element', async () => {
        const { root } = mount()
        await Vue.nextTick()
        expect( sortableOf( root ) ).toBeTruthy()
    } )

    it( 'moves an item down, and the list and the DOM agree', async () => {
        const { root, texts } = mount()
        await Vue.nextTick()
        drag( root, 0, 2 )
        await Vue.nextTick()
        expect( texts() ).toEqual( [ 'B', 'C', 'A', 'D' ] )
    } )

    it( 'moves an item up, and the list and the DOM agree', async () => {
        const { root, texts } = mount()
        await Vue.nextTick()
        drag( root, 3, 1 )
        await Vue.nextTick()
        expect( texts() ).toEqual( [ 'A', 'D', 'B', 'C' ] )
    } )

    it( 'tells the panel the drag ended, so the tool can route again', async () => {
        const { root, data } = mount()
        await Vue.nextTick()
        drag( root, 1, 1 )
        await Vue.nextTick()
        expect( data.ended ).toBe( 1 )
    } )
} )
