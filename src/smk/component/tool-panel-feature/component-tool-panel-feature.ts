/**
 * component-tool-panel-feature — panel for displaying a single feature's details.
 */
import render from './component-tool-panel-feature.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'

component( 'tool-panel-feature', {
    extends: SMK?.COMPONENT?.ToolPanelBase,
    render,
    props: [
        'feature',
        'layer',
        'attributeComponent',
        'tool',
        'resultPosition',
        'resultCount',
        'instance',
        'command',
        'attributeMode',
    ],
    computed: {
        attributes( this: any ): any[] {
            const ft = this.feature
            if ( !this.layer.attributes ) return []
            return this.layer.attributes
                .filter( ( at: any ) => at.visible !== false )
                .map( ( at: any ) => ( {
                    id:     at.name || at.title,
                    name:   at.name,
                    title:  at.title,
                    value:  at.name ? ft.properties[ at.name ] : at.value,
                    format: at.format || 'simple',
                } ) )
        },
        attributeModeOptions( this: any ): any[] {
            const template = 'feature-template-' + this.layer.id
            return [
                { value: 'default', label: 'Default View' },
                this.attributeComponent == template && { value: template, label: 'Template View' },
                this.attributeComponent == 'feature-description' && { value: 'feature-description', label: 'Description View' },
                { value: 'feature-attributes', label: 'Attributes View' },
                { value: 'feature-properties', label: 'Properties View' },
                { value: 'feature-formatted', label: 'Formatted View' },
            ].filter( Boolean )
        },
        customLabel( this: any ): any {
            if ( !this.command?.custom ) return false
            return SMK?.HANDLER?.get( this.id, 'show-custom' )( this )
        },
    },
} )
