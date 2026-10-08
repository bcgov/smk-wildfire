import { SMK } from '../../smk-ref'
/**
 * tool-panel mixin — adds panel component support to a Tool.
 * Converted from mixin/tool-panel/tool-panel.js (include.module -> ES module).
 */

export function ToolPanel( this: any, componentName: string ): void {
    const self = this

    this.defineProp( 'showPanel' )
    this.defineProp( 'showHeader' )
    this.defineProp( 'showSwipe' )
    this.defineProp( 'expand' )
    this.defineProp( 'hasPrevious' )

    this.showPanel   = true
    this.showHeader  = true
    this.showSwipe   = false
    this.expand      = 0
    this.hasPrevious = false

    this.$propFilter.classes = false

    this.makePanelComponent = function () {
        return {
            component: componentName,
            prop:      self.getComponentProps( componentName ),
        }
    }
}

// Assign to SMK.TYPE for backward compat
if ( typeof window !== 'undefined' ) {
    const smk = SMK
    if ( smk && smk.TYPE ) smk.TYPE.ToolPanel = ToolPanel
}

/** The Config defaults of a Tool with a panel. */
export function panelDefaults( option: Record<string, any> ): Record<string, any> {
    return Object.assign( {
        showPanel:  true,
        showHeader: true,
        showSwipe:  false,
        expand:     0,
    }, option )
}

export default ToolPanel
