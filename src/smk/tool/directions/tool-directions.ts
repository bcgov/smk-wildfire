/**
 * tool-directions — Directions composite tool.
 * Converted from tool/directions/tool-directions.js.
 */

import Tool from '../../tool'
import { widgetDefaults } from '../../mixin/tool-widget/tool-widget'
import { panelDefaults } from '../../mixin/tool-panel/tool-panel'
import markerIconGreen from './config/marker-icon-green.png'
import markerIconRed   from './config/marker-icon-red.png'
import markerIconBlue  from './config/marker-icon-blue.png'
import markerShadow    from './config/marker-shadow.png'
import DirectionsWaypointsFactory from './tool-directions-waypoints'
import DirectionsOptionsFactory from './tool-directions-options'
import DirectionsRouteFactory from './tool-directions-route'
import { SMK } from '../../smk-ref'

const smkRef = SMK

const factory = Tool.defineComposite( [
    DirectionsWaypointsFactory,
    DirectionsOptionsFactory,
    DirectionsRouteFactory,
] )

// Without the two layer lists displayWaypoints() throws on the first
// waypoint. The services stay empty: a Host brings its own key.
Tool.register( 'directions', factory, widgetDefaults( panelDefaults( {
    order: 4, position: [ 'shortcut-menu', 'list-menu' ], icon: 'directions_car', title: 'Route Planner',
    optimal: false, geocoderService: {}, routePlannerService: {},
    segmentLayers: [
        { id: '@segments', title: 'Segments',
          style: { strokeColor: 'blue', strokeWidth: 8, strokeOpacity: 0.8 },
          legend: { line: true } },
    ],
    waypointLayers: [
        [ '@waypoint-start',  'Starting Route Location', markerIconGreen ],
        [ '@waypoint-end',    'Ending Route Location',   markerIconRed   ],
        [ '@waypoint-middle', 'Waypoint on Route',       markerIconBlue  ],
    ].map( ( [ id, title, markerUrl ] ) => ( {
        id, title,
        style: {
            markerUrl, markerSize: [ 25, 41 ], markerOffset: [ 12, 41 ],
            shadowUrl: markerShadow, shadowSize: [ 41, 41 ],
            popupOffset: [ 1, -34 ],
        },
        legend: { title, point: true },
        isDraggable: true, isQueryable: false,
    } ) ),
} ) ) )
export default factory
