/**
 * component — base component objects for SMK.
 * Converted from component/component.js (include.module -> ES module).
 */

import toolWidgetRender from './tool-widget.html?vue'
import { templateReplace, projection } from '../util'
import { SMK } from '../smk-ref'
import { component, propNames } from '../vue'
import { toDisplayString } from 'vue'

// ---------------------------------------------------------------------------
// FeatureBase — base mixin for feature display components
// ---------------------------------------------------------------------------

export const FeatureBase: any = {
    props: [ 'feature', 'layer', 'showHeader', 'attributes' ],
    created( this: any ) {
        const smk = SMK
        if ( smk && smk.HANDLER && smk.HANDLER.has( 'IdentifyFeatureTool', 'attribute-replacer-context' ) ) {
            const rep = smk.HANDLER.get( 'IdentifyFeatureTool', 'attribute-replacer-context' )
            this.replacerContext = rep.call( this, this.layer.id )
        } else {
            this.replacerContext = function ( token: string ) {
                /* eslint-disable no-eval */
                return eval( token )
            }
        }
    },
    methods: {
        insertWordBreaks( str: string ) {
            return str.replace( /[^a-z0-9 ]+/ig, ( m ) => '<wbr>' + m )
        },
        formatValue( val: any ) {
            if ( /^https?[:][/]{2}[^/]/.test( ( '' + val ).trim() ) ) {
                return '<a href="' + val + '" target="_blank">Open in new window</a>'
            }
            return val
        },
        formatAttribute( this: any, attr: any ) {
            const m = attr.format.match( /^(.+)[(](.+)[)]$/ )
            if ( !m ) {
                const value = this.evalTemplate( attr.value )
                return formatter[ attr.format ]( Object.assign( {}, attr, { value } ), this.feature, this.layer )()
            }
            return formatter[ m[ 1 ] ]( attr, this.feature, this.layer ).apply( this, eval( '[' + m[ 2 ] + ']' ) )
        },
        formatTitle( this: any, attr: any ) {
            const title = this.evalTemplate( attr.title )
            return this.insertWordBreaks( title )
        },
        evalTemplate( this: any, templ: string ) {
            const self = this
            return templateReplace( templ, function ( token: string ) {
                return self.replacerContext( token )
            } )
        }
    }
}

// ---------------------------------------------------------------------------
// Attribute formatters - HTML for v-html. Vue 2 mounted a component for each
// one; these write the same markup, and '' where its v-if was false.
// ---------------------------------------------------------------------------

const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const text  = ( v: any ) => toDisplayString( v ).replace( /[&<>"']/g, c => ESCAPE[ c ] )
const value = ( html: string ) => '<span class="smk-value">' + html + '</span>'

type Formatter = ( attribute: any, feature: any, layer: any ) => ( ...args: any[] ) => string

const formatter: Record<string, Formatter> = {
    simple:           ( a ) => () => a.value ? value( text( a.value ) ) : '',
    HTML:             ( a ) => () => a.value ? value( a.value ) : '',
    asLocalTimestamp: ( a ) => () => a.value ? value( text( new Date( a.value ).toLocaleString() ) ) : '',
    asLocalDate:      ( a ) => () => a.value ? value( text( new Date( a.value ).toLocaleDateString() ) ) : '',
    asLocalTime:      ( a ) => () => a.value ? value( text( new Date( a.value ).toLocaleTimeString() ) ) : '',
    asUnit:           ( a ) => ( unit: string ) => a.value
        ? value( text( a.value ) + ' <span class="smk-unit">' + text( unit ) + '</span>' ) : '',
    asLink:           ( a ) => ( url: string, label: string ) => url
        ? value( '<a href="' + text( url ) + '" target="_blank">' + text( label || a.value || url )
            + '<i class="material-icons">open_in_new</i></a>' ) : '',
    asHTML:           () => ( html: string ) => html ? value( html ) : '',
}

// ---------------------------------------------------------------------------
// Component mixins
// ---------------------------------------------------------------------------

export const ToolEmit: any = {
    methods: {
        $$emit( this: any, event: string, arg: any ) {
            this.$root.trigger( this.id, event, arg, this )
        }
    }
}

export const ToolBase: any = {
    mixins: [ ToolEmit ],
    props: {
        id:        String,
        type:      String,
        // The zoom and pan tools name one icon and one title per button, so
        // both take an object as well as a string.
        title:     [ String, Object ],
        status:    String,
        active:    Boolean,
        enabled:   Boolean,
        visible:   Boolean,
        group:     Boolean,
        showTitle: Boolean,
        icon:      [ String, Object ],
    },
    computed: {
        baseClasses( this: any ) {
            const c: Record<string, boolean> = {
                'smk-tool-active':   this.active,
                'smk-tool-visible':  this.visible,
                'smk-tool-enabled':  this.enabled,
            }
            c[ 'smk-tool-' + this.id ] = true
            if ( this.type ) c[ 'smk-' + this.type + '-tool' ] = true
            if ( this.status )
                c[ 'smk-tool-status-' + this.status ] = true
            return c
        }
    }
}

const componentProps: Record<string, any> = {}

export const ToolPanelBase: any = {
    extends: ToolBase,
    props: {
        showPanel:   Boolean,
        showHeader:  Boolean,
        showSwipe:   Boolean,
        busy:        Boolean,
        expand:      Number,
        hasPrevious: Boolean,
        parentId:    String,
    },
    computed: {
        classes( this: any ) {
            return this.baseClasses
        }
    },
    methods: {
        $$projectProps( this: any, componentName: string ) {
            if ( !componentProps[ componentName ] ) {
                componentProps[ componentName ] = projection.apply(
                    null,
                    propNames( component( componentName ) )
                )
            }
            return componentProps[ componentName ]( this.$props )
        }
    }
}

export const ToolWidgetBase: any = {
    extends: ToolBase,
    render: toolWidgetRender,
    props: {
        showWidget: Boolean,
    },
    computed: {
        classes( this: any ) {
            const c = this.baseClasses
            c[ 'smk-tool-title' ] = this.showTitle
            return c
        }
    }
}

// ---------------------------------------------------------------------------
// Register on window.SMK.COMPONENT for backward compat
// ---------------------------------------------------------------------------

export function setupComponents(): void {
    const smkRef = SMK
    if ( !smkRef ) return
    if ( !smkRef.COMPONENT ) smkRef.COMPONENT = {}

    smkRef.COMPONENT.FeatureBase    = FeatureBase
    smkRef.COMPONENT.ToolEmit       = ToolEmit
    smkRef.COMPONENT.ToolBase       = ToolBase
    smkRef.COMPONENT.ToolPanelBase  = ToolPanelBase
    smkRef.COMPONENT.ToolWidgetBase = ToolWidgetBase
}

// Auto-register on module load so sub-component imports can extend these base components
if ( typeof window !== 'undefined' ) {
    setupComponents()
}

export default setupComponents
