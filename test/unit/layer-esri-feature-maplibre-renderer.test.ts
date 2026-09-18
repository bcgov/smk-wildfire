/**
 * The maplibre esri-feature layer must use the service's own symbology.
 *
 * The leaflet adapter hands the service url to L.esri.featureLayer, which reads
 * drawingInfo and draws each feature in the colour the service names. The
 * maplibre adapter painted every layer '#3388ff' instead, so the BC Wildfire
 * Fire Perimeters came out plain blue rather than coloured by stage of control.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'

let EsriFeatureMapLibreLayer: any
let resetServiceInfoCache: () => void

beforeAll( async () => {
    ( { EsriFeatureMapLibreLayer, resetServiceInfoCache } =
        await import( '../../src/smk/viewer-maplibre/layer/layer-esri-feature-maplibre' ) )
} )

// One fetch per service is cached, so each test needs a clean slate.
beforeEach( () => { resetServiceInfoCache() } )

const EMPTY = { type: 'FeatureCollection', features: [] }

/** Answers the feature query, then the service description. */
function stubFetch( drawingInfo: any ) {
    ( globalThis as any ).fetch = vi.fn( ( url: string ) => {
        const body = url.includes( '/query?' ) ? EMPTY : { drawingInfo }
        return Promise.resolve( { ok: true, json: () => Promise.resolve( body ) } )
    } )
}

afterEach( () => { vi.restoreAllMocks() } )

function create( config: any ) {
    return EsriFeatureMapLibreLayer.create.call( {}, [ { config } ], 0 )
}

function layerById( spec: any, suffix: string ) {
    return spec.layers.find( ( l: any ) => l.id.endsWith( suffix ) )
}

const CONFIG = { id: 'fire-perimeters', serviceUrl: 'https://example.com/FeatureServer/0' }

describe( 'simple renderer', () => {
    it( 'takes the fill and the outline from the symbol', async () => {
        stubFetch( {
            renderer: {
                type:   'simple',
                symbol: {
                    type:    'esriSFS',
                    color:   [ 255, 0, 0, 128 ],
                    outline: { type: 'esriSLS', color: [ 0, 0, 0, 255 ], width: 1.5 },
                },
            },
        } )

        const spec = await create( CONFIG )

        expect( layerById( spec, '_fill' ).paint[ 'fill-color' ] ).toBe( 'rgba(255,0,0,0.5019607843137255)' )
        expect( layerById( spec, '_line' ).paint[ 'line-color' ] ).toBe( 'rgba(0,0,0,1)' )
        expect( layerById( spec, '_line' ).paint[ 'line-width' ] ).toBe( 1.5 )
    } )
} )

describe( 'uniqueValue renderer', () => {
    it( 'makes a match expression on the renderer field', async () => {
        stubFetch( {
            renderer: {
                type:   'uniqueValue',
                field1: 'FIRE_STATUS',
                uniqueValueInfos: [
                    { value: 'Out of Control', symbol: { type: 'esriSFS', color: [ 255, 0, 0, 255 ] } },
                    { value: 'Being Held',     symbol: { type: 'esriSFS', color: [ 255, 255, 0, 255 ] } },
                ],
                defaultSymbol: { type: 'esriSFS', color: [ 128, 128, 128, 255 ] },
            },
        } )

        const spec = await create( CONFIG )

        expect( layerById( spec, '_fill' ).paint[ 'fill-color' ] ).toEqual( [
            'match', [ 'to-string', [ 'get', 'FIRE_STATUS' ] ],
            'Out of Control', 'rgba(255,0,0,1)',
            'Being Held',     'rgba(255,255,0,1)',
            'rgba(128,128,128,1)',
        ] )
    } )
} )

describe( 'no renderer', () => {
    it( 'falls back to the default colour', async () => {
        stubFetch( null )

        const spec = await create( CONFIG )

        expect( layerById( spec, '_fill' ).paint[ 'fill-color' ] ).toBe( '#3388ff' )
        expect( layerById( spec, '_line' ).paint[ 'line-width' ] ).toBe( 2 )
    } )

    it( 'still draws when the service description cannot be read', async () => {
        ( globalThis as any ).fetch = vi.fn( ( url: string ) =>
            url.includes( '/query?' )
                ? Promise.resolve( { ok: true, json: () => Promise.resolve( EMPTY ) } )
                : Promise.reject( new Error( 'offline' ) )
        )

        const spec = await create( CONFIG )

        expect( layerById( spec, '_fill' ).paint[ 'fill-color' ] ).toBe( '#3388ff' )
    } )
} )

describe( 'config drawingInfo', () => {
    it( 'wins over the service description', async () => {
        stubFetch( { renderer: { type: 'simple', symbol: { color: [ 1, 2, 3, 255 ] } } } )

        const spec = await create( {
            ...CONFIG,
            drawingInfo: { renderer: { type: 'simple', symbol: { color: [ 9, 9, 9, 255 ] } } },
        } )

        expect( layerById( spec, '_fill' ).paint[ 'fill-color' ] ).toBe( 'rgba(9,9,9,1)' )
    } )
} )
