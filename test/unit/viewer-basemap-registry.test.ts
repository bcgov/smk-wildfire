/**
 * The basemap registry is a host-facing contract.
 *
 * A host registers basemaps on Viewer.prototype.basemap before any map is
 * built, then every viewer created afterwards must see them. A class-field
 * initialiser on the instance shadows the prototype and silently drops those
 * registrations, which is what these tests hold shut.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Viewer }                           from '../../src/smk/viewer'

beforeEach( () => {
    Viewer.prototype.basemap     = {}
    Viewer.prototype.basemapType = {}
} )

describe( 'Viewer basemap registry', () => {
    it( 'keeps the registries on the prototype, not as instance fields', () => {
        expect( Viewer.prototype.basemap ).toBeTypeOf( 'object' )
        expect( Viewer.prototype.basemapType ).toBeTypeOf( 'object' )
    } )

    it( 'lets a host register a basemap before any viewer exists', () => {
        Viewer.prototype.basemap[ 'topography' ] = { title: 'BC Topography' }

        const v = new Viewer()
        expect( v.basemap[ 'topography' ] ).toEqual( { title: 'BC Topography' } )
    } )

    it( 'shows host registrations to every viewer built afterwards', () => {
        Viewer.prototype.basemap[ 'night' ] = { title: 'Night' }

        expect( new Viewer().basemap[ 'night' ] ).toBeDefined()
        expect( new Viewer().basemap[ 'night' ] ).toBeDefined()
    } )

    it( 'registers basemap types the same way', () => {
        const create = () => []
        Viewer.prototype.basemapType[ 'vector' ] = create

        expect( new Viewer().basemapType[ 'vector' ] ).toBe( create )
    } )

    it( 'gives each viewer its own copy, so one does not write into another', () => {
        Viewer.prototype.basemap[ 'shared' ] = { title: 'Shared' }

        const a = new Viewer()
        const b = new Viewer()
        a.basemap[ 'only-on-a' ] = { title: 'A' }

        expect( b.basemap[ 'only-on-a' ] ).toBeUndefined()
        expect( b.basemap[ 'shared' ] ).toBeDefined()
    } )

    it( 'does not let a viewer write back into the shared registry', () => {
        const v = new Viewer()
        v.basemap[ 'local' ] = { title: 'Local' }

        expect( Viewer.prototype.basemap[ 'local' ] ).toBeUndefined()
    } )
} )
