/**
 * A raster basemap must honour its configured opacity.
 *
 * The Canada Topography basemap is a composite: the vector map at the bottom,
 * the Canada Hillshade raster on top. Leaflet drew the hillshade at the opacity
 * its config named. The maplibre spec builder emitted no `paint` at all, so
 * MapLibre used the default of 1 and a solid grey relief covered the whole
 * basemap — you could just see the map underneath it.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let basemapSpecForConfig: any

beforeAll( async () => {
    ( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( { basemapSpecForConfig } = await import( '../../src/smk/viewer-maplibre/viewer-maplibre' ) )
} )

function spec( cfg: any ): any {
    return basemapSpecForConfig(
        Object.assign( { id: 'test', type: 'tile', url: 'https://x/{z}/{y}/{x}' }, cfg ) )
}

describe( 'raster basemap opacity', () => {
    it( 'is solid when the config says nothing', () => {
        const [ s ] = spec( {} )
        expect( s.layer.paint[ 'raster-opacity' ] ).toBe( 1 )
    } )

    it( 'takes option.opacity', () => {
        const [ s ] = spec( { option: { opacity: 0.35 } } )
        expect( s.layer.paint[ 'raster-opacity' ] ).toBe( 0.35 )
    } )

    it( 'takes a top level opacity', () => {
        const [ s ] = spec( { opacity: 0.5 } )
        expect( s.layer.paint[ 'raster-opacity' ] ).toBe( 0.5 )
    } )

    it( 'lets zero through rather than reading it as unset', () => {
        const [ s ] = spec( { option: { opacity: 0 } } )
        expect( s.layer.paint[ 'raster-opacity' ] ).toBe( 0 )
    } )

    it( 'accepts a string, as a JSON config gives it', () => {
        const [ s ] = spec( { option: { opacity: '0.25' } } )
        expect( s.layer.paint[ 'raster-opacity' ] ).toBe( 0.25 )
    } )
} )
