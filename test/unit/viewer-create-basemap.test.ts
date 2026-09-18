/**
 * createBasemapLayer must honour a host's create() function.
 *
 * SMK 1.0 was `createBasemapLayer = id => this.basemap[ id ].create( id )`. There
 * was no type registry, so every host basemap is defined as
 * { title, order, create() }. 1.1.0 looked at basemapType[ config.type ] only and
 * never called create, which killed every host-defined basemap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Viewer }                               from '../../src/smk/viewer'

let v: any

beforeEach( () => {
    Viewer.prototype.basemap     = {}
    Viewer.prototype.basemapType = {}
    v = new Viewer()
} )

describe( 'createBasemapLayer', () => {
    it( 'calls a host create() and returns what it builds', () => {
        const layers = [ { fake: 'leaflet layer' } ]
        v.basemap[ 'navigation' ] = { id: 'navigation', title: 'Navigation', create: () => layers }

        expect( v.createBasemapLayer( 'navigation' ) ).toBe( layers )
    } )

    it( 'passes the basemap id to create(), as 1.0 did', () => {
        const create = vi.fn( () => [] )
        v.basemap[ 'navigation' ] = { id: 'navigation', create }

        v.createBasemapLayer( 'navigation' )
        expect( create ).toHaveBeenCalledWith( 'navigation' )
    } )

    it( 'prefers create() over a registered type, so the host stays in charge', () => {
        const fromCreate = [ 'host' ]
        const fromType   = vi.fn( () => [ 'smk' ] )
        v.basemapType[ 'esri-vector-tile' ] = fromType
        v.basemap[ 'navigation' ] = {
            id: 'navigation', type: 'esri-vector-tile',
            url: 'https://example.com/VectorTileServer',
            create: () => fromCreate,
        }

        expect( v.createBasemapLayer( 'navigation' ) ).toBe( fromCreate )
        expect( fromType ).not.toHaveBeenCalled()
    } )

    it( 'still uses the type registry when there is no create()', () => {
        const fromType = vi.fn( () => [ 'smk' ] )
        v.basemapType[ 'tile' ] = fromType
        v.basemap[ 'roads' ] = { id: 'roads', type: 'tile', url: 'https://example.com/{z}/{x}/{y}.png' }

        expect( v.createBasemapLayer( 'roads' ) ).toEqual( [ 'smk' ] )
        expect( fromType ).toHaveBeenCalled()
    } )

    it( 'reports a failing create() against the basemap that failed', () => {
        v.basemap[ 'bad' ] = { id: 'bad', create: () => { throw new Error( 'boom' ) } }

        expect( () => v.createBasemapLayer( 'bad' ) ).toThrow( /base map bad failed/ )
    } )

    it( 'still rejects a basemap with neither create() nor a known type', () => {
        v.basemap[ 'nothing' ] = { id: 'nothing', type: 'made-up' }

        expect( () => v.createBasemapLayer( 'nothing' ) ).toThrow( /unknown type made-up/ )
    } )
} )
