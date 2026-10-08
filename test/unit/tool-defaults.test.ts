/**
 * Each Tool type registers its own defaults; SMK.CONFIG.tools holds only the
 * Tools a map builds when its Config names none.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let SMK: any

/** The tool list a map starts from before its own Config merges in. */
const startList = (): any[] => SMK.TYPE.mergeConfigs( [] ).tools
const byType    = ( type: string ) => startList().find( ( t: any ) => t.type === type )

beforeAll( async () => {
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( window as any ).Vue = { component() {}, filter() {}, nextTick() {}, set() {} }

    await import( '../../src/smk/tool' )
    await import( '../../src/smk/merge-config' )
    await Promise.all( Object.values( import.meta.glob( '../../src/smk/tool/*/tool-*.ts' ) ).map( m => m() ) )
    await import( '../../src/smk/bootstrap' )
    SMK = ( window as any ).SMK
} )

describe( 'tool defaults', () => {
    it( 'builds only actionbar, toolbar, search and location with no Config', () => {
        expect( SMK.CONFIG.tools.map( ( t: any ) => t.type ) )
            .toEqual( [ 'actionbar', 'toolbar', 'search', 'location' ] )
        expect( startList().filter( ( t: any ) => t.enabled ).map( ( t: any ) => t.type ).sort() )
            .toEqual( [ 'actionbar', 'location', 'search', 'toolbar' ] )
    } )

    it( 'leaves About, Menu and Reset View switched off', () => {
        expect( byType( 'about' ).enabled ).toBe( false )
        expect( byType( 'menu' ).enabled ).toBe( false )
        expect( byType( 'reset-view' ).enabled ).toBe( false )
    } )

    it( 'gives Measure its icon and title', () => {
        expect( byType( 'measure' ).icon ).toBe( 'straighten' )
        expect( byType( 'measure' ).title ).toBe( 'Measurement' )
    } )

    it( 'gives every registered type an icon and an order', () => {
        SMK.TYPE.Tool.defaults().forEach( ( t: any ) => {
            expect( t.icon, t.type ).toBeTruthy()
            expect( typeof t.order, t.type ).toBe( 'number' )
        } )
    } )

    it( 'keeps query out of the tool list until a layer names an instance', () => {
        expect( byType( 'query' ).instance ).toBe( true )
    } )

    it( 'names each type once', () => {
        const types = startList().map( ( t: any ) => t.type )
        expect( new Set( types ).size ).toBe( types.length )
    } )

    it( 'keeps the other command defaults when a Config sets one', () => {
        const identify = SMK.TYPE.mergeConfigs( [ { tools: [ { type: 'identify', command: { nearBy: false } } ] } ] )
            .tools.find( ( t: any ) => t.type === 'identify' )
        expect( identify.command ).toMatchObject( { nearBy: false, select: true, radius: false } )
    } )
} )
