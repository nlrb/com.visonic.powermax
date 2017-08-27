"use strict";

// Visonic PowerMax Panel Driver

const pm = require('powermax-api');


var self = module.exports = {

	init: function(devices_data, callback) {
		devices_data.forEach(function(device_data) {
			// Get device settings
			self.getSettings(device_data, function(err, settings) {
				// Get the Homey name of the device
				self.getName(device_data, function(err, name) {
					pm.addPanel(self, device_data, name, settings);
				});
			});
		});

		// we're ready
		callback();
	},

	capabilities: {
		homealarm_state: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelState(device_data.id, 'arm');
						callback(null, val);
					}
			},
			set: function(device_data, new_state, callback) {
					pm.setPanelState(device_data.id, new_state, function(err, success) {
						if (success) {
							// Show the actual state (Homey issue #187)
							setTimeout(function() {
								var state = pm.getPanelState(device_data.id, 'arm');
								pm.debug('REALTIME', state);
								self.realtime(device_data, 'homealarm_state', state);
							}, 5000);
							callback(null);
						} else {
							pm.debug('setPanelState', err);
							callback(err, null);
						}
					});
			}
		},
		arm_state: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelArmState(device_data.id);
						callback(null, val);
					}
			}
		},
		ready: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = !pm.getPanelValue(device_data.id, 'ready');
						callback(null, val);
					}
			}
		},
		trouble: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device_data.id, 'trouble');
						callback(null, val);
					}
			}
		},
		alarm: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device_data.id, 'alarm');
						callback(null, val);
					}
			}
		},
		memory: {
			get: function(device_data, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device_data.id, 'memory');
						callback(null, val);
					}
			}
		}
	},

	added: function(device_data, callback) {
		// Update panel name when a device is added
		self.getName(device_data, function(err, name) {
			pm.updatePanelName(device_data.id, name);
		});

		callback();
	},

	renamed: function(device_data, new_name) {
		pm.updatePanelName(device_data.id, new_name);
	},

	deleted: function(device_data) {
		// run when the user has deleted the panel from Homey
		pm.deletePanel(device_data.id);
	},

	settings: function(device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
		// run when the user has changed the device's settings in Homey.
		// changedKeysArr contains an array of keys that have been changed, for your convenience :)
		var result = pm.updatePanelSettings(device_data.id, changedKeysArr, newSettingsObj);
		// Make sure Homey doesn't change the settings - we do that!
		self.setSettings(device_data, result.updates);
		callback(result.msg, null);
	},

	pair: function(socket) {
		pm.debug('PowerMax panel pairing has started...');
		var completed = false;
		var panel_ip;

		// Search for the PowerMax once we received IP address and port
		socket.on('search', function(data, callback) {
			panel_ip = data.ip + ':' + data.port;
			pm.debug('Request to search for PowerMax on', panel_ip);
			// Add default settings
			var settings = {
				ip: data.ip,
				port: Number(data.port),
				forceModel: data.model,
				allowArm: 'arm',
				allowBypass: false,
				armUser: 1,
				motionTime: 15,
				syncTime: true
			}
			var err = pm.addPanel(self, null, null, settings);
			callback(err, err == null);
		});

		// Fully add panel when successful
		socket.on('completed', function(device, callback) {
			var device_data = device.data;
			completed = true;
			pm.stopPanelSearch(true)
			// Let the front-end know we are done
			callback();
		});

		// Check if the pairing was finished, otherwise remove the panel
		socket.on('disconnect', function() {
			if (!completed) {
				pm.debug('Pairing not completed, closing connection on', panel_ip);
				pm.stopPanelSearch(false);
			}
		});

		// Notify the front-end if a PowerMax has been found
		Homey.on('found', function(data) {
			socket.emit('found', data);
		});

		// Notify the front-end on enrollment/download progress
		Homey.on('download', function(data) {
			socket.emit('download', data);
		});
	}
}
