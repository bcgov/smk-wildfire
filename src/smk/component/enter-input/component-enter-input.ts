/**
 * component-enter-input — text/number input with enter-key handling.
 */
import render from './component-enter-input.html?vue'
import { component } from '../../vue'

component( 'enter-input', {
    emits: [ 'change', 'key-down-arrow', 'key-up-arrow', 'key-enter' ],
    render,
    data() {
        return { position: null as number | null }
    },
    props: {
        value:       { type: String, default: '' },
        type:        { type: String, default: 'text' },
        placeholder: { type: String },
        clear:       { type: Boolean, default: true },
        option:      { type: Object, default: () => ( {} ) },
        disabled:    { type: Boolean, default: false },
    },
    methods: {
        onChange( this: any, val: string ) {
            this.$emit( 'change', val )
        },
    },
    directives: {
        position: function () {},
    },
} )

component( 'enter-number', {
    emits: [ 'change', 'key-down-arrow', 'key-up-arrow', 'key-enter' ],
    render,
    data() {
        return {
            type:     'tel',
            position: null as number | null,
        }
    },
    props: {
        value:       { type: [ Number, String ], default: 0 },
        placeholder: { type: String },
        clear:       { type: Boolean, default: false },
        option:      { type: Object, default: () => ( {} ) },
        disabled:    { type: Boolean, default: false },
    },
    methods: {
        onChange( this: any, val: string, pos: number ) {
            this.position = pos
            this.$emit( 'change', parseFloat( val || '0' ) )
        },
    },
    directives: {
        position( el: HTMLInputElement, _binding: any, _vnode: any ) {
            const pos = ( el as any ).dataset.position
            if ( pos == null ) return
            el.selectionStart = pos
            el.selectionEnd   = pos
        },
    },
} )
