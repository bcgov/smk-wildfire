/**
 * Axis B, every Tool at once.
 *
 * One Config builds the whole Catalogue in each 2D Viewer. This is the cheap
 * net under the fault that has bitten twice: a Tool that builds, reports no
 * error, and renders nothing.
 *
 * A missing viewer half is not that fault. The shared half still renders, so a
 * gap shows here as the same Widget in both and a difference in what the map
 * does — which is what the requests and events in the Record are for.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruled, report, unruledItems } from './differ'
import { buildableTools, VIEWERS_2D } from './matrix'

/** Every type a Config can name. loadTools drops the instance-only ones. */
const TOOLS = buildableTools()

let ref: Run, now: Run

beforeAll( async () => {
    await up()
    // Pin a plain raster basemap: this case is about the tools, and the
    // default composite loads through a different client in each viewer.
    const cfg = [ '/test/harness/configs/basemap-plain.json' ]
    ref = await open( { build: 'v2', viewer: 'leaflet',  tools: TOOLS, config: cfg, merge: true } )
    now = await open( { build: 'v2', viewer: 'maplibre', tools: TOOLS, config: cfg, merge: true } )
}, 300000 )

afterAll( async () => {
    await ref?.close(); await now?.close(); await down()
} )

describe( 'the whole catalogue, in both 2D viewers', () => {
    it( 'starts with every bundled tool switched on', () => {
        expect( ref.state ).toBe( 'ready' )
        expect( now.state ).toBe( 'ready' )
        // Far more than the five a default map builds.
        expect( ( ref.record.built || [] ).length ).toBeGreaterThan( 25 )
    } )

    it( 'builds the same tools in both', () => {
        expect( now.record.built ).toEqual( ref.record.built )
        expect( now.record.builtTypes ).toEqual( ref.record.builtTypes )
    } )

    it( 'renders a widget for the same tools in both', () => {
        expect( now.record.widgets ).toEqual( ref.record.widgets )
    } )

    it( 'renders the same chrome in both', () => {
        expect( unruledItems( 'B', 'domClasses',
            ( now.record.domClasses || [] ).filter( c => ( ref.record.domClasses || [] ).indexOf( c ) < 0 ) ) ).toEqual( [] )
    } )

    it( 'throws nothing in either', () => {
        for ( const [ which, run ] of [ [ 'leaflet', ref ], [ 'maplibre', now ] ] as const )
            expect( unruledItems( 'B', 'console', run.record.console || [] ), which ).toEqual( [] )
    } )

    it( 'has no difference that nobody has ruled on', () => {
        expect( report( 'B', unruled( 'B', ref.record, now.record ) ) ).toBe( '' )
    } )

    it( 'names the tools it swept, so a new one cannot arrive unseen', () => {
        expect( TOOLS.length ).toBeGreaterThan( 25 )
        expect( VIEWERS_2D.length ).toBe( 2 )
    } )
} )
