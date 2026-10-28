/**
 * SMK 1.0.39's base map ids are a Host contract.
 *
 * WFIM's Config names nine of them. v2 kept only topographic-v2, so the other
 * eight fell out of WFIM's picker and WFNEWS fell back to an Imagery with no roads.
 */
import { describe, it, expect } from 'vitest'
import { defineBaseMaps }       from '../../src/smk/base-maps'

// The ids in WFIM release/1.8.8, in the order its picker shows them.
const WFIM = [
    'bc-basemap', 'bc-basemap-hillshade', 'topographic-v2', 'imagery-v2', 'streets-v2',
    'streets-night', 'oceans-v2', 'national-geographic-v2', 'light-gray-v2',
]

const TITLES: Record<string, string> = {
    'bc-basemap': 'BC', 'bc-basemap-hillshade': 'BC (Hillshade)', 'topographic-v2': 'Topographic',
    'imagery-v2': 'Imagery', 'streets-v2': 'Streets', 'streets-night': 'Streets (Night)',
    'oceans-v2': 'Oceans', 'national-geographic-v2': 'National Geographic', 'light-gray-v2': 'Light Gray',
}

function registry() {
    const basemaps: Record<string, any> = {}
    const define = ( id: string, def?: any ) => {
        if ( !def ) return basemaps[ id ]
        basemaps[ id ] = { ...def, id }
    }
    defineBaseMaps( define, () => undefined )
    return basemaps
}

describe( 'SMK 1.0 base maps that WFIM names', () => {
    const bm = registry()

    it( 'defines every one, with its 1.0 title, as a choice', () => {
        for ( const id of WFIM ) {
            expect( bm[ id ], id ).toBeDefined()
            expect( bm[ id ].title, id ).toBe( TITLES[ id ] )
            expect( bm[ id ].internal, id ).toBeFalsy()
            expect( bm[ id ].deprecated, id ).toBeFalsy()
        }
    } )

    it( 'sorts them in the order the 1.0 picker showed', () => {
        const sorted = [ ...WFIM ].sort( ( a, b ) => bm[ a ].order - bm[ b ].order )
        expect( sorted ).toEqual( WFIM )
    } )

    it( 'defines every child a composite names', () => {
        for ( const id of WFIM.filter( ( i ) => bm[ i ].type === 'composite' ) )
            for ( const child of bm[ id ].layers ) expect( bm[ child ], child ).toBeDefined()
    } )

    it( 'puts the Imagery roads and names over the imagery, not under it', () => {
        const [ bottom, top ] = bm[ 'imagery-v2' ].layers
        expect( bm[ bottom ].type ).toBe( 'esri-tiled-map' )
        expect( bm[ top ].itemId ).toBe( '85e2f70a08494305b60af53bd6fd5cbe' )
    } )

    it( 'gives each vector half its service, which carries the credit', () => {
        const vectors = Object.values( bm ).filter( ( b: any ) =>
            b.type === 'esri-vector-tile' && WFIM.some( ( id ) => b.id === id || b.id.startsWith( '--' + id ) ) )
        expect( vectors.length ).toBe( 10 )
        for ( const v of vectors as any[] ) {
            expect( v.itemId, v.id ).toMatch( /^[0-9a-f]{32}$/ )
            expect( v.url, v.id ).toMatch( /\/VectorTileServer$/ )
        }
    } )
} )
