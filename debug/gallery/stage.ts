/**
 * One build of the Gallery, in a document of its own. The Gallery page holds a
 * stage per build in an iframe and drives it with postMessage.
 *
 * In:  { gallery: 'render', seq, story, model, theme, mobile, width, height }
 * Out: ready | missing | rendered | model | log, each with `build`.
 */
import { STORIES, type Story } from './stories'
import { clone, initialModel, liveModel, mountWith, needs, type Chrome } from './kinds'

export type Build = 'v2' | '1.0'

/** What a build rendered, measured so the page can compare two builds. */
export interface Measure {
    box:     [ number, number ] | null
    classes: string[]
    text:    string
}

const BUILD: Build = new URLSearchParams( location.search ).get( 'build' ) === '1.0' ? '1.0' : 'v2'
const EMBEDDED = parent !== window

function post( msg: any ) {
    if ( EMBEDDED ) parent.postMessage( { ...msg, build: BUILD }, location.origin )
}

function summarise( arg: any ): string {
    if ( arg === undefined || arg === null ) return ''
    if ( arg instanceof Event ) return `[${ arg.constructor.name }]`
    try {
        const s = JSON.stringify( arg )
        return s.length > 160 ? s.slice( 0, 157 ) + '...' : s
    } catch {
        return String( arg )
    }
}

function measure( vm: any ): Measure {
    const frame = vm.$el as HTMLElement
    const main = frame.querySelector<HTMLElement>( '.smk-elastic-panel, .smk-toolbar, .smk-actionbar, .smk-status' )
    const r = main?.getBoundingClientRect()

    const classes = new Set<string>()
    frame.querySelectorAll( '*' ).forEach( e => e.classList.forEach( c => { if ( c.startsWith( 'smk-' ) ) classes.add( c ) } ) )

    return {
        box: r ? [ Math.round( r.width ), Math.round( r.height ) ] : null,
        classes: [ ...classes ].sort(),
        text: ( main ?? frame ).innerText.replace( /\s+/g, ' ' ).trim(),
    }
}

async function load(): Promise<{ chrome: Chrome, info: any }> {
    if ( BUILD === '1.0' ) {
        const { loadRef10, THEMES } = await import( './ref10' )
        const chrome = await loadRef10()
        return { chrome, info: { version: chrome.Vue.version, vueBuild: chrome.vueBuild, themes: THEMES } }
    }
    const { V2 } = await import( './mount' )
    return { chrome: V2, info: { version: V2.Vue.version, vueBuild: 'development', themes: [ 'base', 'wf', 'modern' ] } }
}

const state = { seq: 0, vm: null as any, story: null as Story | null, errors: [] as string[] }

function start( chrome: Chrome ) {
    const { Vue } = chrome
    const stage = document.getElementById( 'stage' )!

    Vue.config.errorHandler = ( err: any, _vm: any, info: string ) => {
        state.errors.push( String( err?.message ?? err ) )
        post( { gallery: 'log', kind: 'error', head: `Error in ${ info }`, body: String( err?.message ?? err ) } )
        console.error( err )
    }
    Vue.config.warnHandler = ( msg: string, _vm: any, trace: string ) => {
        state.errors.push( msg )
        post( { gallery: 'log', kind: 'warn', head: 'Vue warning', body: msg + trace } )
    }

    const snapshot = ( story: Story, vm: any ) => ( { model: clone( liveModel( story, vm ) ), record: measure( vm ) } )

    async function render( m: any ) {
        const seq = state.seq = m.seq ?? state.seq + 1
        const story = STORIES.find( s => s.name === m.story ) ?? STORIES[ 0 ]

        if ( state.vm ) {
            try { state.vm.$destroy() } catch { /* already gone */ }
            state.vm.$el?.remove()
            state.vm = null
        }
        stage.replaceChildren()
        state.story = story
        state.errors = []

        let template: string | undefined
        try {
            template = story.kind === 'status' ? chrome.statusTemplate?.( story ) : undefined
        } catch ( e: any ) {
            return absent( seq, [ e.message ] )
        }
        const wanted = needs( story, template )
        const missing = wanted.filter( c => !Vue.component( c ) ).map( c => `<${ c }>` )
        let model = m.model ?? initialModel( story )

        // A bar still shows the widgets this build has.
        if ( story.kind === 'bar' && missing.length < wanted.length ) model = model.filter( ( w: any ) => Vue.component( w.component ) )
        else if ( missing.length ) return absent( seq, missing )

        const host = stage.appendChild( document.createElement( 'div' ) )
        try {
            state.vm = mountWith( chrome, story, model, {
                host, width: m.width, height: m.height, theme: m.theme, mobile: m.mobile,
                trigger: ( id, event, arg ) => {
                    post( { gallery: 'log', kind: 'event', head: `${ id } → ${ event }`, body: summarise( arg ) } )
                    const vm = state.vm
                    Vue.nextTick( () => { if ( vm && vm === state.vm ) post( { gallery: 'model', seq, ...snapshot( story, vm ) } ) } )
                },
            } )
        } catch ( e: any ) {
            state.errors.push( String( e?.message ?? e ) )
            post( { gallery: 'log', kind: 'error', head: 'Mount failed', body: String( e?.message ?? e ) } )
        }

        // Icons are a font. Force a layout so it starts to load, then measure
        // once it has. No animation frame: a hidden tab never gets one.
        await Vue.nextTick()
        stage.getBoundingClientRect()
        await document.fonts.ready
        if ( seq !== state.seq ) return

        const vm = state.vm
        post( { gallery: 'rendered', seq, absent: missing, errors: state.errors,
            ...( vm ? snapshot( story, vm ) : { model: null, record: null } ) } )
    }

    function absent( seq: number, what: string[] ) {
        const p = stage.appendChild( document.createElement( 'p' ) )
        p.className = 'g-absent'
        p.textContent = `SMK ${ BUILD } has no ${ what.join( ', ' ) }.`
        post( { gallery: 'rendered', seq, absent: what, errors: [], model: null, record: null } )
    }

    if ( EMBEDDED ) {
        window.addEventListener( 'message', e => {
            if ( e.source === parent && e.data?.gallery === 'render' ) render( e.data )
        } )
    } else {
        // Opened on its own: show the entry in the hash, as the Gallery would.
        const own = () => render( { story: location.hash.slice( 1 ), width: 400, height: 640, theme: 'wf' } )
        window.addEventListener( 'hashchange', own )
        own()
    }
}

load().then(
    ( { chrome, info } ) => {
        start( chrome )
        document.body.dataset.stage = 'ready'
        post( { gallery: 'ready', ...info, components: Object.keys( chrome.Vue.options.components ) } )
    },
    ( e: any ) => {
        const why = String( e?.message ?? e )
        if ( why.endsWith( 'ref/smk-1.0/smk.js' ) ) {
            document.getElementById( 'missing' )!.hidden = false
        } else {
            const p = document.getElementById( 'stage' )!.appendChild( document.createElement( 'p' ) )
            p.className = 'g-absent'
            p.textContent = `SMK ${ BUILD } did not load: ${ why }`
        }
        document.body.dataset.stage = 'failed'
        post( { gallery: 'missing', why } )
        console.error( e )
    },
)
