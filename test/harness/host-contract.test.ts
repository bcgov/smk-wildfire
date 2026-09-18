/**
 * The Host extension points.
 *
 * A Host does not only call SMK. It extends it: WFNEWS registers Layer types
 * on SMK.TYPE.Layer and Tools with SMK.TYPE.Tool.define.
 * FOUR of the six contracts v2 dropped were extension points, and each one was
 * found by hand, in a browser, one error at a time. Nothing tested them.
 *
 * debug/harness/host.html is a Host in the shape WFNEWS writes one.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruledItems } from './differ'
import { VIEWERS_2D } from './matrix'

const runs: { [ viewer: string ]: Run } = {}

beforeAll( async () => {
    await up()
    for ( const viewer of VIEWERS_2D )
        runs[ viewer ] = await open( { build: 'host', viewer } )
}, 300000 )

afterAll( async () => {
    for ( const v of Object.keys( runs ) ) await runs[ v ].close()
    await down()
} )

/** What the page recorded as it went, step by step. */
async function steps( run: Run ): Promise<{ name: string; ok: boolean }[]> {
    return run.page.evaluate( () => ( window as any ).HOST.steps )
}

describe( 'a host can still extend SMK', () => {
    for ( const viewer of VIEWERS_2D ) describe( viewer, () => {
        it( 'starts', () => {
            expect( runs[ viewer ].state, 'the host page did not reach ready' ).toBe( 'ready' )
        } )

        it( 'passes every extension point', async () => {
            const failed = ( await steps( runs[ viewer ] ) ).filter( s => !s.ok ).map( s => s.name )
            expect( failed ).toEqual( [] )
        } )

        it( 'takes an element for containerSel, not only a selector', async () => {
            // WFNEWS passes an element. v2 briefly used querySelectorAll, which
            // takes a string only, and four call sites threw - including the
            // failure handlers, so the error hid itself.
            const built = await runs[ viewer ].page.evaluate(
                () => !!( window as any ).SMK.MAP.host )
            expect( built ).toBe( true )
        } )

        it( 'registers the host layer type and builds a layer of it', () => {
            expect( runs[ viewer ].record.layerKeys ).toContain( 'host-demo' )
            expect( runs[ viewer ].record.layerIds ).toContain( 'host-demo-layer' )
        } )

        it( 'needs no include loader to load a plugin', () => {
            expect( runs[ viewer ].record.hasInclude ).toBe( false )
        } )

        it( 'registers the host tool on SMK.TYPE', () => {
            expect( runs[ viewer ].record.typeKeys ).toContain( 'HostDemoTool' )
        } )

        it( 'builds the bespoke tool the host filled', () => {
            expect( runs[ viewer ].record.built ).toContain( 'BespokeTool--hostdemo' )
        } )

        it( 'runs the host handler when the panel opens', async () => {
            const text = await runs[ viewer ].page.evaluate( () => {
                const smk = ( window as any ).SMK.MAP.host
                smk.$tool[ 'BespokeTool--hostdemo' ].active = true
                return new Promise( resolve => setTimeout( () => resolve(
                    document.querySelector( '.host-demo-panel' )?.textContent || null ), 400 ) )
            } )
            expect( text ).toBe( 'written by the host' )
        } )

        it( 'throws only what a host with no ArcGIS API is known to throw', () => {
            // This page deliberately does not load the ArcGIS API, because a
            // host that never wanted the 3D viewer would not. dist/smk.es.js
            // then calls require() for the esri modules and throws once.
            // See CONTEXT.md 8.1 - it is a known risk, guarded here.
            expect( unruledItems( 'B', 'console', runs[ viewer ].record.console || [] ) ).toEqual( [] )
        } )
    } )
} )
