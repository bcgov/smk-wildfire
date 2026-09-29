/**
 * The Gallery: one SMK component at a time, with no map. Each build renders in
 * a stage document of its own (stage.html), so v2 and SMK 1.0 can sit side by side.
 */
import { STORIES, type Story } from './stories'
import { clone, initialModel, needs } from './kinds'
import type { Build, Measure } from './stage'

const THEMES = [ 'wf', 'base', 'modern' ]

type Mode = 'v2' | 'both' | '1.0'
const MODES: { [ m in Mode ]: Build[] } = { 'v2': [ 'v2' ], 'both': [ 'v2', '1.0' ], '1.0': [ '1.0' ] }

const $ = <T extends HTMLElement>( sel: string ) => document.querySelector( sel ) as T

interface Result { seq: number, model: any, record: Measure | null, errors: string[], absent: string[] }

interface Pane {
    build:   Build
    fig:     HTMLElement
    frame:   HTMLIFrameElement
    caption: HTMLElement
    ready:   boolean
    failed?: string
    info?:   { version: string, vueBuild: string, themes: string[], components: string[] }
    result?: Result
}

const panes = new Map<Build, Pane>()

const state = {
    story:  null as Story | null,
    mode:   'v2' as Mode,
    layout: 'side',
    theme:  'wf',
    mobile: false,
    dirty:  false,
    seq:    0,
    sent:   null as any,
}

const active = () => MODES[ state.mode ]
const primary = () => panes.get( active()[ 0 ] )

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

function log( kind: string, head: string, body = '' ) {
    const li = document.createElement( 'li' )
    li.className = 'g-log-' + kind
    li.innerHTML = '<time></time><b></b><code></code>'
    li.querySelector( 'time' )!.textContent = new Date().toLocaleTimeString( [], { hour12: false } )
    li.querySelector( 'b' )!.textContent = head
    li.querySelector( 'code' )!.textContent = body
    $( '#g-log' ).prepend( li )
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

function frameSize( story: Story ): [ number, number ] {
    if ( story.size ) return story.size
    return state.mobile ? [ 390, 720 ] : [ 400, 640 ]
}

function pane( build: Build ): Pane {
    const had = panes.get( build )
    if ( had ) return had

    const fig = document.createElement( 'figure' )
    fig.className = 'g-pane'
    fig.dataset.build = build
    const caption = document.createElement( 'figcaption' )
    const frame = document.createElement( 'iframe' )
    frame.title = `SMK ${ build }`
    frame.src = `stage.html?build=${ build }`
    fig.append( caption, frame )

    // v2 always sits first, so the two panes never swap sides.
    if ( build === 'v2' ) $( '#g-panes' ).prepend( fig )
    else $( '#g-panes' ).append( fig )

    const p: Pane = { build, fig, frame, caption, ready: false }
    panes.set( build, p )
    showCaption( p )
    return p
}

function showCaption( p: Pane ) {
    const notes: string[] = []
    if ( p.failed ) notes.push( 'did not load' )
    else if ( !p.ready ) notes.push( 'loading...' )
    else {
        notes.push( 'Vue ' + p.info!.version )
        if ( p.info!.vueBuild === 'production' ) notes.push( 'production Vue, so no warnings' )
        if ( !p.info!.themes.includes( state.theme ) ) notes.push( `no ${ state.theme } theme` )
        if ( p.result?.absent.length ) notes.push( 'has no ' + p.result.absent.join( ', ' ) )
    }
    p.caption.innerHTML = '<strong></strong> <span class="g-muted"></span>'
    p.caption.querySelector( 'strong' )!.textContent = p.build === 'v2' ? 'v2' : 'SMK 1.0'
    p.caption.querySelector( 'span' )!.textContent = notes.join( ' · ' )
}

function send( p: Pane ) {
    if ( !p.ready || !state.story ) return
    const [ width, height ] = frameSize( state.story )
    p.frame.contentWindow!.postMessage( {
        gallery: 'render', seq: state.seq, story: state.story.name, model: state.sent,
        theme: state.theme, mobile: state.mobile, width, height,
    }, location.origin )
}

function render( model?: any ) {
    const story = state.story
    if ( !story ) return

    state.seq += 1
    state.sent = clone( model ?? initialModel( story ) )
    state.dirty = false

    // The frame has a 1px border on each side.
    const [ w, h ] = frameSize( story )
    for ( const build of active() ) {
        const p = pane( build )
        p.frame.style.width = w + 2 + 'px'
        p.frame.style.height = h + 2 + 'px'
        p.result = undefined
        send( p )
    }

    showModel()
    showDiff()
    $( '#g-json-error' ).textContent = ''
}

function showModel() {
    if ( state.dirty || !state.story ) return
    const model = primary()?.result?.model ?? state.sent
    ;( $( '#g-props' ) as HTMLTextAreaElement ).value = JSON.stringify( model, null, 2 )
}

// Keep what the viewer changed when only the theme or the device changes.
const currentModel = () => primary()?.result?.model ?? state.sent

window.addEventListener( 'message', e => {
    const m = e.data
    if ( e.origin !== location.origin || !m?.gallery ) return
    const p = [ ...panes.values() ].find( q => q.frame.contentWindow === e.source )
    if ( !p ) return
    const shown = active().includes( p.build )

    switch ( m.gallery ) {
        case 'ready':
            p.ready = true
            p.info = m
            showCaption( p )
            markNav()
            if ( shown ) send( p )
            break
        case 'missing':
            p.failed = m.why
            showCaption( p )
            showDiff()
            break
        case 'rendered':
        case 'model':
            if ( m.seq !== state.seq ) return
            p.result = m.gallery === 'rendered' ? m : { ...p.result!, model: m.model, record: m.record }
            showCaption( p )
            if ( p === primary() ) showModel()
            showDiff()
            break
        case 'log':
            if ( shown ) log( m.kind, ( state.mode === 'both' ? `${ p.build } · ` : '' ) + m.head, m.body )
            break
    }
} )

// ---------------------------------------------------------------------------
// Differences
// ---------------------------------------------------------------------------

/** The items of `a` left over once each one in `b` has cancelled one out. */
function onlyIn( a: string[], b: string[] ): string[] {
    const left = new Map<string, number>()
    b.forEach( t => left.set( t, ( left.get( t ) ?? 0 ) + 1 ) )
    return a.filter( t => {
        const n = left.get( t ) ?? 0
        if ( n ) left.set( t, n - 1 )
        return !n
    } )
}

function chips( items: string[], max = 40 ): HTMLElement {
    const span = document.createElement( 'span' )
    span.className = 'g-chips'
    items.slice( 0, max ).forEach( t => {
        const c = span.appendChild( document.createElement( 'code' ) )
        c.textContent = t
    } )
    if ( items.length > max ) span.append( ` and ${ items.length - max } more` )
    return span
}

function showDiff() {
    const box = $( '#g-diff' )
    box.hidden = state.mode !== 'both'
    if ( box.hidden ) return

    const rows: [ string, string | HTMLElement ][] = []
    const v2 = panes.get( 'v2' ), ref = panes.get( '1.0' )
    const a = v2?.result, b = ref?.result

    if ( ref?.failed ) rows.push( [ 'SMK 1.0', 'did not load, so there is nothing to compare.' ] )
    else if ( !a || !b ) rows.push( [ '', 'Measuring...' ] )
    else {
        if ( a.absent.length ) rows.push( [ 'Not in v2', chips( a.absent ) ] )
        if ( b.absent.length ) rows.push( [ 'Not in SMK 1.0', chips( b.absent ) ] )

        if ( a.record && b.record ) {
            const [ aw, ah ] = a.record.box ?? [ 0, 0 ], [ bw, bh ] = b.record.box ?? [ 0, 0 ]
            if ( aw !== bw || ah !== bh ) rows.push( [ 'Size', `v2 ${ aw } × ${ ah }, SMK 1.0 ${ bw } × ${ bh }` ] )

            const onlyA = onlyIn( a.record.classes, b.record.classes ), onlyB = onlyIn( b.record.classes, a.record.classes )
            if ( onlyA.length ) rows.push( [ 'Classes only in v2', chips( onlyA ) ] )
            if ( onlyB.length ) rows.push( [ 'Classes only in 1.0', chips( onlyB ) ] )

            const ta = a.record.text.split( ' ' ), tb = b.record.text.split( ' ' )
            const wordsA = onlyIn( ta, tb ), wordsB = onlyIn( tb, ta )
            if ( wordsA.length ) rows.push( [ 'Text only in v2', chips( wordsA ) ] )
            if ( wordsB.length ) rows.push( [ 'Text only in 1.0', chips( wordsB ) ] )
        }

        if ( a.errors.length || b.errors.length )
            rows.push( [ 'Vue errors and warnings', `v2 ${ a.errors.length }, SMK 1.0 ${ b.errors.length }. See Events.` ] )
        if ( !rows.length ) rows.push( [ '', 'The same size, the same smk- classes and the same text.' ] )
    }

    const dl = document.createElement( 'dl' )
    rows.forEach( ( [ dt, dd ] ) => {
        const t = dl.appendChild( document.createElement( 'dt' ) )
        t.textContent = dt
        dl.appendChild( document.createElement( 'dd' ) ).append( dd )
    } )
    const h = document.createElement( 'h2' )
    h.textContent = 'Differences'
    box.replaceChildren( h, dl )
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

/** Say in the nav which entries SMK 1.0 cannot show, once 1.0 has said what it has. */
function markNav() {
    const has = panes.get( '1.0' )?.info?.components
    if ( !has ) return
    document.querySelectorAll<HTMLAnchorElement>( '#g-nav a' ).forEach( a => {
        const story = STORIES.find( s => '#' + s.name === a.getAttribute( 'href' ) )!
        const wanted = needs( story )
        const missing = wanted.filter( c => !has.includes( c ) )
        if ( !missing.length ) return
        // A bar with some of its widgets still renders in 1.0.
        a.dataset.absent = story.kind === 'bar' && missing.length < wanted.length ? 'some' : 'all'
        a.title = 'Not in SMK 1.0: ' + missing.join( ', ' )
    } )
}

function applyMode() {
    const layout = state.mode === 'both' ? state.layout : 'side'
    const fade = Number( ( $( '#g-fade' ) as HTMLInputElement ).value ) / 100
    document.body.dataset.mode = state.mode
    document.body.dataset.layout = layout
    $( '#g-panes' ).style.setProperty( '--g-fade', String( fade ) )

    for ( const [ build, p ] of panes ) p.fig.hidden = !active().includes( build )

    // In the overlay, the pane you see more of is the one that takes the clicks.
    const ref = panes.get( '1.0' )
    if ( ref ) ref.fig.style.pointerEvents = layout === 'overlay' && fade < 0.5 ? 'none' : ''
}

function writeUrl() {
    const q = new URLSearchParams()
    if ( state.mode !== 'v2' ) q.set( 'build', state.mode )
    if ( state.layout !== 'side' ) q.set( 'layout', state.layout )
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
    const mode = q.get( 'build' ) as Mode
    state.mode   = mode in MODES ? mode : 'v2'
    state.layout = q.get( 'layout' ) === 'overlay' ? 'overlay' : 'side'

    const theme = $( '#g-theme' ) as HTMLSelectElement
    theme.replaceChildren( ...THEMES.map( t => new Option( t, t, false, t === state.theme ) ) )
    theme.addEventListener( 'change', () => {
        state.theme = theme.value
        panes.forEach( showCaption )
        writeUrl()
        render( currentModel() )
    } )

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

    const build = $( '#g-build' ) as HTMLSelectElement
    build.value = state.mode
    build.addEventListener( 'change', () => {
        const model = currentModel()
        state.mode = build.value as Mode
        active().forEach( pane )
        applyMode()
        writeUrl()
        render( model )
    } )

    const layout = $( '#g-layout' ) as HTMLSelectElement
    layout.value = state.layout
    layout.addEventListener( 'change', () => {
        state.layout = layout.value
        applyMode()
        writeUrl()
    } )

    $( '#g-fade' ).addEventListener( 'input', applyMode )

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
    active().forEach( pane )
    applyMode()
    window.addEventListener( 'hashchange', () => select( location.hash.slice( 1 ) ) )
    select( location.hash.slice( 1 ) )
    document.body.dataset.gallery = 'ready'
}

start()
