'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')
const pm = require('powermax-api')

const locale = Homey.ManagerI18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported

class PanelDriver extends Homey.Driver {

  onInit() {
    this.log('PanelDriver Init')
    this.locale = locale
    this.panelSearch
    this.registerFlowConditonsAndActions()
  }

  // Generic sensor pairing
  onPair(socket) {
    this.log('PowerMax panel pairing has started...')
		let completed = false
		let panel_ip

		// Search for the PowerMax once we received IP address and port
		socket.on('search', (data, callback) => {
			panel_ip = data.ip + ':' + data.port
			this.log('Request to search for PowerMax on', panel_ip)
			// Add default settings
			let settings = {
				ip: data.ip,
				port: Number(data.port),
				forceModel: data.model,
				allowArm: 'arm',
				allowBypass: false,
				armUser: 1,
				motionTime: 15,
				syncTime: true
			}
			let err = this.addPanel(settings)
			callback(err, err == null)
		})

		// Fully add panel when successful
		socket.on('completed', (device, callback) => {
      this.log('Completed for device', device, callback)
			completed = true
			this.stopPanelSearch(true)
			// Let the front-end know we are done
			callback()
		})

		// Check if the pairing was finished, otherwise remove the panel
		socket.on('disconnect', () => {
			if (!completed) {
				this.log('Pairing not completed, closing connection on', panel_ip)
				this.stopPanelSearch(false)
			}
		})

		// Notify the front-end if a PowerMax has been found
		Homey.on('found', data => {
			socket.emit('found', data)
		})

		// Notify the front-end on enrollment/download progress
		Homey.on('download', data => {
			socket.emit('download', data)
		})
  }

  // Get the status of a panel variable
	getPanelValue(device, name) {
		let result
		if (device !== undefined && device.State !== undefined) {
			result = device.State[name]
		}
		return result
	}

  registerFlowConditonsAndActions() {
    // Check flow conditions
    let condition = new Homey.FlowCardCondition('sysflags')
    condition.registerRunListener((args, state, callback) => {
      // Get status of ready, trouble, alarm, memory
  		let check = this.getPanelValue(args.device, args.flag)
      this.log('FlowCardCondition sysflags', args.flag, state, 'result =', check)
      callback(null, check)
  	})
    condition.register()

    // Register flow actions
    let action = new Homey.FlowCardAction('setClock')
    action.registerRunListener((args, state, callback) => {
      this.log('Action setClock', args.device.id)
      let ok = args.device.setClock()
  		callback(null, ok)
    })
    action.register()

    action = new Homey.FlowCardAction('setState')
    action.registerRunListener((args, state, callback) => {
  		this.log('Action setState', args.device.id, args.state)
      if (args.device !== undefined) {
        args.device.setPanelState(args.state, (err, ok) => callback(err, ok))
      } else {
        return Promise.reject('Panel not available')
      }
  	})
    action.register()

    action = new Homey.FlowCardAction('bypassOn')
    action.registerRunListener((args, state, callback) => {
  		this.log('Action bypass', args.device.getData().id)
      if (args.device !== undefined) {
        let panelDevice = args.device.panelDevice
    		let ok = panelDevice.setZoneBypass(args.device.getData().zone, true)
    		callback((ok ? null : 'Not allowed'), ok)
      } else {
        return Promise.reject('Panel not available')
      }
  	})
    action.register()

    action = new Homey.FlowCardAction('bypassOff')
    action.registerRunListener((args, state, callback) => {
  		this.log('Action bypass', args.device.getData().id)
      if (args.device !== undefined) {
        let panelDevice = args.device.panelDevice
  		  let ok = panelDevice.setZoneBypass(args.device.getData().zone, false)
    		callback((ok ? null : 'Not allowed'), ok)
      } else {
        return Promise.reject('Panel not available')
      }
  	})
    action.register()
  }

  getPanelDeviceById(id) {
    return this.getDevice({ id: id })
  }

  // Search for a new panel
	addPanel(settings) {
		// During a search there is no device id yet
    let id = 'searching'
		let search = settings.ip + ':' + settings.port
    // Check all panels whether there is already one on this ip:port
    let devices = this.getDevices()
    devices.forEach(device => {
      let pip = device.getSetting('ip') + ':' + device.getSetting('port')
      if (search === pip) {
        search += ' (' + device.getName() + ')'
        let err = Homey.__('error.already_present', { panel: search })
        this.error(err)
        Homey.emit('found', { found: false, err: err })
        return err
      }
    })
    this.log('Creating new PowerMax instance with settings', settings)
		let powermax = new pm.PowerMax(locale, settings, this.log)
		this.panelSearch = powermax
		// Add event handlers
    powermax.on('found', this.foundHandler = (data) => {
      id = data.id
      Homey.emit('found', data)
    })
		powermax.on('download', this.downloadHandler = (state) => {
			// Only relevant when we are searching for a panel
			if (this.panelSearch != null) {
				let data = {
					state: state,
					id: id,
					show: {}
				};
				if (state == 'process:MSG_DL_SERIAL') {
					// Now we have the device id (use outer var!)
					id = powermax.settings.config.panelSerial
					data.id = id
				}
				// Build up the information we show in the front-end
				for (let i in pm.info) {
					let item = pm.info[i]
					let val = powermax.settings.config[item.val]
					if (val != null) {
						data.show[i] = { name: item[locale], val: val }
					}
				}
				// If download completed, add panel
				if (state == 'done') {
					// Add read-only settings
					let cfg = powermax.settings.config;
					settings.type = cfg.panelType;
					settings.model = cfg.panelModel;
					settings.serial = cfg.panelSerial;
					settings.firmware = cfg.panelSoftware + ' (' + cfg.panelEprom + ')';
					data.device = {
						name: powermax.settings.config.panelType,
						data: {	id: id },
						settings: settings
					}
  				// Add zone information to show
					for (let z in powermax.settings.zones) {
						let zone = powermax.settings.zones[z];
						// TODO: add translation stype
						let sname = zone.sname ? '[' + zone.sname + '] ' : ''
						data.show['zone' + z] = {
							name: zone.zname + ' (zone ' + z + ')',
							val: zone.stype + ' sensor ' + sname + '(' + zone.ztypeName + ')'
						}
					}
					// Add x10 information to show
					for (let x in powermax.settings.x10) {
						let x10 = powermax.settings.x10[x];
						if (x10.enabled) {
							data.show['x10:' + x] = {
								name: x10.name,
								val: x10.loc
							}
						}
					}
				}
				// Let front-end know of updated info
				Homey.emit('download', data)
			}
		})
	}

	// Cancel a panel search in progress
	stopPanelSearch(complete) {
    if (this.panelSearch != null) {
			this.panelSearch.found = 'no' // make sure we don't re-open the connection
			this.panelSearch.closeConnection()
      this.panelSearch.removeListener('found', this.foundHandler)
      this.panelSearch.removeListener('download', this.downloadHandler)
      this.panelSearch = null
    }
	}

	// Get a list of all registered panels
	getPanels() {
		let list = []
    this.getDevices().forEach(device => {
      let elem = device.powermax.settings.config
      list.push({
				id: device.getData().id,
				type: elem.panelType,
				name: elem.panelModel,
				serial: elem.panelSerial,
				hname: device.getName()
			})
    })
		return list
	}

	// Get a list of issues with the panel
	getPanelTrouble(panel) {
		let result = { panel: [], alarm: [], battery: [], tamper: [] };
    let panelDevice= this.getPanelDeviceById(panel)
		if (panelDevice !== undefined) {
			// Check panel trouble status
			let t = this.getPanelValue(panelDevice, 'troubleType')
			if (t !== undefined && t.txt !== undefined) {
				result.panel.push([{ txt: t.txt }])
			}
			// List alarms also as trouble
			t = this.getPanelValue(panelDevice, 'alarmType');
      if (t !== undefined && t.txt !== undefined) {
				result.panel.push({ txt: t.txt })
			}
			// Check sensor issues
			// We only look at sensors that are visible in Homey
      let sensors = Homey.ManagerDrivers.getDriver('sensor').getDevices()
      sensors.forEach((sensorDevice, key) => {
        let zonenr = sensorDevice.getData().zone
        let zone = panelDevice.powermax.zone['zone.' + zonenr]
				let name = sensorDevice.getName()
				if (zone !== undefined) {
					if (zone.battery) {
						result.battery.push({ nr: zonenr, txt: name })
					} else if (zone.alarm || zone.memory) {
						result.alarm.push({ nr: zonenr, txt: name })
					} else if (zone.tamper) {
						result.tamper.push({ nr: zonenr, txt: name })
					}
				}
			})
		}
		return result
	}

  // Get the event log for a panel (use cache if !force)
	getEventLog(panel, force) {
		let result = false
    let panelDevice = this.getPanelDeviceById(panel)
		if (panelDevice != null) {
			result = panelDevice.powermax.getEventLog(force)
		}
		return result
	}
}

module.exports = PanelDriver
