/**
 * The Gallery's entries. The markup is SMK's own; only the prop values here
 * are invented, in the shapes the tools give at run time.
 */
import type { Mounted } from '../../test/browser/fixture'
import legendHtml from '../../src/smk/tool/legend/legend.html?raw'
import scaleHtml from '../../src/smk/tool/scale/scale.html?raw'
import shortcutMenuHtml from '../../src/smk/tool/shortcut-menu/shortcut-menu.html?raw'
import coordinateHtml from '../../src/smk/tool/coordinate/coordinate.html?raw'
import locationAddressHtml from '../../src/smk/tool/search/location-address.html?raw'

interface Base {
    name:   string
    group:  string
    source: string
    note?:  string
    // A fault the entry shows today. The test expects it, so a fix fails the test until this goes.
    known?: string
    size?:  [ number, number ]
}

export type Story = Base & (
    // A tool panel, through sidepanel.html.
    | { kind: 'panel', panel: Mounted }
    // A building block, placed in one slot of a real tool-panel.
    | { kind: 'block', slot: 'commands' | 'body', template: string, sample: any }
    // Widgets, through toolbar.html or actionbar.html.
    | { kind: 'bar', bar: 'toolbar' | 'actionbar', widgets: Mounted[] }
    // A status item, inside the status container.
    | { kind: 'status', template: string, data: any, methods?: Record<string, ( ...a: any[] ) => any> }
)

// ---------------------------------------------------------------------------
// Prop shapes
// ---------------------------------------------------------------------------

function panel( component: string, id: string, title: string, icon: string, extra: any = {} ): Mounted {
    return { component, prop: {
        id, type: id, title, icon,
        active: true, enabled: true, visible: false, group: false, showTitle: false,
        showPanel: true, showHeader: true, showSwipe: false, busy: false, expand: 0, hasPrevious: false,
        ...extra,
    } }
}

function widget( component: string, id: string, title: any, icon: any, extra: any = {} ): Mounted {
    return { component, prop: {
        id, type: component.replace( /-widget$/, '' ), title, icon,
        active: false, enabled: true, visible: false, group: false, showTitle: false, showWidget: true,
        ...extra,
    } }
}

const svg = ( body: string, w = 20, h = 20 ) =>
    'data:image/svg+xml,' + encodeURIComponent( `<svg xmlns="http://www.w3.org/2000/svg" width="${ w }" height="${ h }">${ body }</svg>` )

const swatch = ( fill: string, stroke = '#333' ) =>
    svg( `<rect x="2" y="2" width="16" height="16" fill="${ fill }" stroke="${ stroke }" stroke-width="1.5"/>` )

// `style` is what Layer.getLegends adds before the layers panel sees a legend.
function legend( title: string, fill: string ) {
    const url = swatch( fill )
    return { title, url, width: 20, height: 20, style: {
        'background-image': `url( ${ url })`, 'background-repeat': 'no-repeat',
        'background-size': '20px 20px', width: '20px', height: '20px', display: 'block',
    } }
}

function display( id: string, title: string, extra: any = {} ) {
    return {
        id, type: 'layer', title, class: null,
        isVisible: true, isEnabled: true, isActuallyVisible: true, isExpanded: false, isInternal: false,
        inFilter: true, showItem: true, showLegend: false, alwaysShowLegend: false,
        legends: null, metadataUrl: null,
        ...extra,
    }
}

const root = ( items: any[] ) => display( 'root', 'root', { type: 'folder', isExpanded: true, showItem: false, items } )

const LAYER_TREE = root( [
    display( 'wildfire', 'Wildfire', { type: 'folder', isExpanded: true, items: [
        display( 'fire-perimeters', 'Fire Perimeters', { showLegend: true, legends: [ legend( 'Perimeter', '#e4572e' ) ] } ),
        display( 'fire-locations', 'Active Fire Locations', { showLegend: true, legends: [
            legend( 'Out of Control', '#d7191c' ), legend( 'Being Held', '#fdae61' ), legend( 'Under Control', '#1a9641' ) ] } ),
        display( 'danger-rating', 'BC Wildfire Danger Rating', { isVisible: false, isActuallyVisible: false } ),
    ] } ),
    display( 'area-restrictions', 'Area Restrictions', { metadataUrl: 'https://catalogue.data.gov.bc.ca/' } ),
    display( 'smoke', 'Smoke Forecast', { isEnabled: false, isActuallyVisible: false } ),
] )

const PERIMETERS = {
    id: 'fire-perimeters', title: 'Fire Perimeters',
    attributes: [
        { name: 'FIRE_NUMBER',        title: 'Fire Number' },
        { name: 'FIRE_SIZE_HECTARES', title: 'Size',        format: "asUnit( 'ha' )" },
        { name: 'FIRE_STATUS',        title: 'Status' },
        { name: 'TRACK_DATE',         title: 'Last Updated', format: 'asLocalDate' },
        { name: 'FIRE_URL',           title: 'Details',     format: "asLink( 'Fire details' )" },
    ],
}

const FEATURE = {
    id: 'K20637', title: 'K20637 Downton Lake',
    properties: {
        FIRE_NUMBER: 'K20637', FIRE_SIZE_HECTARES: 18432.6, FIRE_STATUS: 'Out of Control',
        TRACK_DATE: '2026-08-14T19:00:00Z', FIRE_URL: 'https://wildfiresituation.nrs.gov.bc.ca/',
        description: '<p>Burning in <b>steep terrain</b> west of Gold Bridge.</p>',
    },
}

const FEATURE_ATTRIBUTES = PERIMETERS.attributes.map( at => ( {
    id: at.name, name: at.name, title: at.title,
    value: ( FEATURE.properties as any )[ at.name ], format: at.format || 'simple',
} ) )

const FEATURE_LAYERS = [
    { id: 'fire-perimeters', title: 'Fire Perimeters', features: [
        FEATURE,
        { id: 'G41201', title: 'G41201 Tsah Creek', properties: { FIRE_NUMBER: 'G41201' } },
    ] },
    { id: 'danger-rating', title: 'BC Wildfire Danger Rating', features: [
        { id: 'dr-1', title: 'Extreme', properties: { DANGER_RATING: 'Extreme' } },
    ] },
]

const ADDRESS = {
    fullAddress: '1011 4th Ave, Prince George, BC', matchPrecision: 'CIVIC_NUMBER',
    civicNumber: '1011', streetName: '4th', streetType: 'Ave',
    localityName: 'Prince George', localityType: 'City',
}

const SEARCHED = { geometry: { type: 'Point', coordinates: [ -122.749672, 53.917065 ] }, properties: ADDRESS }

const basemapImage = ( title: string, a: string, b: string ) => svg(
    `<defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="${ a }"/><stop offset="1" stop-color="${ b }"/></linearGradient></defs>` +
    `<rect width="110" height="110" fill="url(#g)"/><text x="8" y="100" font-family="sans-serif" font-size="13" fill="#fff">${ title }</text>`,
    110, 110 )

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

const C = 'src/smk/component/'
const T = 'src/smk/tool/'

export const STORIES: Story[] = [

    // --- Components -------------------------------------------------------

    { name: 'command-button', group: 'Components', source: C + 'command-button/', kind: 'block', slot: 'commands',
      template: `
        <command-button class="smk-area" v-bind:disabled="sample.disabled" v-on:click="$$emit( 'click' )">{{ sample.label }}</command-button>
        <command-button class="smk-reverse" v-bind:title="sample.title" v-bind:icon="sample.icon" v-bind:disabled="sample.disabled" v-on:click="$$emit( 'click-icon' )"></command-button>
        <command-button class="smk-cancel" v-bind:disabled="true">Disabled</command-button>`,
      sample: { label: 'Zoom to', title: 'Reverse route', icon: 'autorenew', disabled: false } },

    { name: 'menu-button', group: 'Components', source: C + 'menu-button/', kind: 'block', slot: 'commands',
      template: `<menu-button class="smk-theme" v-bind:title="sample.title" v-bind:menuItems="sample.menuItems" v-on:click="$$emit( 'click', $event )"></menu-button>`,
      sample: { title: 'Theme', menuItems: [
        { title: 'Wildfire', icon: 'local_fire_department' }, { title: 'Smoke', icon: 'cloud' }, { title: 'Evacuation', icon: 'directions_run' } ] } },

    { name: 'toggle-button', group: 'Components', source: C + 'toggle-button/', kind: 'block', slot: 'commands',
      template: `<toggle-button class="smk-legend-toggle" v-bind:value="sample.value" v-on:change="sample.value = $event; $$emit( 'change', $event )">{{ sample.label }}</toggle-button>`,
      sample: { value: true, label: 'Legend' } },

    { name: 'select-dropdown', group: 'Components', source: C + 'select-dropdown/', kind: 'block', slot: 'commands',
      template: `<select-dropdown class="smk-units" v-bind:options="sample.options" v-bind:value="sample.value" v-on:change="sample.value = $event; $$emit( 'change', $event )"></select-dropdown>`,
      sample: { value: 'metric', options: [
        { value: 'metric', label: 'Metric' }, { value: 'imperial', label: 'Imperial' }, { value: 'hectares', label: 'Hectares' } ] } },

    { name: 'select-option', group: 'Components', source: C + 'select-option/', kind: 'block', slot: 'body',
      template: `<select-option v-bind:options="sample.options" v-bind:value="sample.value" v-on:change="sample.value = $event; $$emit( 'change', $event )">{{ sample.label }}</select-option>`,
      sample: { label: 'Route type', value: 'fastest', options: [
        { value: 'fastest', label: 'Fastest' }, { value: 'shortest', label: 'Shortest' } ] } },

    { name: 'enter-input', group: 'Components', source: C + 'enter-input/', kind: 'block', slot: 'commands',
      template: `<enter-input class="smk-filter" v-bind:placeholder="sample.placeholder" v-bind:value="sample.value" v-bind:disabled="sample.disabled" v-on:change="sample.value = $event; $$emit( 'change', $event )"></enter-input>`,
      sample: { placeholder: 'Filter layers', value: '', disabled: false } },

    { name: 'enter-number', group: 'Components', source: C + 'enter-input/', kind: 'block', slot: 'commands',
      template: `
        <enter-number class="smk-radius" v-bind:value="sample.value" v-on:change="sample.value = $event; $$emit( 'change', $event )">{{ sample.label }}
            <template slot="after-input"><select><option>pixels</option><option>meters</option></select></template>
        </enter-number>`,
      sample: { label: 'Maximum distance', value: 5 } },

    { name: 'address-search', group: 'Components', source: C + 'address-search/', kind: 'block', slot: 'commands',
      note: 'Typing asks the live BC Geocoder.',
      template: `<address-search class="smk-address" v-bind:placeholder="sample.placeholder" v-on:update="$$emit( 'update', $event )"></address-search>`,
      sample: { placeholder: 'Enter address here, or click on map' } },

    { name: 'activate-tool', group: 'Components', source: C + 'activate-tool/', kind: 'block', slot: 'body',
      template: `<activate-tool v-bind:id="sample.id" v-bind:title="sample.title">{{ sample.label }}</activate-tool>`,
      sample: { id: 'LayersTool', title: 'Open the layers panel', label: 'Show layers' } },

    { name: 'feature-list', group: 'Components', source: C + 'feature-list/', kind: 'block', slot: 'body',
      template: `<feature-list v-bind:layers="sample.layers" v-bind:highlightId="sample.highlightId" v-on:active="sample.highlightId = $event.featureId; $$emit( 'active', $event )"></feature-list>`,
      sample: { highlightId: 'G41201', layers: FEATURE_LAYERS } },

    { name: 'feature-attributes', group: 'Components', source: C + 'feature-attributes/', kind: 'block', slot: 'body',
      template: `<feature-attributes v-bind:feature="sample.feature" v-bind:layer="sample.layer" v-bind:attributes="sample.attributes" v-bind:showHeader="sample.showHeader"></feature-attributes>`,
      sample: { showHeader: true, feature: FEATURE, layer: PERIMETERS, attributes: FEATURE_ATTRIBUTES } },

    { name: 'feature-properties', group: 'Components', source: C + 'feature-properties/', kind: 'block', slot: 'body',
      template: `<feature-properties v-bind:feature="sample.feature" v-bind:layer="sample.layer" v-bind:showHeader="sample.showHeader"></feature-properties>`,
      sample: { showHeader: false, feature: FEATURE, layer: PERIMETERS } },

    { name: 'feature-description', group: 'Components', source: C + 'feature-description/', kind: 'block', slot: 'body',
      template: `<feature-description v-bind:feature="sample.feature" v-bind:layer="sample.layer"></feature-description>`,
      sample: { feature: FEATURE, layer: PERIMETERS } },

    { name: 'feature-attribute', group: 'Components', source: C + 'feature-attribute/', kind: 'block', slot: 'body',
      template: `<div class="smk-attributes"><feature-attribute v-bind:title="sample.title" v-bind:value="sample.value"></feature-attribute></div>`,
      sample: { title: 'Fire Number', value: 'K20637' } },

    { name: 'parameter-input', group: 'Components', source: C + 'parameter/', kind: 'block', slot: 'body',
      template: `<div class="smk-parameters"><parameter-input class="smk-parameter" v-bind="sample" v-on:input="$$emit( 'input', $event )" v-on:reset="$$emit( 'reset' )"></parameter-input></div>`,
      sample: { id: 'fire-number', title: 'Fire Number', value: 'K2' } },

    { name: 'parameter-select', group: 'Components', source: C + 'parameter/', kind: 'block', slot: 'body',
      template: `<div class="smk-parameters"><parameter-select class="smk-parameter" v-bind="sample" v-on:input="$$emit( 'input', $event )"></parameter-select></div>`,
      sample: { id: 'status', title: 'Stage of Control', value: '', choices: [
        { value: 'OUT_CNTRL', title: 'Out of Control' }, { value: 'HOLDING', title: 'Being Held' }, { value: 'UNDR_CNTRL' } ] } },

    { name: 'parameter-constant', group: 'Components', source: C + 'parameter/', kind: 'block', slot: 'body',
      template: `<div class="smk-parameters"><parameter-constant class="smk-parameter" v-bind="sample"></parameter-constant></div>`,
      sample: { id: 'year', title: 'Fire Year', value: '2026' } },

    { name: 'tool-panel-feature', group: 'Components', source: C + 'tool-panel-feature/', kind: 'panel',
      panel: panel( 'tool-panel-feature', 'IdentifyFeatureTool', 'Fire Perimeters', 'info_outline', {
        feature: FEATURE, layer: PERIMETERS, attributeComponent: 'feature-attributes', attributeMode: 'default',
        tool: { zoom: true, select: true }, resultPosition: 0, resultCount: 3, instance: null,
        command: { navigator: true, zoom: true, select: true, attributeMode: true },
      } ) },

    // --- Panels -----------------------------------------------------------

    { name: 'layers-panel', group: 'Panels', source: T + 'layers/', kind: 'panel',
      panel: panel( 'layers-panel', 'LayersTool', 'Layers', 'layers', {
        contexts: [ LAYER_TREE ], allVisible: true, filter: '', legend: true,
        glyph: { visible: 'check_box', hidden: 'check_box_outline_blank' },
        command: { allVisibility: true, filter: true, legend: true, themes: false },
      } ) },

    { name: 'measure-panel', group: 'Panels', source: T + 'measure/', kind: 'panel',
      panel: panel( 'measure-panel', 'MeasureTool', 'Measurement', 'straighten', {
        viewer: { maplibre: true }, unit: 'metric', content: null,
        results: [ { title: 'Length', value: 12873.4, dim: 1 }, { title: 'Area', value: 4.2e7, dim: 2 } ],
      } ) },

    { name: 'baseMaps-panel', group: 'Panels', source: T + 'baseMaps/', kind: 'panel',
      note: 'Every option has optionImageUrl, so no live map is built (D7).',
      panel: panel( 'baseMaps-panel', 'BaseMapsTool', 'Base Maps', 'map', {
        current: 'topography', mapStyle: { width: '110px', height: '110px' },
        basemaps: [
            { id: 'topography', title: 'Topography', optionImageUrl: basemapImage( 'Topography', '#8fae6b', '#d9cfa5' ) },
            { id: 'imagery',    title: 'Imagery',    optionImageUrl: basemapImage( 'Imagery', '#2f4f3a', '#6b7b4f' ) },
            { id: 'bc-roads',   title: 'BC Roads',   optionImageUrl: basemapImage( 'BC Roads', '#e8e4d8', '#c9c2ad' ) },
            { id: 'night',      title: 'Night',      optionImageUrl: basemapImage( 'Night', '#101820', '#34495e' ) },
        ],
      } ) },

    { name: 'identify-panel', group: 'Panels', source: T + 'identify/', kind: 'panel',
      panel: panel( 'identify-panel', 'IdentifyListTool', 'Identify Features', 'info_outline', {
        tool: { select: true }, layers: FEATURE_LAYERS, highlightId: null, radius: 5, radiusUnit: 'px',
        command: { select: true, radius: true, radiusUnit: true, nearBy: true },
      } ) },

    { name: 'select-panel', group: 'Panels', source: T + 'select/', kind: 'panel',
      panel: panel( 'select-panel', 'SelectListTool', 'Selected Features', 'select_all', {
        layers: FEATURE_LAYERS, highlightId: 'K20637', command: { clear: true, remove: true },
      } ) },

    { name: 'search-panel', group: 'Panels', source: T + 'search/', kind: 'panel',
      panel: panel( 'search-panel', 'SearchListTool', 'Search for Location', 'search', {
        highlightId: 'r2',
        results: [
            { id: 'r1', properties: ADDRESS },
            { id: 'r2', properties: { ...ADDRESS, civicNumber: '', streetName: '', fullAddress: 'Prince George, BC', matchPrecision: 'LOCALITY' } },
        ],
      } ) },

    { name: 'query-panel', group: 'Panels', source: T + 'query/', kind: 'panel',
      panel: panel( 'query-panel', 'QueryTool--fires', 'Find a Fire', 'search', {
        description: 'Search the current fire season.', within: true, command: { within: true },
        parameters: [
            { id: 'p1', component: 'parameter-input',    prop: { id: 'p1', title: 'Fire Number', value: '' } },
            { id: 'p2', component: 'parameter-select',   prop: { id: 'p2', title: 'Stage of Control', value: '', choices: [
                { value: 'OUT_CNTRL', title: 'Out of Control' }, { value: 'HOLDING', title: 'Being Held' } ] } },
            { id: 'p3', component: 'parameter-constant', prop: { id: 'p3', title: 'Fire Year', value: '2026' } },
        ],
      } ) },

    { name: 'bookmarks-panel', group: 'Panels', source: T + 'bookmarks/', kind: 'panel',
      panel: panel( 'bookmarks-panel', 'BookmarksTool', 'Bookmarks', 'bookmarks', {
        bookmarks: [ { title: 'Kamloops Fire Centre' }, { title: 'Prince George Fire Centre' }, { title: 'Coastal Fire Centre' } ],
      } ) },

    { name: 'about-panel', group: 'Panels', source: T + 'about/', kind: 'panel',
      panel: panel( 'about-panel', 'AboutTool', 'About SMK', 'help', {
        content: '<h3>Welcome to SMK</h3><p>Simple Map Kit draws the map. The <b>Host</b> writes a Config.</p>',
      } ) },

    { name: 'version-panel', group: 'Panels', source: T + 'version/', kind: 'panel',
      panel: panel( 'version-panel', 'VersionTool', 'Version Info', 'build', {
        build: { version: '2.0.0', lastCommit: '2026-09-15 22:14:31 -0700', commit: '6e5fa88', branch: 'feature/maplibre-upgrade', origin: 'github:qqnluaq/smk' },
        config: { createdBy: 'BCWS', enabledTools: [ 'layers', 'measure', 'identify' ] },
      } ) },

    { name: 'location-panel', group: 'Panels', source: T + 'location/', kind: 'panel',
      panel: panel( 'location-panel', 'LocationTool', 'Location', 'location_on', {
        site: { ...ADDRESS, latitude: 53.917065, longitude: -122.749672 },
        tool: { identify: true, measure: false, directions: true },
      } ) },

    // --- Widgets ----------------------------------------------------------

    { name: 'toolbar', group: 'Widgets', source: T + 'toolbar/', kind: 'bar', bar: 'toolbar', size: [ 640, 160 ],
      widgets: [
        widget( 'list-menu-widget', 'ListMenuTool', 'Menu', 'menu' ),
        widget( 'search-widget',    'SearchListTool', 'Search for Location', 'search', { type: 'search', showPanel: true, results: [], initialSearch: '' } ),
        widget( 'layers-widget',    'LayersTool', 'Layers', 'layers', { active: true } ),
        widget( 'measure-widget',   'MeasureTool', 'Measurement', 'straighten' ),
        widget( 'baseMaps-widget', 'BaseMapsTool', 'Base Maps', 'map', { showTitle: true } ),
      ] },

    { name: 'actionbar', group: 'Widgets', source: T + 'actionbar/', kind: 'bar', bar: 'actionbar', size: [ 160, 420 ],
      widgets: [
        widget( 'zoom-widget', 'ZoomTool', { zoomIn: 'Zoom In', zoomOut: 'Zoom Out' }, { zoomIn: 'add', zoomOut: 'remove' }, { control: true } ),
        widget( 'pan-widget', 'PanTool',
            { compass: 'Reset Orientation', navModePan: 'Panning Mode', navModeRotate: 'Rotate Mode' },
            { compass: 'navigation', navModePan: 'open_with', navModeRotate: '3d_rotation' },
            { control: true, navMode: 'pan', compassStyle: { transform: 'rotate(30deg)' } } ),
        widget( 'reset-view-widget', 'ResetViewTool', 'Reset View', 'zoom_out_map' ),
        widget( 'current-location-widget', 'CurrentLocationTool', 'Current Location', 'my_location' ),
      ] },


    // --- Widgets ----------------------------------------------------------
    { name: 'about-widget', group: 'Widgets', source: T + 'about/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'about-widget', 'AboutTool', 'About', 'info' ) ] },
    { name: 'baseMaps-widget', group: 'Widgets', source: T + 'baseMaps/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'baseMaps-widget', 'BaseMapsTool', 'Base Maps', 'map' ) ] },
    { name: 'bespoke-widget', group: 'Widgets', source: T + 'bespoke/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'bespoke-widget', 'BespokeTool', 'Bespoke', 'extension' ) ] },
    { name: 'bookmarks-widget', group: 'Widgets', source: T + 'bookmarks/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'bookmarks-widget', 'BookmarksTool', 'Bookmarks', 'bookmark' ) ] },
    { name: 'directions-widget', group: 'Widgets', source: T + 'directions/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'directions-widget', 'DirectionsTool', 'Directions', 'directions' ) ] },
    { name: 'identify-widget', group: 'Widgets', source: T + 'identify/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'identify-widget', 'IdentifyTool', 'Identify', 'touch_app' ) ] },
    { name: 'layers-widget', group: 'Widgets', source: T + 'layers/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'layers-widget', 'LayersTool', 'Layers', 'layers' ) ] },
    { name: 'list-menu-widget', group: 'Widgets', source: T + 'list-menu/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'list-menu-widget', 'ListMenuTool', 'Tools', 'list' ) ] },
    { name: 'location-widget', group: 'Widgets', source: T + 'location/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'location-widget', 'LocationTool', 'Location', 'place' ) ] },
    { name: 'markup-widget', group: 'Widgets', source: T + 'markup/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'markup-widget', 'MarkupTool', 'Markup', 'create' ) ] },
    { name: 'measure-widget', group: 'Widgets', source: T + 'measure/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'measure-widget', 'MeasureTool', 'Measurement', 'straighten' ) ] },
    { name: 'menu-widget', group: 'Widgets', source: T + 'menu/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'menu-widget', 'MenuTool', 'Menu', 'menu' ) ] },
    { name: 'query-widget', group: 'Widgets', source: T + 'query/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'query-widget', 'QueryTool', 'Query', 'help_outline' ) ] },
    { name: 'search-widget', group: 'Widgets', source: T + 'search/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'search-widget', 'SearchListTool', 'Search for Location', 'search',
        { showPanel: true, results: [], initialSearch: '' } ) ] },
    { name: 'select-widget', group: 'Widgets', source: T + 'select/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'select-widget', 'SelectTool', 'Select', 'select_all' ) ] },
    { name: 'version-widget', group: 'Widgets', source: T + 'version/', kind: 'bar', bar: 'toolbar', size: [ 620, 200 ],
      widgets: [ widget( 'version-widget', 'VersionTool', 'Version', 'build' ) ] },
    { name: 'current-location-widget', group: 'Widgets', source: T + 'current-location/', kind: 'bar', bar: 'actionbar', size: [ 620, 260 ],
      widgets: [ widget( 'current-location-widget', 'CurrentLocationTool', 'Current location', 'my_location' ) ] },
    { name: 'mode-widget', group: 'Widgets', source: T + 'mode/', kind: 'bar', bar: 'actionbar', size: [ 620, 260 ],
      widgets: [ widget( 'mode-widget', 'ModeTool', 'View mode', '3d_rotation' ) ] },
    { name: 'reset-view-widget', group: 'Widgets', source: T + 'reset-view/', kind: 'bar', bar: 'actionbar', size: [ 620, 260 ],
      widgets: [ widget( 'reset-view-widget', 'ResetViewTool', 'Reset view', 'zoom_out_map' ) ] },
    { name: 'pan-widget', group: 'Widgets', source: T + 'pan/', kind: 'bar', bar: 'actionbar', size: [ 620, 260 ],
      note: 'Three buttons: the compass, pan mode and rotate mode.',
      widgets: [ widget( 'pan-widget', 'PanTool', { compass: 'Reset Orientation', navModePan: 'Pan', navModeRotate: 'Rotate' },
        { compass: 'navigation', navModePan: 'open_with', navModeRotate: '3d_rotation' },
        { control: true, navMode: 'pan', compassStyle: { transform: 'rotate(30deg)' } } ) ] },

    { name: 'zoom-widget', group: 'Widgets', source: T + 'zoom/', kind: 'bar', bar: 'actionbar', size: [ 620, 260 ],
      widgets: [ widget( 'zoom-widget', 'ZoomTool', { zoomIn: 'Zoom in', zoomOut: 'Zoom out' },
        { zoomIn: 'add', zoomOut: 'remove' }, { control: true } ) ] },

    { name: 'directions-panel', group: 'Panels', source: T + 'directions/', kind: 'panel',
      panel: panel( 'directions-panel', 'DirectionsTool', 'Directions', 'directions', {
        hasRoute: true, optimal: false, geocoderService: null,
        waypoints: [
            { ...ADDRESS, siteName: 'Fire Centre' },
            { fullAddress: 'Gold Bridge, BC', matchPrecision: 'LOCALITY', localityName: 'Gold Bridge', localityType: 'Village' },
        ],
      } ) },

    { name: 'directions-options-panel', group: 'Panels', source: T + 'directions/', kind: 'panel',
      panel: panel( 'directions-options-panel', 'DirectionsTool', 'Route Options', 'tune', {
        // No host content, and 1.0's v-content throws on an empty bespoke.
        command: { bespoke: false },
        truck: true, optimal: false, roundTrip: false, criteria: 'shortest',
        truckRoute: 1, truckHeight: 4.15, truckWidth: 2.6, truckLength: 23, truckWeight: 63500,
        truckHeightUnit: 1, truckWidthUnit: 1, truckLengthUnit: 1, truckWeightUnit: 1,
      } ) },

    { name: 'route-panel', group: 'Panels', source: T + 'directions/', kind: 'panel',
      panel: panel( 'route-panel', 'DirectionsTool', 'Route', 'directions', {
        directionHighlight: 1, directionPick: null,
        directions: [
            { name: 'Highway 97', type: 'START', text: 'Start out north on Highway 97',
              distanceUnit: { value: 0, unit: 'meters' }, time: 0 },
            { name: 'Highway 16', type: 'TURN_LEFT', text: 'Turn left onto Highway 16',
              distance: 12.4, distanceUnit: { value: 12400, unit: 'kilometers' }, time: 540 },
            { name: 'Blackwater Road', type: 'TURN_RIGHT', text: 'Turn right onto Blackwater Road',
              distance: 3.1, distanceUnit: { value: 3100, unit: 'kilometers' }, time: 180 },
        ],
      } ) },

    { name: 'query-results-panel', group: 'Panels', source: T + 'query/', kind: 'panel',
      panel: panel( 'query-results-panel', 'QueryTool--fires', 'Fires Found', 'search', {
        tool: { select: true }, layers: FEATURE_LAYERS, highlightId: 'K20637',
        command: { select: true, clear: true },
      } ) },

    { name: 'search-location-panel', group: 'Panels', source: T + 'search/', kind: 'panel',
      panel: panel( 'search-location-panel', 'SearchLocationTool', 'Location', 'place', {
        tool: { identify: true, measure: true, directions: true },
        command: { identify: true, measure: true, directions: true },
        // As the tool builds it on a picked search result; mount turns data into the function.
        locationComponent: { name: 'location', template: locationAddressHtml, data: { feature: SEARCHED } },
        feature: SEARCHED,
      } ) },

    { name: 'menu-panel', group: 'Panels', source: T + 'menu/', kind: 'panel',
      note: 'The sub widgets and panels are real ones, the way MenuTool.addTool pushes a pair for each tool.',
      panel: panel( 'menu-panel', 'MenuTool', 'Menu', 'menu', {
        subWidgets: [
            widget( 'layers-widget', 'LayersTool', 'Layers', 'layers' ),
            widget( 'measure-widget', 'MeasureTool', 'Measurement', 'straighten' ),
        ],
        subPanels: [
            panel( 'layers-panel', 'LayersTool', 'Layers', 'layers', { active: false, parentId: 'MenuTool' } ),
            panel( 'measure-panel', 'MeasureTool', 'Measurement', 'straighten', {
                parentId: 'MenuTool', viewer: { maplibre: true }, unit: 'metric', content: null,
                results: [ { title: 'Length', value: 12873.4, dim: 1 }, { title: 'Area', value: 4.2e7, dim: 2 } ],
            } ),
        ],
      } ) },

    { name: 'list-menu-panel', group: 'Panels', source: T + 'list-menu/', kind: 'panel',
      panel: panel( 'list-menu-panel', 'ListMenuTool', 'Tools', 'list', {
        subWidgets: [
            widget( 'layers-widget', 'LayersTool', 'Layers', 'layers', { showTitle: true } ),
            widget( 'measure-widget', 'MeasureTool', 'Measurement', 'straighten', { showTitle: true } ),
            widget( 'about-widget', 'AboutTool', 'About', 'info', { showTitle: true } ),
        ],
      } ) },

    { name: 'bespoke-panel', group: 'Panels', source: T + 'bespoke/', kind: 'panel',
      note: 'A Host supplies the content; the panel is only the chrome around it.',
      panel: panel( 'bespoke-panel', 'BespokeTool', 'Bespoke', 'extension', {
        // As the tool builds it: createContent( el ) runs the Host's activated handler. Mount makes the HTML that function.
        content: { createContent: '<p>Whatever the <b>Host</b> puts here.</p>' }, component: null,
      } ) },

    // --- Building blocks --------------------------------------------------

    { name: 'tool-panel', group: 'Components', source: C + 'tool-panel/', kind: 'block', slot: 'body',
      note: 'The chrome every Panel is built from. Here it holds only text.',
      template: `<p>{{ sample.text }}</p>`,
      sample: { text: 'A tool panel with a header, a commands row and a body.' } },

    { name: 'status-message', group: 'Components', source: 'src/smk/vue-config.ts', kind: 'block', slot: 'body',
      template: `
        <div>
            <status-message status="progress" message="Locating..."></status-message>
            <status-message status="warning" message="Unable to get location"></status-message>
            <status-message v-bind:status="sample.status" v-bind:message="sample.message"></status-message>
        </div>`,
      sample: { status: 'summary', message: '2 fires found' } },

    { name: 'busy-spinner', group: 'Components', source: 'src/smk/vue-config.ts', kind: 'block', slot: 'body',
      template: `<busy-spinner v-bind:active="sample.active"></busy-spinner>`,
      sample: { active: true } },

    { name: 'layer-display', group: 'Components', source: T + 'layers/', kind: 'block', slot: 'body',
      note: 'One row of the layers panel tree, in the panel class its styles are scoped to.',
      template: `<div class="smk-layers-panel"><layer-display v-bind:id="sample.display.id" v-bind:display="sample.display" v-bind:glyph="sample.glyph"></layer-display></div>`,
      sample: { glyph: { visible: 'check_box', hidden: 'check_box_outline_blank' },
        display: display( 'fire-perimeters', 'Fire Perimeters', { showLegend: true, legends: [ legend( 'Perimeter', '#e4572e' ) ] } ) } },

    { name: 'legend-display', group: 'Components', source: T + 'legend/', kind: 'block', slot: 'body',
      note: 'One row of the legend pane, in the pane class its styles are scoped to.',
      template: `<div class="smk-legend-status"><legend-display v-bind:display="sample.display"></legend-display></div>`,
      sample: { display: display( 'fire-locations', 'Active Fire Locations', { legends: [
        legend( 'Out of Control', '#d7191c' ), legend( 'Being Held', '#fdae61' ) ] } ) } },

    // --- Status -----------------------------------------------------------

    { name: 'legend', group: 'Status', source: T + 'legend/', kind: 'status', size: [ 480, 420 ],
      template: legendHtml,
      data: { title: 'Legend', contexts: [ root( [
        display( 'fire-locations', 'Active Fire Locations', { class: 'smk-inline-legend', legends: [
            legend( 'Out of Control', '#d7191c' ), legend( 'Being Held', '#fdae61' ), legend( 'Under Control', '#1a9641' ) ] } ),
        display( 'fire-perimeters', 'Fire Perimeters', { legends: [ legend( 'Perimeter', '#e4572e' ) ] } ),
      ] ) ] } },

    // Neither is a Vue component. Each is a plain template the tool mounts
    // with `new Vue( { el: smk.addToStatus( html ) } )`, as the legend is.
    { name: 'scale', group: 'Status', source: T + 'scale/', kind: 'status', size: [ 480, 260 ],
      note: 'The shape ToolScale.refresh writes after a changedView.',
      template: scaleHtml,
      data: { scaleDenom: 97131, rulerSectionWidth: 25, rulerLength: 2000, rulerUnit: 'm', zoomLevel: 9.4 } },

    { name: 'coordinate', group: 'Status', source: T + 'coordinate/', kind: 'status', size: [ 480, 260 ],
      note: "formatValue is the tool's own method, for the DD and DDM formats.",
      template: coordinateHtml,
      data: { latitude: 53.917, longitude: -122.749 },
      methods: { formatValue: ( v: number ) => v.toFixed( 3 ) } },

    { name: 'shortcut-menu', group: 'Status', source: T + 'shortcut-menu/', kind: 'status', size: [ 620, 300 ],
      note: 'A row of widgets the Host pins over the map.',
      template: shortcutMenuHtml,
      data: { widgets: [
        widget( 'layers-widget', 'LayersTool', 'Layers', 'layers' ),
        widget( 'measure-widget', 'MeasureTool', 'Measurement', 'straighten' ),
        widget( 'about-widget', 'AboutTool', 'About', 'info' ),
      ] } },
]
