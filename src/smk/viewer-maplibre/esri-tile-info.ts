/**
 * esri-tile-info — read what an ArcGIS tile cache actually holds.
 *
 * A cache holds tiles only for the levels and the extent it was built with, and
 * it may not use 256px tiles or serve from the base host. esri-leaflet reads
 * `MapServer?f=json` before it asks for anything. Both the esri-tiled layer
 * adapter and the esri-tiled-map basemap guessed instead, so they asked for
 * tiles that do not exist and got 404s. See CONTEXT.md 8.1.
 *
 * One module, so the layer and the basemap cannot drift apart.
 */

/** One fetch per service, however many layers and basemaps ask. */
let cache: Record<string, Promise<any>> = {}

/** Tests stub different answers at one url, so they need a clean cache. */
export function resetEsriTileInfoCache(): void { cache = {} }

export function readEsriTileInfo( serviceUrl: string ): Promise<any> {
    const url = String( serviceUrl || '' ).replace( /\/$/, '' )

    if ( !cache[ url ] )
        cache[ url ] = fetch( url + '?f=json' )
            .then( r => r.ok ? r.json() : null )
            .catch( () => null )

    return cache[ url ]
}

/**
 * MapLibre draws web mercator XYZ only, so a cache in any other tiling scheme
 * cannot line up whatever we do. Read its levels only when it is one we can use.
 */
export function isWebMercator( sr: any ): boolean {
    const wkid = sr && ( sr.latestWkid || sr.wkid )
    return wkid === 3857 || wkid === 102100
}

const R = 6378137
const MAX_LAT = 85.0511287798

/** Web mercator metres to longitude and latitude. */
function toLonLat( x: number, y: number ): [ number, number ] {
    const lon = ( x / R ) * 180 / Math.PI
    const lat = ( 2 * Math.atan( Math.exp( y / R ) ) - Math.PI / 2 ) * 180 / Math.PI
    return [ lon, Math.max( -MAX_LAT, Math.min( MAX_LAT, lat ) ) ]
}

/** The cache's own extent, as MapLibre wants it: west, south, east, north. */
export function readBounds( info: any ): [ number, number, number, number ] | null {
    const e = info && ( info.fullExtent || info.initialExtent )
    if ( !e || [ e.xmin, e.ymin, e.xmax, e.ymax ].some( ( n: any ) => typeof n !== 'number' ) ) return null

    if ( isWebMercator( e.spatialReference || info.spatialReference ) ) {
        const [ w, s ] = toLonLat( e.xmin, e.ymin )
        const [ x, n ] = toLonLat( e.xmax, e.ymax )
        return [ w, s, x, n ]
    }

    // Already degrees. Anything else we cannot place, so do not guess.
    const looksLikeDegrees = Math.abs( e.xmin ) <= 180 && Math.abs( e.ymax ) <= 90
    return looksLikeDegrees ? [ e.xmin, e.ymin, e.xmax, e.ymax ] : null
}

/** The zoom levels the cache actually holds. */
export function readLevels( info: any ): { min: number; max: number } | null {
    const lods = info && info.tileInfo && info.tileInfo.lods
    if ( !Array.isArray( lods ) || !lods.length ) return null
    if ( !isWebMercator( info.tileInfo.spatialReference || info.spatialReference ) ) return null

    const levels = lods.map( ( l: any ) => l.level ).filter( ( n: any ) => typeof n === 'number' )
    return levels.length ? { min: Math.min( ...levels ), max: Math.max( ...levels ) } : null
}

/**
 * The zoom that draws at a scale denominator, from the cache's own table.
 *
 * A bigger denominator is a smaller map, so minScale is the furthest out and
 * gives the LOWEST zoom. Both spellings are in use across the layer types.
 */
export function zoomForScale( info: any, scale: number ): number | null {
    const lods = info && info.tileInfo && info.tileInfo.lods
    if ( !scale || !Array.isArray( lods ) || !lods.length ) return null

    let best: any = null
    for ( const lod of lods )
        if ( typeof lod.scale === 'number' && typeof lod.level === 'number' )
            if ( !best || Math.abs( lod.scale - scale ) < Math.abs( best.scale - scale ) ) best = lod

    return best ? best.level : null
}

/**
 * The hosts to ask for tiles.
 *
 * `tileServers` when the service publishes them. ArcGIS Online does not, and
 * esri-leaflet spreads those across tiles1-tiles4 by itself — four hosts get
 * four times the browser's per-host connection budget. Match it.
 */
export function tileHosts( base: string, info: any ): string[] {
    if ( Array.isArray( info?.tileServers ) && info.tileServers.length )
        return info.tileServers.map( ( s: string ) => String( s ).replace( /\/$/, '' ) )

    if ( base.indexOf( 'https://tiles.arcgis.com/' ) === 0 )
        return [ 1, 2, 3, 4 ].map( n => base.replace( '://tiles.', '://tiles' + n + '.' ) )

    return [ base ]
}

/** Everything a MapLibre raster source wants, from one description. */
export function tileSourceFromInfo( base: string, info: any ) {
    const path = '/tile/{z}/{y}/{x}'
    const out: any = { tiles: tileHosts( base, info ).map( h => h + path ) }

    if ( !info ) return out

    if ( info.tileInfo && info.tileInfo.rows ) out.tileSize = info.tileInfo.rows

    const levels = readLevels( info )
    if ( levels ) { out.minzoom = levels.min; out.maxzoom = levels.max }

    const bounds = readBounds( info )
    if ( bounds ) out.bounds = bounds

    if ( info.copyrightText ) out.attribution = info.copyrightText

    return out
}
