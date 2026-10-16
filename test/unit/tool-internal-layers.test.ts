/**
 * A Host on the 1.0.16001 line (WFNEWS, WFIM) styles internal layers with
 * `internalLayer`, an object keyed by id. v2 builds them from `internalLayers`,
 * so the Host style must merge over the defaults, or identify draws SMK's own.
 */
import { describe, it, expect } from 'vitest'

const { ToolInternalLayers } = await import( '../../src/smk/mixin/tool-internal-layers/tool-internal-layers' )

function build( internalLayers: any[], internalLayer?: any ) {
    const tool: any = { id: 'IdentifyListTool', type: 'identify', $initializers: [] }
    ToolInternalLayers.call( tool )
    tool.internalLayers = internalLayers
    if ( internalLayer ) tool.internalLayer = internalLayer

    const added: any[] = []
    tool.$initializers[ 0 ].call( tool, { $viewer: { addLayer: ( ly: any ) => added.push( ly ) } } )

    const byId = ( id: string ) => added.find( ( ly: any ) => ly.id === 'IdentifyListTool--' + id )
    return { added, byId }
}

const defaults = () => [
    { id: 'search-area', style: { stroke: false, fill: true, fillColor: 'white', fillOpacity: 0.5 } },
    { id: 'location',    title: 'Identify Location', style: { markerUrl: 'crosshair.png', markerSize: [ 40, 40 ], markerOffset: [ 20, 20 ] }, legend: { point: true } },
]

describe( 'ToolInternalLayers - the Host internalLayer', () => {
    it( 'keeps the defaults when the Host gives none', () => {
        const { byId } = build( defaults() )

        expect( byId( 'search-area' ).style.fillColor ).toBe( 'white' )
        expect( byId( 'location' ).style.markerUrl ).toBe( 'crosshair.png' )
    } )

    it( 'merges the Host style over the default, key by key', () => {
        const { byId } = build( defaults(), {
            'search-area': { style: { fillColor: '#548ADB', fillOpacity: 0.3 } },
        } )

        expect( byId( 'search-area' ).style ).toEqual( { stroke: false, fill: true, fillColor: '#548ADB', fillOpacity: 0.3 } )
    } )

    it( 'lets the Host remove the crosshair with markerUrl: null', () => {
        const { byId } = build( defaults(), { location: { style: { markerUrl: null }, legend: {} } } )

        expect( byId( 'location' ).style.markerUrl ).toBeNull()
        expect( byId( 'location' ).style.markerSize ).toEqual( [ 40, 40 ] )
        expect( byId( 'location' ).legend ).toEqual( { point: true } )
    } )

    it( 'adds a layer that only the Host names', () => {
        const { added, byId } = build( defaults(), { extra: { style: { strokeColor: 'red' } } } )

        expect( added ).toHaveLength( 3 )
        expect( byId( 'extra' ).style.strokeColor ).toBe( 'red' )
        expect( byId( 'extra' ).isInternal ).toBe( true )
    } )
} )
