/**
 * The maplibre vector layer must draw a point the way the leaflet one does.
 *
 * Three faults, all seen on the BC Wildfire map:
 *
 * 1. A point took `radius` (default 5) and a stroke of `strokeWidth - 1`. The
 *    leaflet adapter takes `strokeWidth / 2` as the radius and a fixed 2px
 *    ring, so an incident dot came out too big with a halo three times too
 *    wide.
 * 2. `markerUrl` was ignored, so a layer with an icon drew a plain circle.
 * 3. Clustering read `cfg.cluster`, but every SMK config says `useClustering`.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

let VectorMapLibreLayer: any

beforeAll( async () => {
    ( { VectorMapLibreLayer } =
        await import( '../../src/smk/viewer-maplibre/layer/layer-vector-maplibre' ) )
} )

// A viewer with only the surface .create() reads.
function fakeViewer( option: { image?: any } = {} ) {
    const images: Record<string, any> = {}
    return {
        images,
        resolveAttachmentUrl: ( url: string ) => 'https://example.com' + url,
        map: {
            hasImage: ( id: string ) => id in images,
            addImage: ( id: string, img: any, opt: any ) => { images[ id ] = { img, opt } },
            loadImage: () => Promise.resolve( option.image || { data: { width: 48, height: 48 } } ),
            getSource: () => undefined,
        },
    }
}

function create( viewer: any, config: any ) {
    return Promise.resolve(
        VectorMapLibreLayer.create.call( viewer, [ { config } ], 0 )
    )
}

function layerById( spec: any, suffix: string ) {
    return spec.layers.find( ( l: any ) => l.id.endsWith( suffix ) )
}

describe( 'point style', () => {
    it( 'takes strokeWidth as the diameter and a 2px ring', async () => {
        const spec = await create( fakeViewer(), {
            id:    'out-of-control',
            style: {
                strokeWidth:   '7',
                strokeColor:   '#00000069',
                strokeOpacity: '1',
                fillColor:     '#FF0000',
                fillOpacity:   '1',
                fill:          true,
            },
        } )

        const circle = layerById( spec, '_circle' )
        expect( circle.type ).toBe( 'circle' )
        expect( circle.paint[ 'circle-radius' ] ).toBe( 3.5 )
        expect( circle.paint[ 'circle-stroke-width' ] ).toBe( 2 )
        expect( circle.paint[ 'circle-stroke-color' ] ).toBe( '#00000069' )
        expect( circle.paint[ 'circle-stroke-opacity' ] ).toBe( 1 )
        expect( circle.paint[ 'circle-color' ] ).toBe( '#FF0000' )
    } )

    it( 'keeps an explicit radius, and then the stroke is the width', async () => {
        const spec = await create( fakeViewer(), {
            id: 'explicit', style: { radius: 10, strokeWidth: 4 },
        } )

        const circle = layerById( spec, '_circle' )
        expect( circle.paint[ 'circle-radius' ] ).toBe( 10 )
        expect( circle.paint[ 'circle-stroke-width' ] ).toBe( 3 )
    } )

    it( 'answers a 5px dot when the style says nothing', async () => {
        const spec = await create( fakeViewer(), { id: 'bare' } )

        const circle = layerById( spec, '_circle' )
        expect( circle.paint[ 'circle-radius' ] ).toBe( 5 )
    } )
} )

describe( 'markerUrl', () => {
    it( 'makes a symbol layer and registers the image', async () => {
        const viewer = fakeViewer()
        const spec = await create( viewer, {
            id:    'fire-of-note',
            style: {
                markerUrl:    '/assets/images/local_fire_department.png',
                markerSize:   [ '24', '24' ],
                markerOffset: [ '12', '12' ],
            },
        } )

        const symbol = layerById( spec, '_circle' )
        expect( symbol.type ).toBe( 'symbol' )
        expect( symbol.layout[ 'icon-image' ] ).toBe( '_smk_vec_fire-of-note_icon' )
        // A 24px icon anchored at its centre needs no offset.
        expect( symbol.layout[ 'icon-offset' ] ).toEqual( [ 0, 0 ] )

        const image = viewer.images[ '_smk_vec_fire-of-note_icon' ]
        expect( image ).toBeTruthy()
        // A 48px image drawn at 24px is two device pixels to the CSS pixel.
        expect( image.opt.pixelRatio ).toBe( 2 )
    } )

    it( 'states the offset when the anchor is not the centre', async () => {
        const spec = await create( fakeViewer(), {
            id:    'pin',
            style: { markerUrl: '/pin.png', markerSize: [ 25, 41 ], markerOffset: [ 12, 41 ] },
        } )

        const symbol = layerById( spec, '_circle' )
        expect( symbol.layout[ 'icon-offset' ] ).toEqual( [ 0.5, -20.5 ] )
    } )

    it( 'does not fail the layer when the image cannot be read', async () => {
        const viewer = fakeViewer()
        viewer.map.loadImage = () => Promise.reject( new Error( '404' ) )
        vi.spyOn( console, 'warn' ).mockImplementation( () => {} )

        const spec = await create( viewer, {
            id: 'broken', style: { markerUrl: '/gone.png', markerSize: [ 24, 24 ] },
        } )

        expect( layerById( spec, '_circle' ).type ).toBe( 'symbol' )
    } )
} )

describe( 'useClustering and useHeatmap', () => {
    it( 'clusters the source when useClustering is true', async () => {
        const spec = await create( fakeViewer(), {
            id: 'out', useClustering: true, style: { strokeWidth: '7', fillColor: '#5c6671' },
        } )

        expect( spec.source.cluster ).toBe( true )
        expect( layerById( spec, '_cluster' ) ).toBeTruthy()
        expect( layerById( spec, '_unclustered' ).paint[ 'circle-radius' ] ).toBe( 3.5 )
    } )

    it( 'leaves the source alone when useClustering is false', async () => {
        const spec = await create( fakeViewer(), { id: 'holding', useClustering: false } )

        expect( spec.source.cluster ).toBeUndefined()
        expect( layerById( spec, '_circle' ) ).toBeTruthy()
    } )

    it( 'adds a heatmap layer when useHeatmap is true', async () => {
        const spec = await create( fakeViewer(), { id: 'heat', useHeatmap: true } )

        expect( layerById( spec, '_heat' ).type ).toBe( 'heatmap' )
    } )
} )
