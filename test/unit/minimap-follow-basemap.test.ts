/**
 * The Minimap overview draws the Basemap the map shows, and follows a change.
 * A Config that names `baseMap` on the minimap tool pins the overview instead.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let followBasemap: ( smk: any, pinned: string | undefined, show: ( id: string ) => void ) => void

beforeAll( async () => {
    // main.ts seeds these before any tool module loads.
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( { followBasemap } = await import( '../../src/smk/tool/minimap/tool-minimap' ) )
} )

function fakeSmk( configured: string, currentBasemapId?: string ) {
    const handlers: Array<( ev: any ) => void> = []
    return {
        viewer:  { baseMap: configured },
        $viewer: {
            currentBasemapId,
            changedBaseMap( cb: ( ev: any ) => void ) { handlers.push( cb ) },
        },
        change( id: string ) { handlers.forEach( h => h( { baseMap: id } ) ) },
        handlers,
    }
}

describe( 'followBasemap', () => {
    it( 'starts on the Basemap the Config names for the map', () => {
        const shown: string[] = []
        followBasemap( fakeSmk( 'bc-roads' ), undefined, id => shown.push( id ) )
        expect( shown ).toEqual( [ 'bc-roads' ] )
    } )

    it( 'starts on the Basemap the Viewer shows now, when it knows one', () => {
        const shown: string[] = []
        followBasemap( fakeSmk( 'bc-roads', 'imagery' ), undefined, id => shown.push( id ) )
        expect( shown ).toEqual( [ 'imagery' ] )
    } )

    it( 'follows each change of the map Basemap', () => {
        const smk = fakeSmk( 'bc-roads' )
        const shown: string[] = []
        followBasemap( smk, undefined, id => shown.push( id ) )

        smk.change( 'imagery' )
        smk.change( 'topography' )
        expect( shown ).toEqual( [ 'bc-roads', 'imagery', 'topography' ] )
    } )

    it( 'does not rebuild when the Viewer announces the same Basemap again', () => {
        const smk = fakeSmk( 'bc-roads' )
        const shown: string[] = []
        followBasemap( smk, undefined, id => shown.push( id ) )

        smk.change( 'bc-roads' )
        expect( shown ).toEqual( [ 'bc-roads' ] )
    } )

    it( 'keeps a pinned baseMap and does not listen for changes', () => {
        const smk = fakeSmk( 'bc-roads' )
        const shown: string[] = []
        followBasemap( smk, 'esri-imagery', id => shown.push( id ) )

        smk.change( 'topography' )
        expect( shown ).toEqual( [ 'esri-imagery' ] )
        expect( smk.handlers ).toHaveLength( 0 )
    } )
} )
