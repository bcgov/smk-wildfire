/**
 * Mounts one Gallery entry. The page and test/browser/gallery.test.ts both use
 * this, so an entry that stops rendering fails a test.
 */
import { Vue, mountSidepanel, mountBar, mountStatus, type FrameOptions } from '../../test/browser/fixture'
import type { Story } from './stories'

// Tool modules register their components when they load. Same order as main.ts.
await import( '../../src/smk/tool/about/tool-about' )
await import( '../../src/smk/tool/pan/tool-pan' )
await import( '../../src/smk/tool/zoom/tool-zoom' )
await import( '../../src/smk/tool/version/tool-version' )
await import( '../../src/smk/tool/reset-view/tool-reset-view' )
await import( '../../src/smk/tool/list-menu/tool-list-menu' )
await import( '../../src/smk/tool/baseMaps/tool-baseMaps' )
await import( '../../src/smk/tool/bookmarks/tool-bookmarks' )
await import( '../../src/smk/tool/current-location/tool-current-location' )
await import( '../../src/smk/tool/location/tool-location' )
await import( '../../src/smk/tool/legend/tool-legend' )
await import( '../../src/smk/tool/layers/tool-layers' )
await import( '../../src/smk/tool/measure/tool-measure' )
await import( '../../src/smk/tool/identify/tool-identify' )
await import( '../../src/smk/tool/search/tool-search' )
await import( '../../src/smk/tool/select/tool-select' )
await import( '../../src/smk/tool/query/tool-query' )
await import( '../../src/smk/tool/query-place/tool-query-place' )
await import( '../../src/smk/tool/bespoke/tool-bespoke' )
await import( '../../src/smk/tool/directions/tool-directions' )
await import( '../../src/smk/tool/dropdown/tool-dropdown' )
await import( '../../src/smk/tool/markup/tool-markup' )
await import( '../../src/smk/tool/menu/tool-menu' )
await import( '../../src/smk/tool/shortcut-menu/tool-shortcut-menu' )
await import( '../../src/smk/viewer-maplibre/tool/mode/tool-mode-maplibre' )

// A building block goes into a real tool-panel, in the slot a tool would use.
function blockComponent( story: Extract<Story, { kind: 'block' }> ) {
    const name = 'gallery-' + story.name
    if ( Vue.component( name ) ) return name

    const body = story.slot === 'body' ? story.template : ''
    const commands = story.slot === 'commands' ? `<template slot="commands">${ story.template }</template>` : ''
    Vue.component( name, {
        extends: ( window as any ).SMK.COMPONENT.ToolPanelBase,
        props: [ 'sample' ],
        template: `
            <tool-panel class="smk-gallery-panel" v-bind="$$projectProps( 'tool-panel' )">
                <template slot="header"><slot></slot></template>
                ${ commands }
                ${ body }
            </tool-panel>`,
    } )
    return name
}

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

export function mountStory( story: Story, model: any, opt: FrameOptions ) {
    const m = clone( model )
    switch ( story.kind ) {
        case 'panel':
            return mountSidepanel( { component: story.panel.component, prop: m }, opt )
        case 'block':
            return mountSidepanel( { component: blockComponent( story ), prop: {
                id: story.name, type: story.name, title: story.name,
                active: true, enabled: true, showPanel: true, showHeader: true, sample: m,
            } }, opt )
        case 'bar':
            return mountBar( story.bar, m, opt )
        case 'status':
            return mountStatus( story.template, m, { ...opt, methods: story.methods } )
    }
}
