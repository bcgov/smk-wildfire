/**
 * The tools that change the map, driven the way a person drives them.
 *
 * The sweep proves a Widget renders and a Panel opens. It cannot prove that
 * dragging moves the map. These do.
 *
 * pan and zoom carry a fact from CONTEXT.md 8.1: both viewers disable every
 * interaction handler right after they build the map, and the pan and zoom
 * tool initializers are what turn them back on. Both are `enabled: false` in
 * the Default tools, so SMK out of the box gives a map that cannot be dragged.
 * That is measured here rather than argued about.
 *
 * A tool initializer runs once, so pan and zoom must be BUILT with the map.
 * Setting `enabled` on a live tool does not call dragPan.enable().
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { VIEWERS_2D } from './matrix'
import type { Page } from 'playwright'

const runs: { [ key: string ]: Run } = {}
const key = ( what: string, viewer: string ) => what + '/' + viewer

beforeAll( async () => {
    await up()
    for ( const viewer of VIEWERS_2D ) {
        runs[ key( 'bare',   viewer ) ] = await open( { build: 'v2', viewer } )
        runs[ key( 'moving', viewer ) ] = await open( { build: 'v2', viewer, tools: [ 'pan', 'zoom' ] } )
        runs[ key( 'ident',  viewer ) ] = await open( { build: 'v2', viewer, tools: [ 'identify' ] } )
        runs[ key( 'coord',  viewer ) ] = await open( { build: 'v2', viewer, tools: [ 'coordinate' ] } )
    }
}, 600000 )

afterAll( async () => {
    for ( const k of Object.keys( runs ) ) await runs[ k ].close()
    await down()
} )

const mapId = ( viewer: string ) => 'harness-' + viewer

async function view( page: Page, viewer: string ) {
    return page.evaluate( ( id: string ) => {
        const v = ( window as any ).SMK.MAP[ id ].$viewer.getView()
        return { lon: v.center.longitude, lat: v.center.latitude, zoom: v.zoom }
    }, mapId( viewer ) )
}

/** The middle of the pane, in page coordinates. */
async function centre( page: Page, viewer: string ) {
    const box = await page.locator( `#frame-${ viewer }` ).boundingBox()
    if ( !box ) throw new Error( 'no frame for ' + viewer )
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function drag( page: Page, viewer: string, dx: number, dy: number ) {
    const c = await centre( page, viewer )
    await page.mouse.move( c.x, c.y )
    await page.mouse.down()
    await page.mouse.move( c.x + dx, c.y + dy, { steps: 12 } )
    await page.mouse.up()
    await page.waitForTimeout( 900 )
}

const moved = ( a: any, b: any ) =>
    Math.abs( a.lon - b.lon ) > 0.001 || Math.abs( a.lat - b.lat ) > 0.001

const ATTRIB: Record<string, string> = {
    leaflet:  '.leaflet-control-attribution',
    maplibre: '.maplibregl-ctrl-attrib',
}

/** Box and font of one element inside the pane, in page coordinates. */
async function chrome( page: Page, viewer: string, sel: string ) {
    return page.evaluate( ( args: string[] ) => {
        const e = document.querySelector( args[ 0 ] + ' ' + args[ 1 ] )
        if ( !e ) return null
        const r = e.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right,
                 font: parseFloat( getComputedStyle( e ).fontSize ) }
    }, [ '#frame-' + viewer, sel ] )
}

describe( 'the tools that move the map', () => {
    for ( const viewer of VIEWERS_2D ) describe( viewer, () => {

        it( 'a map with no pan tool does not drag - CONTEXT 8.1', async () => {
            const run = runs[ key( 'bare', viewer ) ]
            const before = await view( run.page, viewer )
            await drag( run.page, viewer, 160, 90 )
            expect( moved( before, await view( run.page, viewer ) ) ).toBe( false )
        } )

        it( 'a map built with the pan tool does drag', async () => {
            const run = runs[ key( 'moving', viewer ) ]
            const before = await view( run.page, viewer )
            await drag( run.page, viewer, 160, 90 )
            const after = await view( run.page, viewer )

            expect( moved( before, after ), 'the map did not move' ).toBe( true )
            // Dragging right and down moves the ground the same way, so the
            // centre goes west and north.
            expect( after.lon ).toBeLessThan( before.lon )
            expect( after.lat ).toBeGreaterThan( before.lat )
        } )

        it( 'a map built with the zoom tool answers the wheel', async () => {
            const run = runs[ key( 'moving', viewer ) ]
            const c = await centre( run.page, viewer )
            const before = await view( run.page, viewer )

            await run.page.mouse.move( c.x, c.y )
            await run.page.mouse.wheel( 0, -400 )
            await run.page.waitForTimeout( 1200 )

            expect( ( await view( run.page, viewer ) ).zoom ).toBeGreaterThan( before.zoom )
        } )

        it( 'a click on the map picks a location', async () => {
            const run = runs[ key( 'ident', viewer ) ]
            const c = await centre( run.page, viewer )

            await run.page.evaluate( () => { ( window as any ).HARNESS.events.length = 0 } )
            await run.page.mouse.click( c.x, c.y )
            // The maplibre viewer holds a click for 300ms to tell it from a
            // double click, so give both viewers time to answer.
            await run.page.waitForTimeout( 1200 )

            const picked = await run.page.evaluate( () =>
                ( window as any ).HARNESS.events
                    .filter( ( e: any ) => e.event === 'pickedLocation' )
                    .map( ( e: any ) => e.payload ) )

            expect( picked.length, 'no pickedLocation event' ).toBeGreaterThan( 0 )
            expect( picked[ 0 ].map.latitude ).toBeTypeOf( 'number' )
            expect( picked[ 0 ].map.longitude ).toBeTypeOf( 'number' )
        } )

        it( 'the coordinate readout does not sit on the attribution', async () => {
            // The status column ends 17px above the frame, so the corner lane
            // is 18px. MapLibre's own attribution is a 24px pill and used to
            // run straight through the readout.
            const run = runs[ key( 'coord', viewer ) ]
            const c = await centre( run.page, viewer )
            await run.page.mouse.move( c.x, c.y )
            await run.page.mouse.move( c.x + 10, c.y + 10 )
            await run.page.waitForTimeout( 800 )

            const coord  = await chrome( run.page, viewer, '.smk-coordinate' )
            const attrib = await chrome( run.page, viewer, ATTRIB[ viewer ] )
            expect( coord,  'no coordinate readout' ).not.toBeNull()
            expect( attrib, 'no attribution' ).not.toBeNull()

            const over = Math.min( coord!.bottom, attrib!.bottom ) - Math.max( coord!.top, attrib!.top )
            expect( over, 'the readout crosses the attribution' ).toBeLessThanOrEqual( 1 )
        } )

        it( 'the attribution stays legible - it is a legal notice', async () => {
            const attrib = await chrome( runs[ key( 'coord', viewer ) ].page, viewer, ATTRIB[ viewer ] )
            expect( attrib!.font ).toBeGreaterThanOrEqual( 10 )
        } )

        it( 'the identify family is built under one config entry', () => {
            // identify is a composite: one entry builds identify-feature and
            // identify-list too, and every one carries the parent's type, so
            // $toolType holds one key while $tool holds several ids.
            const rec = runs[ key( 'ident', viewer ) ].record
            expect( rec.builtTypes ).toContain( 'identify' )
            expect( ( rec.built || [] ).filter( id => id.indexOf( 'Identify' ) === 0 ).length )
                .toBeGreaterThan( 0 )
        } )
    } )
} )
