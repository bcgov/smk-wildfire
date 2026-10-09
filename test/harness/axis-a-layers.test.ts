/**
 * Axis A, one Layer type at a time.
 *
 * Did the rewrite change what a Layer type asks the service for? The oracle is
 * SMK 1.0, both sides in the Leaflet viewer.
 *
 * No basemap is pinned here. The default changed on purpose (the user ruled it
 * topography on 2026-09-07), that difference is already ruled, and 1.0 does not
 * know v2's basemap ids anyway.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { unruled, openItems, report, unruledItems } from './differ'
import { layerTypesFor } from './matrix'
import { readFileSync } from 'fs'
import { join } from 'path'

const config = ( type: string ) => [ `/test/harness/configs/${ type }.json` ]

const TYPES = layerTypesFor( 'leaflet' )

const runs: { [ type: string ]: { ref: Run; now: Run } } = {}

beforeAll( async () => {
    await up()
    for ( const type of TYPES ) {
        runs[ type ] = {
            ref: await open( { build: '1.0',                     config: config( type ) } ),
            now: await open( { build: 'v2', viewer: 'leaflet',   config: config( type ) } ),
        }
    }
}, 900000 )

afterAll( async () => {
    for ( const type of Object.keys( runs ) ) {
        await runs[ type ].ref.close()
        await runs[ type ].now.close()
    }
    await down()
} )

describe( 'the rewrite kept every layer type', () => {
    it( 'covers every type the Leaflet viewer draws', () => {
        expect( TYPES ).toEqual( [ 'esri-dynamic', 'esri-feature', 'esri-tiled', 'vector', 'wms' ] )
    } )

    for ( const type of TYPES ) describe( type, () => {
        it( 'starts in both builds', () => {
            expect( runs[ type ].ref.state, 'SMK 1.0 - is ref/smk-1.0 in place?' ).toBe( 'ready' )
            expect( runs[ type ].now.state ).toBe( 'ready' )
        } )

        it( 'compares two panes of the same size', () => {
            expect( runs[ type ].now.record.screen ).toEqual( runs[ type ].ref.record.screen )
        } )

        it( 'builds the layer the config names, in both', () => {
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
                expect( unruledItems( 'A', 'console', runs[ type ][ which ].record.console || [] ),
                    which ).toEqual( [] )
        } )

        it( 'has no difference that nobody has ruled on', () => {
            const { ref, now } = runs[ type ]
            const left = openItems( 'A', ref.record, now.record )
            if ( left.length ) console.warn( report( 'A', left, `OPEN on ${ type }, needs a ruling` ) )

            expect( report( 'A', unruled( 'A', ref.record, now.record ) ) ).toBe( '' )
        } )
    } )
} )
