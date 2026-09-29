/**
 * tool-coordinate — Coordinate display tool.
 * Converted from tool/coordinate/tool-coordinate.js.
 */

import Tool from '../../tool'
import coordinateRender from './coordinate.html?vue'
import { SMK } from '../../smk-ref'
import { mountRoot, reactive } from '../../vue'


const smkRef = SMK

const factory = Tool.define( 'CoordinateTool',
    null,
    function ( this: any, smk: any ) {
        const self = this

        if ( smk.$device === 'mobile' ) return

        this.model = reactive( { latitude: null, longitude: null } )

        this.vm = mountRoot( smk.addToStatus( '<div>' ), {
            render: coordinateRender,
            data: this.model,
            methods: {
                formatValue( this: any, v: number ) {
                    switch ( self.format ) {
                    case 'DDM': {
                        const s = Math.sign( v )
                        const a = Math.abs( v )
                        const i = Math.floor( a )
                        const m = ( a - i ) * 60
                        return ( s * i ) + ' ' + formatNumber( m, 6, 3 )
                    }
                    case 'DD':
                    default:
                        return formatNumber( v, 6, 3 )
                    }
                },
            },
        } )

        smk.$viewer.changedLocation( function ( ev: any ) {
            if ( ev.map && ev.map.latitude ) {
                self.model.latitude  = ev.map.latitude
                self.model.longitude = ev.map.longitude
            } else {
                self.model.latitude  = null
                self.model.longitude = null
            }
        } )

        function formatNumber( value: number, precision: number, fractionPlaces: number ) {
            const rounded = parseFloat( value.toPrecision( precision ) )
            if ( !fractionPlaces ) return rounded.toLocaleString()
            const a = Math.abs( rounded )
            const s = Math.sign( rounded )
            const i = Math.floor( a )
            const f = a - i
            return ( s * i ).toLocaleString() + f.toFixed( fractionPlaces ).substr( 1 )
        }
    }
)

// The status column is column-reverse, so a higher order sits higher:
// legend 4, minimap 3, coordinate 2, scale 1.
Tool.register( 'coordinate', factory, { order: 2, format: 'DD' } )
export default factory
