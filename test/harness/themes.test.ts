/**
 * Every Theme, in both 2D viewers. Smoke only.
 *
 * Cheap, and it is the net under the wf theme: a rule added for BCWS must not
 * push a control out of the Map Frame in somebody else's Theme. The Browser
 * project measures one Panel in detail; this one only asks whether the whole
 * chrome still fits and still builds.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruledItems } from './differ'
import { VIEWERS_2D } from './matrix'

/** What the harness Theme picker offers. */
const THEMES = [ 'wf', 'modern', 'base' ]

const runs: { [ key: string ]: Run } = {}
const key = ( theme: string, viewer: string ) => theme + '/' + viewer

beforeAll( async () => {
    await up()
    for ( const theme of THEMES )
        for ( const viewer of VIEWERS_2D )
            runs[ key( theme, viewer ) ] = await open( { build: 'v2', viewer, theme } )
}, 900000 )

afterAll( async () => {
    for ( const k of Object.keys( runs ) ) await runs[ k ].close()
    await down()
} )

/** Anything sticking out of the Map Frame, with a little tolerance. */
function overflowing( run: Run, viewer: string ) {
    return run.page.evaluate( ( v: string ) => {
        const frame = document.querySelector( `#frame-${ v }` ) as HTMLElement
        if ( !frame ) return [ 'no frame' ]

        const box = frame.getBoundingClientRect()
        const out: string[] = []

        frame.querySelectorAll( '[class^="smk-"], [class*=" smk-"]' ).forEach( el => {
            const r = ( el as HTMLElement ).getBoundingClientRect()
            if ( !r.width || !r.height ) return                    // not showing
            if ( getComputedStyle( el as HTMLElement ).position === 'fixed' ) return

            const over = Math.max( box.left - r.left, r.right - box.right,
                                   box.top - r.top,   r.bottom - box.bottom )
            if ( over > 2 ) out.push( String( ( el as HTMLElement ).className ).slice( 0, 60 )
                                      + ' by ' + Math.round( over ) + 'px' )
        } )
        return [ ...new Set( out ) ].slice( 0, 6 )
    }, viewer )
}

describe( 'every theme still builds a map', () => {
    for ( const theme of THEMES ) describe( theme, () => {
        for ( const viewer of VIEWERS_2D ) describe( viewer, () => {
            const run = () => runs[ key( theme, viewer ) ]

            it( 'starts', () => {
                expect( run().state ).toBe( 'ready' )
                expect( run().record.viewerType ).toBe( viewer )
            } )

            it( 'renders the chrome', () => {
                // A theme that renders nothing is the Vue compiler fault. The
                // record reads classes INSIDE the map frame, so the frame's own
                // class is not among them.
                expect( ( run().record.domClasses || [] ).length ).toBeGreaterThanOrEqual( 8 )
                expect( run().record.domClasses ).toContain( 'smk-viewer' )
            } )

            it( 'keeps everything inside the map frame', async () => {
                expect( await overflowing( run(), viewer ) ).toEqual( [] )
            } )

            it( 'throws nothing', () => {
                expect( unruledItems( 'B', 'console', run().record.console || [] ) ).toEqual( [] )
            } )
        } )
    } )
} )
