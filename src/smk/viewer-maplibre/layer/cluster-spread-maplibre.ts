// The SMK 1.0 Leaflet.markercluster spread: a cluster's parts move out from it while the map zooms in.

export const SPREAD_MS = 600

const HIDDEN = 'smk_hidden'
const ALPHA  = '_smk_alpha'

const OPACITY_KEYS: Record<string, string[]> = {
    circle: [ 'circle-opacity', 'circle-stroke-opacity' ],
    symbol: [ 'text-opacity', 'icon-opacity' ],
}

/** A cluster layer that a spread can hide, one cluster at a time, with no tile reload. */
export function hideable( layer: any ): any {
    const paint = { ...layer.paint }
    ;( OPACITY_KEYS[ layer.type ] || [] ).forEach( ( key ) => {
        paint[ key ] = [ 'case', [ 'boolean', [ 'feature-state', HIDDEN ], false ], 0, paint[ key ] ?? 1 ]
    } )
    return { ...layer, paint }
}

function fading( layer: any, sourceId: string ): any {
    const paint = { ...layer.paint }
    ;( OPACITY_KEYS[ layer.type ] || [] ).forEach( ( key ) => {
        const value = paint[ key ] ?? 1
        if ( typeof value === 'number' ) paint[ key ] = [ '*', value, [ 'get', ALPHA ] ]
    } )
    return { ...layer, id: layer.id + '_spread', source: sourceId, paint }
}

/** The parts the map shows at the cluster's expansion zoom: smaller clusters or points. */
export async function clusterParts( source: any, clusterId: number ): Promise<any[]> {
    let parts = await source.getClusterChildren( clusterId )
    while ( parts.length === 1 && parts[ 0 ].properties?.cluster ) {
        parts = await source.getClusterChildren( parts[ 0 ].properties.cluster_id )
    }
    return parts
}

export interface Spread {
    map:      any
    sourceId: string
    layers:   any[]   // the cluster, count and point layers, unwrapped
    cluster:  any
    parts:    any[]
    zoom:     number
}

/** Zooms to the cluster and spreads it. The result stops the spread at once. */
export function spreadCluster( s: Spread ): () => void {
    const { map, sourceId, cluster, parts, zoom } = s
    const center: number[] = cluster.geometry.coordinates
    const spreadId = sourceId + '_spread'
    const layers = s.layers.map( ( l ) => fading( l, spreadId ) )
    const parent = { source: sourceId, id: cluster.id ?? cluster.properties.cluster_id }
    let frame = 0
    let stopped = false

    const data = ( k: number ) => ( {
        type: 'FeatureCollection',
        features: [
            ...parts.map( ( p ) => {
                const [ x, y ] = p.geometry.coordinates
                const at = [ center[ 0 ] + ( x - center[ 0 ] ) * k, center[ 1 ] + ( y - center[ 1 ] ) * k ]
                return { type: 'Feature', geometry: { type: 'Point', coordinates: at }, properties: { ...p.properties, [ ALPHA ]: Math.min( 1, 0.35 + k ) } }
            } ),
            // The cluster fades on top of its parts as they leave it.
            { type: 'Feature', geometry: cluster.geometry, properties: { ...cluster.properties, [ ALPHA ]: Math.max( 0, 1 - k * 1.6 ) } },
        ],
    } )

    map.addSource( spreadId, { type: 'geojson', data: data( 0 ) } )
    const style = map.getStyle().layers.map( ( l: any ) => l.id )
    const before = style[ Math.max( ...s.layers.map( ( l ) => style.indexOf( l.id ) ) ) + 1 ]
    layers.forEach( ( l ) => map.addLayer( l, before ) )
    // The worker makes the spread's tiles later, so the cluster stays until they draw.
    const drawn = ( e: any ) => {
        if ( e.sourceId !== spreadId || !e.isSourceLoaded ) return
        map.off( 'sourcedata', drawn )
        if ( !stopped ) map.setFeatureState( parent, { [ HIDDEN ]: true } )
    }
    map.on( 'sourcedata', drawn )

    const start = performance.now()
    const step = ( now: number ) => {
        const t = Math.min( 1, ( now - start ) / SPREAD_MS )
        map.getSource( spreadId )?.setData( data( 1 - Math.pow( 1 - t, 3 ) ) )
        if ( t < 1 ) frame = requestAnimationFrame( step )
    }

    const remove = () => {
        layers.forEach( ( l ) => { if ( map.getLayer( l.id ) ) map.removeLayer( l.id ) } )
        if ( map.getSource( spreadId ) ) map.removeSource( spreadId )
    }
    const stop = () => {
        if ( stopped ) return
        stopped = true
        cancelAnimationFrame( frame )
        map.off( 'moveend', ended )
        map.off( 'sourcedata', drawn )
        map.removeFeatureState( parent, HIDDEN )
        remove()
    }
    function ended() {
        map.off( 'moveend', ended )
        // A drag stopped the zoom, so the real cluster is still on the map.
        if ( Math.abs( map.getZoom() - zoom ) > 0.01 ) return stop()
        cancelAnimationFrame( frame )
        map.getSource( spreadId )?.setData( data( 1 ) )
        // The real parts draw when their tiles are made; until then the spread covers them.
        const timer = setTimeout( stop, 400 )
        map.once( 'idle', () => { clearTimeout( timer ); stop() } )
    }

    map.easeTo( { center, zoom, duration: SPREAD_MS } )
    // After easeTo, which ends any older move with a moveend of its own.
    map.on( 'moveend', ended )
    frame = requestAnimationFrame( step )
    return stop
}
