/**
 * component-feature-attributes — displays formatted feature attribute list.
 */
import render from './component-feature-attributes.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'

component( 'feature-attributes', {
    extends: SMK?.COMPONENT?.FeatureBase,
    render,
} )
