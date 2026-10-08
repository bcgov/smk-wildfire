import { describe, it, expect } from 'vitest'

/**
 * A style URL keeps its MapLibre placeholders.
 *
 * `new URL()` percent-encodes braces, so a glyphs template came out as
 * `%7Bfontstack%7D` and MapLibre silently kept the previous font server. Every
 * label layer then rendered nothing, with no error.
 */
function resolveStyleUrl( u: string, baseUrl: string ): string {
    try {
        return new URL( u, baseUrl ).toString()
            .replace( /%7B/g, '{' )
            .replace( /%7D/g, '}' )
    } catch { return u }
}

const SERVICE = 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Topo/VectorTileServer/resources/styles/root.json'

describe( 'resolveStyleUrl', () => {
    it( 'keeps {fontstack} and {range} in an absolute glyphs URL', () => {
        const glyphs = 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Topo/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf'
        expect( resolveStyleUrl( glyphs, SERVICE ) ).toBe( glyphs )
    } )

    it( 'keeps the placeholders when the style gives a relative glyphs path', () => {
        const out = resolveStyleUrl( '../fonts/{fontstack}/{range}.pbf', SERVICE )
        expect( out ).toContain( '{fontstack}' )
        expect( out ).toContain( '{range}' )
        expect( out ).not.toContain( '%7B' )
        expect( out ).toBe( 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Topo/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf' )
    } )

    it( 'keeps {z}/{x}/{y} in a tile template', () => {
        const out = resolveStyleUrl( '../../tile/{z}/{y}/{x}.pbf', SERVICE )
        expect( out ).toContain( '{z}' )
        expect( out ).toContain( '{y}' )
        expect( out ).toContain( '{x}' )
    } )

    it( 'still resolves a sprite, which has no placeholders', () => {
        expect( resolveStyleUrl( '../sprites/sprite', SERVICE ) )
            .toBe( 'https://tiles.arcgis.com/tiles/ABC/arcgis/rest/services/Topo/VectorTileServer/resources/sprites/sprite' )
    } )
} )
