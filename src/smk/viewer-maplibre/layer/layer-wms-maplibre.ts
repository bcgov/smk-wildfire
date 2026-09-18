/**
 * layer-wms-maplibre — MapLibre WMS layer adapter (non-tiled).
 *
 * Mirrors the leaflet `NonTiledLayer.wms` behaviour
 * but, A future tiled variant can be added separately for
 * fast services where parallel tile fetching is preferable.
 *
 * Implementation notes:
 *  - We use a maplibre `image` source whose `url` and `coordinates` are
 *    refreshed on every move/zoom/resize via `updateImage`.
 *  - The WMS GetMap is requested in EPSG:3857 with width/height matching
 *    the current map canvas (in CSS pixels).  The image source's
 *    `coordinates` are the lng/lat corners of the same canvas extent, so
 *    mercator alignment is exact.
 */

import { WmsLayer } from '../../layer/layer-types'
import { Layer }    from '../../layer/layer'

// 1×1 transparent PNG used to seed the image source until the first
// updateImage() call replaces it with a real WMS response.
const BLANK_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const EARTH_R = 6378137
const D2R     = Math.PI / 180

function lngLatToMercator( lng: number, lat: number ): [ number, number ] {
    // Clamp latitude to web-mercator's valid range.
    const clamped = Math.max( Math.min( lat, 85.05112878 ), -85.05112878 )
    const x = EARTH_R * lng * D2R
    const y = EARTH_R * Math.log( Math.tan( Math.PI / 4 + ( clamped * D2R ) / 2 ) )
    return [ x, y ]
}

export class WmsMapLibreLayer extends WmsLayer {}

;( Layer as any )[ 'wms' ][ 'maplibre' ] = WmsMapLibreLayer

;( WmsMapLibreLayer as any ).create = function ( layers: any[], _zIndex: number ) {
    return resolveSLD( layers[ 0 ].config.sld ).then( function ( sldBody ) {
        const cfg0 = layers[ 0 ].config

        const layerNames  = layers.map( ( c: any ) => c.config.layerName ).reverse().join( ',' )
        const styleNames  = layers.map( ( c: any ) => c.config.styleName ).reverse().join( ',' )
        const version     = cfg0.version || '1.1.1'
        const transparent = cfg0.transparent == null ? true : !!cfg0.transparent

        // WMS 1.3.0 uses CRS=, 1.1.x uses SRS=
        const crsParam = ( /^1\.3/.test( version ) ? 'crs' : 'srs' ) + '=EPSG%3A3857'

        // Base parameters — bbox/width/height are appended per request.
        const baseParams: string[] = [
            'service=WMS',
            'request=GetMap',
            'version='     + encodeURIComponent( version ),
            'layers='      + encodeURIComponent( layerNames ),
            crsParam,
            'format=image%2Fpng',
            'transparent=' + ( transparent ? 'true' : 'false' ),
        ]

        if ( sldBody ) {
            baseParams.push( 'sld_body=' + encodeURIComponent( sldBody ) )
        } else if ( styleNames ) {
            baseParams.push( 'styles=' + encodeURIComponent( styleNames ) )
        }

        // Optional CQL filter (one expression per merged sub-layer, joined with ';').
        const where = layers.map( ( c: any ) => c.config.where || 'include' ).reverse().join( ';' )
        if ( where && where !== 'include' ) {
            baseParams.push( 'cql_filter=' + encodeURIComponent( where ) )
        }

        const sep     = cfg0.serviceUrl.indexOf( '?' ) >= 0 ? '&' : '?'
        const baseUrl = cfg0.serviceUrl + sep + baseParams.join( '&' )

        const id      = '_smk_wms_' + cfg0.id
        const opacity = cfg0.opacity != null ? cfg0.opacity : 1

        // One image pixel for every `resolutionDivisor` screen pixels. 1 asks
        // for the image at screen size, which is the old behaviour.
        const divisor = Math.max( 1, Number( cfg0.resolutionDivisor ) || 1 )

        return {
            sourceId: id,
            source: {
                type:        'image',
                url:         BLANK_PNG,
                // Four identical corners are a zero-area quad, and MapLibre's
                // tile maths then gives `x=Infinity ... outside of bounds` and
                // refuses it - one error per WMS layer on every start. The
                // image is a 1x1 transparent PNG and _smk_onAdd replaces these
                // with the real bounds on the first frame, so the placeholder
                // only has to be VALID. The web mercator limit is 85.0511.
                coordinates: [ [ -180, 85.05 ], [ 180, 85.05 ], [ 180, -85.05 ], [ -180, -85.05 ] ],
            },
            layer: {
                id,
                type:   'raster',
                source: id,
                paint:  {
                    'raster-opacity': opacity,
                    // An image source ignores this: ImageSource.prepare binds
                    // gl.LINEAR itself, so the stretch is already smooth. It is
                    // here for the day someone adds a tiled variant, which does
                    // read it.
                    'raster-resampling': 'linear',
                },
            },

            // Attached by viewer-maplibre.addViewerLayer after the source has
            // been registered with the map.  Returns a cleanup function that
            // viewer-maplibre.removeViewerLayer will invoke.
            _smk_onAdd: function ( map: any ) {
                let raf:       number | null = null
                let fetchToken = 0
                let objectUrl: string | null = null
                let cancelled  = false

                function buildUrlAndCoords() {
                    const bounds = map.getBounds()
                    const sw     = bounds.getSouthWest()
                    const ne     = bounds.getNorthEast()

                    const canvas = map.getCanvas()
                    // Use CSS pixels (clientWidth/Height) so we don't ask
                    // the WMS for a 4×-resolution image on retina displays.
                    const cw = Math.max( 1, Math.round( canvas.clientWidth  || canvas.width  ) )
                    const ch = Math.max( 1, Math.round( canvas.clientHeight || canvas.height ) )

                    // A model grid is much coarser than the screen. Asked for at
                    // screen size, each cell arrives as a hard square. Ask for a
                    // smaller image and let MapLibre stretch it, and the cells
                    // blend. It is also that much less to fetch.
                    const w = Math.max( 1, Math.round( cw / divisor ) )
                    const h = Math.max( 1, Math.round( ch / divisor ) )

                    const [ minX, minY ] = lngLatToMercator( sw.lng, sw.lat )
                    const [ maxX, maxY ] = lngLatToMercator( ne.lng, ne.lat )

                    // A time-aware subclass sets this to add &time=... per frame.

                    const extra = typeof cfg0._smkExtraParams === 'string' ? cfg0._smkExtraParams : ''

                    const url = baseUrl
                        + extra
                        + '&bbox='   + [ minX, minY, maxX, maxY ].join( ',' )
                        + '&width='  + w
                        + '&height=' + h

                    const coordinates = [
                        [ sw.lng, ne.lat ], // top-left
                        [ ne.lng, ne.lat ], // top-right
                        [ ne.lng, sw.lat ], // bottom-right
                        [ sw.lng, sw.lat ], // bottom-left
                    ]

                    return { url, coordinates }
                }

                function setLoading( v: boolean ) {
                    layers.forEach( ( ly: any ) => { ly.loading = v } )
                }

                function update() {
                    // Coalesce bursts (e.g. moveend + resize firing together)
                    // into a single network request per animation frame.
                    if ( raf != null ) return
                    raf = requestAnimationFrame( function () {
                        raf = null
                        if ( cancelled ) return
                        const src = map.getSource( id )
                        if ( !src ) return

                        const { url, coordinates } = buildUrlAndCoords()

                        // Fetch ONCE and hand updateImage a blob url. Giving it
                        // the WMS url instead made maplibre download the same
                        // image a second time - measured at 710ms each.
                        // The fetch also gives reliable success/failure, which
                        // `sourcedata` does not on a WMS error.
                        const token = ++fetchToken
                        const stale = () => cancelled || token !== fetchToken

                        setLoading( true )

                        fetch( url, { mode: 'cors' } )
                            .then( ( r: Response ) => {
                                if ( !r.ok ) throw new Error( r.status + ' ' + r.statusText )
                                return r.blob()
                            } )
                            .then( ( blob: Blob ) => {
                                if ( stale() ) return
                                // A WMS reports an error as XML with status 200.
                                if ( blob.type && blob.type.indexOf( 'image/' ) !== 0 )
                                    throw new Error( 'not an image: ' + blob.type )

                                const s = map.getSource( id )
                                if ( !s ) return

                                const next = URL.createObjectURL( blob )
                                s.updateImage( { url: next, coordinates } )

                                // Revoke the one it replaces, never the new one.
                                if ( objectUrl ) URL.revokeObjectURL( objectUrl )
                                objectUrl = next
                            } )
                            .catch( ( err: any ) => {
                                if ( stale() ) return
                                console.warn( 'WMS image fetch failed:', url, err )
                            } )
                            .then( () => { if ( !stale() ) setLoading( false ) } )
                    } )
                }

                map.on( 'moveend', update )
                map.on( 'resize',  update )

                // The image is only re-requested on move. A time-aware subclass
                // changes the URL without moving, so give it a way to ask.
                cfg0._smkRefresh = update

                // First request once the map is idle.
                update()

                return function cleanup() {
                    cancelled = true
                    if ( cfg0._smkRefresh === update ) delete cfg0._smkRefresh
                    map.off( 'moveend', update )
                    map.off( 'resize',  update )
                    if ( raf != null ) {
                        cancelAnimationFrame( raf )
                        raf = null
                    }
                    fetchToken++
                    if ( objectUrl ) {
                        URL.revokeObjectURL( objectUrl )
                        objectUrl = null
                    }
                    setLoading( false )
                }
            },
        }
    } )
}

function resolveSLD( sld: string | undefined ): Promise<string | undefined> {
    if ( !sld ) return Promise.resolve( undefined )

    if ( sld.startsWith( '@' ) ) {
        const url = sld.substr( 1 )
        return fetch( url )
            .then( r => {
                if ( r.status !== 200 ) throw new Error( 'fetching ' + url + ': ' + r.statusText )
                return r.text()
            } )
            .then( text => text.replace( /\s+/g, ' ' ).replace( /[>] [<]/g, '><' ) )
            .catch( err => { console.warn( err ); return undefined } )
    }

    return Promise.resolve( sld )
}

export default WmsMapLibreLayer
