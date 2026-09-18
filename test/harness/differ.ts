/**
 * The differ, and the allowed differences.
 *
 * A difference is a decision or a defect (CONTEXT.md D3). A decision goes in
 * allowed.json with a reason and a date. Everything else fails the run.
 *
 * A ruling covers one ITEM, not a whole field. Ruling a whole field would let
 * the next real change in through the same hole.
 */
import allowed from './allowed.json' with { type: 'json' }
import type { Record as SmkRecord } from './record'

export interface Difference {
    field:  string
    /** For a list field: what only the reference had, and what only the candidate had. */
    onlyInRef?: string[]
    onlyInNew?: string[]
    /** For an object field: one line per key that moved. */
    changed?:  string[]
    /** For a plain value. */
    ref?: unknown
    now?: unknown
}

export interface Ruling {
    axis:   'A' | 'B' | '*'
    field:  string
    /** A substring of the item, not a regex. Absent means the whole field. */
    match?: string
    /** Rules an addition only. Something that left the reference side is never covered. */
    onlyAdded?: boolean
    /** Nobody has ruled yet. It does not fail the run, and it is reported every time. */
    open?:  boolean
    reason: string
    date:   string
}

const RULINGS = allowed as unknown as Ruling[]

function rulingsFor( axis: 'A' | 'B', field: string ): Ruling[] {
    return RULINGS.filter( r => ( r.axis === axis || r.axis === '*' ) && r.field === field )
}

function render( d: Difference ): string {
    return [
        d.onlyInRef?.length ? 'onlyInRef ' + d.onlyInRef.join( ',' ) : '',
        d.onlyInNew?.length ? 'onlyInNew ' + d.onlyInNew.join( ',' ) : '',
        d.changed?.length   ? d.changed.join( ' ; ' ) : '',
        d.ref !== undefined ? 'ref ' + JSON.stringify( d.ref ) + ' now ' + JSON.stringify( d.now ) : '',
    ].filter( Boolean ).join( ' ' )
}

/** The ruling that covers one list item, if there is one. */
function itemRuling( axis: 'A' | 'B', field: string, item: string, lost: boolean ): Ruling | null {
    return rulingsFor( axis, field ).find( r =>
        ( !r.match || item.indexOf( r.match ) >= 0 ) &&
        // "It only added things" stops being true the moment something is lost.
        !( r.onlyAdded && lost )
    ) || null
}

/** The ruling that covers a whole object or scalar difference, if there is one. */
export function isAllowed( axis: 'A' | 'B', d: Difference ): Ruling | null {
    const text = render( d )
    return rulingsFor( axis, d.field ).find( r =>
        ( !r.match || text.indexOf( r.match ) >= 0 ) &&
        !( r.onlyAdded && d.onlyInRef?.length )
    ) || null
}

/** Every field that moved, whether or not somebody has ruled on it. */
export function diff( ref: SmkRecord, now: SmkRecord ): Difference[] {
    const out: Difference[] = []
    const fields = [ ...new Set( [ ...Object.keys( ref ), ...Object.keys( now ) ] ) ].sort()

    for ( const field of fields ) {
        const a = ( ref as any )[ field ], b = ( now as any )[ field ]
        if ( JSON.stringify( a ) === JSON.stringify( b ) ) continue

        if ( Array.isArray( a ) && Array.isArray( b ) ) {
            const only = ( p: any[], q: any[] ) => p.filter( v => q.indexOf( v ) < 0 ).map( String )
            out.push( { field, onlyInRef: only( a, b ), onlyInNew: only( b, a ) } )
        }
        else if ( a && b && typeof a === 'object' && typeof b === 'object' ) {
            const changed: string[] = []
            for ( const k of [ ...new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] ) ].sort() )
                if ( JSON.stringify( a[ k ] ) !== JSON.stringify( b[ k ] ) )
                    changed.push( `${ k }: ref [${ a[ k ] }] now [${ b[ k ] }]` )
            // Same keys, same values, different insertion order. That is the
            // tools list order, not a contract, and no ruling can match ''.
            if ( changed.length ) out.push( { field, changed } )
        }
        else out.push( { field, ref: a, now: b } )
    }
    return out
}

/** Split one difference into what is ruled, what is open, and what is neither. */
function sort( axis: 'A' | 'B', d: Difference ) {
    if ( d.onlyInRef || d.onlyInNew ) {
        const pick = ( items: string[], lost: boolean, want: ( r: Ruling | null ) => boolean ) =>
            items.filter( v => want( itemRuling( axis, d.field, v, lost ) ) )

        const left = ( want: ( r: Ruling | null ) => boolean ): Difference | null => {
            const inRef = pick( d.onlyInRef || [], true,  want )
            const inNew = pick( d.onlyInNew || [], false, want )
            return inRef.length || inNew.length ? { field: d.field, onlyInRef: inRef, onlyInNew: inNew } : null
        }

        return {
            unruled: left( r => !r ),
            open:    left( r => !!r?.open ),
        }
    }

    const r = isAllowed( axis, d )
    return { unruled: r ? null : d, open: r?.open ? d : null }
}

/** The differences nobody has ruled on. These are what a test fails for. */
export function unruled( axis: 'A' | 'B', ref: SmkRecord, now: SmkRecord ): Difference[] {
    return diff( ref, now ).map( d => sort( axis, d ).unruled ).filter( Boolean ) as Difference[]
}

/** Ruled "open": tracked, reported every run, and not yet decided. */
export function openItems( axis: 'A' | 'B', ref: SmkRecord, now: SmkRecord ): Difference[] {
    return diff( ref, now ).map( d => sort( axis, d ).open ).filter( Boolean ) as Difference[]
}

export function rulings(): Ruling[] { return RULINGS }

/** Items of one field that no ruling covers. For a list a test checks on its own. */
export function unruledItems( axis: 'A' | 'B', field: string, items: string[] ): string[] {
    return items.filter( v => !itemRuling( axis, field, v, false ) )
}

/** A message a person can act on without opening the run. */
export function report( axis: 'A' | 'B', ds: Difference[], what = 'unruled difference' ): string {
    if ( !ds.length ) return ''

    const lines: string[] = [ `${ ds.length } ${ what }(s) on axis ${ axis }:` ]
    for ( const d of ds ) {
        lines.push( '  ' + d.field )
        d.onlyInRef?.forEach( v => lines.push( '    reference only: ' + v ) )
        d.onlyInNew?.forEach( v => lines.push( '    candidate only: ' + v ) )
        d.changed?.forEach(   v => lines.push( '    ' + v ) )
        if ( d.ref !== undefined )
            lines.push( `    reference ${ JSON.stringify( d.ref ) }, candidate ${ JSON.stringify( d.now ) }` )
    }
    if ( what === 'unruled difference' )
        lines.push( '', 'Rule each one in test/harness/allowed.json, or fix it.' )
    return lines.join( '\n' )
}
