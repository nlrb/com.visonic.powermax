"use strict";

// Visonic PowerMax X10 Driver

const pm = require('powermax-api');

var self = module.exports = {

	init: function(devices_data, callback) {
		devices_data.forEach(function(device_data) {
			// Get the Homey name of the device
			self.getName(device_data, function(err, name) {
				pm.addX10Device(self, device_data, name);
			});
		});
		
		// we're ready
		callback();
	},
	
	capabilities: {
		onoff: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						pm.getX10State(device_data.panel, device_data.nr, function(err, val) {
							callback(err, val);
						});
					}
			},
			set:  function(device_data, state, callback) {
				// Get state first, then invert
				pm.getX10State(device_data.panel, device_data.nr, function(err, val) {
					if (!err) {
						pm.sendX10Command(device_data.panel, device_data.nr, (val ? 'off' : 'on'));
					}
					callback(err, val);
				});
			}
		},
		// We cannot use dim_level, as X10 does not provide it
		dim_oneway: {
			set:  function(device_data, state, callback) {
				Homey.log('dim_oneway:set', state);
				pm.sendX10Command(device_data.panel, device_data.nr, state);
				callback();
			}
		}
	},

	added: function(device_data, callback) {
		// Update driver administration when a device is added
		self.getName(device_data, function(err, name) {
			pm.addX10Device(self, device_data, name);
		});

		callback();
	},
	
	renamed: function(device_data, new_name) {
		pm.updateDeviceName(device_data, new_name);
	},
	
	deleted: function(device_data) {
		// run when the user has deleted the device from Homey
		pm.deleteDevice(device_data);
	},
	
	pair: function(socket) {
		pm.debug('X10 pairing has started...');
		var selectedPanel;

		// Let the front-end know which panels there are
		var panels = pm.getPanels();
		// Make sure the page has fully loaded
		socket.on('loaded', function() {
			socket.emit('start', panels);
		});

		socket.on('selected', function(id, callback) {
			selectedPanel = id;
			callback(null, id);
		});
	
		// this method is run when Homey.emit('list_devices') is run on the front-end
		// which happens when you use the template `list_devices`
		socket.on('list_devices', function(data, callback) {
			var devices = pm.getX10Devices(selectedPanel);
			// err, result style
			callback(null, devices);
		});
	}
}
