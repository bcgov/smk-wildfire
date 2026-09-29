/**
 * component-feature-description — displays feature description HTML.
 */
import render from './component-feature-description.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'

component( 'feature-description', {
    extends: SMK?.COMPONENT?.FeatureBase,
    render,
} )
