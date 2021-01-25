include.module( 'layer.layer-vector-js', [ 'layer.layer-js' ], function () {
    "use strict";

    function VectorLayer() {
        SMK.TYPE.Layer.prototype.constructor.apply( this, arguments )
    }

    $.extend( VectorLayer.prototype, SMK.TYPE.Layer.prototype )

    SMK.TYPE.Layer[ 'vector' ] = VectorLayer
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    VectorLayer.prototype.initLegends = function ( viewer, width, height ) {
        var self = this

        if ( width == null ) width = 20
        if ( height == null ) height = 20

        var mult = ( !!this.config.legend.point + !!this.config.legend.line + !!this.config.legend.fill )

        var cv = $( '<canvas width="' + width * mult + '" height="' + height + '">' ).get( 0 )
        var ctx = cv.getContext( '2d' )

        var styles = [].concat( self.config.style )

        return SMK.UTIL.resolved( 0 )
            .then( drawPoint )
            .then( drawLine )
            .then( drawFill )
            .then( function () {
                return [ {
                    url: cv.toDataURL( 'image/png' ),
                    title: self.config.legend.title || self.config.title
                } ]
            } )

        function drawPoint( offset ) {
            if ( !self.config.legend.point ) return offset 

            return SMK.UTIL.makePromise( function ( res, rej ) {
                if ( styles[ 0 ].markerUrl ) {
                    var img = $( '<img>' )
                        .on( 'load', function () {
                            var r = img.width / img.height
                            if ( r > 1 ) r = 1 / r
                            ctx.drawImage( img, offset, 0, height * r, height )
                            res( offset + width )
                        } )
                        .on( 'error', res )
                        .attr( 'src', viewer.resolveAttachmentUrl( styles[ 0 ].markerUrl, null, 'png' ) )
                        .get( 0 )
                }
                else {
                    ctx.beginPath()
                    ctx.arc( offset + width / 2, height / 2, styles[ 0 ].strokeWidth / 2, 0, 2 * Math.PI )
                    ctx.lineWidth = 2
                    ctx.strokeStyle = cssColorAsRGBA( styles[ 0 ].strokeColor, styles[ 0 ].strokeOpacity )
                    ctx.fillStyle = cssColorAsRGBA( styles[ 0 ].fillColor, styles[ 0 ].fillOpacity )
                    ctx.fill()
                    ctx.stroke()

                    res( offset + width )
                }
            } )

        }

        function drawLine( offset ) {
            if ( !self.config.legend.line ) return offset 
        
            styles.forEach( function ( st ) {
                ctx.lineWidth = st.strokeWidth
                ctx.strokeStyle = cssColorAsRGBA( st.strokeColor, st.strokeOpacity )
                ctx.lineCap = st.strokeCap
                if ( st.strokeDashes ) {
                    ctx.setLineDash( st.strokeDashes.split( ',' ) )
                    if ( parseFloat( st.strokeDashOffset ) )
                        ctx.lineDashOffset = parseFloat( st.strokeDashOffset )
                }

                var hw = st.strokeWidth / 2
                ctx.moveTo( offset, height / 2 )
                ctx.quadraticCurveTo( offset + width - hw, 0, offset + width - hw, height )
                ctx.stroke()
            } )

            return offset + width
        }

        function drawFill( offset ) {
            if ( !self.config.legend.fill ) return offset 

            styles.forEach( function ( st ) {
                // var w = self.config.style.strokeWidth
                // ctx.lineWidth = w
                // ctx.strokeStyle = self.config.style.strokeColor + alpha( self.config.style.strokeOpacity )
                ctx.fillStyle = cssColorAsRGBA( st.fillColor, st.fillOpacity )

                ctx.fillRect( 0, 0, width, height )
                // ctx.strokeRect( w / 2, w / 2, width - w , height - w )
            } )

            return offset + width
        }
    }

    VectorLayer.prototype.load = function ( data ) {
        if ( !data ) return

        if ( this.loadLayer )
            return this.loadLayer( data )

        this.loadCache = data
    }

    VectorLayer.prototype.clear = function () {
        if ( this.clearLayer )
            return this.clearLayer()
    }

    var colorMemo = {}
    function cssColorAsRGBA( color, opacity ) {
        var rgb = colorMemo[ color ]
        if ( !rgb ) {
            var div = $( '<div>' ).appendTo( 'body' ).css( 'background-color', color )
            colorMemo[ color ] = rgb = window.getComputedStyle( div.get( 0 ) ).backgroundColor
            div.remove()
        }

        var s = rgb.split( /\b/ )
        if ( s.length != 8 ) throw new Error( 'can\'t parse: ' + rgb )
        return 'rgba( ' + s[ 2 ] + ',' + s[ 4 ] + ',' + s[ 6 ] + ',' + ( opacity || 1 ) + ')' 
    }
} )
