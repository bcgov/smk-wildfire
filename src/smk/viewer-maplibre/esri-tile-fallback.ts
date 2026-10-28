/**
 * esri-tile-fallback — draw the deepest level an Esri cache holds at each place.
 *
 * Past that level a cache answers 200 with a grey "Map data not yet available"
 * tile. The service's tilemap says which tiles exist, as the ArcGIS JS API reads it.
 */

declare const maplibregl: any

export const FALLBACK_PROTOCOL = 'smk-esri-fallback'

const BLOCK = 32
// Further up, the part of the tile to enlarge is under one pixel.
const MAX_STEPS = 8

let blocks: Record<string, Promise<any>> = {}
let ancestors = new Map<string, Promise<ImageBitmap>>()
let registered = false

/** Tests stub different answers at one url, so they need clean caches. */
export function resetTileFallback(): void { blocks = {}; ancestors = new Map() }

/** True or false from the tilemap; null when it has no answer, so the tile is asked as before. */
export function hasTile( service: string, query: string, z: number, y: number, x: number ): Promise<boolean | null> {
    const url = `${ service }/tilemap/${ z }/${ y - y % BLOCK }/${ x - x % BLOCK }/${ BLOCK }/${ BLOCK }${ query }`
    if ( !blocks[ url ] )
        blocks[ url ] = fetch( url ).then( r => r.ok ? r.json() : null ).catch( () => null )

    return blocks[ url ].then( ( b: any ) => {
        const at = b?.location
        if ( !b?.valid || !Array.isArray( b.data ) || !at ) return null
        const row = y - at.top, col = x - at.left
        if ( row < 0 || col < 0 || row >= at.height || col >= at.width ) return null
        return b.data[ row * at.width + col ] === 1
    } )
}

/** How many levels up from z the cache holds this place; 0 when it does, or will not say. */
export async function levelsUp( service: string, query: string, z: number, y: number, x: number, min = 0 ): Promise<number> {
    for ( let k = 0; k <= MAX_STEPS && z - k >= min; k++ )
        if ( await hasTile( service, query, z - k, y >> k, x >> k ) !== false ) return k

    return 0
}

/** A tile url that goes through the fallback. */
export function fallbackUrl( url: string ): string {
    return FALLBACK_PROTOCOL + '://' + url
}

/** False when there is no MapLibre to register with. */
export function registerTileFallback(): boolean {
    if ( typeof maplibregl === 'undefined' || !maplibregl.addProtocol ) return false
    if ( !registered ) maplibregl.addProtocol( FALLBACK_PROTOCOL, loadTile )
    registered = true
    return true
}

/** One fetch and decode for all the tiles that enlarge the same ancestor. */
function ancestor( url: string ): Promise<ImageBitmap> {
    if ( !ancestors.has( url ) ) {
        ancestors.set( url, fetch( url )
            .then( r => { if ( !r.ok ) throw new Error( 'HTTP ' + r.status + ' for ' + url ); return r.blob() } )
            .then( b => createImageBitmap( b ) ) )
        ancestors.get( url )!.catch( () => ancestors.delete( url ) )
        if ( ancestors.size > 64 ) ancestors.delete( ancestors.keys().next().value! )
    }
    return ancestors.get( url )!
}

export async function loadTile( params: { url: string }, abort: AbortController ): Promise<{ data: ArrayBuffer | ImageBitmap }> {
    const url = params.url.slice( FALLBACK_PROTOCOL.length + 3 )
    const m = /^(.*)\/tile\/(\d+)\/(\d+)\/(\d+)(\?.*)?$/.exec( url )
    const [ z, y, x ] = m ? [ +m[ 2 ], +m[ 3 ], +m[ 4 ] ] : [ 0, 0, 0 ]
    const k = m ? await levelsUp( m[ 1 ], m[ 5 ] || '', z, y, x ) : 0

    if ( !k ) {
        const r = await fetch( url, { signal: abort.signal } )
        if ( !r.ok ) throw new Error( 'HTTP ' + r.status + ' for ' + url )
        return { data: await r.arrayBuffer() }
    }

    const whole = await ancestor( `${ m![ 1 ] }/tile/${ z - k }/${ y >> k }/${ x >> k }${ m![ 5 ] || '' }` )
    if ( abort.signal.aborted ) throw new DOMException( 'aborted', 'AbortError' )

    const canvas = document.createElement( 'canvas' )
    canvas.width = canvas.height = whole.width
    canvas.getContext( '2d' )!.drawImage( whole, ...enlargeRect( whole.width, k, x, y ) )
    return { data: await createImageBitmap( canvas ) }
}

/**
 * drawImage arguments for the part of the ancestor under one tile, at full size.
 * One source pixel past each edge, so the edges blend into the next tile with no seam.
 */
export function enlargeRect( width: number, k: number, x: number, y: number ): [ number, number, number, number, number, number, number, number ] {
    const size = width >> k, s = 1 << k, n = s - 1
    return [ ( x & n ) * size - 1, ( y & n ) * size - 1, size + 2, size + 2, -s, -s, ( size + 2 ) * s, ( size + 2 ) * s ]
}
