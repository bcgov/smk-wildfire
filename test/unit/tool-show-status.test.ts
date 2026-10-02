/**
 * A Tool's Status message can be turned off in the Config.
 *
 * WFNEWS shows the identify state in its own panel, and SMK's box over the map
 * then said the same thing a second time, in a place the user was not looking.
 */
import { describe, it, expect, beforeAll } from 'vitest'

let Tool: any

beforeAll( async () => {
    // main.ts seeds this before any tool module loads.
    ;( window as any ).SMK = { UTIL: {}, TYPE: {}, COMPONENT: {}, MAP: {}, VIEWER: {} }
    ;( { default: Tool } = await import( '../../src/smk/tool' ) )
} )

/** Builds one Tool and runs ToolBase's initializer against a minimal smk. */
function build( config: any ) {
    const shown: string[] = []
    const factory = Tool.define( 'ShowStatusTestTool' )
    const tool = factory( config )[ 0 ]
    const smk = {
        forEachTool: ( cb: ( t: any ) => void ) => cb( tool ),
        getToolById: ( id: string ) => ( id === tool.id ? tool : undefined ),
        getToolGroup: () => [ tool.id ],
        getStatusMessage: () => ( { show: ( message: string ) => { shown.push( message ); return Promise.resolve() } } ),
    }
    tool.$initializers[ 0 ].call( tool, smk )
    return { tool, shown }
}

describe( 'showStatus', () => {
    it( 'shows the message by default', async () => {
        const { tool, shown } = build( {} )
        await tool.showStatusMessage( 'Fetching features', 'progress' )
        expect( shown ).toEqual( [ 'Fetching features' ] )
    } )

    it( 'shows nothing when the Config turns it off', async () => {
        const { tool, shown } = build( { showStatus: false } )
        await expect( tool.showStatusMessage( 'No features found', 'warning' ) ).resolves.toBeUndefined()
        expect( shown ).toEqual( [] )
    } )
} )
