/**
 * The map frame fades in, as in SMK 1.0.
 *
 * Found 2026-09-23. fadeIn set the transition before it committed opacity 0,
 * so the browser ran 1 -> 0, the next write cancelled it, and the map
 * appeared at once. SMK.INIT still waited out the fade's timer.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { fadeIn } from '../../src/smk/smk-map'

let frame: HTMLElement | null = null

afterEach( () => { frame?.remove(); frame = null } )

describe( 'map frame fade', () => {
    it( 'animates a frame that was already on the page', async () => {
        frame = document.createElement( 'div' )
        frame.style.cssText = 'width: 100px; height: 100px; background: black'
        document.body.appendChild( frame )
        void frame.offsetWidth                  // the frame has a computed style, as at boot

        // What SmkMap.initialize does when the map is ready.
        frame.style.display = 'none'
        const done = fadeIn( frame, 400 )

        await new Promise( r => setTimeout( r, 150 ) )
        const mid = parseFloat( getComputedStyle( frame ).opacity )
        expect( mid ).toBeGreaterThan( 0 )
        expect( mid ).toBeLessThan( 1 )

        await done
        expect( getComputedStyle( frame ).opacity ).toBe( '1' )
    } )
} )
