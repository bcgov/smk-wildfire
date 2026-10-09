/**
 * The Legend pane asks for its own legend images.
 *
 * `item.legends` is lazy: only setDisplayContextLegendsVisible fetches it.
 * SMK 1.0 asked at boot, the TypeScript rewrite dropped the call, and the
 * pane then stayed empty until the Layers panel opened and asked for its
 * own. Found 2026-09-19 in the Harness on maplibre.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let showOwnLegends: ( smk: any ) => void
let ticks: Array<() => void> = []

beforeAll( async () => {
    // main.ts seeds these before any tool module loads. tool-legend registers
    // a component, constructs a Vue and reads nextTick, so all three answer.
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }

    const Vue: any = function () {}
    Vue.component = () => {}
    Vue.nextTick = ( cb: () => void ) => ticks.push( cb )
    ;( window as any ).Vue = Vue

    ;( { showOwnLegends } = await import( '../../src/smk/tool/legend/tool-legend' ) )
} )

/** Records every ask, and hands back the one display context it holds. */
function fakeSmk() {
    const asked: boolean[] = []
    const handlers: Array<() => void> = []
    return {
        asked,
        addToStatus: () => document.createElement( 'div' ),
        contextAdded() { handlers.forEach( h => h() ) },
        $viewer: {
            changedDisplayContext( cb: () => void ) { handlers.push( cb ) },
            getDisplayContexts: () => [ { id: 'root' } ],
            setDisplayContextLegendsVisible( vis: boolean ) { asked.push( vis ) },
        },
    }
}

function runTicks() {
    const due = ticks
    ticks = []
    due.forEach( cb => cb() )
}

describe( 'showOwnLegends', () => {
    it( 'asks the display contexts for their legends', () => {
        const smk = fakeSmk()
        showOwnLegends( smk )
        expect( smk.asked[ 0 ], 'the pane never asked, so it renders nothing' ).toBe( true )
    } )

    it( 'turns them off only after Vue has rendered', () => {
        const smk = fakeSmk()
        showOwnLegends( smk )
        expect( smk.asked, 'off came in the same turn as on' ).toEqual( [ true ] )

        runTicks()
        expect( smk.asked ).toEqual( [ true, false ] )
    } )
} )

describe( 'the LegendTool initializer', () => {
    /**
     * The tool's own initializer, which Tool.define pushes last. The ones
     * before it are ToolBase's, and they want a whole smk to walk.
     */
    function initialize( smk: any ) {
        const tool = new ( window as any ).SMK.TYPE.LegendTool()
        const own = tool.$initializers[ tool.$initializers.length - 1 ]
        own.call( tool, smk )
    }

    it( 'asks as soon as a display context arrives', () => {
        const smk = fakeSmk()
        initialize( smk )
        smk.contextAdded()

        runTicks()
        expect( smk.asked, 'the pane waits for the Layers panel to ask' )
            .toEqual( [ true, false ] )
    } )

    it( 'has nothing to show before any context arrives', () => {
        const smk = fakeSmk()
        initialize( smk )
        expect( smk.asked ).toEqual( [] )
    } )
} )
