"use strict";

// Visonic PowerMax Panel Driver

var pm = require('powermax-api');
	
var self = module.exports = {
	
	init: function(devices, callback) {
		devices.forEach(function(device) {
			// TODO Get device settings
			var ip_port = device.id.split(":");
			pm.addPanel(ip_port[0], ip_port[1]);
			pm.addPanelActions(self, device);
		});
		
		// we're ready
		callback();
	},
	
	capabilities: {
		homealarm_state: {
			get: function(device, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelState(device.id);
						callback(null, val);
					}
			},
			set: function(device, new_state, callback) {
					pm.setPanelState(device.id, new_state, function(err, success) {
						Homey.log(err + ' : ' + success);
						if (!err) {
							self.realtime(device, 'homealarm_state', new_state);
						}
						callback(err, success);
					});
			}
		}
	},
	
	deleted: function(device_data) {
		// run when the user has deleted the device from Homey
		pm.deletePanel(device_data.id);
	},
	
	pair: function(socket) {
		Homey.log('PowerMax panel pairing has started...');

		// Search for the PowerMax once we received IP address and port
		socket.on('search', function(data, callback) {
			var id = data.ip + ':' + data.port;
			pm.debug('Request to search for PowerMax on ' + id);
			pm.addPanel(data.ip, data.port);
			callback(null, true);
		});
		
		// Fully add panel when successful
		socket.on('add_device', function(device_data, callback) {
			var device = device_data['data'];
			pm.addPanelActions(self, device_data);
			callback();
		});
		
		// Notify the front-end if a PowerMax has been found
		Homey.on('found', function(data) {
			socket.emit('found', data);
			if (data.found) {
				// Update driver administration when a device is added
				pm.debug('*** device added ***');
				pm.debug(data.device);
				pm.addDevice(self, data.device, 'panel');
			}
		});
	}
}
