/**
 * component-feature-list — displays a list of features from multiple layers.
 */
import render from './component-feature-list.html?vue'
import { component } from '../../vue'

component( 'feature-list', {
    emits: [ 'active', 'hover', 'remove' ],
    render,
    props: {
        layers:      Array,
        highlightId: String,
    },
    computed: {
        featureCount( this: any ): number {
            if ( !this.layers || this.layers.length === 0 ) return 0
            return this.layers.reduce( ( accum: number, ly: any ) => accum + ly.features.length, 0 )
        },
    },
} )
