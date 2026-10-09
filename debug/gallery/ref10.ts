/**
 * SMK 1.0 for the Gallery, from ref/smk-1.0/ (npm run ref:v1). 1.0 claims
 * window.SMK, so it needs a document of its own.
 */
import { frameWith, type FrameOptions } from '../../test/browser/frame'
import type { Chrome } from './kinds'
import type { Mounted } from '../../test/browser/fixture'

const SMK_JS = '../../ref/smk-1.0/smk.js'

// 1.0 ships production Vue, which never warns. The same version's development
// build makes its warnings comparable with v2's. 1.0 takes a Host's window.Vue.
const VUE_DEV = 'https://cdn.jsdelivr.net/npm/vue@2.5.11/dist/vue.js'

export const THEMES = [ 'base', 'wf', 'alpha', 'beta', 'gamma', 'delta' ]

// Every tag that registers a component an entry uses.
const TAGS = [
    'vue-config', 'material-icons', 'component', 'sidepanel', 'status-message',
    'component-activate-tool', 'component-address-search', 'component-command-button', 'component-menu-button',
    'component-enter-input', 'component-feature-attribute', 'component-feature-attributes',
    'component-feature-description', 'component-feature-list', 'component-feature-properties',
    'component-parameter', 'component-select-dropdown', 'component-select-option',
    'component-toggle-button', 'component-tool-panel', 'component-tool-panel-feature',
    'tool-about', 'tool-actionbar', 'tool-baseMaps', 'tool-bespoke', 'tool-bookmarks', 'tool-coordinate', 'tool-current-location',
    'tool-directions', 'tool-identify', 'tool-layers', 'tool-legend', 'tool-list-menu',
    'tool-location', 'tool-markup', 'tool-measure', 'tool-menu', 'tool-pan', 'tool-query', 'tool-reset-view',
    'tool-scale', 'tool-search', 'tool-select', 'tool-shortcut-menu', 'tool-toolbar',
    'tool-version', 'tool-zoom',
    ...THEMES.map( t => 'theme-' + t ),
]

function script( src: string ) {
    return new Promise<void>( ( ok, no ) => {
        const s = document.createElement( 'script' )
        s.src = src
        s.onload = () => ok()
        s.onerror = () => no( new Error( 'nothing at ' + src ) )
        document.head.appendChild( s )
    } )
}

export interface Ref10 extends Chrome { vueBuild: 'development' | 'production' }

export async function loadRef10(): Promise<Ref10> {
    const vueBuild = await script( VUE_DEV ).then( () => 'development' as const, () => 'production' as const )
    await script( SMK_JS )

    const w = window as any
    // SMK.INIT sets the base, and with no map nothing calls it. Set it before
    // the first include: a tag keeps the url it first resolved.
    w.include.option( { baseUrl: w.SMK.BASE_URL + 'assets/src/' } )
    // The tool modules call jQuery as they load.
    await w.include( 'libs' )
    await w.include( TAGS )

    const t = await w.include(
        'sidepanel.sidepanel-html', 'tool-toolbar.toolbar-html', 'tool-actionbar.actionbar-html',
        'tool-legend.legend-html', 'tool-scale.scale-html', 'tool-coordinate.coordinate-html',
        'tool-shortcut-menu.shortcut-menu-html' )

    const Vue = w.Vue
    return {
        Vue, vueBuild,
        sidepanel: ( panel: Mounted, opt: FrameOptions ) => {
            panel.prop = Object.assign( { active: true }, panel.prop )
            return frameWith( Vue, t[ 'sidepanel.sidepanel-html' ], { visible: true, expand: 1, panels: [ panel ] }, opt )
        },
        bar: ( bar, widgets, opt ) =>
            frameWith( Vue, t[ `tool-${ bar }.${ bar }-html` ], { widgets }, opt ),
        status: ( template, data, opt ) =>
            frameWith( Vue, `<div class="smk-status smk-elastic-container">${ template }</div>`, data, opt ),
        statusTemplate: story => {
            const html = t[ `tool-${ story.name }.${ story.name }-html` ]
            if ( !html ) throw new Error( `SMK 1.0 has no ${ story.name }.html` )
            return html
        },
    }
}
