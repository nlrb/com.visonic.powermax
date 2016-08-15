"use strict";

// Visonic PowerMax Panel Driver

var pm = require('powermax-api');

function registerEvents(driver, device) {
	var panel = pm.getPanel(device.id);
	if (panel != null) {
		pm.debug('Adding events for panel ' + device.id);
		// Catch system events
		panel.events.on('system', function(field, newVal) {
			pm.debug(newVal);
			if (field == 'status') {
				Homey.manager('flow').triggerDevice('status', { status: newVal.txt }, { panel: device.id, status: newVal.nr }, device);
			} else if (field == 'alarm') {
				// For all zones in alarm
				for (var i in panel.zone) {
					if (panel.zone[i].alarm) {
						var name = pm.getZoneName(device.id, i);
						Homey.manager('flow').triggerDevice('zonealarm', { zone: i, name: name }, { state: newVal }, device);
					}
				}
				driver.realtime(device, field, newVal);
			} else if (field == 'alarmType') { // e.g. Intruder, Tamper, Panic, Fire, Emergency, Gas, Flood
				var text = newVal.txt || '';
				Homey.manager('flow').triggerDevice('panelalarm', { type: newVal.alarmType, name: text }, { state: text != '' }, device);
			} else if (field == 'troubleType') { // e.g. Communication, General, Battery, Power, Jamming, Telephone
				var text = newVal.txt || '';
				pm.debug('Triggering device trouble ' + text);
				Homey.manager('flow').triggerDevice('paneltrouble', { type: newVal.troubleType, name: text }, { state: text != '' }, device);
			} else { // nready, memory, trouble
				driver.realtime(device, field, newVal);
			}
		});
		// Catch battery events
		panel.events.on('battery', function(newVal) {
			var name = pm.getZoneName(device.id, newVal.zone);
			Homey.manager('flow').triggerDevice('battery', { zone: newVal.zone, name: name }, { state: newVal.low }, device);
		});
	}
}


var self = module.exports = {
	
	init: function(devices, callback) {
		devices.forEach(function(device) {
			self.getSettings(device, function(err, settings){
				pm.addPanel(self, device, settings);
				// Register handlers
				registerEvents(self, device);
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
						if (success) {
							callback(null, success);
							//self.realtime(device, 'homealarm_state', new_state);
						} else {
							callback(err, null);
						}
					});
			}
		},
		nready: {
			get: function(device, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device.id, 'nready');
						callback(null, val);
					}
			}
		},
		trouble: {
			get: function(device, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device.id, 'trouble');
						callback(null, val);
					}
			}
		},
		alarm: {
			get: function(device, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device.id, 'alarm');
						callback(null, val);
					}
			}
		},
		memory: {
			get: function(device, callback) {
					if (typeof callback == 'function') {
						var val = pm.getPanelValue(device.id, 'memory');
						callback(null, val);
					}
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
		socket.on('completed', function(device_data, callback) {
			var device = device_data.data;
			completed = true;
			pm.addPanelActions(self, device);
			// Register handlers
			registerEvents(self, device);
			// Let the front-end know we are done
			pm.debug(completed);
			callback();
		});
		
		// Check if the pairing was finished, otherwise remove the panel
		socket.on('disconnect', function() {
			if (!completed) {
				pm.debug('Pairing not completed, deleting panel ' + panel_id);
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
