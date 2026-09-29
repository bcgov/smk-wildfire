/**
 * component-command-button — clickable action button component.
 */
import render from './component-command-button.html?vue'
import { component } from '../../vue'

component( 'command-button', {
    emits: [ 'click' ],
    render,
    props: {
        title:    { type: String },
        disabled: { type: Boolean, default: false },
        icon:     { type: String },
    },
    methods: {
        clickButton( this: any, ev: Event ) {
            if ( this.disabled ) return
            this.$emit( 'click', ev )
        },
    },
} )
