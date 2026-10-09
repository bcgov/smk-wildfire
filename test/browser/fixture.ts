/**
 * Mounts SMK's real components inside the chrome their CSS selects on. The
 * Browser project measures them; the Gallery (debug/gallery/) shows them.
 */
import '../../src/styles'

// The frame is a template made here, so the tests run Vue with its compiler:
// vite.config.js resolves 'vue' to the full build for the dev server and tests.
import { mountRoot, component, componentNames, appHandlers, nextTick, reactive } from '../../src/smk/vue'
import { version } from 'vue'
import { frameWith, type FrameOptions } from './frame'

import sidepanelHtml from '../../src/smk/sidepanel/sidepanel.html?raw'
import toolbarHtml   from '../../src/smk/tool/toolbar/toolbar.html?raw'
import actionbarHtml from '../../src/smk/tool/actionbar/actionbar.html?raw'

// The components register on SMK.COMPONENT, so it must exist first. Same order as main.ts.
await import( '../../src/smk/smk-global' )
await import( '../../src/smk/vue-config' )
await import( '../../src/smk/component/component' )
await import( '../../src/smk/component/activate-tool/component-activate-tool' )
await import( '../../src/smk/component/address-search/component-address-search' )
await import( '../../src/smk/component/command-button/component-command-button' )
await import( '../../src/smk/component/enter-input/component-enter-input' )
await import( '../../src/smk/component/feature-attribute/component-feature-attribute' )
await import( '../../src/smk/component/feature-attributes/component-feature-attributes' )
await import( '../../src/smk/component/feature-description/component-feature-description' )
await import( '../../src/smk/component/feature-list/component-feature-list' )
await import( '../../src/smk/component/feature-properties/component-feature-properties' )
await import( '../../src/smk/component/menu-button/component-menu-button' )
await import( '../../src/smk/component/parameter/component-parameter' )
await import( '../../src/smk/component/select-dropdown/component-select-dropdown' )
await import( '../../src/smk/component/select-option/component-select-option' )
await import( '../../src/smk/component/toggle-button/component-toggle-button' )
await import( '../../src/smk/component/tool-panel-feature/component-tool-panel-feature' )
await import( '../../src/smk/component/tool-panel/component-tool-panel' )
await import( '../../src/smk/mixin/tool-panel/tool-panel' )
await import( '../../src/smk/mixin/tool-widget/tool-widget' )
await import( '../../src/smk/api/geocoder' )

/** What the tests and the Gallery used of Vue 2's global. */
export const Vue = {
    version,
    nextTick,
    config: appHandlers,
    component: ( name: string, options?: any ) => component( name, options ),
    options: { get components() { return Object.fromEntries( componentNames().map( n => [ n, true ] ) ) } },
}
export type { FrameOptions }

/** One entry of the list sidepanel.html, toolbar.html and actionbar.html iterate. */
export interface Mounted { component: string, prop: any }

const mounted: any[] = []

function frame( chrome: string, data: any, opt: FrameOptions ) {
    // Reactive, so a test that changes its data after the mount sees it redraw.
    const vm = frameWith( ( o, host ) => mountRoot( host, o ), chrome, reactive( data ), opt )
    mounted.push( vm )
    return vm
}

/**
 * Mount `inner` - real component tags, not markup - inside the nesting that
 * sidepanel.css and wf.css select on. Vue puts a component's class on its
 * root, so the tool class lands on the elastic panel, NOT on `.smk-panel`.
 */
export function mountPanel( panelClass: string, inner: string, data: any = {}, opt: FrameOptions = {} ): HTMLElement {
    const vm = frame( `
        <div class="smk-sidepanel">
            <div class="smk-elastic-panel ${ panelClass }">
                <div class="smk-panel">${ inner }</div>
            </div>
        </div>`, data, opt )
    return vm.$el.querySelector( `.${ panelClass }` ) as HTMLElement
}

/** Mount a real tool panel through SMK's own sidepanel template. */
export function mountSidepanel( panel: Mounted, opt: FrameOptions = {} ) {
    panel.prop = Object.assign( { active: true }, panel.prop )
    return frame( sidepanelHtml, { visible: true, expand: 1, panels: [ panel ] }, opt )
}

/** Mount real widgets through SMK's own toolbar or actionbar template. */
export function mountBar( bar: 'toolbar' | 'actionbar', widgets: Mounted[], opt: FrameOptions = {} ) {
    return frame( bar === 'toolbar' ? toolbarHtml : actionbarHtml, { widgets }, opt )
}

/** Mount a status item, such as legend.html. The wrapper is the one SmkMap.addToStatus makes. */
export function mountStatus( template: string, data: any = {}, opt: FrameOptions = {} ) {
    return frame( `<div class="smk-status smk-elastic-container">${ template }</div>`, data, opt )
}

export function unmount( vm: any ) {
    const i = mounted.indexOf( vm )
    if ( i >= 0 ) mounted.splice( i, 1 )
    try { vm.$smkUnmount() } catch { /* already gone */ }
    vm.$el?.remove?.()
}

export function cleanup() {
    mounted.slice().forEach( unmount )
    document.querySelectorAll( '.smk-map-frame' ).forEach( e => e.remove() )
}

/**
 * How many rows the children occupy. Items on one line rarely share a top edge
 * — a select is a pixel or two shorter than a button — so group by overlap,
 * not by an exact value.
 */
export function rowCount( parent: HTMLElement, tolerance = 8 ): number {
    const mids = [ ...parent.children ]
        .map( c => { const r = c.getBoundingClientRect(); return r.top + r.height / 2 } )
        .sort( ( a, b ) => a - b )

    let rows = 0, last = -Infinity
    mids.forEach( m => { if ( m - last > tolerance ) { rows += 1; last = m } } )
    return rows
}
