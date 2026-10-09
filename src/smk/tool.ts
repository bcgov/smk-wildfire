/**
 * Tool — base class for all SMK tools.
 * Converted from tool.js (include.module -> ES module).
 */

import { SMKEvent } from './event'
import { ToolBase, baseDefaults } from './mixin/tool-base/tool-base'
import { type as smkType } from './util'
import { SMK } from './smk-ref'
import { component, propNames, isComponentOptions } from './vue'
import { reactive, toRaw, markRaw } from 'vue'

// ---------------------------------------------------------------------------
// Public types for the Tool.define factory
// ---------------------------------------------------------------------------

/**
 * Options accepted by Tool.define().  May be passed positionally
 * (construct, initialize, methods) or as a single object literal.
 */
export interface ToolDefineOptions {
    construct?:  ( this: any ) => void
    initialize?: ( this: any, smk: any ) => void
    methods?:    Record<string, any>
    events?:     string[]
    [key: string]: any
}

/** A tool instance created by Tool.define()'s returned factory. */
export type ToolInstance = any

/** Factory returned by Tool.define() — produces tool instance(s) from a config. */
export type ToolFactory = ( config: any ) => ToolInstance[]

/** Static surface of the Tool function. */
export interface ToolStatic {
    ( this: any ): void
    prototype: any
    define(
        name:        string,
        construct?:  ToolDefineOptions | ToolDefineOptions[ 'construct' ],
        initialize?: ToolDefineOptions[ 'initialize' ],
        methods?:    ToolDefineOptions[ 'methods' ],
    ): ToolFactory & { addInitializer?: ( init: Function ) => void }
    defineComposite( toolDefs: ToolFactory[] ): ToolFactory
    register( type: string, factory: ToolFactory, defaults?: Record<string, any> ): ToolFactory
    defaults(): Record<string, any>[]
}

// ---------------------------------------------------------------------------
// Tool event class
// ---------------------------------------------------------------------------

const ToolEvent: any = SMKEvent.define( [
    'changedVisible',
    'changedEnabled',
    'changedActive',
    'changedGroup',
] )

// ---------------------------------------------------------------------------
// Tool base constructor
// ---------------------------------------------------------------------------

export function Tool( this: any ): void {
    ToolEvent.prototype.constructor.call( this )

    this.$prop           = {}
    this.$propFilter     = { constructor: false }
    this.$componentProp  = {}
    this.$initializers   = []
}

Object.assign( Tool.prototype, ToolEvent.prototype )

Tool.prototype.configure = function ( name: string, option: any ) {
    Object.assign( this, option )

    if ( this.instance ) {
        this.id = name + '--' + this.instance
        if ( this.parentId )
            this.parentId = this.parentId + '--' + this.instance
    } else {
        this.id = name
    }

    return this
}

Tool.prototype.initialize = function ( smk: any ) {
    const self = this
    return this.$initializers.concat( this.$moreInitializers ).forEach(
        function ( init: Function, i: number ) {
            try {
                init.call( self, smk )
            } catch ( e ) {
                console.warn( self.id + ' initializer #' + i + ' failed' )
                throw e
            }
        }
    )
}

Tool.prototype.defineProp = function ( name: string, opt?: any ) {
    const self = this

    if ( name in this.$prop )
        throw new Error( 'prop "' + name + '" is already defined' )

    const prop = this.$prop[ name ] = Object.assign( {
        onSet:    [],
        validate: function ( val: any ) { return val },
    }, opt )

    prop.onSet = [].concat( prop.onSet )

    Object.defineProperty( this, name, {
        get() { return prop.val },
        set( val ) {
            const oldVal = prop.val
            const newVal = prop.validate( val, oldVal, name )
            if ( toRaw( newVal ) === toRaw( oldVal ) ) return

            // Vue 2 made a value reactive in place, so a tool could push onto
            // an array it had set. Vue 3 tracks only the proxy, so keep that.
            prop.val = newVal === null || typeof newVal !== 'object' ? newVal
                : isComponentOptions( newVal ) ? markRaw( newVal ) : reactive( newVal )
            prop.onSet.forEach( function ( f: Function ) {
                f.call( self, name, prop.val )
            } )
        },
    } )
}

Tool.prototype.getComponentProps = function ( componentName: string ) {
    const self = this

    if ( this.$componentProp[ componentName ] )
        return this.$componentProp[ componentName ]

    const options = component( componentName )
    if ( !options ) throw new Error( 'component "' + componentName + '" not defined' )

    const names = propNames( options ).filter( function ( c: string ) {
        if ( c in self.$propFilter ) return self.$propFilter[ c ]
        if ( c in self.$prop ) return true
        console.warn( 'prop "' + c + '" is defined in "' + componentName + '", but is not in tool', self )
        return false
    } )

    // Rendered by a root that only holds it, so the tool's writes must reach the proxy.
    const prop = this.$componentProp[ componentName ] = reactive( {} )
    names.forEach( function ( p: string ) {
        ( prop as any )[ p ] = self[ p ]
        self.$prop[ p ].onSet.unshift( function ( name: string, val: any ) {
            console.debug( 'set', componentName, name, val )
            ;( prop as any )[ p ] = val
        } )
    } )

    return this.$componentProp[ componentName ]
}

Tool.prototype.modifyComponentProp = function ( propName: string, modify: Function ) {
    const self = this
    Object.keys( this.$componentProp ).forEach( function ( c: string ) {
        if ( !( propName in self.$componentProp[ c ] ) ) return
        modify.call( self, self.$componentProp[ c ][ propName ], c )
    } )
}

// ---------------------------------------------------------------------------
// Tool.define — factory that creates named tool constructor types
// ---------------------------------------------------------------------------

const ToolStatic = Tool as unknown as ToolStatic

ToolStatic.define = function (
    name,
    construct,
    initialize,
    methods,
) {
    const option: ToolDefineOptions = {
        construct: typeof construct === 'function' ? construct : undefined,
        initialize,
        methods,
    }

    if ( smkType( construct ) === 'object' ) {
        Object.assign( option, construct as ToolDefineOptions )
    }

    const initializers: Function[] = []

    let events: any
    if ( option.events ) {
        events = SMKEvent.define( option.events )
    }

    const smk = SMK
    if ( !smk || !smk.TYPE ) throw new Error( 'SMK.TYPE not available' )

    smk.TYPE[ name ] = function ( this: any ) {
        Tool.prototype.constructor.call( this )

        if ( events )
            events.prototype.constructor.call( this )

        ToolBase.call( this )

        if ( option.construct ) option.construct.call( this )

        if ( option.initialize )
            this.$initializers.push( option.initialize )

        this.$moreInitializers = initializers

        Object.assign( this, option.methods )
    }

    Object.assign( smk.TYPE[ name ].prototype, Tool.prototype )

    if ( events )
        Object.assign( smk.TYPE[ name ].prototype, events.prototype )

    smk.TYPE[ name ].addInitializer = function ( init: Function ) {
        initializers.push( init )
    }

    const factory = function ( config: any ) {
        return [ ( new smk.TYPE[ name ]() ).configure( name, config ) ]
    } as ToolFactory & { addInitializer?: ( init: Function ) => void }

    factory.addInitializer = smk.TYPE[ name ].addInitializer

    return factory
}

// ---------------------------------------------------------------------------
// Tool.defineComposite
// ---------------------------------------------------------------------------

ToolStatic.defineComposite = function ( toolDefs ) {
    return function ( config: any ) {
        return toolDefs.map( function ( t ) {
            return t( config )[ 0 ]
        } )
    }
}

// ---------------------------------------------------------------------------
// Tool.register — a Config tool type, and the defaults its entry starts from
// ---------------------------------------------------------------------------

// In registration order: initTools keeps it for Tools with the same `order`.
const typeDefaults: Record<string, any>[] = []

ToolStatic.register = function ( type, factory, defaults = {} ) {
    SMK.TYPE[ 'tool-' + type ] = factory

    const entry = baseDefaults( Object.assign( { type }, defaults ) )
    const i     = typeDefaults.findIndex( d => d.type === type )
    if ( i < 0 ) typeDefaults.push( entry )
    else         typeDefaults[ i ] = entry

    return factory
}

/** Each registered type's defaults, as a Config tools list. */
ToolStatic.defaults = function () {
    return JSON.parse( JSON.stringify( typeDefaults ) )
}

// Assign to SMK.TYPE for backward compat
if ( typeof window !== 'undefined' ) {
    const smk = SMK
    if ( smk && smk.TYPE ) smk.TYPE.Tool = Tool
}

export default ToolStatic
