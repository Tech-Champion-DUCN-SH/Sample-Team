
var NS_HTML = "http://www.w3.org/1999/xhtml";
var NS_SVG = "http://www.w3.org/2000/svg";
var NS_XLINK = "http://www.w3.org/1999/xlink";

var SVG = {
	use: function( parent, id, position) {
		var u = parent.appendChild( document.createElementNS( NS_SVG, "use"));
		u.setAttributeNS( NS_XLINK, "href", "#" + id);
		if( position) u.setAttribute( "transform", "translate( " + position[ 0] + ", " + position[ 1] + ")");
		return u;
	},

	setTransform: function( element, transform) {
		element.setAttribute( "transform", transform); return element;
	},

	addG: function( parent, clazz) {
		var g = parent.appendChild( document.createElementNS( NS_SVG, "g"));
		if( clazz) g.setAttribute( "class", clazz);
		return g;
	},

	addRect: function( parent, clazz, size, round) {
		var rect = parent.appendChild( document.createElementNS( NS_SVG, "rect"));
		if( clazz) rect.setAttribute( "class", clazz);
		if( size) rect.setAttribute( "width", size[ 0]), rect.setAttribute( "height", size[ 1]);
		if( round) rect.setAttribute( "rx", round[ 0]), rect.setAttribute( "ry", round[ 1]);
		return rect;
	},

	addCircle: function( parent, clazz, radius) {
		var c = parent.appendChild( document.createElementNS( NS_SVG, "circle"));
		if( clazz) c.setAttribute( "class", clazz);
		if( radius) c.setAttribute( "r", radius);
		return c;
	},

	addPath: function( parent, clazz, d, dashArray) {
		var path = parent.appendChild( document.createElementNS( NS_SVG, "path"));
		if( clazz) path.setAttribute( "class", clazz);
		if( d) path.setAttribute( "d", d);
		if( dashArray) path.setAttribute( "stroke-dasharray", dashArray);
		return path;
	},

	addText: function( parent, clazz, content, horizontal, vertical, location) {
		var text = parent.appendChild( document.createElementNS( NS_SVG, "text"));
		if( clazz) text.setAttribute( "class", clazz);
		if( horizontal)
			text.setAttribute( "text-anchor", horizontal);
		if( vertical)
			text.setAttribute( "dominant-baseline", vertical);
		if( location)
			text.setAttribute( "transform", "translate(" + location[ 1] + ", " + location[ 2] + ") rotate(" + location[ 0] + ")");
		text.appendChild( document.createTextNode( content));
		return text;
	},

	addFixedText: function( parent, clazz, content, tooltip, align, geometry, location) {
		var fo = parent.appendChild( document.createElementNS( NS_SVG, "foreignObject"));
		fo.setAttribute( "x", geometry[ 0]);
		fo.setAttribute( "y", geometry[ 1]);
		fo.setAttribute( "width", geometry[ 2]);
		fo.setAttribute( "height", geometry[ 3]);
		if( location)
			fo.setAttribute( "transform", "translate(" + location[ 1] + ", " + location[ 2] + ") rotate(" + location[ 0] + ")");
		var span = fo.appendChild( document.createElementNS( NS_HTML, "span"));
		span.appendChild( document.createTextNode( content));
		span.title = tooltip;
		if( clazz) span.className = clazz;
		if( align) span.style.textAlign = align;
		span.style.lineHeight = geometry[ 3] + "px";
		return fo;
	},
};
