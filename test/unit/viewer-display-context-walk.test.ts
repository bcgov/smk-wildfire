/**
 * The display context walk must skip a context that is not filled yet.
 *
 * Viewer seeds `displayContext = { layers: null }` and fills it later. The walk
 * handed that null to every caller — setView, getConfig, isItemVisible,
 * getItem, getLayerIds, setItemEnabled, setLegendsVisible — and each threw.
 * The event dispatcher caught it, so the map worked and nothing said so: every
 * viewer threw once on changedDisplayContext at start. See CONTEXT.md 8.1.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let Viewer: any

beforeAll( async () => {
    ( { Viewer } = await import( '../../src/smk/viewer' ) )
} )

const make = () => Object.create( Viewer.prototype )

describe( 'eachDisplayContext', () => {
    it( 'calls back for nothing while the context is still null', () => {
        const v = make()
        v.displayContext = { layers: null }

        const seen: string[] = []
        v.eachDisplayContext( ( _dc: any, k: string ) => seen.push( k ) )
        expect( seen ).toEqual( [] )
    } )

    it( 'calls back once the context is filled', () => {
        const v = make()
        v.displayContext = { layers: { id: 'layers' } }

        const seen: string[] = []
        v.eachDisplayContext( ( dc: any, k: string ) => seen.push( k + ':' + dc.id ) )
        expect( seen ).toEqual( [ 'layers:layers' ] )
    } )

    it( 'skips only the empty one when several contexts are held', () => {
        const v = make()
        v.displayContext = { layers: { id: 'layers' }, query: null, select: { id: 'select' } }

        const seen: string[] = []
        v.eachDisplayContext( ( _dc: any, k: string ) => seen.push( k ) )
        expect( seen.sort() ).toEqual( [ 'layers', 'select' ] )
    } )

    it( 'keeps the key, so isDisplayContext still answers', () => {
        const v = make()
        v.displayContext = { layers: null }
        expect( 'layers' in v.displayContext ).toBe( true )
    } )
} )
