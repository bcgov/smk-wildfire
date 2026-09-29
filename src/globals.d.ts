/**
 * Ambient declarations for vendored libs that are loaded as window globals
 * via <script> tags in HTML pages (src/lib/*).
 *
 * These are installed as devDependencies (for types and version pinning) but
 * NOT bundled — Vite marks them external in vite.config.js.  This file lets
 * TypeScript see the global identifiers and (where useful) re-export the
 * package types.
 */

// ---------------------------------------------------------------------------
// Window globals — what HTML pages expose by loading <script src="..."></script>
// ---------------------------------------------------------------------------

import type * as LType   from 'leaflet'
import type * as MlgType from 'maplibre-gl'

declare global {
    // Leaflet
    const L: typeof LType & {
        esri?:    any
        Vector?:  any
        Heat?:    any
        markerClusterGroup?: ( opts?: any ) => any
    }

    // MapLibre
    const maplibregl: typeof MlgType

    // turf, proj4 and Terraformer are imported, not globals (D26).
}

export {}
