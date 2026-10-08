/**
 * Unit tests for resolveContainer.
 *
 * SMK took jQuery's $() for containerSel, which accepts a selector string or a
 * DOM element. The move to querySelectorAll dropped the element case, and a
 * caller that passed one got a SyntaxError instead of a map. These tests hold
 * both forms open.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveContainer }                 from '../../src/smk/util'

beforeEach( () => { document.body.innerHTML = '' } )

describe( 'resolveContainer', () => {
    it( 'returns the element when given one', () => {
        const el = document.createElement( 'div' )
        document.body.appendChild( el )

        expect( resolveContainer( el ) ).toBe( el )
    } )

    it( 'returns an element that is not in the document', () => {
        const el = document.createElement( 'div' )

        expect( resolveContainer( el ) ).toBe( el )
    } )

    it( 'resolves a selector that matches one element', () => {
        document.body.innerHTML = '<div id="map"></div>'

        expect( resolveContainer( '#map' ) ).toBe( document.getElementById( 'map' ) )
    } )

    it( 'returns null when a selector matches nothing', () => {
        expect( resolveContainer( '#missing' ) ).toBeNull()
    } )

    it( 'returns null when a selector matches more than one element', () => {
        document.body.innerHTML = '<div class="m"></div><div class="m"></div>'

        expect( resolveContainer( '.m' ) ).toBeNull()
    } )

    it( 'returns null for nothing at all', () => {
        expect( resolveContainer( null ) ).toBeNull()
        expect( resolveContainer( undefined ) ).toBeNull()
        expect( resolveContainer( '' ) ).toBeNull()
    } )
} )
