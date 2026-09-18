/**
 * layer-esri-feature-maplibre — MapLibre Esri feature layer adapter.
 *
 * Fetches features from the Esri REST query endpoint as GeoJSON and
 * renders them as MapLibre fill / line / circle layers off a single
 * GeoJSON source.  This is a simple "load once" implementation; viewport
 * refetching is not yet implemented.
 *
 * Symbology comes from the service's own drawingInfo renderer, which is what
 * esri-leaflet gives the Leaflet adapter. A `simple` renderer becomes one
 * colour; a `uniqueValue` renderer becomes a MapLibre `match` expression.
 */

import { EsriFeatureLayer } from '../../layer/layer-types'
import { Layer }            from '../../layer/layer'

const DEFAULT_COLOR = '#3388ff'

/** An Esri colour is [ r, g, b, a ] with a in 0..255. */
function esriColor( c: any ): string | null {
    if ( !Array.isArray( c ) || c.length < 3 ) return null
    const a = c.length > 3 ? c[ 3 ] / 255 : 1
    return 'rgba(' + c[ 0 ] + ',' + c[ 1 ] + ',' + c[ 2 ] + ',' + a + ')'
}

interface SymbolPaint {
    fillColor?:   string
    strokeColor?: string
    strokeWidth?: number
}

function readSymbol( sym: any ): SymbolPaint {
    if ( !sym ) return {}
    const out: SymbolPaint = {}

    const fill = esriColor( sym.color )
    if ( fill ) out.fillColor = fill

    const outline = sym.outline || ( sym.type === 'esriSLS' ? sym : null )
    if ( outline ) {
        const stroke = esriColor( outline.color )
        if ( stroke ) out.strokeColor = stroke
        if ( outline.width != null ) out.strokeWidth = Number( outline.width )
    }

    return out
}

/**
 * Answers one MapLibre paint value for a symbol property, as a constant or as
 * a `match` on the renderer's field.
 */
function paintValue(
    renderer: any, key: keyof SymbolPaint, fallback: any,
): any {
    if ( !renderer ) return fallback

    if ( renderer.type === 'uniqueValue' && Array.isArray( renderer.uniqueValueInfos ) ) {
        const field = renderer.field1
        if ( !field ) return fallback

        const cases: any[] = []
        renderer.uniqueValueInfos.forEach( ( info: any ) => {
            const v = readSymbol( info.symbol )[ key ]
            if ( v == null || info.value == null ) return
            cases.push( String( info.value ), v )
        } )
        if ( !cases.length ) return fallback

        const dflt = readSymbol( renderer.defaultSymbol )[ key ]
        return [ 'match', [ 'to-string', [ 'get', field ] ], ...cases, dflt != null ? dflt : fallback ]
    }

    const v = readSymbol( renderer.symbol )[ key ]
    return v != null ? v : fallback
}

/** The service description carries drawingInfo. A failure is not fatal. */
/** One fetch per service, shared by the renderer and the credit. */
let serviceInfo: Record<string, Promise<any>> = {}

/** Tests stub different answers at one URL, so they need a clean cache. */
export function resetServiceInfoCache(): void { serviceInfo = {} }

function readServiceInfo( serviceUrl: string ): Promise<any> {
    if ( !serviceInfo[ serviceUrl ] )
        serviceInfo[ serviceUrl ] = fetch( serviceUrl + '?f=json' )
            .then( r => r.ok ? r.json() : null )
            .catch( () => null )

    return serviceInfo[ serviceUrl ]
}

function readRenderer( serviceUrl: string, cfg: any ): Promise<any> {
    if ( cfg.drawingInfo ) return Promise.resolve( cfg.drawingInfo.renderer )

    return readServiceInfo( serviceUrl )
        .then( ( d: any ) => d && d.drawingInfo ? d.drawingInfo.renderer : null )
}

/**
 * esri-leaflet put each service's copyrightText into Leaflet's attribution
 * control by itself. MapLibre only shows what a source declares, so carry it.
 */
function readAttribution( serviceUrl: string, cfg: any ): Promise<string> {
    if ( cfg.attribution ) return Promise.resolve( cfg.attribution )

    return readServiceInfo( serviceUrl )
        .then( ( d: any ) => ( d && d.copyrightText ) || '' )
}

export class EsriFeatureMapLibreLayer extends EsriFeatureLayer {}

;( Layer as any )[ 'esri-feature' ][ 'maplibre' ] = EsriFeatureMapLibreLayer

;( EsriFeatureMapLibreLayer as any ).create = function ( layers: any[], _zIndex: number ) {
    if ( layers.length !== 1 ) throw new Error( 'only 1 config allowed' )
    const cfg = layers[ 0 ].config

    const base    = ( cfg.serviceUrl || '' ).replace( /\/$/, '' )
    const where   = encodeURIComponent( cfg.where || '1=1' )
    const queryUrl = base + '/query?where=' + where + '&outFields=*&outSR=4326&f=geojson'

    const id      = '_smk_esri_ft_' + cfg.id
    const opacity = cfg.opacity != null ? cfg.opacity : 1

    return Promise.all( [
        fetch( queryUrl )
            .then( r => r.ok ? r.json() : Promise.reject( new Error( 'esri-feature query failed: ' + r.status ) ) ),
        readRenderer( base, cfg ),
        readAttribution( base, cfg ),
    ] )
        .then( ( [ geojson, renderer, attribution ]: any[] ) => {
            const fillId   = id + '_fill'
            const lineId   = id + '_line'
            const circleId = id + '_circle'

            const fillColor   = paintValue( renderer, 'fillColor',   DEFAULT_COLOR )
            const strokeColor = paintValue( renderer, 'strokeColor', DEFAULT_COLOR )
            const strokeWidth = paintValue( renderer, 'strokeWidth', 2 )

            return {
                sourceId: id,
                source:   {
                    type: 'geojson',
                    data: geojson || { type: 'FeatureCollection', features: [] },
                    attribution,
                },
                layers: [
                    {
                        id:     fillId,
                        type:   'fill',
                        source: id,
                        filter: [ 'in', [ 'geometry-type' ], [ 'literal', [ 'Polygon', 'MultiPolygon' ] ] ],
                        paint:  { 'fill-color': fillColor, 'fill-opacity': opacity },
                    },
                    {
                        id:     lineId,
                        type:   'line',
                        source: id,
                        filter: [ 'in', [ 'geometry-type' ], [ 'literal', [ 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon' ] ] ],
                        paint:  { 'line-color': strokeColor, 'line-width': strokeWidth, 'line-opacity': opacity },
                    },
                    {
                        id:     circleId,
                        type:   'circle',
                        source: id,
                        filter: [ 'in', [ 'geometry-type' ], [ 'literal', [ 'Point', 'MultiPoint' ] ] ],
                        paint:  {
                            'circle-radius':       5,
                            'circle-color':        fillColor,
                            'circle-opacity':      opacity,
                            'circle-stroke-color': strokeColor,
                            'circle-stroke-width': 1,
                        },
                    },
                ],
            }
        } )
        .catch( ( e ) => {
            console.warn( 'esri-feature maplibre layer "' + cfg.id + '" failed:', e )
            // Return an empty source so addViewerLayer is a no-op
            return {
                sourceId: id,
                source:   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                layers:   [],
            }
        } )
}

export default EsriFeatureMapLibreLayer
