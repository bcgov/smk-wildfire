/**
 * SMK's one door to Vue 3.
 *
 * Vue 2 kept components, filters and directives global. Vue 3 keeps them per
 * app, and SMK makes a dozen apps, so each root mounts through mountRoot and
 * gets the whole registry. Templates are compiled at build time, so the
 * bundles carry the runtime only.
 */

import { createApp, defineAsyncComponent, reactive, isReactive, type App } from 'vue'
import { VUE_API } from './vue-api'

export { reactive, nextTick, h } from 'vue'

type Options = Record<string, any>

const registry:   Record<string, any> = {}
const directives: Record<string, any> = {}
const globals:    Record<string, any> = {}
const apps = new Set<App>()

/** Error and warning handlers for every app, as Vue 2's global Vue.config had. */
export const appHandlers: { errorHandler?: Function, warnHandler?: Function } = {}

/**
 * Registers a component, or returns one with no second argument - Vue 2's
 * Vue.component. A registration also reaches the apps already mounted.
 */
export function component( name: string, options?: Options ): any {
    if ( options === undefined ) return registry[ name ]
    registry[ name ] = options
    apps.forEach( app => { app.component( name, options ) } )
    return options
}

export function componentNames(): string[] {
    return Object.keys( registry )
}

export function directive( name: string, def: Options ): void {
    directives[ name ] = def
    apps.forEach( app => { app.directive( name, def ) } )
}

/** A property every template sees, such as $filters. */
export function globalProperty( name: string, value: any ): void {
    globals[ name ] = value
    apps.forEach( app => { app.config.globalProperties[ name ] = value } )
}

/** A component's options, which Vue wants left raw, not made reactive. */
export function isComponentOptions( v: any ): boolean {
    return !!v && typeof v === 'object' && !Array.isArray( v ) && (
        typeof v.render === 'function' || typeof v.template === 'string' ||
        typeof v.setup === 'function' || !!v.__asyncLoader )
}

/** Every prop name a component declares, through its mixins and extends. */
export function propNames( options: Options | undefined ): string[] {
    if ( !options ) return []
    const own = Array.isArray( options.props ) ? options.props : Object.keys( options.props || {} )
    const inherited = [ options.extends, ...( options.mixins || [] ) ].flatMap( propNames )
    return Array.from( new Set( [ ...inherited, ...own ] ) )
}

function install( app: App ): void {
    Object.keys( registry ).forEach( n => app.component( n, registry[ n ] ) )
    Object.keys( directives ).forEach( n => app.directive( n, directives[ n ] ) )
    Object.assign( app.config.globalProperties, globals )
    app.config.errorHandler = ( err, vm, info ) =>
        appHandlers.errorHandler ? appHandlers.errorHandler( err, vm, info ) : console.error( err )
    app.config.warnHandler = ( msg, vm, trace ) =>
        appHandlers.warnHandler ? appHandlers.warnHandler( msg, vm, trace ) : console.warn( '[Vue warn]: ' + msg + trace )
    apps.add( app )
}

/**
 * Mounts a root where `at` is, and puts the rendered root in its place, as
 * Vue 2's `new Vue( { el } )` did. Vue 3 renders inside its container and
 * empties it first, and the overlay holds several roots.
 *
 * A `data` object stays the caller's: make it with reactive(), and change it
 * only through that proxy, or the change will not redraw.
 */
export function mountRoot( at: Element, options: Options ): any {
    const data = options.data
    if ( data && typeof data !== 'function' ) {
        const state = isReactive( data ) ? data : reactive( data )
        options = Object.assign( {}, options, { data: () => state } )
    }

    const app    = createApp( options )
    install( app )
    const holder = document.createElement( 'div' )
    const vm: any = app.mount( holder )
    at.replaceWith( ...Array.from( holder.childNodes ) )

    vm.$smkUnmount = () => { apps.delete( app ); app.unmount() }
    return vm
}

/** Renders a component once and gives its HTML - for strings that go into v-html. */
export function renderToHtml( options: Options, props?: Options ): string {
    const app    = createApp( options, props )
    install( app )
    const holder = document.createElement( 'div' )
    app.mount( holder )
    const html = holder.innerHTML
    apps.delete( app )
    app.unmount()
    return html
}

// ---------------------------------------------------------------------------
// Run-time templates. A Config popupTemplate is data, so it cannot be compiled
// at build time. The compiler is fetched only for a map that has one.
// ---------------------------------------------------------------------------

let compiler: Promise<any> | null = null

function loadCompiler(): Promise<any> {
    const w = window as any
    if ( w.VueCompilerDOM ) return Promise.resolve( w.VueCompilerDOM )
    return compiler ??= new Promise( ( resolve, reject ) => {
        const s   = document.createElement( 'script' )
        s.src     = ( w.SMK?.BASE_URL || '' ) + 'smk-template-compiler.js'
        s.onload  = () => resolve( w.VueCompilerDOM )
        s.onerror = () => { compiler = null; reject( new Error( 'cannot load ' + s.src ) ) }
        document.head.appendChild( s )
    } )
}

export function compileToRender( template: string, compilerDom: any ): any {
    const { code } = compilerDom.compile( template, { hoistStatic: true, whitespace: 'preserve' } )
    // eslint-disable-next-line no-new-func
    const render = new Function( 'Vue', code )( VUE_API )
    // The code reads the instance through with(); _rc gives it the proxy that allows it, as Vue's own compiler does.
    render._rc = true
    return render
}

/** A component whose template arrives as a string, compiled when first shown. */
export function runtimeTemplateComponent( template: string, base: Options ): any {
    return defineAsyncComponent( () =>
        loadCompiler().then( c => ( { extends: base, render: compileToRender( template, c ) } ) ) )
}
