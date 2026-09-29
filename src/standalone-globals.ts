/**
 * Adds Leaflet and esri-leaflet to the globals in library-globals.ts.
 * The MapLibre build leaves this module out.
 */
import './library-globals'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// esri-leaflet 3 is ESM and exports a namespace; it does NOT patch L.esri the way
// the old UMD script tag did. Hosts read L.esri, so attach it by hand below.
import * as esriLeaflet from 'esri-leaflet'
import * as esriLeafletVector from 'esri-leaflet-vector'

;( window as any ).L = L

// window.L.esri was part of the 1.0 contract. Keep anything already attached.
;( L as any ).esri = Object.assign(
    {},
    ( L as any ).esri,
    esriLeaflet,
    { Vector: Object.assign( {}, ( L as any ).esri?.Vector, esriLeafletVector ) },
)

export {}
