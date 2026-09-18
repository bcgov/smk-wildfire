/**
 * The Basemaps, in both 2D viewers.
 *
 * Take the id list from the Viewer's own registry: SMK.CONFIG.baseMaps is
 * empty, so a test that read the Config would test nothing.
 *
 * This is also where decision D7 lives. A Config that gives a Basemap an
 * optionImageUrl must get a picture, and the picker must build no live
 * mini-map for it.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { open, up, down, type Run } from './harness'
import { VIEWERS_2D } from './matrix'

const PICKER = [ '/test/harness/configs/basemap-picker.json' ]

const runs: { [ viewer: string ]: Run } = {}

beforeAll( async () => {
    await up()
    for ( const viewer of VIEWERS_2D )
        runs[ viewer ] = await open( { build: 'v2', viewer, config: PICKER, merge: true } )
}, 300000 )

afterAll( async () => {
    for ( const v of Object.keys( runs ) ) await runs[ v ].close()
    await down()
} )

/** What the picker actually offers, read off the built tool. */
function picker( run: Run ) {
    return run.page.evaluate( ( id: string ) => {
        const t = ( window as any ).SMK.MAP[ id ].$tool.BaseMapsTool
        return ( t.basemaps || [] ).map( ( b: any ) => ( {
            id: b.id, title: b.title,
            optionImageUrl:  b.optionImageUrl || null,
            buildsAMiniMap:  typeof b.createContent === 'function',
        } ) )
    }, 'harness-' + ( run.record.viewerType === 'maplibre' ? 'maplibre' : 'leaflet' ) )
}

describe( 'the basemap picker', () => {
    it( 'offers the same basemaps in both viewers', async () => {
        const [ leaflet, maplibre ] = await Promise.all( VIEWERS_2D.map( v => picker( runs[ v ] ) ) )
        expect( maplibre.map( ( b: any ) => b.id ) ).toEqual( leaflet.map( ( b: any ) => b.id ) )
        expect( leaflet.length ).toBeGreaterThan( 4 )
    } )

    it( 'hides the deprecated and the internal ones', async () => {
        const ids = ( await picker( runs.leaflet ) ).map( ( b: any ) => b.id )
        // 'topographic' is the 1.0 default and is deprecated now. A default the
        // picker will not offer could never be switched back to - see D9.
        expect( ids ).not.toContain( 'topographic' )
        expect( ids ).toContain( 'topography' )
    } )

    for ( const viewer of VIEWERS_2D ) describe( viewer, () => {
        it( 'shows a picture for a basemap the config gave an optionImageUrl', async () => {
            const osm = ( await picker( runs[ viewer ] ) ).find( ( b: any ) => b.id === 'openstreetmap' )
            expect( osm, 'openstreetmap is not in the picker' ).toBeTruthy()
            expect( osm.optionImageUrl ).toMatch( /marker-icon-green\.png$/ )
        } )

        it( 'builds no live mini-map for that one - decision D7', async () => {
            const all = await picker( runs[ viewer ] )
            const osm   = all.find( ( b: any ) => b.id === 'openstreetmap' )
            const other = all.find( ( b: any ) => b.id !== 'openstreetmap' )
            expect( osm.buildsAMiniMap, 'a picture must cost no map' ).toBe( false )
            // And one without a picture still does, so the test is not vacuous.
            expect( other.buildsAMiniMap ).toBe( true )
        } )

        it( 'sets every basemap the picker offers', async () => {
            const ids = ( await picker( runs[ viewer ] ) ).map( ( b: any ) => b.id )
            const mapId = 'harness-' + viewer

            const failed = await runs[ viewer ].page.evaluate( async ( [ id, list ]: any ) => {
                const smk = ( window as any ).SMK.MAP[ id ]
                const bad: string[] = []
                for ( const bm of list ) {
                    try {
                        smk.$viewer.setBasemap( bm )

                        // MapLibre builds a basemap asynchronously, so wait for
                        // the answer rather than for a fixed time. A fixed wait
                        // passed alone and failed in a full run.
                        const until = Date.now() + 5000
                        while ( Date.now() < until && smk.$tool.BaseMapsTool.current !== bm )
                            await new Promise( r => setTimeout( r, 100 ) )

                        if ( smk.$tool.BaseMapsTool.current !== bm ) bad.push( bm + ' (not current)' )
                    } catch ( e: any ) { bad.push( bm + ': ' + e.message ) }
                }
                return bad
            }, [ mapId, ids ] )

            expect( failed ).toEqual( [] )
        } )

        it( 'stacks a composite basemap, bottom first', async () => {
            const mapId = 'harness-' + viewer
            const stacked = await runs[ viewer ].page.evaluate( async ( id: string ) => {
                const smk = ( window as any ).SMK.MAP[ id ]
                smk.$viewer.setBasemap( 'topography' )
                await new Promise( r => setTimeout( r, 1500 ) )

                // Leaflet keeps the layers it made; MapLibre keeps their ids.
                const v: any = smk.$viewer
                if ( Array.isArray( v.currentBasemap ) ) return v.currentBasemap.length
                return ( v.basemapLayerIds || [] ).length
            }, mapId )

            // topography is topography-vector under topography-hillshade, so a
            // composite must put more than one thing on the map.
            expect( stacked ).toBeGreaterThan( 1 )
        } )
    } )
} )
