/**
 * The directions step time is a duration in seconds. v2 read it as a Date, so
 * every step showed the clock time of the epoch, "4:00:00 PM" in Pacific time.
 */
import { describe, it, expect } from 'vitest'
import { formatTime } from '../../src/smk/vue-config'

describe( 'formatTime - a duration, as SMK 1.0 wrote it', () => {
    it( 'writes minutes and seconds under an hour', () => {
        expect( formatTime( 0 ) ).toBe( '00:00' )
        expect( formatTime( 75 ) ).toBe( '01:15' )
        expect( formatTime( 3599 ) ).toBe( '59:59' )
    } )

    it( 'adds hours from one hour up', () => {
        expect( formatTime( 3600 ) ).toBe( '01:00:00' )
        expect( formatTime( 3 * 3600 + 25 * 60 + 7 ) ).toBe( '03:25:07' )
    } )

    it( 'rounds a fraction of a second', () => {
        expect( formatTime( 12.6 ) ).toBe( '00:13' )
    } )

    it( 'writes nothing for no value', () => {
        expect( formatTime( undefined ) ).toBe( '' )
        expect( formatTime( null ) ).toBe( '' )
    } )
} )
