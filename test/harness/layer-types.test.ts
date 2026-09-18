/**
 * Axis B, one Layer type at a time.
 *
 * Each case loads one visible layer of one type in both 2D Viewers and diffs
 * the Records. What matters most is `requests`: a Layer adapter that asks the
 * service for the wrong thing draws nothing and says nothing.
 *
 * The case list comes from the support manifest, so a new adapter appears here
 * by itself and a removed one fails.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruled, openItems, report, unruledItems } from './differ'
import { layerTypesFor } from './matrix'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Scenario configs live beside this file and are served from the repo root.
 *
 * Every case pins a plain raster basemap. The default is a composite of a
 * vector tile map and a hillshade, and the two viewers load those through
 * different client libraries, so leaving it in would make each layer case
 * re-test the basemap and drown the layer it is meant to be about.
 */
const PLAIN_BASEMAP = '/test/harness/configs/basemap-plain.json'
const config = ( type: string ) => [ PLAIN_BASEMAP, `/test/harness/configs/${ type }.json` ]

const TYPES = layerTypesFor( 'leaflet' ).filter( t => layerTypesFor( 'maplibre' ).indexOf( t ) >= 0 )

const runs: { [ type: string ]: { ref: Run; now: Run } } = {}

beforeAll( async () => {
    await up()
    for ( const type of TYPES ) {
        runs[ type ] = {
            ref: await open( { build: 'v2', viewer: 'leaflet',  config: config( type ) } ),
            now: await open( { build: 'v2', viewer: 'maplibre', config: config( type ) } ),
        }
    }
}, 600000 )

afterAll( async () => {
    for ( const type of Object.keys( runs ) ) {
        await runs[ type ].ref.close()
        await runs[ type ].now.close()
    }
    await down()
} )

describe( 'both 2D viewers draw the same five layer types', () => {
    it( 'has a case for every type the manifest says both draw', () => {
        expect( TYPES ).toEqual( [ 'esri-dynamic', 'esri-feature', 'esri-tiled', 'vector', 'wms' ] )
    } )

    for ( const type of TYPES ) describe( type, () => {
        it( 'starts in both viewers', () => {
            expect( runs[ type ].ref.state ).toBe( 'ready' )
            expect( runs[ type ].now.state ).toBe( 'ready' )
        } )

        it( 'builds the layer the config names, in both', () => {
            // Read the id from the scenario file, so the test cannot drift from it.
            const cfg = JSON.parse( readFileSync(
                join( import.meta.dirname, 'configs', type + '.json' ), 'utf8' ) )
            const wanted = String( cfg.layers[ 0 ].id )

            for ( const which of [ 'ref', 'now' ] as const ) {
                const ids = ( runs[ type ][ which ].record.layerIds || [] ).map( String )
                expect( ids, `${ which } built ${ ids.join( ',' ) }` ).toContain( wanted )
            }
        } )

        it( 'throws nothing in either', () => {
            for ( const which of [ 'ref', 'now' ] as const )
                expect( unruledItems( 'B', 'console', runs[ type ][ which ].record.console || [] ),
                    which ).toEqual( [] )
        } )

        it( 'has no difference that nobody has ruled on', () => {
            const { ref, now } = runs[ type ]
            const openLeft = openItems( 'B', ref.record, now.record )
            if ( openLeft.length ) console.warn( report( 'B', openLeft, `OPEN on ${ type }, needs a ruling` ) )

            expect( report( 'B', unruled( 'B', ref.record, now.record ) ) ).toBe( '' )
        } )
    } )
} )
