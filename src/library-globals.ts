/**
 * Exposes the libraries a Host must share with SMK, except Leaflet.
 * Both bundled builds import this first; standalone-globals.ts adds Leaflet.
 *
 * Only a shared instance is a global (D26): a Host registers components on
 * SMK's Vue and adds markers to SMK's map. turf, proj4, Terraformer and jQuery
 * are imported where SMK uses them, so a bundle keeps only what it calls.
 *
 * A separate module, because ESM hoists imports above a file's own statements:
 * importing this one first is what sets the globals before SMK's modules run.
 */
import maplibregl from 'maplibre-gl'
import { VUE_API } from './smk/vue-api'
import 'maplibre-gl/dist/maplibre-gl.css'

const w = window as any
w.Vue        = VUE_API
w.maplibregl = maplibregl

export {}
