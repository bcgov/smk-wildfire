/**
 * One layer must not be able to end the identify for the others.
 *
 * A layer type that throws before it makes a promise throws inside the
 * forEach rather than rejecting. On the BC Wildfire map that single throw
 * ended identifyFeatures for every layer.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

;( globalThis as any ).maplibregl = {
    Marker: class { setLngLat() { return this } addTo() { return this } remove() {} },
}

let Viewer: any
let SMKEvent: any

beforeAll( async () => {
    ( { Viewer } = await import( '../../src/smk/viewer' ) )
    ;( { SMKEvent } = await import( '../../src/smk/event' ) )
} )

function fakeViewer( layers: Record<string, any> ) {
    const added: { id: string; features: any[] }[] = []
    const v: any = Object.create( Viewer.prototype )
    v.dispatcher = new SMKEvent().dispatcher
    v.layerIds  = Object.keys( layers )
    v.layerId   = layers
    v.visibleLayer = {}
    v.offMapLayer  = {}
    v.added     = added
    v.identified = { clear: () => {}, add: ( id: string, features: any[] ) => added.push( { id, features } ) }
    v.getView   = () => ( { scale: 1 } )
    v.isDisplayContextItemVisible = () => true
    v.acquireIdentifyMutex = () => ( { held: () => true } )
    return v
}

function layer( id: string, getFeaturesInArea: any ) {
    return { id, config: { id, titleAttribute: 'name' }, inScaleRange: () => true, getFeaturesInArea }
}

const AREA = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ [] ] } }
const AT   = { map: { latitude: 49, longitude: -123 } }

describe( 'identifyFeatures', () => {
    it( 'keeps going when one layer throws before it makes a promise', async () => {
        vi.spyOn( console, 'warn' ).mockImplementation( () => {} )

        const v = fakeViewer( {
            broken: layer( 'broken', () => { throw new TypeError( "Cannot read properties of undefined (reading 'ArcGIS')" ) } ),
            good:   layer( 'good',   () => Promise.resolve( [ { properties: { name: 'a fire' } } ] ) ),
        } )

        await v.identifyFeatures( AT, AREA )

        expect( v.added.map( ( a: any ) => a.id ) ).toEqual( [ 'good' ] )
        expect( v.added[ 0 ].features[ 0 ].title ).toBe( 'a fire' )
    } )

    it( 'keeps going when one layer rejects', async () => {
        const v = fakeViewer( {
            broken: layer( 'broken', () => Promise.reject( new Error( 'no features' ) ) ),
            good:   layer( 'good',   () => Promise.resolve( [ { properties: { name: 'a fire' } } ] ) ),
        } )

        await v.identifyFeatures( AT, AREA )

        expect( v.added.map( ( a: any ) => a.id ) ).toEqual( [ 'good' ] )
    } )

    it( 'marks each feature with the point the user picked', async () => {
        const v = fakeViewer( {
            good: layer( 'good', () => Promise.resolve( [ { properties: { name: 'a fire' } } ] ) ),
        } )

        await v.identifyFeatures( AT, AREA )

        expect( v.added[ 0 ].features[ 0 ]._identifyPoint ).toEqual( AT.map )
    } )
} )

// A Host opened its panels by wrapping identifyFeatures; these events replace that.
describe( 'identify events', () => {
    function listen( v: any ) {
        const seen: string[] = []
        v.startedIdentify( ( ev: any ) => seen.push( 'started:' + !!ev.location ) )
        v.finishedIdentify( ( ev: any ) => seen.push( 'finished:' + !!ev.location + ':' + v.added.length ) )
        return seen
    }

    it( 'fires started, then finished after the results are in', async () => {
        const v = fakeViewer( { good: layer( 'good', () => Promise.resolve( [ { properties: { name: 'a fire' } } ] ) ) } )
        const seen = listen( v )
        await v.identifyFeatures( AT, AREA )
        expect( seen ).toEqual( [ 'started:true', 'finished:true:1' ] )
    } )

    it( 'fires both for a clear, which has no location', async () => {
        const v = fakeViewer( {} )
        const seen = listen( v )
        await v.identifyFeatures()
        expect( seen ).toEqual( [ 'started:false', 'finished:false:0' ] )
    } )

    it( 'does not fire finished for an identify a newer one discarded', async () => {
        const v = fakeViewer( { good: layer( 'good', () => Promise.resolve( [] ) ) } )
        v.acquireIdentifyMutex = () => ( { held: () => false } )
        const seen = listen( v )
        await v.identifyFeatures( AT, AREA ).catch( () => {} )
        expect( seen ).toEqual( [ 'started:true' ] )
    } )
} )
