/**
 * SMK.BOOT runs each SMK.INIT after the one before it.
 *
 * A map that failed left SMK.BOOT rejected, so every later map on the page
 * failed too, and showed the first map's error.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let SMK: any

beforeAll( async () => {
    // main.ts seeds these before anything imports bootstrap.
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    await import( '../../src/smk/bootstrap' )
    SMK = ( window as any ).SMK
} )

describe( 'SMK.BOOT', () => {
    it( 'starts the next map after a map fails', async () => {
        document.body.innerHTML = '<div id="a"></div><div id="b"></div>'

        // No SmkMap type yet, so the first map cannot be built.
        await expect( SMK.INIT( { id: 'a', containerSel: '#a' } ) ).rejects.toThrow()

        SMK.TYPE.SmkMap = function ( this: any ) { this.initialize = () => Promise.resolve( this ) }
        await expect( SMK.INIT( { id: 'b', containerSel: '#b' } ) ).resolves.toBeTruthy()
    } )
} )
