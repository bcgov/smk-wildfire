/**
 * Axis A — SMK 1.0 against v2, both in the Leaflet viewer.
 *
 * Did the TypeScript rewrite lose anything? The oracle is the 1.0 bundle, not
 * an expectation somebody wrote down. See CONTEXT.md D8.
 *
 * The 1.0 build is not in git. Copy it once:
 *   cp -r <wfnews>/client/wfnews-war/src/main/angular/node_modules/@qqnluaq/smk/dist ref/smk-1.0
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { diff, unruled, openItems, report, isAllowed, rulings } from './differ'

let ref: Run, now: Run

beforeAll( async () => {
    await up()
    ref = await open( { build: '1.0' } )
    now = await open( { build: 'v2', viewer: 'leaflet' } )
}, 240000 )

afterAll( async () => {
    await ref?.close(); await now?.close(); await down()
} )

describe( 'axis A - the rewrite', () => {
    it( 'runs the 1.0 reference', () => {
        expect( ref.state, 'the 1.0 build is missing - see the note at the top of this file' ).toBe( 'ready' )
        expect( ref.record.viewerType ).toBe( 'leaflet' )
    } )

    it( 'runs v2 on the same config', () => {
        expect( now.state ).toBe( 'ready' )
        expect( now.record.viewerType ).toBe( 'leaflet' )
    } )

    it( 'compares two panes of the same size', () => {
        // A shorter frame fits the same extent at a lower zoom. Without this
        // the view comparison measures the harness, not SMK.
        expect( now.record.screen ).toEqual( ref.record.screen )
    } )

    it( 'opens the same config at the same zoom', () => {
        // The centre is allowed to differ by rounding; the zoom is not. One
        // level changes which scale-dependent Layers draw at all.
        expect( ( now.record.view as any )?.zoom ).toBe( ( ref.record.view as any )?.zoom )
    } )

    it( 'loses no host extension point', () => {
        // The registries are what a Host builds on, and four of the six
        // contracts v2 dropped were these.
        for ( const field of [ 'typeKeys', 'viewerKeys', 'layerKeys' ] as const ) {
            const lost = ( ref.record[ field ] as string[] )
                .filter( k => ( now.record[ field ] as string[] ).indexOf( k ) < 0 )
            expect( lost, `${ field } lost from v2` ).toEqual( [] )
        }
    } )

    it( 'keeps every default tool type, with its enabled flag', () => {
        expect( now.record.configTools ).toEqual( ref.record.configTools )
    } )

    it( 'builds the same tools from the same config', () => {
        expect( now.record.built ).toEqual( ref.record.built )
        expect( now.record.builtTypes ).toEqual( ref.record.builtTypes )
    } )

    it( 'renders the same chrome', () => {
        expect( now.record.domClasses ).toEqual( ref.record.domClasses )
    } )

    it( 'has no difference that nobody has ruled on', () => {
        const left = unruled( 'A', ref.record, now.record )
        expect( report( 'A', left ) ).toBe( '' )
    } )

    it( 'rules every difference it does report', () => {
        // A ruling that matches nothing is dead, and a dead ruling hides the
        // next real one. Every difference must map to at most one ruling.
        for ( const d of diff( ref.record, now.record ) ) {
            const r = isAllowed( 'A', d )
            if ( r ) expect( r.reason.length, `ruling for ${ d.field } has no reason` ).toBeGreaterThan( 20 )
        }
    } )


    it( 'reports the differences nobody has ruled yet', () => {
        // An open ruling does not fail the run - it would wedge the suite red
        // for ever - but it is printed every time, so it cannot be forgotten.
        const open = openItems( 'A', ref.record, now.record )
        if ( open.length ) console.warn( report( 'A', open, 'OPEN, needs a ruling' ) )

        for ( const r of rulings().filter( r => r.open ) )
            expect( r.reason.length, `open ruling for ${ r.field } has no reason` ).toBeGreaterThan( 40 )
    } )
} )
