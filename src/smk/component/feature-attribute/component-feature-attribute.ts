/**
 * component-feature-attribute — displays a single attribute row.
 */
import render from './component-feature-attribute.html?vue'
import { component } from '../../vue'

component( 'feature-attribute', {
    render,
    props: {
        title: { type: String },
        value: { type: String },
    },
} )
