/**
 * Exposes the libraries the legacy SMK code reads off `window`.
 *
 * This is a separate module because ESM hoists every import in a file above
 * that file's own statements. Putting the assignments beside `import './main'`
 * in one file therefore ran them too late: component.ts builds its formatter
 * table at module scope and calls `Vue.extend` there, before any assignment.
 * A module runs when it is imported, so importing this one first is what makes
 * the globals visible in time.
 */
import $ from 'jquery'
import Vue from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import proj4 from 'proj4'
import * as turf from '@turf/turf'
import { arcgisToGeoJSON, geojsonToArcGIS } from '@terraformer/arcgis'

// esri-leaflet 3 is ESM and exports a namespace; it does NOT patch L.esri the way
// the old UMD script tag did. Hosts read L.esri, so attach it by hand below.
import * as esriLeaflet from 'esri-leaflet'
import * as esriLeafletVector from 'esri-leaflet-vector'

const w = window as any
// jQuery is part of the 1.0 contract: host plugin scripts use $.extend.
w.$          = $
w.jQuery     = $
w.Vue        = Vue
w.L          = L

// window.L.esri was part of the 1.0 contract. Keep anything already attached.
;( L as any ).esri = Object.assign(
    {},
    ( L as any ).esri,
    esriLeaflet,
    { Vector: Object.assign( {}, ( L as any ).esri?.Vector, esriLeafletVector ) },
)
// window.Terraformer was part of the 1.0 contract: the ESRI layer types read
// ArcGIS.parse and ArcGIS.convert off it to identify features. Without it every
// ESRI identify throws, and the throw kills the whole identify.
w.Terraformer = Object.assign( {}, w.Terraformer, {
    ArcGIS: { parse: arcgisToGeoJSON, convert: geojsonToArcGIS },
} )
w.maplibregl = maplibregl
w.proj4      = proj4
w.turf       = turf

export {}
