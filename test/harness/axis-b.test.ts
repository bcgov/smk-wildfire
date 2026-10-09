/**
 * Axis B — the Leaflet viewer against the MapLibre viewer, both in v2.
 *
 * Does the new viewer do what the old one does? This is the axis WFNEWS needs,
 * because it is moving off Leaflet.
 *
 * A missing viewer half throws nothing: the shared half of the tool still
 * renders. So a gap only ever shows as a difference here.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruled, openItems, report, rulings, unruledItems } from './differ'
import { layerTypesFor, toolsWithHalves, hasViewerHalf, VIEWERS_2D } from './matrix'

let ref: Run, now: Run

beforeAll( async () => {
    await up()
    ref = await open( { build: 'v2', viewer: 'leaflet' } )
    now = await open( { build: 'v2', viewer: 'maplibre' } )
}, 240000 )

afterAll( async () => {
    await ref?.close(); await now?.close(); await down()
} )

describe( 'axis B - the new viewer', () => {
    it( 'starts both viewers on one config', () => {
        expect( ref.state ).toBe( 'ready' )
        expect( now.state ).toBe( 'ready' )
        expect( ref.record.viewerType ).toBe( 'leaflet' )
        expect( now.record.viewerType ).toBe( 'maplibre' )
    } )

    it( 'compares two panes of the same size', () => {
        expect( now.record.screen ).toEqual( ref.record.screen )
    } )

    it( 'builds the same tools', () => {
        expect( now.record.built ).toEqual( ref.record.built )
    } )

    it( 'loads the same layers', () => {
        expect( now.record.layerIds ).toEqual( ref.record.layerIds )
    } )

    it( 'starts with a clean console in both', () => {
        for ( const [ which, run ] of [ [ 'leaflet', ref ], [ 'maplibre', now ] ] as const )
            expect( unruledItems( 'B', 'console', run.record.console || [] ), which ).toEqual( [] )
    } )

    it( 'has no difference that nobody has ruled on', () => {
        const left = unruled( 'B', ref.record, now.record )
        expect( report( 'B', left ) ).toBe( '' )
    } )
} )

describe( 'the support matrix is real', () => {
    // Generated from the manifest, so a new adapter or viewer half turns up
    // here by itself.
    for ( const viewer of VIEWERS_2D ) {
        it( `${ viewer } draws five layer types`, () => {
            expect( layerTypesFor( viewer ) ).toEqual( [
                'esri-dynamic', 'esri-feature', 'esri-tiled', 'vector', 'wms',
            ] )
        } )
    }

    it( 'records which 2D viewer is missing which tool half', () => {
        const gaps: string[] = []
        for ( const tool of toolsWithHalves() )
            for ( const viewer of VIEWERS_2D )
                if ( !hasViewerHalf( tool, viewer ) ) gaps.push( `${ tool }/${ viewer }` )

        // This is a record, not a target. When somebody writes a missing half,
        // this fails, and the line comes out. See CONTEXT.md 8.1.
        expect( gaps.sort() ).toEqual( [
            'feature-list-clustering-leaflet/maplibre',
            'feature-list-clustering/maplibre',
            'mode/leaflet',
            'query-place/maplibre',
            'query/maplibre',
            'search/leaflet',
            'search/maplibre',
            'select/maplibre',
        ] )
    } )


    it( 'reports the differences nobody has ruled yet', () => {
        // An open ruling does not fail the run - it would wedge the suite red
        // for ever - but it is printed every time, so it cannot be forgotten.
        const open = openItems( 'B', ref.record, now.record )
        if ( open.length ) console.warn( report( 'B', open, 'OPEN, needs a ruling' ) )

        for ( const r of rulings().filter( r => r.open ) )
            expect( r.reason.length, `open ruling for ${ r.field } has no reason` ).toBeGreaterThan( 40 )
    } )
} )
