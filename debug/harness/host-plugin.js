/**
 * A host plugin, in the shape WFNEWS writes them.
 *
 * It loads as a plain script, subclasses a bundled Layer type with
 * Reflect.construct, and registers the result on SMK.TYPE.Layer. Four of the
 * six contracts SMK v2 dropped were these, so the harness project exercises
 * them from outside rather than trusting that they still work.
 */
( function () {
    'use strict'

    // SMK v2's layer types are ES classes, which cannot be .apply()d onto an
    // existing object. Reflect.construct works against a class or a function.
    var Base = SMK.TYPE.Layer[ 'vector' ]

    function HostDemoLayer( config ) {
        return Reflect.construct( Base, [ config ], new.target || HostDemoLayer )
    }

    Object.setPrototypeOf( HostDemoLayer.prototype, Base.prototype )
    Object.setPrototypeOf( HostDemoLayer, Base )

    SMK.TYPE.Layer[ 'host-demo' ] = HostDemoLayer

    // A host overrides the shared half and keeps the viewer halves.
    HostDemoLayer.prototype.getConfig = function () {
        var cfg = JSON.parse( JSON.stringify( Base.prototype.getConfig.call( this ) ) )
        cfg.type = 'host-demo'
        return cfg
    }

    // The adapter registry is Layer[ type ][ viewer ]. Borrow vector's, which
    // is what a host does when its type only changes the shared behaviour.
    ;[ 'leaflet', 'maplibre', 'esri3d' ].forEach( function ( v ) {
        if ( Base[ v ] ) HostDemoLayer[ v ] = Base[ v ]
    } )

    // A host tool. Only the registration is checked here - building one needs a
    // component, and that is the bespoke tool's job.
    if ( SMK.TYPE.Tool && typeof SMK.TYPE.Tool.define === 'function' ) {
        SMK.TYPE.Tool.define( 'HostDemoTool', {
            initialize: function () {},
        } )
    }

    window.HOST_PLUGIN = {
        loadedBy:    'script',
        layerType:   'host-demo',
        toolDefined: typeof SMK.TYPE.HostDemoTool === 'function',
    }
} )()
