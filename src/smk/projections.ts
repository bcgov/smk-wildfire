import { SMK } from './smk-ref'
import proj4 from 'proj4'
/**
 * projections — registers proj4 projection definitions from SMK.PROJECTIONS.
 * Converted from projections.js (include.module -> ES module).
 */

export function registerProjections(): void {
    const projections: Array<{ name?: string; def?: string; alias?: string }> =
        ( SMK?.PROJECTIONS ) || []

    projections.forEach( ( pr ) => {
        if ( !pr.name ) return

        if ( pr.def ) {
            proj4.defs( pr.name, pr.def )
        } else if ( pr.alias ) {
            const def = proj4.defs( pr.alias )
            if ( !def ) return
            proj4.defs( pr.name, def )
        }
    } )
}

export default registerProjections
