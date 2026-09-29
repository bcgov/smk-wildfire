/**
 * tool-query-parameters — Query parameters panel tool (part of query composite).
 * Converted from tool/query/tool-query-parameters.js.
 */

import Tool from '../../tool'
import panelQueryRender from './panel-query.html?vue'
import { SMK } from '../../smk-ref'
import { component } from '../../vue'


const smkRef = SMK

component( 'query-widget', {
    extends: smkRef.COMPONENT.ToolWidgetBase,
} )

component( 'query-panel', {
    emits: [ 'pickDown', 'pickUp' ],
    extends: smkRef.COMPONENT.ToolPanelBase,
    render: panelQueryRender,
    props: [ 'description', 'parameters', 'within', 'command' ],
} )

function asyncIterator( test: () => boolean, body: () => void, delay: number ): Promise<any> {
    return smkRef.UTIL.makePromise( function ( res: any, rej: any ) {
        try {
            if ( !test() ) return res( false )
            body()
            setTimeout( () => res( true ), delay )
        } catch ( e ) {
            return rej( e )
        }
    } ).then( function ( cont: boolean ) {
        if ( !cont ) return
        return asyncIterator( test, body, delay )
    } )
}

const factory = Tool.define( 'QueryParametersTool',
    function ( this: any ) {
        smkRef.TYPE.ToolWidget.call( this, 'query-widget' )
        smkRef.TYPE.ToolPanel.call( this, 'query-panel' )

        this.defineProp( 'description' )
        this.defineProp( 'parameters' )
        this.defineProp( 'within' )
        this.defineProp( 'command' )
        // default command is to execute the query with the current parameters, within the current map extent
        // skipped in js conversion, so check other spots where I made similar mistakes!
        this.command = { within: true, select: true }
    },
    function ( this: any, smk: any ) {
        const self = this

        if ( !this.instance )
            throw new Error( 'query tool needs an instance' )
        if ( !( this.instance in smk.$viewer.query ) )
            throw new Error( '"' + this.instance + '" is not a defined query' )

        this.featureSet = smk.$viewer.queried[ this.instance ]
        this.featureSet.instance = this.instance

        this.query = smk.$viewer.query[ this.instance ]

        this.title       = this.query.title
        this.description = this.query.description
        this.parameters  = this.query.getParameters( smk.$viewer )

        if ( !this.query.canUseWithExtent( smk.$viewer ) ) this.within = null

        function focusFirstParameter() {
            self.parameters[ 0 ].focus()
        }

        self.changedActive( function () {
            if ( !self.active ) return

            focusFirstParameter()
            smkRef.UTIL.makeDelayedCall( function () { focusFirstParameter() }, { delay: 100 } )()

            if ( self.onActivate ) {
                if ( self.onActivate === 'execute' ) smk.emit( self.id, 'execute' )
                self.onActivate = null
            }
        } )

        self.changedGroup( function () {
            if ( !self.group ) {
                self.featureSet.clear()
                self.featureSet.pick()
            }
        } )

        smk.on( this.id, {
            'parameter-input': function ( ev: any ) {
                self.parameters[ ev.index ].prop.value = ev.value
            },
            'parameter-mounted': function ( ev: any ) {
                self.parameters[ ev.index ].mounted()
            },
            'parameter-reset': function ( ev: any ) {
                self.parameters[ ev.index ].prop.value = self.query.parameters[ ev.index ].value
            },
            'parameter-change': function ( ev: any ) {
                smk.setEditFocus( ev.active )
            },
            'reset': function () {
                self.featureSet.clear()
                self.showStatusMessage()
                self.parameters.forEach( function ( p: any, i: number ) {
                    p.prop.value = self.query.parameters[ i ].value
                } )
            },
            'execute': function () {
                self.featureSet.clear()
                self.busy = true
                self.showStatusMessage( 'Searching for features', 'progress' )

                const param: Record<string, any> = {}
                self.parameters.forEach( function ( p: any ) {
                    param[ p.prop.id ] = Object.assign( {}, p.prop )
                } )

                return smkRef.UTIL.resolved()
                    .then( function () {
                        return self.query.queryLayer( param, { within: self.within }, smk.$viewer )
                    } )
                    .then( function ( features: any[] ) {
                        self.showStatusMessage()
                        return asyncIterator(
                            function () { return features.length > 0 },
                            function () { self.featureSet.add( self.query.layerId, features.splice( 0, 50 ) ) },
                            5
                        )
                    } )
                    .catch( function ( err: any ) {
                        console.warn( err )
                        // A service that refuses the request is not an empty answer.
                        const empty = /^(no features|no results|filter is empty|test is empty)$/.test( err && err.message )
                        self.showStatusMessage( empty ? 'No features found' : 'Search failed - the service did not answer', 'warning' )
                    } )
                    .finally( function () { self.busy = false } )
            },
            'add-all': function () {
                self.layers.forEach( function ( ly: any ) {
                    smk.$viewer.selected.add( ly.id, ly.features.map( function ( ft: any ) {
                        return self.featureSet.get( ft.id )
                    } ) )
                } )
            },
            'change': function ( ev: any, comp: any ) {
                Object.assign( self, ev )
                comp.$forceUpdate()
            },
        } )
    }
)

smkRef.TYPE[ 'tool-query-parameters' ] = factory
export default factory
