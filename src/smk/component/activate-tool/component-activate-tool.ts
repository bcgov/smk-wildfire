/**
 * component-activate-tool — Vue component for triggering another tool.
 */
import render from './component-activate-tool.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'

component( 'activate-tool', {
    extends: SMK?.COMPONENT?.ToolEmit,
    render,
    props: {
        id:    { type: String },
        title: { type: String },
    }
} )
