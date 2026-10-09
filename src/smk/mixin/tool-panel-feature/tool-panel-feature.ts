import { SMK } from '../../smk-ref'
import { component, runtimeTemplateComponent } from '../../vue'
/**
 * tool-panel-feature mixin — manages a feature detail panel for a Tool.
 * Converted from mixin/tool-panel-feature/tool-panel-feature.js.
 */


export function ToolPanelFeature( this: any, featureSetCallback: ( this: any, smk: any ) => any ): void {
    this.defineProp( 'feature' )
    this.defineProp( 'layer' )
    this.defineProp( 'attributeComponent' )
    this.defineProp( 'tool' )
    this.defineProp( 'resultPosition' )
    this.defineProp( 'resultCount' )
    this.defineProp( 'instance' )
    this.defineProp( 'attributeMode' )
    this.defineProp( 'command' )
    this.defineProp( 'attributes' )

    this.tool    = {}
    this.command = {}
    this.attributeMode = 'default'
    this.$propFilter.attributes = false

    this.$initializers.push( function ( this: any, smk: any ) {
        this.featureSet = featureSetCallback.call( this, smk )

        this.tool = smk.getToolTypesAvailable()
        delete this.tool[ this.type ]

        const self = this
        smk.on( this.id, {
            'swipe-up': function () {
                smk.$sidepanel.setExpand( 2 )
            },
            'swipe-down': function () {
                smk.$sidepanel.incrExpand( -1 )
            },
            // The panel's view picker. Vue 3 will not let the panel write its own prop.
            'attribute-mode': function ( mode: string ) {
                self.attributeMode = mode
            },
        } )

        // TODO: remove, attributeView deprecated
        if ( this.attributeView )
            this.attributeMode = this.attributeView
    } )

    this.setAttributeComponent = function ( layer: any, feature: any ) {
        if ( layer.config.popupTemplate ) {
            let template: string | null = null

            if ( layer.config.popupTemplate.startsWith( '@' ) ) {
                this.attributeComponent = layer.config.popupTemplate.substr( 1 )
            } else {
                this.attributeComponent = 'feature-template-' + layer.config.id
                template = layer.config.popupTemplate
            }

            if ( !component( this.attributeComponent ) ) {
                if ( template ) {
                    // A Config template is data, so it compiles here, on first show.
                    component( this.attributeComponent,
                        runtimeTemplateComponent( template, SMK?.COMPONENT?.FeatureBase ) )
                } else {
                    console.warn( 'component not found:', this.attributeComponent )
                    layer.config.popupTemplate = null
                }
            }

            if ( component( this.attributeComponent ) ) return
        }

        if ( feature.properties.description ) {
            this.attributeComponent = 'feature-description'
            return
        }

        if ( layer.config.attributes ) {
            this.attributeComponent = 'feature-attributes'
            return
        }

        this.attributeComponent = 'feature-properties'
    }
}

// Assign to SMK.TYPE for backward compat
if ( typeof window !== 'undefined' ) {
    const smk = SMK
    if ( smk && smk.TYPE ) smk.TYPE.ToolPanelFeature = ToolPanelFeature
}

/** The Config defaults of a Tool with a feature panel. */
export function panelFeatureDefaults( option: Record<string, any> ): Record<string, any> {
    option.command = Object.assign( {
        navigator:     true,
        zoom:          true,
        select:        true,
        attributeMode: false,
    }, option.command )
    return Object.assign( { attributeMode: 'default' }, option )
}

export default ToolPanelFeature
