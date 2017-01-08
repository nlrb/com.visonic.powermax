"use strict";

// Visonic PowerMax Sensor Driver

var pm = require('powermax-api');

function createSensorDriver(driver) {
	var self = {

		init: function(devices_data, callback) {
			devices_data.forEach(function(device_data) {
				// Get the Homey name of the device
				self.getName(device_data, function(err, name) {
					pm.addSensorDevice(self, device_data, name);
				});
			});
			
			// we're ready
			callback();
		},
		
		capabilities: {
			'onoff': {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('onoff', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				},
				set: function(device_data, newVal, callback) {
						if (typeof callback == 'function') {
							pm.setZoneBypass(device_data.panel, device_data.zone, !newVal); // invert for bypass
							callback(__('no_bypass'), null);
						}
				}
			},
			alarm_contact: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_contact', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_motion: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_motion', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_smoke: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_smoke', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_co: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_co', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_battery: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_battery', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_tamper: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_tamper', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_generic: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							pm.getZoneValue('alarm_generic', device_data.panel, device_data.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			}
		},

		added: function(device_data, callback) {
			// Update driver administration when a device is added
			self.getName(device_data, function(err, name) {
				pm.addSensorDevice(self, device_data, name);
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
			pm.debug('Sensor pairing has started...');
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
				var devices = pm.getSensors(selectedPanel, driver);
				// err, result style
				callback(null, devices);
			});
		}
	}
	return self;
}

module.exports = { createSensorDriver: createSensorDriver };