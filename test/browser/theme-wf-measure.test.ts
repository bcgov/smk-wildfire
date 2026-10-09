/**
 * The measurement panel command row.
 *
 * Area, Distance, Cancel and the units belong on one line, and the units must
 * wear the same skin as the buttons. Both were wrong: the row wrapped, and the
 * units select was the only select in SMK without the `smk-command` class, so
 * it rendered as a raw browser control beside three black pills.
 *
 * Layout and the CSS cascade decide this, so it can only be tested in a browser.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mountPanel, cleanup, rowCount } from './fixture'

// The shape panel-measure.html passes: { value, label }.
const UNITS = [
    'Metric', 'Imperial', 'Inches', 'Feet', 'Yards', 'Miles',
    'Nautical Miles', 'Meters', 'Kilometers', 'Acres', 'Hectares',
].map( l => ( { value: l.toLowerCase().replace( / /g, '-' ), label: l } ) )

// Real components, not markup that imitates them. Vue puts the class the
// parent gives onto the component's own root element.
function measurePanel() {
    return mountPanel( 'smk-measure-panel', `
        <div class="smk-commands">
            <command-button class="smk-area">Area</command-button>
            <command-button class="smk-distance">Distance</command-button>
            <command-button class="smk-cancel" v-bind:disabled="true">Cancel</command-button>
            <select-dropdown class="smk-units" v-bind:options="units"></select-dropdown>
        </div>`, { units: UNITS } )
}

afterEach( cleanup )

describe( 'the fixture mounts the real components', () => {
    it( 'compiles the tags away, so this is not markup imitating them', () => {
        const panel = measurePanel()
        // Left in the DOM only if the template never compiled - the D5 fault,
        // where the runtime-only Vue renders nothing and everything "passes".
        expect( panel.querySelector( 'command-button' ), 'template not compiled' ).toBeNull()
        expect( panel.querySelector( 'select-dropdown' ), 'template not compiled' ).toBeNull()

        const area = panel.querySelector( '.smk-area' ) as HTMLElement
        expect( area.tagName ).toBe( 'DIV' )
        expect( area.classList.contains( 'smk-command-button' ) ).toBe( true )
        expect( area.querySelector( '.smk-command' ) ).not.toBeNull()
    } )

    it( 'renders the props it was given, not a fixed string', () => {
        const panel = measurePanel()
        // The real component builds one <option> per entry of `options`.
        expect( panel.querySelectorAll( '.smk-units option' ).length ).toBe( UNITS.length )
        // And `disabled` is a prop the component turns into a class.
        expect( ( panel.querySelector( '.smk-cancel' ) as HTMLElement )
            .classList.contains( 'smk-disabled' ) ).toBe( true )
    } )
} )

describe( 'measure panel commands', () => {
    it( 'puts every command on one line', () => {
        const cmds = measurePanel().querySelector( '.smk-commands' ) as HTMLElement
        expect( rowCount( cmds ) ).toBe( 1 )
    } )

    it( 'does not overflow a narrow panel', () => {
        const panel = measurePanel()
        const cmds  = panel.querySelector( '.smk-commands' ) as HTMLElement
        const right = Math.max( ...[ ...cmds.children ]
            .map( c => c.getBoundingClientRect().right ) )
        expect( right ).toBeLessThanOrEqual( cmds.getBoundingClientRect().right + 1 )
    } )

    it( 'shows every label in full, never an ellipsis', () => {
        const panel = measurePanel()
        for ( const sel of [ '.smk-area', '.smk-distance', '.smk-cancel' ] ) {
            const c = panel.querySelector( sel + ' .smk-command' ) as HTMLElement
            expect( c.scrollWidth, sel + ' is truncated' ).toBeLessThanOrEqual( c.clientWidth + 1 )
        }
    } )

    it( 'never wraps', () => {
        const cmds = measurePanel().querySelector( '.smk-commands' ) as HTMLElement
        expect( getComputedStyle( cmds ).flexWrap ).toBe( 'nowrap' )
    } )

    it( 'keeps the buttons together at the start, not spread to the corners', () => {
        const cmds = measurePanel().querySelector( '.smk-commands' ) as HTMLElement
        const [ area, distance ] = [ ...cmds.children ] as HTMLElement[]
        const gap = distance.getBoundingClientRect().left - area.getBoundingClientRect().right
        expect( gap ).toBeLessThan( 20 )
    } )

    it( 'gives the units the rest of the row', () => {
        const cmds = measurePanel().querySelector( '.smk-commands' ) as HTMLElement
        const units = cmds.querySelector( '.smk-units' ) as HTMLElement
        const right = units.getBoundingClientRect().right
        expect( right ).toBeLessThanOrEqual( cmds.getBoundingClientRect().right + 1 )
        expect( units.getBoundingClientRect().width ).toBeGreaterThan( 40 )
    } )

    it( 'dresses the units select like the buttons', () => {
        const panel = measurePanel()
        const select = panel.querySelector( '.smk-units select' ) as HTMLElement
        const button = panel.querySelector( '.smk-area .smk-command' ) as HTMLElement
        const s = getComputedStyle( select ), b = getComputedStyle( button )
        expect( s.backgroundColor ).toBe( b.backgroundColor )
        expect( s.color ).toBe( b.color )
        expect( s.fontSize ).toBe( b.fontSize )
    } )

    it( 'paints the commands white with black text', () => {
        const panel = measurePanel()
        for ( const sel of [ '.smk-area .smk-command', '.smk-units select' ] ) {
            const cs = getComputedStyle( panel.querySelector( sel ) as HTMLElement )
            expect( cs.backgroundColor ).toBe( 'rgb(255, 255, 255)' )
            expect( cs.color ).toBe( 'rgb(0, 0, 0)' )
        }
    } )

    it( 'shows a disabled command as disabled', () => {
        const panel = measurePanel()
        const cancel  = panel.querySelector( '.smk-cancel .smk-command' ) as HTMLElement
        const enabled = panel.querySelector( '.smk-area .smk-command' ) as HTMLElement
        expect( getComputedStyle( cancel ).color )
            .not.toBe( getComputedStyle( enabled ).color )
    } )
} )
