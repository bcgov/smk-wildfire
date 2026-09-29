/**
 * Leaflet.markercluster, for the vector layer's useClustering and the Query and
 * Select feature lists. SMK 1.0 loaded it with its two stylesheets.
 */

import markerClusterJs from '../../lib/leaflet/marker-cluster-1.4.1.js?raw'
import '../../lib/leaflet/marker-cluster-1.4.1.css'
import '../../lib/leaflet/marker-cluster-default-1.4.1.css'

declare const L: any

// It is UMD: with the ArcGIS API's define on the page it would register there
// and never reach L. Run it with define hidden, as the directions libs are.
if ( typeof L !== 'undefined' && !L.markerClusterGroup )
    new Function( 'define', 'module', 'exports', markerClusterJs )()
