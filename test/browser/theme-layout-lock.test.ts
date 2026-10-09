/**
 * A theme changes the look and the colour scheme. It does not change layout.
 *
 * Every theme is mounted against the same Story, and the box properties are
 * compared with the base theme. Computed width and height are NOT in the lock:
 * a theme may set font-weight, and bold text makes an auto-width box wider.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Vue, cleanup } from './fixture'
import { STORIES } from '../../debug/gallery/stories'
import { mountStory, initialModel } from '../../debug/gallery/mount'

const THEMES = [ 'base', 'wf', 'modern' ]

const BOX = [
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'gap', 'fontSize', 'lineHeight', 'minHeight',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
] as const

/** Where an element sits, so the same box can be found under another theme. */
function path( el: Element ) {
    const parts: string[] = []
    let n: Element | null = el
    while ( n && !n.classList.contains( 'smk-map-frame' ) ) {
        parts.unshift( n.tagName.toLowerCase() + ( n.className ? '.' + String( n.className ).trim().split( /\s+/ ).join( '.' ) : '' ) )
        n = n.parentElement
    }
    return parts.join( '>' )
}

function measure( story: any, theme: string ) {
    const vm = mountStory( story, initialModel( story ), { theme } )
    const out: Record<string, string> = {}
    for ( const el of vm.$el.querySelectorAll( '[class*="smk-"]' ) ) {
        const cs = getComputedStyle( el )
        out[ path( el ) ] = BOX.map( p => cs[ p ] ).join( '|' )
    }
    return out
}

afterEach( cleanup )

describe( 'a theme does not change the layout', () => {
    for ( const story of STORIES.filter( s => !s.known ) ) {
        it( story.name, async () => {
            const want = measure( story, 'base' )
            await Vue.nextTick()

            for ( const theme of THEMES.slice( 1 ) ) {
                const got = measure( story, theme )
                await Vue.nextTick()

                for ( const sel of Object.keys( want ) ) {
                    if ( !( sel in got ) ) continue
                    const a = want[ sel ].split( '|' )
                    const b = got[ sel ].split( '|' )
                    for ( let i = 0; i < BOX.length; i++ )
                        expect( b[ i ], `${ theme } moved ${ BOX[ i ] } on ${ sel.split( '>' ).pop() }` ).toBe( a[ i ] )
                }
            }
        } )
    }
} )
