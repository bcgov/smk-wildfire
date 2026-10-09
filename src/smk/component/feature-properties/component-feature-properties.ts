/**
 * component-feature-properties — displays raw feature GeoJSON properties.
 */
import render from './component-feature-properties.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'

component( 'feature-properties', {
    extends: SMK?.COMPONENT?.FeatureBase,
    render,
    computed: {
        sortedProperties( this: any ): string[] {
            if ( !this.feature || !this.feature.properties ) return []
            return Object.keys( this.feature.properties ).sort()
        },
    },
} )
