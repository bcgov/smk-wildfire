/**
 * The scenario list, read from the support manifest.
 *
 * Never write the tool or layer list into a test. build/scan-support.js is
 * already the one source, and both vite configs import it, so a new Layer
 * adapter or a new viewer half turns up here by itself.
 */
// @ts-expect-error - a plain .js build helper, no types
import { scanSupport } from '../../build/scan-support.js'
import { resolve } from 'path'

export interface Support {
    viewers: string[]
    tools:   { [ name: string ]: { shared: boolean; viewers: string[]; parent?: string } }
    layers:  { [ type: string ]: string[] }
}

export const SUPPORT: Support = scanSupport( resolve( import.meta.dirname, '..', '..' ) )

export const VIEWERS_2D = [ 'leaflet', 'maplibre' ] as const

/** Layer types the given viewer has an adapter for. */
export function layerTypesFor( viewer: string ): string[] {
    return Object.keys( SUPPORT.layers ).filter( t => SUPPORT.layers[ t ].indexOf( viewer ) >= 0 ).sort()
}

/**
 * Every tool a Config can build: no sub-tool, because its parent builds it.
 * A tool with no viewer half still builds — it just does nothing to the map.
 */
export function buildableTools(): string[] {
    return Object.keys( SUPPORT.tools ).filter( t => !SUPPORT.tools[ t ].parent ).sort()
}

/** Does this viewer have the half of the tool that touches the map? */
export function hasViewerHalf( tool: string, viewer: string ): boolean {
    const t = SUPPORT.tools[ tool ]
    return !!t && t.viewers.indexOf( viewer ) >= 0
}

/** Tools with a viewer half somewhere. Every gap is in this list. */
export function toolsWithHalves(): string[] {
    return Object.keys( SUPPORT.tools )
        .filter( t => !SUPPORT.tools[ t ].parent && SUPPORT.tools[ t ].viewers.length )
        .sort()
}
