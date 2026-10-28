/**
 * base-maps — standard basemap definitions.
 * Converted from base-maps.js (include.module -> ES module).
 */

import { SMK } from './smk-ref'

export function defineBaseMaps(
    defineBaseMap:     ( id: string, config?: any ) => any,
    defineBaseMapType: ( type: string, fn?: Function ) => any,
    viewerCfg?:        any,
): void {
    // Optional ArcGIS Online API key, set via viewer config:
    //   { "viewer": { "esriApiToken": "<your-token>" } }
    // When absent, the v2 vector basemaps that require a token are hidden.
    const esriToken: string = viewerCfg?.esriApiToken || ''
    const hasEsriToken      = !!esriToken && esriToken !== '** NEEDS AN API TOKEN **'

    defineBaseMapType( 'composite', function ( cfg: any ) {
        return cfg.layers.reduce( function ( acc: any[], ly: string ) {
            const lyConfig = defineBaseMap( ly )
            if ( !lyConfig ) throw new Error( 'in composite layer ' + cfg.id + ', no base map defined for ' + ly )

            const lyType = defineBaseMapType( lyConfig.type )
            if ( !lyType ) throw new Error( 'in composite layer ' + cfg.id + ', base map ' + ly + ' has unknown type ' + lyConfig.type )

            let lys: any[]
            try {
                lys = lyType( lyConfig )
            } catch ( e: any ) {
                throw new Error( 'in composite layer ' + cfg.id + ', base map ' + ly + ' failed: ' + e )
            }

            return acc.concat( lys )
        }, [] )
    } )

    // -----------------------------------------------------------------------
    // Legacy basemaps (all deprecated)
    // -----------------------------------------------------------------------

    defineBaseMap( 'Topographic', {
        deprecated: true, type: 'esri-basemap', order: 1, key: 'Topographic', title: 'Topographic',
        option: { maxNativeZoom: 16 },
    } )

    defineBaseMap( 'Streets', {
        deprecated: true, type: 'esri-basemap', order: 2, key: 'Streets', title: 'Streets',
        option: { maxNativeZoom: 19, maxZoom: 30 },
    } )

    defineBaseMap( 'Imagery', {
        deprecated: true, type: 'composite', order: 3, title: 'Imagery',
        layers: [ 'imagery-esri', 'imagery-transportation-esri', 'imagery-labels-esri' ],
    } )

    defineBaseMap( 'imagery-esri', {
        internal: true, deprecated: true, type: 'esri-basemap', order: 3,
        key: 'Imagery', title: 'Imagery',
        option: { maxNativeZoom: 20, maxZoom: 30 },
    } )

    defineBaseMap( 'imagery-transportation-esri', {
        internal: true, deprecated: true, type: 'esri-basemap', order: 3,
        key: 'ImageryTransportation', title: 'Imagery Transportation',
        option: { maxNativeZoom: 19, maxZoom: 30, tileSize: 512, zoomOffset: -1 },
    } )

    defineBaseMap( 'imagery-labels-esri', {
        internal: true, deprecated: true, type: 'esri-basemap', order: 3,
        key: 'ImageryLabels', title: 'Imagery Labels',
        option: { maxNativeZoom: 19, maxZoom: 30, tileSize: 512, zoomOffset: -1 },
    } )

    defineBaseMap( 'Oceans', {
        deprecated: true, type: 'esri-basemap', order: 4,
        key: 'Oceans', title: 'Oceans', labels: [ 'OceansLabels' ],
    } )

    defineBaseMap( 'NationalGeographic', {
        deprecated: true, type: 'esri-basemap', order: 5,
        key: 'NationalGeographic', title: 'National Geographic',
    } )

    defineBaseMap( 'ShadedRelief', {
        deprecated: true, type: 'esri-basemap', order: 6,
        key: 'ShadedRelief', title: 'Shaded Relief',
    } )

    defineBaseMap( 'DarkGray', {
        deprecated: true, type: 'esri-basemap', order: 7, key: 'DarkGray', title: 'Dark Gray',
    } )

    defineBaseMap( 'Gray', {
        deprecated: true, type: 'esri-basemap', order: 8, key: 'Gray', title: 'Gray',
    } )

    // -----------------------------------------------------------------------
    // Current basemaps
    // -----------------------------------------------------------------------

    // The default, and its ids, as SMK 1.0.39 defined them. Esri's vector style is made to lie over the hillshade.
    defineBaseMap( 'topographic-v2', {
        type: 'composite', order: 10, title: 'Topographic',
        layers: [ '--topographic-v2-hillshade', '--topographic-v2-vector' ],
    } )

    defineBaseMap( '--topographic-v2-hillshade', {
        internal: true, type: 'esri-tiled-map', order: 10, title: 'Topographic',
        url: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer',
    } )

    defineBaseMap( '--topographic-v2-vector', {
        internal: true, type: 'esri-vector-tile', order: 10, title: 'Topographic',
        itemId: '7dc6cea0b1764a1f9af2e679f642f0f5',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    // The rest of SMK 1.0.39's set, which WFIM names. 1.0 gave them no order,
    // so its picker kept the order they were defined in; these orders keep it.
    defineBaseMap( 'bc-basemap', {
        type: 'esri-vector-tile', order: 8, title: 'BC',
        itemId: 'b1624fea73bd46c681fab55be53d96ae',
        url: 'https://tiles.arcgis.com/tiles/ubm4tcTYICKBpist/arcgis/rest/services/BC_BASEMAP_20240307/VectorTileServer',
    } )

    defineBaseMap( 'bc-basemap-hillshade', {
        type: 'esri-vector-tile', order: 9, title: 'BC (Hillshade)',
        itemId: 'bbe05270d3a642f5b62203d6c454f457',
        url: 'https://tiles.arcgis.com/tiles/ubm4tcTYICKBpist/arcgis/rest/services/BC_BASEMAP_20240307/VectorTileServer',
    } )

    // 1.0 listed the vector first and Leaflet drew it on top anyway. v2 stacks
    // a composite in list order, so the vector goes last.
    defineBaseMap( 'imagery-v2', {
        type: 'composite', order: 12, title: 'Imagery',
        layers: [ '--imagery-v2-tiles', '--imagery-v2-vector' ],
    } )

    // Esri's Canadian Imagery Hybrid: the roads and names over the imagery.
    defineBaseMap( '--imagery-v2-vector', {
        internal: true, type: 'esri-vector-tile', order: 12, title: 'Imagery',
        itemId: '85e2f70a08494305b60af53bd6fd5cbe',
        url: 'https://tiles.arcgis.com/tiles/B6yKvIZqzuOr0jBR/arcgis/rest/services/Canada_Topographic/VectorTileServer',
    } )

    defineBaseMap( '--imagery-v2-tiles', {
        internal: true, type: 'esri-tiled-map', order: 12, title: 'Imagery',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    } )

    defineBaseMap( 'streets-v2', {
        type: 'esri-vector-tile', order: 14, title: 'Streets',
        itemId: 'de26a3cf4cc9451298ea173c4b324736',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( 'streets-night', {
        type: 'esri-vector-tile', order: 15, title: 'Streets (Night)',
        itemId: '86f556a2d1fd468181855a35e344567f',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( 'oceans-v2', {
        type: 'composite', order: 16, title: 'Oceans',
        layers: [ '--oceans-v2-tiles', '--oceans-v2-labels-vector' ],
    } )

    defineBaseMap( '--oceans-v2-labels-vector', {
        internal: true, type: 'esri-vector-tile', order: 16, title: 'Oceans',
        itemId: '94329802cbfa44a18f423e6f1a0b875c',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( '--oceans-v2-tiles', {
        internal: true, type: 'esri-tiled-map', order: 16, title: 'Oceans',
        url: 'https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer',
    } )

    defineBaseMap( 'national-geographic-v2', {
        type: 'composite', order: 17, title: 'National Geographic',
        layers: [
            '--national-geographic-v2-tiles',
            '--national-geographic-v2-hillshade-tiles',
            '--national-geographic-v2-vector',
        ],
    } )

    defineBaseMap( '--national-geographic-v2-vector', {
        internal: true, type: 'esri-vector-tile', order: 17, title: 'National Geographic',
        itemId: '3d1a30626bbc46c582f148b9252676ce',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( '--national-geographic-v2-tiles', {
        internal: true, type: 'esri-tiled-map', order: 17, title: 'National Geographic',
        url: 'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/NatGeoStyleBase/MapServer',
    } )

    defineBaseMap( '--national-geographic-v2-hillshade-tiles', {
        internal: true, type: 'esri-tiled-map', order: 17, title: 'National Geographic',
        url: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer',
    } )

    // 1.0 defined the label half and left it out of the composite: it drew nothing.
    defineBaseMap( 'light-gray-v2', {
        type: 'composite', order: 18, title: 'Light Gray',
        layers: [ '--light-gray-v2-vector' ],
    } )

    defineBaseMap( '--light-gray-v2-vector', {
        internal: true, type: 'esri-vector-tile', order: 18, title: 'Light Gray',
        itemId: '291da5eab3a0412593b66d384379f89f',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( '--light-gray-v2-label', {
        internal: true, type: 'esri-vector-tile', order: 18, title: 'Light Gray',
        itemId: '1768e8369a214dfab4e2167d5c5f2454',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    // GeoBC's standard BC Basemap, with hillshade, as published on the item.
    // The service's own style is another one, with no hillshade.
    defineBaseMap( 'bc-roads', {
        type: 'esri-vector-tile', order: 20, title: 'BC BaseMap Vector',
        itemId: 'bbe05270d3a642f5b62203d6c454f457',
        url: 'https://tiles.arcgis.com/tiles/ubm4tcTYICKBpist/arcgis/rest/services/BC_BASEMAP_20240307/VectorTileServer',
        option: { maxNativeZoom: 17, maxZoom: 30 },
    } )

    defineBaseMap( 'bc-roads-raster', {
        type: 'tile', order: 21, title: 'BC Roads Raster',
        url: 'https://maps.gov.bc.ca/arcserver/rest/services/Province/roads_wm/MapServer/tile/{z}/{y}/{x}',
        option: { maxNativeZoom: 17, maxZoom: 30 },
    } )

    defineBaseMap( 'topography', {
        type: 'composite', order: 22, title: 'Canada Topography',
        layers: [ 'topography-vector', 'topography-hillshade' ],
    } )

    // Esri Canada's item carries no style, so the service's own is the design.
    defineBaseMap( 'topography-vector', {
        type: 'esri-vector-tile', order: 11, title: 'Canada Topographic Vector',
        url: 'https://tiles.arcgis.com/tiles/B6yKvIZqzuOr0jBR/arcgis/rest/services/Canada_Topographic/VectorTileServer',
    } )

    defineBaseMap( 'topography-hillshade', {
        type: 'esri-tiled-map', order: 13, title: 'Canada Hillshade',
        // It sits on top of the vector map in the topography composite, so it
        // must shade the relief, not cover it.
        option: { minZoom: 4, maxZoom: 30, opacity: 0.35 },
        url: 'https://tiles.arcgis.com/tiles/B6yKvIZqzuOr0jBR/arcgis/rest/services/Canada_Hillshade/MapServer',
    } )

    defineBaseMap( 'imagery-esri-v2', {
        internal: !hasEsriToken, type: 'esri-vector-basemap', order: 23, title: 'Imagery',
        key: 'arcgis/imagery',
        option: { token: esriToken, maxNativeZoom: 19, maxZoom: 30, tileSize: 512, zoomOffset: -1 },
    } )

    defineBaseMap( 'streets-esri-v2', {
        internal: !hasEsriToken, type: 'esri-vector-basemap', order: 24, title: 'ESRI Streets',
        key: 'arcgis/streets',
        option: { token: esriToken, maxNativeZoom: 19, maxZoom: 30 },
    } )

    // Esri's World Street Map (Night). A stored copy of an older Esri night
    // style drifted, and its sprite item was withdrawn.
    defineBaseMap( 'night', {
        type: 'esri-vector-tile', order: 25, title: 'Night',
        itemId: '86f556a2d1fd468181855a35e344567f',
        url: 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
    } )

    defineBaseMap( 'esri-imagery', {
        type: 'tile', order: 26, title: 'ESRI Imagery',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        option: { maxNativeZoom: 19, maxZoom: 30 },
    } )

    defineBaseMap( 'openstreetmap', {
        type: 'tile', order: 27, title: 'OpenStreetMap',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        option: { maxNativeZoom: 19, maxZoom: 30 },
    } )
}

export default defineBaseMaps

// Register on SMK._baseMaps so viewer.ts.initializeBasemaps() can call it.
if ( typeof window !== 'undefined' ) {
    const smk = SMK
    if ( smk ) smk._baseMaps = defineBaseMaps
}
