/**
 * Mounts one Gallery entry in v2. The v2 stage and test/browser/gallery.test.ts
 * both use this, so an entry that stops rendering fails a test.
 */
import { Vue, mountSidepanel, mountBar, mountStatus, type FrameOptions } from '../../test/browser/fixture'
import { mountWith, type Chrome } from './kinds'
import type { Story } from './stories'

// Tool modules register their components when they load. Same order as main.ts.
await import( '../../src/smk/tool/about/tool-about' )
await import( '../../src/smk/tool/pan/tool-pan' )
await import( '../../src/smk/tool/zoom/tool-zoom' )
await import( '../../src/smk/tool/version/tool-version' )
await import( '../../src/smk/tool/reset-view/tool-reset-view' )
await import( '../../src/smk/tool/list-menu/tool-list-menu' )
await import( '../../src/smk/tool/baseMaps/tool-baseMaps' )
await import( '../../src/smk/tool/bookmarks/tool-bookmarks' )
await import( '../../src/smk/tool/current-location/tool-current-location' )
await import( '../../src/smk/tool/location/tool-location' )
await import( '../../src/smk/tool/legend/tool-legend' )
await import( '../../src/smk/tool/layers/tool-layers' )
await import( '../../src/smk/tool/measure/tool-measure' )
await import( '../../src/smk/tool/identify/tool-identify' )
await import( '../../src/smk/tool/search/tool-search' )
await import( '../../src/smk/tool/select/tool-select' )
await import( '../../src/smk/tool/query/tool-query' )
await import( '../../src/smk/tool/bespoke/tool-bespoke' )
await import( '../../src/smk/tool/directions/tool-directions' )
await import( '../../src/smk/tool/markup/tool-markup' )
await import( '../../src/smk/tool/menu/tool-menu' )
await import( '../../src/smk/tool/shortcut-menu/tool-shortcut-menu' )
await import( '../../src/smk/viewer-maplibre/tool/mode/tool-mode-maplibre' )

export { clone, initialModel, liveModel } from './kinds'

export const V2: Chrome = { Vue, sidepanel: mountSidepanel, bar: mountBar, status: mountStatus }

export function mountStory( story: Story, model: any, opt: FrameOptions ) {
    return mountWith( V2, story, model, opt )
}
