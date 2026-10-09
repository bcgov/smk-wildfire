/**
 * component-toggle-button — on/off toggle with v-model support.
 */
import render from './component-toggle-button.html?vue'
import { component } from '../../vue'

component( 'toggle-button', {
    emits: [ 'change' ],
    render,
    props: {
        value:    { type: Boolean, default: false },
        iconOff:  { type: String, default: 'toggle_off' },
        iconOn:   { type: String, default: 'toggle_on' },
        titleOff: { type: String, default: 'Off. Click to turn on' },
        titleOn:  { type: String, default: 'On. Click to turn off' },
    },
    methods: {
        clickToggle( this: any ) {
            this.$emit( 'change', !this.value )
        },
    },
} )
