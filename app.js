"use strict";

var powermax = require('powermax-api');

var triggers = [ 'zonealarm', 'panelalarm', 'paneltrouble', 'battery' ];

// Start of the app
function init() {
	Homey.log("Starting PowerMax app!");

	// Catch triggers
	for (var i = 0; i < triggers.length; i++) {
		Homey.manager('flow').on('trigger.' + triggers[i], function(callback, args, state) {
		var result = (state.state == false) != (args.values == 'on');
		powermax.debug('>> Checked action ' + triggers[i] + ' for ' + state.state + ' = ' + args.values + ', result = ' + result);
		callback(null, result);
		});
	}
	
	// Check conditions
	Homey.manager('flow').on('condition.sysflags', function(callback, args) {
		var id = args.device.id;
		var check = powermax.getPanelValue(id, args.flag);
		callback(null, check);
	});
	
	// Register actions
	Homey.manager('flow').on('action.setClock', function(callback, args) {
		powermax.debug('Action setClock ' + args.device.id);
		var ok = powermax.setClock(args.device.id);
		callback(null, ok);
	});
	
}


var api = {
}

module.exports = { 
	init: init,
	api: api
}