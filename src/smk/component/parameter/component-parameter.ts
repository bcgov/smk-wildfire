/**
 * component-parameter — constant, input, and select parameter components.
 */
import constantTemplate from './component-parameter-constant.html?vue'
import inputTemplate    from './component-parameter-input.html?vue'
import selectTemplate   from './component-parameter-select.html?vue'
import { component } from '../../vue'

component( 'parameter-constant', {
    emits: [ 'mounted' ],
    render: constantTemplate,
    props: [ 'id', 'title', 'value', 'type', 'focus' ],
    mounted( this: any ) {
        this.$emit( 'mounted' )
    },
} )

component( 'parameter-input', {
    emits: [ 'mounted', 'input', 'pickDown', 'pickUp', 'execute', 'change', 'reset' ],
    render: inputTemplate,
    props: [ 'id', 'title', 'value', 'type', 'focus' ],
    data( this: any ) {
        return { input: this.value || '' }
    },
    watch: {
        value( this: any, val: string ) {
            this.input = val || ''
        },
        focus( this: any ) {
            this.$refs.in.focus()
        },
    },
    mounted( this: any ) {
        this.$emit( 'mounted' )
    },
} )

component( 'parameter-select', {
    emits: [ 'mounted', 'input' ],
    render: selectTemplate,
    props: [ 'id', 'title', 'choices', 'value', 'type', 'focus', 'useFallback' ],
    data( this: any ) {
        return { selected: this.value || '' }
    },
    watch: {
        value( this: any, val: string ) {
            this.selected = val || ''
        },
    },
    mounted( this: any ) {
        this.$emit( 'mounted' )
    },
    computed: {
        isEmpty( this: any ): boolean {
            return !this.choices || this.choices.length === 0
        },
    },
} )
