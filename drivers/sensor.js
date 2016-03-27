"use strict";

// Visonic PowerMax Sensor Driver

var pm = require('powermax-api');

function createSensorDriver(driver) {
	var self = {

		init: function(devices, callback) {
			devices.forEach(function(device) {
				pm.addDevice(self, device);
			});
			
			// we're ready
			callback();
		},
		
		capabilities: {
			alarm_contact: {
				get: function(device, callback) {
						if (typeof callback == 'function') {
							pm.getValue('alarm_contact', device.panel, device.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_motion: {
				get: function(device, callback) {
						if (typeof callback == 'function') {
							pm.getValue('alarm_motion', device.panel, device.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_smoke: {
				get: function(device, callback) {
						if (typeof callback == 'function') {
							pm.getValue('alarm_smoke', device.panel, device.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_battery: {
				get: function(device, callback) {
						if (typeof callback == 'function') {
							pm.getValue('alarm_battery', device.panel, device.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			},
			alarm_tamper: {
				get: function(device, callback) {
						if (typeof callback == 'function') {
							pm.getValue('alarm_tamper', device.panel, device.zone, function(err, val) {
								callback(err, val);
							});
						}
				}
			}
		},

		deleted: function(device_data) {
			// run when the user has deleted the device from Homey
			pm.deleteDevice(device_data);
		},
		
		pair: function(socket) {
			pm.debug('Sensor pairing has started...');
			var selectedPanel;

			// Let the front-end know which panels there are
			socket.emit('start', pm.getPanels());

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

			// Update driver administration when a device is added
			socket.on('add_device', function(device_data, callback) {
				var device = device_data['data'];
				pm.addDevice(self, device);

				callback();
			});
		}
	}
	return self;
}

module.exports = { createSensorDriver: createSensorDriver };