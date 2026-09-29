/**
 * MapLibre build entry.
 *
 * The same SMK as standalone-entry.ts, with no Leaflet and no ESRI 3D.
 * vite.config.maplibre.js replaces the modules of those two viewers with
 * empty ones, so main.ts stays the one import list. See D25.
 */
import './library-globals'
import './main'
