/**
 * The Harness's own contract.
 *
 * The Harness is a workbench and a person must stay free to change it, so this
 * holds only what phase 1 promised a test: the deep link, the ready flag, the
 * HARNESS object and the Build picker. It does not select on the chrome.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { up, down } from './harness'
import { chromium, type Browser, type Page } from 'playwright'
import { serveRepo, type Static } from './server'

let server: Static, browser: Browser

beforeAll( async () => {
    ;( { server, browser } = await up() as any )
}, 120000 )

afterAll( () => down() )

/** Open the harness with a query string and wait for the ready flag. */
async function harness( query: string ): Promise<Page> {
    const page = await browser.newPage( { viewport: { width: 1500, height: 950 } } )
    await page.goto( `${ server.url }/debug/harness/${ query }`, { waitUntil: 'domcontentloaded' } )

    const until = Date.now() + 90000
    while ( Date.now() < until ) {
        const flag = await page.evaluate( () => document.body.dataset.harness || null )
        if ( flag && flag !== 'starting' ) break
        await page.waitForTimeout( 200 )
    }
    return page
}

describe( 'the deep link', () => {
    it( 'sets every control it names', async () => {
        const page = await harness( '?viewer=leaflet&theme=modern&story=defaults&mobile=1' )
        expect( await page.evaluate( () => ( {
            viewer: ( document.querySelector( '#viewer' ) as HTMLSelectElement ).value,
            theme:  ( document.querySelector( '#theme'  ) as HTMLSelectElement ).value,
            story:  ( document.querySelector( '#story'  ) as HTMLSelectElement ).value,
            mobile: ( document.querySelector( '#mobile' ) as HTMLInputElement ).checked,
        } ) ) ).toEqual( { viewer: 'leaflet', theme: 'modern', story: 'defaults', mobile: true } )
        await page.close()
    } )

    it( 'builds the catalogue tools it names', async () => {
        const bare = await harness( '?viewer=leaflet&story=layers' )
        const some = await harness( '?viewer=leaflet&story=layers&tools=measure,identify' )

        const count = ( p: Page ) => p.evaluate( () =>
            Object.keys( ( window as any ).HARNESS.maps.leaflet.$tool ).length )

        expect( await count( some ) ).toBeGreaterThan( await count( bare ) )
        expect( await some.evaluate( () =>
            Object.keys( ( window as any ).HARNESS.maps.leaflet.$toolType ) ) )
            .toEqual( expect.arrayContaining( [ 'measure', 'identify' ] ) )

        await bare.close(); await some.close()
    } )

    it( 'writes itself back, so a link can be copied', async () => {
        const page = await harness( '?viewer=leaflet' )
        await page.selectOption( '#theme', 'modern' )
        await page.waitForTimeout( 500 )
        expect( await page.evaluate( () => location.search ) ).toContain( 'theme=modern' )
        await page.close()
    } )
} )

describe( 'the ready flag', () => {
    it( 'waits for the 1.0 reference pane as well as the v2 panes', async () => {
        const page = await harness( '?build=both&viewer=leaflet' )

        // The flag must not go up while the iframe is still starting.
        expect( await page.evaluate( () => document.body.dataset.harness ) ).toBe( 'ready' )
        expect( await page.evaluate( () => ( window as any ).HARNESS.ref()?.state ) ).toBe( 'ready' )
        await page.close()
    } )

    it( 'says ready with the 1.0 reference alone, which is not a failure', async () => {
        const page = await harness( '?build=1.0' )
        expect( await page.evaluate( () => document.body.dataset.harness ) ).toBe( 'ready' )
        expect( await page.evaluate( () => Object.keys( ( window as any ).HARNESS.maps ).length ) ).toBe( 0 )
        await page.close()
    } )
} )

describe( 'the HARNESS object', () => {
    it( 'holds the maps the panels drive, and the events', async () => {
        const page = await harness( '?viewer=maplibre' )
        const got = await page.evaluate( () => ( {
            maps:    Object.keys( ( window as any ).HARNESS.maps ),
            events:  Array.isArray( ( window as any ).HARNESS.events ),
            restart: typeof ( window as any ).HARNESS.restart,
            state:   ( window as any ).HARNESS.state,
        } ) )
        expect( got.maps ).toEqual( [ 'maplibre' ] )
        expect( got.events ).toBe( true )
        expect( got.restart ).toBe( 'function' )
        expect( got.state ).toBe( 'ready' )
        await page.close()
    } )

    it( 'records the viewer events as data, not only as log lines', async () => {
        const page = await harness( '?viewer=maplibre&tools=pan,zoom' )
        await page.evaluate( () => ( window as any ).SMK.MAP[ 'harness-maplibre' ]
            .$viewer.setView( { center: [ -123.1, 49.25 ], zoom: 9 } ) )
        await page.waitForTimeout( 1500 )

        const kinds = await page.evaluate( () => [ ...new Set(
            ( window as any ).HARNESS.events.map( ( e: any ) => e.event ) ) ] )
        expect( kinds ).toContain( 'changedView' )
        await page.close()
    } )
} )

describe( 'restart owed', () => {
    it( 'is raised by the config text, which cannot restart by itself', async () => {
        const page = await harness( '?viewer=leaflet' )

        expect( await page.evaluate( () =>
            ( document.querySelector( '#pending' ) as HTMLElement ).hidden ) ).toBe( true )

        await page.click( '#tabs button[data-panel="config"]' )
        await page.fill( '#config', '[ { "tools": [] } ]' )
        await page.waitForTimeout( 300 )

        expect( await page.evaluate( () =>
            ( document.querySelector( '#pending' ) as HTMLElement ).hidden ) ).toBe( false )
        await page.close()
    } )
} )
