/**
 * highlight-layers — the three internal layers a feature list highlights with.
 *
 * A factory, not a constant. tool-internal-layers rewrites each layer's id and
 * type in place, so three tools sharing one object would corrupt each other.
 */

import markerIconWhite from './config/marker-icon-white.png'
import markerShadow    from './config/marker-shadow.png'

export function highlightLayers(): any[] {
    return [
        { id: 'highlight-polygon', style: { fill: true, stroke: true, fillColor: 'white', fillOpacity: 0.5, strokeColor: 'black', strokeWidth: 3, strokeOpacity: 0.8 } },
        { id: 'highlight-line',    style: { stroke: true, strokeColor: 'black', strokeWidth: 3, strokeOpacity: 0.8 } },
        { id: 'highlight-point',   style: { markerUrl: markerIconWhite, markerSize: [ 25, 41 ], markerOffset: [ 12, 41 ], shadowUrl: markerShadow, shadowSize: [ 41, 41 ] } },
    ]
}

export default highlightLayers
