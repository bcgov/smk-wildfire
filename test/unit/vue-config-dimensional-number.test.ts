/**
 * The measure panel's numbers.
 *
 * "Metric" and "Imperial" used to fall through to metres and miles, so a 265km
 * line read "265210.41475 m", and a dimensionless count read "2.00000".
 */
import { describe, it, expect } from 'vitest'
import { dimensionalNumber } from '../../src/smk/vue-config'

describe( 'dimensionalNumber - a count has no dimension', () => {
    it( 'does not put five decimals on a whole number', () => {
        expect( dimensionalNumber( 2, undefined as any, 'metric', 5 ) ).toBe( '2' )
    } )

    it( 'keeps a real fraction', () => {
        expect( dimensionalNumber( 2.5, undefined as any, 'metric', 5 ) ).toBe( '2.5' )
    } )
} )

describe( 'dimensionalNumber - metric picks its own unit', () => {
    it( 'uses metres below a kilometre', () => {
        expect( dimensionalNumber( 950, 1, 'metric', 2 ) ).toBe( '950 m' )
    } )

    it( 'uses kilometres at and above one', () => {
        expect( dimensionalNumber( 265210.41475, 1, 'metric', 2 ) ).toBe( '265.21 km' )
    } )

    it( 'still reads metres when the unit says meters', () => {
        expect( dimensionalNumber( 265210.41475, 1, 'meters', 2 ) ).toBe( '265210.41 m' )
    } )

    it( 'uses square metres then square kilometres', () => {
        expect( dimensionalNumber( 500000, 2, 'metric', 1 ) ).toBe( '500000 m\u00b2' )
        expect( dimensionalNumber( 5000000, 2, 'metric', 1 ) ).toBe( '5 km\u00b2' )
    } )
} )

describe( 'dimensionalNumber - imperial picks its own unit', () => {
    it( 'uses feet below a mile', () => {
        expect( dimensionalNumber( 100, 1, 'imperial', 1 ) ).toMatch( /^328(\.\d)? ft$/ )
    } )

    it( 'uses miles at and above one', () => {
        expect( dimensionalNumber( 10000, 1, 'imperial', 2 ) ).toMatch( / mi$/ )
    } )

    it( 'is not the same as miles for a short length', () => {
        expect( dimensionalNumber( 100, 1, 'imperial', 2 ) )
            .not.toBe( dimensionalNumber( 100, 1, 'miles', 2 ) )
    } )
} )

describe( 'dimensionalNumber - the named units are unchanged', () => {
    it( 'keeps kilometers, feet and hectares', () => {
        expect( dimensionalNumber( 2000, 1, 'kilometers', 1 ) ).toBe( '2 km' )
        expect( dimensionalNumber( 10000, 2, 'hectares', 1 ) ).toBe( '1 ha' )
    } )
} )
