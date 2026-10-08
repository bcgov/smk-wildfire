/**
 * tool-query-results — Query results panel tool (part of query composite).
 * Converted from tool/query/tool-query-results.js.
 */

import Tool from '../../tool'
import panelQueryResultsHtml from './panel-query-results.html?raw'
import { SMK } from '../../smk-ref'
import { highlightLayers } from '../../mixin/tool-feature-list/highlight-layers'

declare const Vue: any

const smkRef = SMK

Vue.component( 'query-results-panel', {
    extends: smkRef.COMPONENT.ToolPanelBase,
    template: panelQueryResultsHtml,
    props: [ 'tool', 'layers', 'highlightId', 'command' ],
} )

const factory = Tool.define( 'QueryResultsTool',
    function ( this: any ) {
        smkRef.TYPE.ToolPanel.call( this, 'query-results-panel' )
        smkRef.TYPE.ToolInternalLayers.call( this )
        smkRef.TYPE.ToolFeatureList.call( this, function ( smk: any ) { return smk.$viewer.queried[ ( this as any ).instance ] } )

        this.internalLayers.push(
            ...highlightLayers(),
        )

        this.defineProp( 'tool' )
        this.defineProp( 'command' )

        this.tool    = {}
        this.command = {}

        this.parentId = 'QueryParametersTool'
    },
    function ( this: any, smk: any ) {
        const self = this

        this.title = smk.$viewer.query[ this.instance ].title
        this.tool  = smk.getToolTypesAvailable()

        smk.on( this.id, {
            'previous-panel': function () {
                self.featureSet.clear()
            },
        } )

        self.featureSet.addedFeatures( function () {
            const stat = self.featureSet.getStats()
            self.active = true
            self.showStatusMessage( '<div>Found ' + smkRef.UTIL.grammaticalNumber( stat.featureCount, null, 'a feature', '{} features' ) + '</div>' )
        } )
    }
)

smkRef.TYPE[ 'tool-query-results' ] = factory
export default factory
