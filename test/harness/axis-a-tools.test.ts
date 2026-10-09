/**
 * Axis A, every Tool the two builds share.
 *
 * Did the rewrite drop a Tool, or stop one rendering? The oracle is SMK 1.0,
 * both sides in the Leaflet viewer.
 *
 * The list is the INTERSECTION of what each build knows, worked out at run
 * time. Asking 1.0 to build `mode` would prove nothing - it is a MapLibre tool
 * that did not exist then. What 1.0 knows and v2 does not is the interesting
 * half, and it gets its own test.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruled, report, unruledItems } from './differ'
import { buildableTools } from './matrix'

let shared: string[] = []
let onlyIn10: string[] = []
let ref: Run, now: Run

// 1.0 states these in its defaults but never built them (D19). axis-a.test.ts
// holds the default entry; there is no tool behind it in either build.
const NEVER_BUILT_IN_10 = [ 'dropdown' ]

beforeAll( async () => {
    await up()

    // What each build states in its own defaults.
    const look = await open( { build: '1.0' } )
    const oldTypes: string[] = ( look.record.configTools || [] )
        .map( ( t: string ) => t.replace( /!$/, '' ) )
    await look.close()

    const newTypes = buildableTools()
    shared   = oldTypes.filter( t => newTypes.indexOf( t ) >= 0 ).sort()
    onlyIn10 = oldTypes.filter( t => newTypes.indexOf( t ) < 0 && NEVER_BUILT_IN_10.indexOf( t ) < 0 ).sort()

    ref = await open( { build: '1.0',                   tools: shared } )
    now = await open( { build: 'v2', viewer: 'leaflet', tools: shared } )
}, 600000 )

afterAll( async () => {
    await ref?.close(); await now?.close(); await down()
} )

describe( 'axis A - the whole catalogue', () => {
    it( 'finds tools both builds know', () => {
        expect( shared.length ).toBeGreaterThan( 20 )
    } )

    it( 'kept every tool type SMK 1.0 stated', () => {
        // A type that left the defaults is a Host contract gone. D9 says the
        // 1.0 side wins, so this must stay empty.
        expect( onlyIn10 ).toEqual( [] )
    } )

    it( 'starts both builds with the whole catalogue on', () => {
        expect( ref.state, 'SMK 1.0 - is ref/smk-1.0 in place?' ).toBe( 'ready' )
        expect( now.state ).toBe( 'ready' )
    } )

    it( 'compares two panes of the same size', () => {
        expect( now.record.screen ).toEqual( ref.record.screen )
    } )

    it( 'loses no tool SMK 1.0 built', () => {
        // v2 adds tools 1.0 never had, which is fine. A tool that LEFT is not.
        const lost = ( f: 'built' | 'builtTypes' ) => unruledItems( 'A', f,
            ( ref.record[ f ] || [] ).filter( t => ( now.record[ f ] || [] ).indexOf( t ) < 0 ) )
        expect( lost( 'built' ) ).toEqual( [] )
        expect( lost( 'builtTypes' ) ).toEqual( [] )
    } )

    it( 'renders a widget for the same tools', () => {
        expect( now.record.widgets ).toEqual( ref.record.widgets )
    } )

    it( 'renders every class SMK 1.0 rendered', () => {
        const lost = ( ref.record.domClasses || [] )
            .filter( c => ( now.record.domClasses || [] ).indexOf( c ) < 0 )
        expect( unruledItems( 'A', 'domClasses', lost ),
            'classes SMK 1.0 rendered and v2 does not' ).toEqual( [] )
    } )

    it( 'throws nothing in either', () => {
        for ( const [ which, run ] of [ [ '1.0', ref ], [ 'v2', now ] ] as const )
            expect( unruledItems( 'A', 'console', run.record.console || [] ), which ).toEqual( [] )
    } )

    it( 'has no difference that nobody has ruled on', () => {
        expect( report( 'A', unruled( 'A', ref.record, now.record ) ) ).toBe( '' )
    } )
} )
