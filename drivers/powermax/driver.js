"use strict";

// Visonic PowerMax Panel Driver

var pm = require('powermax-api');
	
var self = module.exports = {
	
	init: function(devices, callback) {
		devices.forEach(function(device) {
			self.getSettings(device, function(err, settings){
				pm.addPanel(self, device, settings);
				//pm.addPanelActions(self, device);
			})
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
		// run when the user has deleted the panel from Homey
		pm.deletePanel(device_data.id);
	},
	
	settings: function(device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
		// run when the user has changed the device's settings in Homey.
		// changedKeysArr contains an array of keys that have been changed, for your convenience :)
		pm.updateSettings(device_data.id, changedKeysArr, newSettingsObj);
		// always fire the callback, or the settings won't change!
		// if the settings must not be saved for whatever reason:
		// callback( "Your error message", null );
		// else
		callback(null, true);
	},
	
	pair: function(socket) {
		Homey.log('PowerMax panel pairing has started...');
		var completed = false;
		var panel_id;

		// Search for the PowerMax once we received IP address and port
		socket.on('search', function(data, callback) {
			panel_id = data.ip + ':' + data.port;
			pm.debug('Request to search for PowerMax on ' + panel_id);
			// Add default settings
			var settings = {
				ip: data.ip,
				port: Number(data.port),
				allowArm: 'all',
				motionTime: 8,
				syncTime: true
			}
			pm.addPanel(self, null, settings);
			callback(null, true);
		});
		
		// Fully add panel when successful
		socket.on('completed', function(device_data) {
			var device = device_data.data;
			completed = true;
			pm.addPanelActions(self, device);
		});
		
		// Check if the pairing was finished, otherwise remove the panel
		socket.on('disconnect', function() {
			if (!completed) {
				pm.deletePanel(panel_id);
			}
		});

		// Notify the front-end if a PowerMax has been found
		Homey.on('found', function(data) {
			socket.emit('found', data);
		});

		// Notify the front-end on enrollment/download progress
		Homey.on('download', function(data) {
			panel_id = data.id;
			socket.emit('download', data);
		});
	}
}
