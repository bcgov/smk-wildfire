/**
 * esri-basemap-tiles — the tile URL of each `esri-basemap` key.
 *
 * Copied from esri-leaflet 3.0.19 `BasemapLayer.TILES`, so the MapLibre viewer
 * needs no Leaflet to draw a legacy basemap. `{s}.arcgisonline.com` is
 * resolved to `server.arcgisonline.com`, as resolveTileUrl did.
 */

const ONLINE = 'https://server.arcgisonline.com/ArcGIS/rest/services/'
// esri-leaflet spells these three in lower case; keep its exact paths.
const ONLINE_LC = 'https://server.arcgisonline.com/arcgis/rest/services/'

const TILES: Record<string, string> = {
    Streets:               ONLINE + 'World_Street_Map',
    Topographic:           ONLINE + 'World_Topo_Map',
    Oceans:                ONLINE_LC + 'Ocean/World_Ocean_Base',
    OceansLabels:          ONLINE_LC + 'Ocean/World_Ocean_Reference',
    NationalGeographic:    ONLINE + 'NatGeo_World_Map',
    DarkGray:              ONLINE + 'Canvas/World_Dark_Gray_Base',
    DarkGrayLabels:        ONLINE + 'Canvas/World_Dark_Gray_Reference',
    Gray:                  ONLINE + 'Canvas/World_Light_Gray_Base',
    GrayLabels:            ONLINE + 'Canvas/World_Light_Gray_Reference',
    Imagery:               ONLINE + 'World_Imagery',
    ImageryLabels:         ONLINE + 'Reference/World_Boundaries_and_Places',
    ImageryTransportation: ONLINE + 'Reference/World_Transportation',
    ShadedRelief:          ONLINE + 'World_Shaded_Relief',
    ShadedReliefLabels:    ONLINE + 'Reference/World_Boundaries_and_Places_Alternate',
    Terrain:               ONLINE + 'World_Terrain_Base',
    TerrainLabels:         ONLINE + 'Reference/World_Reference_Overlay',
    USATopo:               ONLINE + 'USA_Topo_Maps',
    ImageryClarity:        'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery',
    Physical:              ONLINE_LC + 'World_Physical_Map',
    ImageryFirefly:        'https://fly.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Firefly',
}

export function esriBasemapTileUrl( key: string ): string | null {
    const service = TILES[ key ]
    return service ? service + '/MapServer/tile/{z}/{y}/{x}' : null
}
