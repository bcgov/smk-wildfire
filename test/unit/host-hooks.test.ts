/**
 * The hooks that replace a Host's monkey patches (D27).
 *
 * WFNEWS wrote its basemaps into Viewer.prototype.basemap, and WFPREV rebuilt
 * displayContext.layers by hand and named its mini-maps to dodge a repeated
 * id. Each of these is now something a Host asks SMK for.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

let Viewer: any
let SMKEvent: any
let WmsLayer: any
let nextMapId: any

beforeAll( async () => {
    // main.ts seeds these before anything imports bootstrap; smk-ref reads it once.
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( { Viewer } = await import( '../../src/smk/viewer' ) )
    ;( { SMKEvent } = await import( '../../src/smk/event' ) )
    ;( { WmsLayer } = await import( '../../src/smk/layer/layer-types' ) as any )
    ;( { nextMapId } = await import( '../../src/smk/bootstrap' ) as any )
} )

function smkWith( baseMapConfig: any[] ) {
    return {
        lmfId: 1,
        viewer: { type: 'maplibre', baseMapConfig },
        $option: {},
        resolveAssetUrl: ( u: string ) => u,
        hasToolType: () => false,
        getSidepanelPosition: () => null,
    }
}

describe( 'a Basemap from baseMapConfig', () => {
    beforeEach( () => {
        Viewer.prototype.basemap     = {}
        Viewer.prototype.basemapType = {}
    } )

    it( 'is added to that map when its id is new and it names a type', () => {
        const v = new Viewer()
        v.initialize( smkWith( [ { id: 'Navigation', type: 'esri-vector-tile', url: 'https://x/VectorTileServer', title: 'Navigation' } ] ) )

        expect( v.basemap.navigation ).toMatchObject( { id: 'navigation', type: 'esri-vector-tile', title: 'Navigation' } )
    } )

    it( 'reaches no other map and not the shared registry', () => {
        new Viewer().initialize( smkWith( [ { id: 'navigation', type: 'esri-vector-tile', url: 'u' } ] ) )

        expect( new Viewer().basemap.navigation ).toBeUndefined()
        expect( Viewer.prototype.basemap.navigation ).toBeUndefined()
    } )

    it( 'is put last in the picker when it gives no order', () => {
        const v = new Viewer()
        v.initialize( smkWith( [ { id: 'late', type: 'tile', url: 'u' } ] ) )

        expect( v.basemap.late.order ).toBe( 1000 )
        expect( v.basemap.late.title ).toBe( 'late' )
    } )

    it( 'is ignored with a warning when it names no type for an unknown id', () => {
        const warn = vi.spyOn( console, 'warn' ).mockImplementation( () => {} )
        const v = new Viewer()
        v.initialize( smkWith( [ { id: 'ghost', optionImageUrl: 'ghost.jpg' } ] ) )

        expect( v.basemap.ghost ).toBeUndefined()
        expect( warn.mock.calls.some( c => String( c[ 0 ] ).includes( 'ghost' ) ) ).toBe( true )
        warn.mockRestore()
    } )
} )

describe( 'replacing a display context', () => {
    function viewer() {
        const v: any = Object.create( Viewer.prototype )
        v.dispatcher     = new SMKEvent().dispatcher
        v.displayContext = {}
        v.layerId        = {}
        v.getView        = () => ( {} )
        return v
    }

    it( 'still refuses a second context unless the Host asks to replace it', () => {
        const warn = vi.spyOn( console, 'warn' ).mockImplementation( () => {} )
        const v = viewer()
        v.setDisplayContextItems( 'layers', [] )
        const first = v.displayContext.layers

        v.setDisplayContextItems( 'layers', [] )
        expect( v.displayContext.layers ).toBe( first )
        expect( warn ).toHaveBeenCalled()
        warn.mockRestore()
    } )

    it( 'replaces it, and tells the tools and the refresh', () => {
        const v = viewer()
        v.setDisplayContextItems( 'layers', [] )
        const first = v.displayContext.layers

        const seen: string[] = []
        v.changedDisplayContext( () => seen.push( 'context' ) )
        v.changedLayerVisibility( () => seen.push( 'visibility' ) )

        v.setDisplayContextItems( 'layers', [], { replace: true } )
        expect( v.displayContext.layers ).not.toBe( first )
        expect( seen ).toEqual( [ 'context', 'visibility' ] )
    } )
} )

describe( 'the default map id', () => {
    it( 'never repeats, also after a map is destroyed', () => {
        ;( window as any ).SMK = Object.assign( ( window as any ).SMK || {}, { MAP: {} } )
        const a = nextMapId()
        ;( window as any ).SMK.MAP[ a ] = {}
        const b = nextMapId()
        delete ( window as any ).SMK.MAP[ a ]
        const c = nextMapId()

        expect( new Set( [ a, b, c ] ).size ).toBe( 3 )
    } )

    it( 'skips an id a Host already took', () => {
        const next = nextMapId() + 1
        ;( window as any ).SMK.MAP[ next ] = {}
        expect( nextMapId() ).toBe( next + 1 )
    } )
} )

describe( 'a WMS legend', () => {
    it( 'sends the Config header, as the map images do', () => {
        const calls: any[] = []
        ;( globalThis as any ).fetch = ( url: string, opt: any ) => {
            calls.push( opt )
            return new Promise( () => {} )
        }
        const layer = new WmsLayer( { id: 'w', serviceUrl: 'https://x/ows', layerName: 'a', header: { apikey: 'k' } } )
        layer.initLegends()

        expect( calls[ 0 ].headers ).toEqual( { apikey: 'k' } )
    } )
} )
