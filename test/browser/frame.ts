/**
 * The chrome SMK's CSS selects on, with no SMK in it. The Fixture uses it for
 * v2, and the Gallery's 1.0 stage for SMK 1.0, so both get the same frame.
 */

export interface FrameOptions {
    host?:    HTMLElement
    theme?:   string
    mobile?:  boolean
    width?:   number
    height?:  number
    // Receives every `$$emit`, the way SmkMap.emit would.
    trigger?: ( toolId: string, event: string, arg: any ) => void
    // A status template can call its tool's own methods, as coordinate.html does.
    methods?: Record<string, ( ...args: any[] ) => any>
}

/**
 * Mounts options over host, putting the root in host's place. v2 passes a
 * Vue 3 mount; the 1.0 stage passes `( o, el ) => new Vue( o ).$mount( el )`.
 */
export type Mount = ( options: any, host: HTMLElement ) => any

export function frameWith( mount: Mount, chrome: string, data: any, opt: FrameOptions ) {
    const host = opt.host ?? document.body.appendChild( document.createElement( 'div' ) )
    const { theme = 'wf', mobile = false, width = 1200, height = 800 } = opt
    const trigger = ( id: string, event: string, arg: any ) => opt.trigger?.( id, event, arg )

    return mount( {
        data() { return data },
        methods: {
            trigger,
            previousPanel: ( id: string ) => trigger( id, 'previous-panel', null ),
            closePanel:    ( id: string ) => trigger( id, 'close-panel', null ),
            beforeShow() {}, afterShow() {}, beforeHide() {}, afterHide() {},
            ...opt.methods,
        },
        // The sidepanel is absolutely positioned, so the frame needs a box.
        template: `
            <div class="smk-map-frame smk-theme-base smk-theme-${ theme } smk-device-${ mobile ? 'mobile' : 'desktop' }"
                style="position:relative;width:${ width }px;height:${ height }px">
                <div class="smk-overlay">${ chrome }</div>
            </div>`,
    }, host )
}
