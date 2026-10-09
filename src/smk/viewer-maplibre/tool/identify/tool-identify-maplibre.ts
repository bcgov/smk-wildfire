/**
 * tool-identify-maplibre — MapLibre initializer for IdentifyListTool.
 *
 * Identify itself is viewer-agnostic; this adds only the drag handle that
 * resizes the search radius, which the leaflet viewer has had all along.
 */

declare const maplibregl: any
import '../../../tool/identify/tool-identify-list'
import { SMK } from '../../../smk-ref'
import * as turf from '@turf/turf'

const smkRef = SMK

smkRef.TYPE.IdentifyListTool.addInitializer( function ( this: any, smk: any ) {
    if ( smk.$viewer.type !== 'maplibre' ) return

    const self = this
    let marker: any = null

    this.clearMarker = function () {
        if ( marker ) marker.remove()
        marker = null
    }

    function searchCentre() {
        return [ self.searchLocation.map.longitude, self.searchLocation.map.latitude ]
    }

    function metresFromCentre( lngLat: any ) {
        return turf.distance( searchCentre(), [ lngLat.lng, lngLat.lat ] ) * 1000
    }

    smk.$viewer.map.on( 'mousemove', function ( ev: any ) {
        if ( !self.trackMouse )          return
        if ( !self.searchLocation )      return
        if ( ev.originalEvent.buttons )  return

        const distToLocation = metresFromCentre( ev.lngLat )

        // Only offer the handle near the edge of the circle, as leaflet does.
        if ( Math.abs( distToLocation - self.getRadiusMeters() ) >= self.bufferDistance() ) {
            self.clearMarker()
            return
        }

        // closestPointOnBoundary answers in [ lat, lng ]; MapLibre wants lng first.
        const pos = self.closestPointOnBoundary( ev.lngLat )
        if ( !pos ) return
        const lngLat = [ pos[ 1 ], pos[ 0 ] ]

        if ( marker ) {
            marker.setLngLat( lngLat )
            return
        }

        marker = new maplibregl.Marker( { element: dragHandle(), draggable: true } )
            .setLngLat( lngLat )
            .addTo( smk.$viewer.map )

        marker.on( 'dragstart', function () {
            // Stop following the pointer, or the handle fights the drag.
            self.trackMouse = false
            self.displayEditSearchArea( self.makeSearchLocationCircle( distToLocation ) )
        } )

        marker.on( 'drag', function () {
            self.displayEditSearchArea(
                self.makeSearchLocationCircle( metresFromCentre( marker.getLngLat() ) ),
            )
        } )

        marker.on( 'dragend', function () {
            self.setRadiusMeters( metresFromCentre( marker.getLngLat() ) )
            self.restartIdentify()
        } )
    } )
} )

function dragHandle(): HTMLElement {
    const el = document.createElement( 'div' )
    el.className = 'smk-drag-handle'
    // A leaflet divIcon carried iconSize; a MapLibre marker element sizes itself.
    el.style.width      = '10px'
    el.style.height     = '10px'
    el.style.boxSizing  = 'border-box'
    el.style.cursor     = 'pointer'
    return el
}
