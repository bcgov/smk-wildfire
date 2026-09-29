/**
 * component-select-dropdown — dropdown selector with v-model support.
 */
import render from './component-select-dropdown.html?vue'
import { component } from '../../vue'

component( 'select-dropdown', {
    emits: [ 'change' ],
    render,
    props: {
        options: { type: Array, default: () => [] },
        value:   {},
    },
    methods: {
        clickOption( this: any, value: any ) {
            this.$emit( 'change', value )
        },
    },
} )
