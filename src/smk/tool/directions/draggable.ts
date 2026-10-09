/**
 * <draggable> for the directions panel: SortableJS over a v-for list.
 *
 * It replaces vuedraggable 2.16, which runs on Vue 2 only. Sortable moves the
 * node; this puts it back and moves the list item, so Vue alone owns the DOM.
 */
import sortableJs from './lib/sortable-1.7.0.min.js?raw'
import { component, h } from '../../vue'

// UMD. With no AMD define, module or exports in scope it sets window.Sortable.
if ( !( window as any ).Sortable ) new Function( 'define', 'module', 'exports', sortableJs )()

component( 'draggable', {
    props: {
        list:    { type: Array },
        options: { type: Object, default: () => ( {} ) },
    },
    emits: [ 'end' ],
    mounted( this: any ) {
        const self = this
        this.sortable = ( window as any ).Sortable.create( this.$el, Object.assign( {}, this.options, {
            onEnd( ev: any ) {
                const { oldIndex, newIndex, from, item } = ev
                if ( self.list && oldIndex !== newIndex ) {
                    const rest = Array.from( from.children ).filter( c => c !== item )
                    from.insertBefore( item, rest[ oldIndex ] || null )
                    self.list.splice( newIndex, 0, self.list.splice( oldIndex, 1 )[ 0 ] )
                }
                self.$emit( 'end', ev )
            },
        } ) )
    },
    watch: {
        options: {
            deep: true,
            handler( this: any, o: any ) {
                Object.keys( o || {} ).forEach( k => this.sortable.option( k, o[ k ] ) )
            },
        },
    },
    beforeUnmount( this: any ) {
        this.sortable?.destroy()
    },
    render( this: any ) {
        return h( 'div', this.$slots.default?.() )
    },
} )
