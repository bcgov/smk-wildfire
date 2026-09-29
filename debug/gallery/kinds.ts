/**
 * How each kind of Gallery entry mounts, with no SMK in it. Each build hands
 * in its own Vue and its own chrome templates, so v2 and 1.0 mount the same way.
 */
import type { FrameOptions } from '../../test/browser/frame'
import type { Mounted } from '../../test/browser/fixture'
import type { Story } from './stories'

export interface Chrome {
    Vue: any
    sidepanel( panel: Mounted, opt: FrameOptions ): any
    bar( bar: 'toolbar' | 'actionbar', widgets: Mounted[], opt: FrameOptions ): any
    status( template: string, data: any, opt: FrameOptions ): any
    // A status entry's template is the build's own, not the one in stories.ts.
    statusTemplate?( story: Extract<Story, { kind: 'status' }> ): string
    // Stories are written in Vue 2.5 syntax, which the 1.0 stage runs; v2 rewrites them.
    template?( html: string ): string
    destroy?( vm: any ): void
}

const inBuild = ( chrome: Chrome, html: string ) => chrome.template ? chrome.template( html ) : html

export const clone = ( v: any ) => JSON.parse( JSON.stringify( v ) )

export function initialModel( story: Story ): any {
    switch ( story.kind ) {
        case 'panel':  return story.panel.prop
        case 'block':  return story.sample
        case 'bar':    return story.widgets
        case 'status': return story.data
    }
}

/** The live object, so a click that changes a value shows in the props box. */
export function liveModel( story: Story, vm: any ): any {
    switch ( story.kind ) {
        case 'panel':  return vm.panels[ 0 ].prop
        case 'block':  return vm.panels[ 0 ].prop.sample
        case 'bar':    return vm.widgets
        case 'status': return vm.$data
    }
}

const TAG = /<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)[\s>/]/g

/** The components an entry mounts directly. Nested ones are not listed. */
export function needs( story: Story, template = story.kind === 'status' ? story.template : '' ): string[] {
    switch ( story.kind ) {
        case 'panel':  return [ story.panel.component ]
        case 'bar':    return [ ...new Set( story.widgets.map( w => w.component ) ) ]
        case 'block':  template = story.template
    }
    return [ ...new Set( [ ...template.matchAll( TAG ) ].map( m => m[ 1 ] ) ) ]
}

// A building block goes into a real tool-panel, in the slot a tool would use.
function blockComponent( chrome: Chrome, story: Extract<Story, { kind: 'block' }> ) {
    const { Vue } = chrome
    const name = 'gallery-' + story.name
    if ( Vue.component( name ) ) return name

    const body = story.slot === 'body' ? story.template : ''
    const commands = story.slot === 'commands' ? `<template slot="commands">${ story.template }</template>` : ''
    Vue.component( name, {
        extends: ( window as any ).SMK.COMPONENT.ToolPanelBase,
        props: [ 'sample' ],
        template: inBuild( chrome, `
            <tool-panel class="smk-gallery-panel" v-bind="$$projectProps( 'tool-panel' )">
                <template slot="header"><slot></slot></template>
                ${ commands }
                ${ body }
            </tool-panel>` ),
    } )
    return name
}

// Some props hold functions, which JSON cannot carry: an inline component's
// data(), and v-content's createContent( el ). The sample keeps the plain form
// (a data object, an HTML string) and here it becomes the function.
function inlineComponents( chrome: Chrome, prop: any ) {
    for ( const k of Object.keys( prop ) ) {
        const v = prop[ k ]
        if ( v && typeof v.template === 'string' && v.data && typeof v.data === 'object' ) {
            const data = v.data
            prop[ k ] = { ...v, template: inBuild( chrome, v.template ), data: () => clone( data ) }
            // Vue 3 must not make a component reactive; Vue 2 ignores the flag.
            Object.defineProperty( prop[ k ], '__v_skip', { value: true } )
        }
        else if ( v && typeof v.createContent === 'string' ) {
            const html = v.createContent
            prop[ k ] = { createContent: ( el: HTMLElement ) => { el.innerHTML = html } }
        }
        else continue
        // So the props box shows, and Apply sends back, the plain form.
        Object.defineProperty( prop[ k ], 'toJSON', { value: () => v } )
    }
    return prop
}

export function mountWith( chrome: Chrome, story: Story, model: any, opt: FrameOptions ) {
    const m = clone( model )
    switch ( story.kind ) {
        case 'panel':
            return chrome.sidepanel( { component: story.panel.component, prop: inlineComponents( chrome, m ) }, opt )
        case 'block':
            return chrome.sidepanel( { component: blockComponent( chrome, story ), prop: {
                id: story.name, type: story.name, title: story.name,
                active: true, enabled: true, showPanel: true, showHeader: true, sample: m,
            } }, opt )
        case 'bar':
            return chrome.bar( story.bar, m, opt )
        case 'status':
            return chrome.status( chrome.statusTemplate?.( story ) ?? inBuild( chrome, story.template ), m, { ...opt, methods: story.methods } )
    }
}
