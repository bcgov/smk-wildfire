/**
 * A marker image larger than the screen needs is shrunk by area, not by lookup.
 *
 * MapLibre shrinks an icon with one bilinear lookup per pixel and no mipmaps,
 * so the 4x WFNEWS fire markers broke up on a 1x screen. Leaflet drew the same
 * PNG as an <img>, which the browser smooths. Seen 2026-10-06.
 */
import { describe, it, expect } from 'vitest'
import { screenSizedIcon } from '../../src/smk/viewer-maplibre/layer/layer-vector-maplibre'

// Half white by area, but one lookup at the centre of each 4px block reads white.
function stripes( size: number ): HTMLCanvasElement {
    const canvas = document.createElement( 'canvas' )
    canvas.width = canvas.height = size
    const ctx = canvas.getContext( '2d' )!
    ctx.fillStyle = '#000'
    ctx.fillRect( 0, 0, size, size )
    ctx.fillStyle = '#fff'
    for ( let x = 0; x < size; x += 4 ) ctx.fillRect( x + 1, 0, 2, size )
    return canvas
}

function reds( data: ImageData ): number[] {
    return [ ...data.data ].filter( ( _, i ) => i % 4 === 0 )
}

describe( 'screenSizedIcon', () => {
    it( 'shrinks a 4x image for a 1x screen by area', () => {
        const icon = screenSizedIcon( stripes( 88 ), 22, 1 )

        expect( icon.pixelRatio ).toBe( 1 )
        expect( [ icon.data.width, icon.data.height ] ).toEqual( [ 22, 22 ] )
        const r = reds( icon.data )
        expect( Math.min( ...r ), 'a pixel came out black' ).toBeGreaterThan( 100 )
        expect( Math.max( ...r ), 'a pixel came out white' ).toBeLessThan( 155 )
    } )

    it( 'makes the image for a screen ratio that is not whole', () => {
        const icon = screenSizedIcon( stripes( 88 ), 22, 2.625 )

        expect( icon.data.width ).toBe( 58 )
        expect( icon.pixelRatio ).toBeCloseTo( 58 / 22 )
    } )

    it( 'leaves an image that the screen can use as it is', () => {
        const img = stripes( 44 )
        const icon = screenSizedIcon( img, 22, 2 )

        expect( icon.data ).toBe( img )
        expect( icon.pixelRatio ).toBe( 2 )
    } )
} )
