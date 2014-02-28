
var Prototype = {
	move: function( x, y) { this.x = x; this.y = y; SVG.setTransform( this.g, "translate( " + x + ", " + y + ")"); if( this.moved) this.moved(); return this;},
	deviceMoved: function() { for( var i = 0; i < this.ports.length; ++i) if( this.ports[ i].connection) this.ports[ i].connection.redraw();},
};

var Host = function( parent, host) { this.deviceType = "ho";
	this.g = SVG.addG( parent, "ho");
	var bgLayer = SVG.addG( this.g);
	var canvas = SVG.setTransform( SVG.addG( this.g), "translate( 0, 24)");

	this.portDict = {};
	this.machines = []; for( var i = 0; i < host.vms.length; ++i) this.machines[ this.machines.length] = new Machine( host.vms[ i], canvas, this.portDict);
	this.bridges = []; for( var i = 0; i < host.bridges.length; ++i) this.bridges[ this.bridges.length] = new Bridge( host.bridges[ i], canvas, this.portDict);
	this.switches = []; for( var i = 0; i < host.switches.length; ++i) this.switches[ this.switches.length] = new Switch( host.switches[ i], canvas, this.portDict);
	this.ports = []; for( var i = 0; i < host.interfaces.length; ++i) this.portDict[ host.interfaces[ i].id] = this.ports[ this.ports.length] = new Port( host.interfaces[ i], canvas, this).position( "T");
	this.links = []; for( var i = 0; i < host.links.length; ++i) this.links[ this.links.length] = new Connection( this.portDict[ host.links[ i][ 0]], this.portDict[ host.links[ i][ 1]], this, canvas);

	// biggest switch left most
	var biggestSwitchSize = -1;
	var biggestSwitchIndex = -1;
	for( var i = 0; i < this.switches.length; ++i)
		if( this.switches[ i].ports.length > biggestSwitchSize)
			biggestSwitchSize = this.switches[ i].ports.length,
			biggestSwitchIndex = i;
	if( biggestSwitchIndex > 0) {
		var tmp = this.switches[ biggestSwitchIndex];
		this.switches[ biggestSwitchIndex] = this.switches[ 0];
		this.switches[ 0] = tmp;
	}

	// flip bridges, bottom towards switches
	for( var i = 0; i < this.bridges.length; ++i) { var bridge = this.bridges[ i];
		for( var j = 0; j < bridge.ports.length; ++j) { var port = bridge.ports[ j];
			if( !port.connection) continue;
			var peerPort = port.connection.peer( port);
			if( peerPort.device && peerPort.device.deviceType == "sw") {
				bridge.portPosition( port, "B");
				break;
			}
		}
	}

	// rank bridges
	var rank1BridgesOrdered = [];
	for( var i = 0; i < this.machines.length; ++i) { var machine = this.machines[ i];
		for( var j = 0; j < machine.ports.length; ++j) { var port = machine.ports[ j];
			var peerPort = port.connection? port.connection.peer( port): null;
			if( peerPort && peerPort.device && peerPort.device.deviceType == "br") {
				peerPort.device.rank = 1;
				rank1BridgesOrdered[ rank1BridgesOrdered.length] = peerPort.device;
				peerPort.device.portPosition( peerPort, "T");
			}
		}
	}
	var otherBridges = []; for( var i = 0; i < this.bridges.length; ++i) if( this.bridges[ i].rank != 1) otherBridges[ otherBridges.length] = this.bridges[ i];
	this.bridges = rank1BridgesOrdered.concat( otherBridges);

	// rank1 -> switch-upper
	for( var i = 0; i < rank1BridgesOrdered.length; ++i) { var bridge = rank1BridgesOrdered[ i];
		var downPort = bridge.port( "B");
		if( !downPort || !downPort.connection) continue;
		var peerPort = downPort.connection.peer( downPort);
		if( peerPort && peerPort.device && peerPort.device.deviceType == "sw") peerPort.device.portPosition( peerPort, "T");
	}

	// host port -> switch-bottom
	var rankN1Devices = [];
	for( var i = 0; i < this.ports.length; ++i) { var port = this.ports[ i];
		if( !port.connection) continue;
		var peerPort = port.connection.peer( port);
		var peerDevice = peerPort? peerPort.device: null;
		if( !peerDevice) continue;
		if( peerPort.device.deviceType == "sw" || peerPort.device.deviceType == "br") {
			peerDevice.portPosition( peerPort, "B");
			if( peerDevice.rank == null) {
				rankN1Devices[ rankN1Devices.length] = peerDevice;
				peerDevice.rank = -1;
			}
		}
	}

	// freeze switches. this is wrong, but i don't have time for a right algorithm...
	for( var i = 0; i < this.links.length; ++i) { var connection = this.links[ i];
		if( connection.port1.pos) {
			if( !connection.port2.pos)
				connection.port2.device.portPosition( connection.port2, connection.port1.pos == "T"? "B": "T");
		} else if( connection.port2.pos)
			connection.port1.device.portPosition( connection.port1, connection.port2.pos == "T"? "B": "T");
		else
			connection.port1.device.portPosition( connection.port1, "T"),
			connection.port2.device.portPosition( connection.port2, "B");
	}
	for( var i = 0; i < this.switches.length; ++i) this.switches[ i].freeze();

	var maxX = Host.PADDING_H;
	var y = Host.PADDING_V;

	// vm
	var x = Host.PADDING_H;
	var height = 0;
	for( var i = 0; i < this.machines.length; ++i) {
		if( i != 0) x += Host.SPACING_H;
		var device = this.machines[ i].move( x, y);
		x += device.width;
		if( device.height > height) height = device.height;
	}
	if( x > maxX) maxX = x;
	if( height > 0) y += height + Host.SPACING_V;

	// bridges, rank 1
	x = Host.PADDING_H;
	height = 0;
	for( var i = 0; i < rank1BridgesOrdered.length; ++i) {
		if( i != 0) x += Host.SPACING_H;
		var device = rank1BridgesOrdered[ i].move( x, y);
		x += device.width;
		if( device.height > height) height = device.height;
	}
	if( x > maxX) maxX = x;
	if( height > 0) y += height + Host.SPACING_V;

	// bridges, no rank 1 no rank -1
	x = Host.PADDING_H;
	height = 0;
	for( var i = 0; i < otherBridges.length; ++i) { if( otherBridges[ i].rank == -1) continue;
		if( i != 0) x += Host.SPACING_H;
		var device = otherBridges[ i].move( x, y);
		x += device.width;
		if( device.height > height) height = device.height;
	}
	if( x > maxX) maxX = x;
	if( height > 0) y += height + Host.SPACING_V;

	// switches, no rank -1
	x = Host.PADDING_H;
	height = 0;
	for( var i = 0; i < this.switches.length; ++i) { if( this.switches[ i].rank == -1) continue;
		if( i != 0) x += Host.SPACING_H;
		var device = this.switches[ i].move( x, y);
		x += device.width;
		if( device.height > height) height = device.height;
	}
	if( x > maxX) maxX = x;
	if( height > 0) y += height + Host.SPACING_V;

	// rank -1
	x = Host.PADDING_H;
	height = 0;
	for( var i = 0; i < rankN1Devices.length; ++i) {
		if( i != 0) x += Host.SPACING_H;
		var device = rankN1Devices[ i].move( x, y);
		x += device.width;
		if( device.height > height) height = device.height;
	}
	if( x > maxX) maxX = x;
	if( height > 0) y += height + Host.SPACING_V;

	this.width = maxX + Host.PADDING_H;
	this.height = y - Host.SPACING_V + Host.FINAL_SPACING_V + Host.PADDING_V;

	for( var i = 0; i < this.ports.length; ++i) {
		this.ports[ i].move( Host.PADDING_H + 22 + i * 74, this.height - 20);
		if( this.ports[ i].connection) this.ports[ i].connection.redraw();
	}

	SVG.addRect( bgLayer, "box nofill", [ this.width, this.height + 24], [ 8, 8]).setAttribute( "style", "fill: #eeede0;");
	SVG.addPath( bgLayer, "nostroke", "M 8 0 L " + ( this.width - 8) + " 0 a 8 8 0 0 1 8 8 L " + this.width + " 24 L 0 24 L 0 8 a 8 8 0 0 1 8 -8 Z");
	SVG.addText( bgLayer, "caption nostroke", host.name, "start", "middle", [ 0, 12, 12]).setAttribute( "style", "fill: white;");
};
Host.MIN_WIDTH = 100;
Host.PADDING_V = 24;
Host.PADDING_H = 32;
Host.SPACING_H = 18;
Host.SPACING_V = 140;
Host.FINAL_SPACING_V = 60;
Host.prototype.move = Prototype.move;

var Bridge = function( bridge, parent, ports) { this.deviceType = "br";
	this.g = SVG.addG( parent, "br");
	SVG.addRect( this.g, "box nofill", [ Bridge.WIDTH, Bridge.HEIGHT], [ 8, 8]);
	SVG.use( this.g, "br-icon", [ 2, 2]);
	SVG.addText( this.g, "caption nostroke", bridge.name, "start", "baseline", [ 90, 8, 20]);

	if( bridge.interfaces.length >= 2) SVG.addPath( this.g, "nofill", "M " + Bridge.CENTER + " 0 l 0 " + Bridge.HEIGHT).setAttribute( "style", "stroke-width: 2;");
	this.ports = [];
	for( var i = 0; i < bridge.interfaces.length; ++i)
		ports[ bridge.interfaces[ i].id] = this.ports[ this.ports.length] = new Port( bridge.interfaces[ i], this.g, this);
	if( this.ports.length >= 2) this.portPosition( this.ports[ 0], "T"); // random choice

	this.width = Bridge.WIDTH;
	this.height = Bridge.HEIGHT;
};
Bridge.CENTER = 32;
Bridge.WIDTH = 54;
Bridge.HEIGHT = 100;
Bridge.prototype.move = Prototype.move;
Bridge.prototype.moved = Prototype.deviceMoved;
Bridge.prototype.portPosition = function( port, pos) {
	port.position( pos).move( Bridge.CENTER, pos == "T"? 0: Bridge.HEIGHT);
	if( this.ports.length > 1)
		this.ports[ port == this.ports[ 0]? 1: 0].position( pos == "T"? "B": "T").move( Bridge.CENTER, pos == "T"? Bridge.HEIGHT: 0);
};
Bridge.prototype.port = function( pos) { return this.ports[ 0].pos == pos? this.ports[ 0]: this.ports[ 1].pos == pos? this.ports[ 1]: null;};

var Machine = function( vm, parent, ports) { this.deviceType = "vm"; this.rank = 0;
	this.g = SVG.addG( parent, "vm");
	var bgLayer = SVG.addG( this.g);
	SVG.use( this.g, "vm-icon", [ 2, 2]);
	SVG.addText( this.g, "caption nostroke", vm.name, "start", "hanging", [ 0, 20, 6]);

	this.ports = []; for( var i = 0; i < vm.interfaces.length; ++i) ports[ vm.interfaces[ i].id] = this.ports[ this.ports.length] = new Port( vm.interfaces[ i], this.g, this).position( "B");

	this.width = Machine.PADDING_H * 2 + Machine.PORT_STEP * this.ports.length; if( this.width < Machine.MIN_WIDTH) this.width = Machine.MIN_WIDTH;
	this.height = Machine.HEIGHT;

	SVG.addRect( bgLayer, "box nofill", [ this.width, Machine.HEIGHT], [ 8, 8]);
	this.drawPorts();
};
Machine.HEIGHT = 72;
Machine.MIN_WIDTH = 96;
Machine.PADDING_H = 16;
Machine.PORT_STEP = 32;
Machine.prototype.move = Prototype.move;
Machine.prototype.moved = Prototype.deviceMoved;
Machine.prototype.drawPorts = function() { for( var i = 0; i < this.ports.length; ++i) this.ports[ i].move( Machine.PADDING_H + i * Machine.PORT_STEP + Machine.PORT_STEP / 2, Machine.HEIGHT);};

var Switch = function( sw, parent, ports) { this.deviceType = "sw";
	this.g = SVG.addG( parent, "sw");
	this.bgLayer = SVG.addG( this.g);
	SVG.use( this.g, "sw-icon", [ 2, 2]);
	SVG.addText( this.g, "caption nostroke", sw.name, "start", "baseline", [ 90, 8, 20]);

	this.tags = [];
	this.upPorts = [];
	this.downPorts = [];
	this.ports = [];
	for( var i = 0; i < sw.interfaces.length; ++i) { var portData = sw.interfaces[ i];
		var port = ports[ portData.id] = this.ports[ this.ports.length] = new Port( portData, this.g, this);
		port.vlans = portData.vlans? portData.vlans: [];
		if( !portData.vlans || portData.vlans.length <= 0)
			this.downPorts[ this.downPorts.length] = port;
		else {
			this.upPorts[ this.upPorts.length] = port;
			for( var j = 0; j < portData.vlans.length; ++j) { var vlan = "vlan " + portData.vlans[ j];
				if( this.tags.indexOf( vlan) == -1) this.tags[ this.tags.length] = vlan;
			}
		}
	}

	if( this.tags.length > 0) {
		for( var i = 0; i < this.upPorts.length; ++i) this.upPorts[ i].position( "T");
		for( var i = 0; i < this.downPorts.length; ++i) this.downPorts[ i].position( "B");

		var slots = this.upPorts.length > this.downPorts.length? this.upPorts.length: this.downPorts.length;
		var portWidth = Switch.PADDING_H * 2 + Switch.PORT_STEP * slots;
		var upperHeight = 10 + ( this.upPorts.length > 0? Port.HEIGHT: 0) + this.tags.length * Switch.VLAN_HEIGHT;
		this.width = portWidth + ( this.tags.length > 0? Switch.VLAN_WIDTH: 0);
		this.height = upperHeight + 10 + ( this.downPorts.length > 0? Port.HEIGHT: 0);
		if( this.height < Switch.MIN_HEIGHT) this.height = Switch.MIN_HEIGHT;

		SVG.addRect( this.bgLayer, "box nofill", [ this.width, this.height], [ 8, 8]);
		SVG.addPath( this.bgLayer, "nofill", "M 22 " + upperHeight + " L " + ( portWidth - 22) + " " + upperHeight).setAttribute( "style", "stroke-width: 2px;");

		for( var i = 0; i < this.upPorts.length; ++i) SVG.addPath( this.bgLayer, "nofill", "M " + ( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2) + " 0 l 0 " + upperHeight, "2,4").setAttribute( "style", "stroke-width: 2px;");
		for( var i = 0; i < this.downPorts.length; ++i) SVG.addPath( this.bgLayer, "nofill", "M " + ( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2) + " " + upperHeight + " l 0 " + ( this.height - upperHeight), "2,4").setAttribute( "style", "stroke-width: 2px;");

		for( var i = 0; i < this.tags.length; ++i) { var vlan = this.tags[ i];
			SVG.addText( this.bgLayer, "caption", vlan, "start", "middle", [ 0, portWidth - 18, Port.HEIGHT + Switch.VLAN_HEIGHT / 2 + Switch.VLAN_HEIGHT * i]);
			SVG.addPath( this.bgLayer, "nofill", "M 22 " + ( Port.HEIGHT + Switch.VLAN_HEIGHT / 2 + Switch.VLAN_HEIGHT * i) + " l " + ( portWidth - 44) + " 0").setAttribute( "style", "stroke-width: 2px;");
		}

		this.fretboard = SVG.addG( this.bgLayer);
		this.drawPorts();
		this.frozen = true;
	}
};
Switch.PADDING_H = 16;
Switch.MIN_HEIGHT = 72;
Switch.PORT_STEP = 32;
Switch.VLAN_HEIGHT = 18;
Switch.VLAN_WIDTH = 36;
Switch.prototype.move = Prototype.move;
Switch.prototype.moved = Prototype.deviceMoved;
Switch.prototype.drawPorts = function() {
	for( var i = 0; i < this.upPorts.length; ++i) this.upPorts[ i].move( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2, 0);
	for( var i = 0; i < this.downPorts.length; ++i) this.downPorts[ i].move( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2, this.height);

	if( this.tags.length > 0) {
		this.fretboard.parentNode.removeChild( this.fretboard);
		this.fretboard = SVG.addG( this.bgLayer);
		for( var i = 0; i < this.tags.length; ++i) { var vlan = this.tags[ i];
			for( var j = 0; j < this.upPorts.length; ++j) { var port = this.upPorts[ j];
				if( port.vlans.indexOf( parseInt( vlan.substring( "vlan ".length))) != -1)
					SVG.setTransform( SVG.addPath( this.fretboard, "nostroke", "M 0 -4 L 6 0 L 0 4 L -6 0 Z"), 
							"translate( " + ( Switch.PADDING_H + j * Switch.PORT_STEP + Switch.PORT_STEP / 2) + ", " + ( Port.HEIGHT + Switch.VLAN_HEIGHT / 2 + Switch.VLAN_HEIGHT * i) + ")");
			}
		}
	}
};
Switch.prototype.portPosition = function( port, pos) { if( port.pos) return; port.position( pos);};
Switch.prototype.freeze = function() { if( this.frozen) return; this.frozen = true;
	var newDownPorts = [];
	for( var i = 0; i < this.downPorts.length; ++i) {
		if( !this.downPorts[ i].pos) this.downPorts[ i].device.portPosition( this.downPorts[ i], this.upPorts.length < newDownPorts.length? "T": "B");
		if( this.downPorts[ i].pos == "T")
			this.upPorts[ this.upPorts.length] = this.downPorts[ i];
		else
			newDownPorts[ newDownPorts.length] = this.downPorts[ i];
	}
	this.downPorts = newDownPorts;

	var slots = this.upPorts.length > this.downPorts.length? this.upPorts.length: this.downPorts.length;
	var portWidth = Switch.PADDING_H * 2 + Switch.PORT_STEP * slots;
	var upperHeight = 10 + ( this.upPorts.length > 0? Port.HEIGHT: 0);
	this.width = portWidth;
	this.height = upperHeight + 10 + ( this.downPorts.length > 0? Port.HEIGHT: 0);
	if( this.height < Switch.MIN_HEIGHT) this.height = Switch.MIN_HEIGHT;

	SVG.addRect( this.bgLayer, "box nofill", [ this.width, this.height], [ 8, 8]);
	SVG.addPath( this.bgLayer, "nofill", "M 22 " + upperHeight + " L " + ( portWidth - 22) + " " + upperHeight).setAttribute( "style", "stroke-width: 2px;");

	for( var i = 0; i < this.upPorts.length; ++i) SVG.addPath( this.bgLayer, "nofill", "M " + ( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2) + " 0 l 0 " + upperHeight).setAttribute( "style", "stroke-width: 2px;");
	for( var i = 0; i < this.downPorts.length; ++i) SVG.addPath( this.bgLayer, "nofill", "M " + ( Switch.PADDING_H + i * Switch.PORT_STEP + Switch.PORT_STEP / 2) + " " + upperHeight + " l 0 " + ( this.height - upperHeight)).setAttribute( "style", "stroke-width: 2px;");

	this.drawPorts();
	this.frozen = true;
};

var Port = function( port, parent, device) { this.name = port.name; this.tip = port.ip? port.name + "\n" + port.ip: port.name; this.device = device;
	this.g = SVG.addG( parent);
};
Port.WIDTH = 20;
Port.HEIGHT = 45;
Port.prototype.move = Prototype.move;
Port.prototype.position = function( pos) { if( pos == this.pos) return this; this.pos = pos;
	while( this.g.lastChild) this.g.removeChild( this.g.lastChild);
	if( this.pos)
		if( this.device.deviceType == "ho")
			SVG.use( this.g, "po-host"),
			SVG.addText( this.g, "label", this.name, "middle", "middle", [ 0, 0, 10]).setAttribute( "style", "fill: white;");
		else
			SVG.use( this.g, this.pos == "B"? "po-lower": "po-upper"),
			SVG.addFixedText( this.g, "vert-text", this.name, this.tip, "center", [ 3, 0, Port.HEIGHT - 6, Port.WIDTH], [ 90, Port.WIDTH / 2, this.pos == "B"? -Port.HEIGHT: 0]);
	return this;
};
Port.prototype.connected = function( connection) { this.connection = connection;};
Port.prototype.connectionPoint = function() {
	if( this.device.deviceType == "ho")
		return this.x == null || this.y == null? null: [ this.x, this.y];
	return this.x == null || this.y == null || this.device.x == null || this.device.y == null? null: [ this.device.x + this.x, this.device.y + this.y];
};

var Connection = function( port1, port2, host, parent) { this.port1 = port1; this.port2 = port2; this.host = host;
	this.port1.connected( this);
	this.port2.connected( this);
	this.g = SVG.addG( parent);
	this.pathBack = SVG.addPath( this.g, "co-back", null, this.port1.device.deviceType == "ho" || this.port2.device.deviceType == "ho"? "5,5": null);
	this.pathFore = SVG.addPath( this.g, "co-fore", null, this.port1.device.deviceType == "ho" || this.port2.device.deviceType == "ho"? "5,5": null);
};
Connection.CONTROL_DISTANCE = 60;
Connection.prototype.redraw = function() {
	var point1 = this.port1.connectionPoint();
	var point2 = this.port2.connectionPoint();
	if( !point1 || !point2 || !this.port1.pos || !this.port2.pos) return;
	var p1x = point1[ 0];
	var p1y = point1[ 1];
	var c1x = p1x;
	var c1y = p1y + ( this.port1.pos == "B"? Connection.CONTROL_DISTANCE: -Connection.CONTROL_DISTANCE);
	var p2x = point2[ 0];
	var p2y = point2[ 1];
	var c2x = p2x;
	var c2y = p2y + ( this.port2.pos == "B"? Connection.CONTROL_DISTANCE: -Connection.CONTROL_DISTANCE);
	this.pathBack.setAttribute( "d", "M -5 -5 l 0 0 M " + p1x + " " + p1y + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2x + " " + p2y + " M " + this.host.width + " " + this.host.height);
	this.pathFore.setAttribute( "d", "M -5 -5 l 0 0 M " + p1x + " " + p1y + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2x + " " + p2y + " M " + this.host.width + " " + this.host.height);
};
Connection.prototype.peer = function( port) { return port == null? null: port == this.port1? this.port2: this.port1;};
