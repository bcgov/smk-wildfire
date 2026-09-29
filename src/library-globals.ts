/**
 * Exposes the libraries a Host must share with SMK, except Leaflet.
 * Both bundled builds import this first; standalone-globals.ts adds Leaflet.
 *
 * Only a shared instance is a global (D26): a Host registers components on
 * SMK's Vue and adds markers to SMK's map. turf, proj4, Terraformer and jQuery
 * are imported where SMK uses them, so a bundle keeps only what it calls.
 *
 * This is a separate module because ESM hoists every import in a file above
 * that file's own statements. Putting the assignments beside `import './main'`
 * in one file therefore ran them too late: component.ts builds its formatter
 * table at module scope and calls `Vue.extend` there, before any assignment.
 * A module runs when it is imported, so importing this one first is what makes
 * the globals visible in time.
 */
import Vue from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const w = window as any
w.Vue        = Vue
w.maplibregl = maplibregl

export {}
