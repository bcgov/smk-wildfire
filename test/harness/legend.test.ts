/**
 * The layers panel legend.
 *
 * Axis A showed SMK 1.0 asking each WMS service for a legend graphic at start
 * and v2 asking for none, and 1.0 rendering smk-legend rows that v2 did not.
 * That looked like a loss. It is not: v2 renders the panel and fetches its
 * legends when the panel OPENS, and 1.0 did both at start.
 *
 * It took driving the real commands to find out. Setting the tool's props does
 * nothing — the panel runs off `smk.emit( id, 'change', ... )`, which is what
 * its own toggle-button sends. A test that sets props would have "proved" the
 * loss that is not there.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { VIEWERS_2D } from './matrix'

const runs: { [ viewer: string ]: Run } = {}
const legendHits: { [ viewer: string ]: number[] } = {}

beforeAll( async () => {
    await up()

    for ( const viewer of VIEWERS_2D ) {
        const run = await open( { build: 'v2', viewer, tools: [ 'layers' ] } )
        runs[ viewer ] = run

        const seen: string[] = []
        run.page.on( 'request', r => {
            if ( /getlegendgraphic/i.test( r.url() ) ) seen.push( r.url() )
        } )

        const atStart = seen.length

        // The commands the panel's own controls send.
        await run.page.evaluate( ( id: string ) =>
            ( window as any ).SMK.MAP[ id ].emit( 'LayersTool', 'activate' ), 'harness-' + viewer )
        await run.page.waitForTimeout( 2000 )
        const afterOpen = seen.length

        await run.page.evaluate( ( id: string ) =>
            ( window as any ).SMK.MAP[ id ].emit( 'LayersTool', 'change', { legend: true } ),
            'harness-' + viewer )
        await run.page.waitForTimeout( 2500 )

        legendHits[ viewer ] = [ atStart, afterOpen, seen.length ]
    }
}, 300000 )

afterAll( async () => {
    for ( const v of Object.keys( runs ) ) await runs[ v ].close()
    await down()
} )

describe( 'the layers panel legend', () => {
    for ( const viewer of VIEWERS_2D ) describe( viewer, () => {
        it( 'asks for no legend graphic before the panel is opened', () => {
            // Lazier than SMK 1.0, which asked at start. A Host that reads the
            // DOM for legend rows before anything is opened finds none.
            expect( legendHits[ viewer ][ 0 ] ).toBe( 0 )
        } )

        it( 'asks the WMS service for one legend graphic per layer when it opens', () => {
            const [ , afterOpen ] = legendHits[ viewer ]
            expect( afterOpen, 'no getlegendgraphic request' ).toBe( 4 )
        } )

        it( 'renders a legend row for every layer', async () => {
            const dom = await runs[ viewer ].page.evaluate( () => ( {
                legends: document.querySelectorAll( '.smk-legend' ).length,
                items:   document.querySelectorAll( '.smk-legend-item' ).length,
                titles:  document.querySelectorAll( '.smk-legend-title' ).length,
            } ) )
            expect( dom.legends ).toBe( 4 )
            expect( dom.items ).toBe( 4 )
            expect( dom.titles ).toBe( 4 )
        } )

        it( 'asks once, not again when the toggle is pressed', () => {
            const [ , afterOpen, afterToggle ] = legendHits[ viewer ]
            expect( afterToggle ).toBe( afterOpen )
        } )
    } )

    it( 'behaves the same in both viewers', () => {
        expect( legendHits.maplibre ).toEqual( legendHits.leaflet )
    } )
} )
