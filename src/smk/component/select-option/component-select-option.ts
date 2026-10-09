/**
 * component-select-option — radio-style option group with v-model support.
 */
import render from './component-select-option.html?vue'
import { component } from '../../vue'

component( 'select-option', {
    emits: [ 'change' ],
    render,
    props: {
        options: { type: Array, default: () => [] },
        value:   {},
    },
    methods: {
        clickOption( this: any, option: any ) {
            this.$emit( 'change', option.value )
        },
    },
} )
