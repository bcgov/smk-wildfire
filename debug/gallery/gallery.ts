/**
 * The Gallery: one SMK component at a time, with no map. It mounts through
 * the Fixture, so it shows exactly what the Browser project measures.
 */
import { Vue, unmount, type FrameOptions } from '../../test/browser/fixture'
import { STORIES, type Story } from './stories'
import { mountStory, initialModel, liveModel, clone } from './mount'

const THEMES = [ 'wf', 'base', 'modern' ]

const $ = <T extends HTMLElement>( sel: string ) => document.querySelector( sel ) as T

const state = {
    story:  null as Story | null,
    vm:     null as any,
    theme:  'wf',
    mobile: false,
    dirty:  false,
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

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

function log( kind: 'event' | 'warn' | 'error', head: string, body = '' ) {
    const li = document.createElement( 'li' )
    li.className = 'g-log-' + kind
    li.innerHTML = '<time></time><b></b><code></code>'
    li.querySelector( 'time' )!.textContent = new Date().toLocaleTimeString( [], { hour12: false } )
    li.querySelector( 'b' )!.textContent = head
    li.querySelector( 'code' )!.textContent = body
    $( '#g-log' ).prepend( li )
}

Vue.config.errorHandler = ( err: any, _vm: any, info: string ) => {
    log( 'error', `Error in ${ info }`, String( err?.message ?? err ) )
    console.error( err )
}
Vue.config.warnHandler = ( msg: string, _vm: any, trace: string ) => {
    log( 'warn', 'Vue warning', msg + trace )
}

// ---------------------------------------------------------------------------
// Mounting
// ---------------------------------------------------------------------------

function frameSize( story: Story ): [ number, number ] {
    if ( story.size ) return story.size
    return state.mobile ? [ 390, 720 ] : [ 400, 640 ]
}

function render( model?: any ) {
    const story = state.story
    if ( !story ) return
    if ( state.vm ) unmount( state.vm )

    const host = document.createElement( 'div' )
    $( '#g-stage' ).replaceChildren( host )

    const [ width, height ] = frameSize( story )
    const opt: FrameOptions = {
        host, width, height, theme: state.theme, mobile: state.mobile,
        trigger: ( id, event, arg ) => {
            log( 'event', `${ id } → ${ event }`, summarise( arg ) )
            showModel()
        },
    }

    state.vm = mountStory( story, model ?? initialModel( story ), opt )
    state.dirty = false
    showModel()
    $( '#g-json-error' ).textContent = ''
}

function showModel() {
    if ( state.dirty || !state.story || !state.vm ) return
    ;( $( '#g-props' ) as HTMLTextAreaElement ).value = JSON.stringify( liveModel( state.story, state.vm ), null, 2 )
}

// Keep what the viewer changed when only the theme or the device changes.
function currentModel() {
    return state.story && state.vm ? clone( liveModel( state.story, state.vm ) ) : undefined
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

const HOW: Record<Story[ 'kind' ], string> = {
    panel:  'Mounted through sidepanel.html.',
    block:  'Mounted in a tool-panel, through sidepanel.html.',
    bar:    'Mounted through its bar template.',
    status: 'Mounted in the status container.',
}

function select( name: string ) {
    const story = STORIES.find( s => s.name === name ) ?? STORIES[ 0 ]
    state.story = story

    document.querySelectorAll( '#g-nav a' ).forEach( a =>
        a.toggleAttribute( 'aria-current', a.getAttribute( 'href' ) === '#' + story.name ) )

    $( '#g-name' ).textContent = story.name
    $( '#g-source' ).textContent = story.source
    $( '#g-kind' ).textContent = HOW[ story.kind ]
    $( '#g-note' ).textContent = [ story.note, story.known && 'Known fault: ' + story.known ].filter( Boolean ).join( ' ' )
    $( '#g-log' ).replaceChildren()
    render()
}

function writeUrl() {
    const q = new URLSearchParams()
    if ( state.theme !== 'wf' ) q.set( 'theme', state.theme )
    if ( state.mobile ) q.set( 'mobile', '1' )
    const search = q.toString()
    history.replaceState( null, '', location.pathname + ( search ? '?' + search : '' ) + location.hash )
}

function buildNav() {
    const nav = $( '#g-nav' )
    const groups = [ ...new Set( STORIES.map( s => s.group ) ) ]
    groups.forEach( g => {
        const h = document.createElement( 'h2' )
        h.textContent = g
        const ul = document.createElement( 'ul' )
        STORIES.filter( s => s.group === g ).forEach( s => {
            const a = document.createElement( 'a' )
            a.href = '#' + s.name
            a.textContent = s.name
            if ( s.known ) a.title = 'Known fault'
            const li = document.createElement( 'li' )
            li.append( a )
            ul.append( li )
        } )
        nav.append( h, ul )
    } )
}

function start() {
    const q = new URLSearchParams( location.search )
    state.theme  = THEMES.includes( q.get( 'theme' ) ?? '' ) ? q.get( 'theme' )! : 'wf'
    state.mobile = q.get( 'mobile' ) === '1'

    const theme = $( '#g-theme' ) as HTMLSelectElement
    theme.replaceChildren( ...THEMES.map( t => new Option( t, t, false, t === state.theme ) ) )
    theme.addEventListener( 'change', () => { state.theme = theme.value; writeUrl(); render( currentModel() ) } )

    const mobile = $( '#g-mobile' ) as HTMLInputElement
    const mobileNote = () => $( '#g-mobile-note' ).hidden = !state.mobile
    mobile.checked = state.mobile
    mobileNote()
    mobile.addEventListener( 'change', () => {
        state.mobile = mobile.checked
        mobileNote()
        writeUrl()
        render( currentModel() )
    } )

    const props = $( '#g-props' ) as HTMLTextAreaElement
    props.addEventListener( 'input', () => { state.dirty = true } )
    $( '#g-apply' ).addEventListener( 'click', () => {
        try {
            render( JSON.parse( props.value ) )
        } catch ( e: any ) {
            $( '#g-json-error' ).textContent = e.message
        }
    } )
    $( '#g-reset' ).addEventListener( 'click', () => render() )
    $( '#g-clear' ).addEventListener( 'click', () => $( '#g-log' ).replaceChildren() )

    buildNav()
    window.addEventListener( 'hashchange', () => select( location.hash.slice( 1 ) ) )
    select( location.hash.slice( 1 ) )
    document.body.dataset.gallery = 'ready'
}

start()
