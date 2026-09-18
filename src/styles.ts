/**
 * Every SMK stylesheet, in cascade order. The order is load-bearing: the theme
 * files must come last so they can override the component skins.
 *
 * main.ts and the browser tests both import this, so they cannot drift.
 */

// Base theme tokens and layout
import './theme/_base/variables.css'
import './theme/_base/resets.css'
import './theme/_base/map-frame.css'
import './theme/_base/elastic.css'
import './theme/_base/command.css'

// Components
import './smk/component/component.css'
import './smk/component/activate-tool/component-activate-tool.css'
import './smk/component/address-search/component-address-search.css'
import './smk/component/command-button/component-command-button.css'
import './smk/component/enter-input/component-enter-input.css'
import './smk/component/feature-list/component-feature-list.css'
import './smk/component/menu-button/component-menu-button.css'
import './smk/component/parameter/tool-query.css'
import './smk/component/select-dropdown/component-select-dropdown.css'
import './smk/component/select-option/component-select-option.css'
import './smk/component/toggle-button/component-toggle-button.css'
import './smk/component/tool-panel-feature/component-tool-panel-feature.css'

// Sidepanel and status
import './smk/sidepanel/sidepanel.css'
import './smk/status-message/status-message.css'

// Tools
import './smk/tool/about/tool-about.css'
import './smk/tool/actionbar/tool-actionbar.css'
import './smk/tool/baseMaps/tool-base-maps.css'
import './smk/tool/bespoke/tool-bespoke.css'
import './smk/tool/bookmarks/tool-bookmarks.css'
import './smk/tool/coordinate/tool-coordinate.css'
import './smk/tool/current-location/tool-current-location.css'
import './smk/tool/directions/tool-directions.css'
import './smk/tool/directions/tool-directions-options.css'
import './smk/tool/directions/tool-directions-route.css'
import './smk/tool/dropdown/dropdown.css'
import './smk/tool/identify/tool-identify.css'
import './smk/tool/layers/tool-layers.css'
import './smk/tool/legend/tool-legend.css'
import './smk/tool/list-menu/list-menu.css'
import './smk/tool/location/tool-location.css'
import './smk/tool/measure/tool-measure.css'
import './smk/tool/menu/menu.css'
import './smk/tool/query/tool-query.css'
import './smk/tool/reset-view/tool-reset-view.css'
import './smk/tool/scale/tool-scale.css'
import './smk/tool/search/tool-search.css'
import './smk/tool/shortcut-menu/shortcut-menu.css'
import './smk/tool/toolbar/tool-toolbar.css'
import './smk/tool/version/tool-version.css'

// Leaflet viewer and its tools
import './smk/viewer-leaflet/viewer-leaflet.css'
import './smk/viewer-leaflet/tool/identify/tool-identify-leaflet.css'
import './smk/viewer-leaflet/tool/directions/tool-directions-leaflet.css'
import './smk/viewer-leaflet/tool/measure/tool-measure-leaflet.css'
import './smk/viewer-leaflet/tool/query/tool-query-leaflet.css'

// MapLibre viewer
import './smk/viewer-maplibre/viewer-maplibre.css'

// ESRI 3D viewer
import './smk/viewer-esri3d/viewer-esri3d.css'

// Themes (all shipped; host picks one via <body class="smk-theme-*">)
import './theme/modern/modern.css'
import './theme/wf/wf.css'
