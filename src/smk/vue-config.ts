/**
 * vue-config — Vue 2 filters, components, and directives for SMK.
 * Converted from vue-config.js (include.module -> ES module).
 */

import spinnerGifUrl from './spinner.gif'
import { getMetersPerUnit } from './util'

declare const Vue: any

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function formatTitle( value: any ): string {
    if ( value == null ) return '(Null)'

    return ( value as string )
        .replace( /([^\w\s]+)/, ' $1 ' )
        .replace( /\s*[A-Z]\S*?\w(?=\W)/g, ( m ) => ' ' + m.trim() + ' ' )
        .replace( /\s*[_-]\s*/g, ' ' )
        .toLowerCase()
        .replace( /^\w|\s\w/g, ( m ) => m.toUpperCase() )
        .replace( /\s+/g, ' ' )
        .trim()
}

function formatNumber( value: any, precision: number, fractionPlaces: number ): string {
    if ( value == null ) return '(Null)'
    var fixed = Number( value ).toFixed( precision || 0 )
    if ( fractionPlaces != null ) {
        var parts = fixed.split( '.' )
        return parts[0] + '.' + parts[1].substring( 0, fractionPlaces )
    }
    return fixed
}

function formatDate( value: any ): string {
    if ( !value ) return ''
    var d = new Date( value )
    return isNaN( d.getTime() ) ? String( value ) : d.toLocaleDateString()
}

/** A duration in seconds, as SMK 1.0 wrote it: mm:ss, or hh:mm:ss past an hour. */
export function formatTime( value: any ): string {
    if ( value == null || value === '' ) return ''
    var t = Math.round( Number( value ) )
    if ( !isFinite( t ) ) return String( value )
    var pad = function ( n: number ) { return ( '0' + n ).slice( -2 ) }
    var s = t % 60, m = Math.floor( t / 60 ) % 60, h = Math.floor( t / 3600 )
    return ( h ? pad( h ) + ':' : '' ) + pad( m ) + ':' + pad( s )
}

/** A fixed decimal count leaves ".00000" on a whole number. Drop it. */
function trimZeros( s: string ): string {
    return s.indexOf( '.' ) < 0 ? s : s.replace( /0+$/, '' ).replace( /\.$/, '' )
}

export function dimensionalNumber( value: any, dim: number, unit: string, decimalPlaces: number ): string {
    const n  = ( x: number ) => trimZeros( formatNumber( x, decimalPlaces ) )
    const v  = Number( value )
    const mi = getMetersPerUnit( 'mi' )
    const ft = getMetersPerUnit( 'ft' )

    if ( dim === 1 )
        switch ( unit ) {
            // metric and imperial pick the unit from the size. Both used to
            // fall through, so "Metric" read the same as "Meters".
            case 'metric':         return v >= 1000 ? n( v / 1000 ) + ' km' : n( v ) + ' m'
            case 'imperial':       return v >= mi   ? n( v / mi )   + ' mi' : n( v / ft ) + ' ft'
            case 'miles':          return n( v / mi ) + ' mi'
            case 'inches':         return n( v / getMetersPerUnit( 'inches' ) ) + ' in'
            case 'feet':           return n( v / ft ) + ' ft'
            case 'yards':          return n( v / getMetersPerUnit( 'yd' ) ) + ' yd'
            case 'nautical-miles': return n( v / getMetersPerUnit( 'nmi' ) ) + ' nm'
            case 'kilometers':     return n( v / 1000 ) + ' km'
            case 'acres':          return n( v / mi ) + ' mi'
            case 'hectares':       return n( v ) + ' m'
            case 'meters':
            default:               return n( v ) + ' m'
        }

    if ( dim === 2 ) {
        const mi2 = mi * mi, ft2 = ft * ft
        switch ( unit ) {
            case 'metric':         return v >= 1e6 ? n( v / 1e6 ) + ' km²' : n( v ) + ' m²'
            case 'imperial':       return v >= mi2 ? n( v / mi2 ) + ' mi²' : n( v / ft2 ) + ' ft²'
            case 'miles':          return n( v / mi2 ) + ' mi²'
            case 'inches':         return n( v / Math.pow( getMetersPerUnit( 'inches' ), 2 ) ) + ' in²'
            case 'feet':           return n( v / ft2 ) + ' ft²'
            case 'yards':          return n( v / Math.pow( getMetersPerUnit( 'yd' ), 2 ) ) + ' yd²'
            case 'nautical-miles': return n( v / Math.pow( getMetersPerUnit( 'nmi' ), 2 ) ) + ' nmi²'
            case 'kilometers':     return n( v / 1e6 ) + ' km²'
            case 'acres':          return n( v / getMetersPerUnit( 'GunterChain' ) / getMetersPerUnit( 'Furlong' ) ) + ' acres'
            case 'hectares':       return n( v / 100 / 100 ) + ' ha'
            case 'meters':
            default:               return n( v ) + ' m²'
        }
    }

    // No dimension means a count, like "Number of edges". It is not 2.00000.
    return n( v )
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function setupVueConfig(): void {
    Vue.filter( 'formatTitle', formatTitle )
    Vue.filter( 'formatNumber', formatNumber )
    Vue.filter( 'formatDate', formatDate )
    Vue.filter( 'formatTime', formatTime )
    Vue.filter( 'dimensionalNumber', dimensionalNumber )

    Vue.component( 'busy-spinner', {
        props: [ 'active' ],
        template: `<img v-if="active" class="smk-busy-spinner" :src="spinnerSrc">`,
        data() {
            return { spinnerSrc: spinnerGifUrl }
        }
    } )

    Vue.component( 'status-message', {
        props: [ 'status', 'message' ],
        template: `<div v-if="message" class="smk-status-message" :class="'smk-status-' + status">{{ message }}</div>`
    } )

    Vue.directive( 'content', {
        inserted( el: any, binding: any ) {
            if ( binding.value && binding.value.createContent )
                binding.value.createContent( el )
        }
    } )
}

// Auto-call on module load — Vue must be available as a global before SMK
if ( typeof window !== 'undefined' && ( window as any ).Vue ) {
    setupVueConfig()
}

export default setupVueConfig
