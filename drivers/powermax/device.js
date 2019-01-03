'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')
const pm = require('powermax-api')

const triggers = [
  { id: 'status', check: false },
  { id :'panelalarm', check: true },
  { id: 'paneltrouble', check: true },
  { id: 'event', check: false },
  { id: 'zoneTripAlarm', check: true },
  { id: 'zoneBattery', check: true }
]

class PanelDevice extends Homey.Device {

  onInit() {
    this.driver = this.getDriver()
    this.locale = this.driver.locale
    this.id = this.getData().id
    this.log('Starting device', this.id)
    this.powermax = new pm.PowerMax(this.locale, this.getSettings(), this.log, true)
    this.Trigger = {}
    // Create flow triggers
    for (let t in triggers) {
      this.Trigger[triggers[t].id] = new Homey.FlowCardTriggerDevice(triggers[t].id)
      // Register flow condition checks
      if (triggers[t].check) {
        this.Trigger[triggers[t].id].registerRunListener((args, state) => {
          let result = (state.state === false) != (args.values === 'on')
          this.log('>> Checked action', triggers[t].id, 'for', state.state,'=', args.values + ', result =', result)
          return Promise(result)
        })
      }
      this.Trigger[triggers[t].id].register()
      this.log('Tigger', triggers[t], 'registered')
    }
    this.registerEvents()
    this.registerListeners()
    // Check if there are devices in the queue that still need to be initialized
    for (let i = 0; i < this.driver.initQueue.length; i++) {
      let device = this.driver.initQueue[i]
      this.log('Initializing device')
      device.onInit()
      device.setAvailable()
    }
  }

  // Called on removal
  onDeleted() {
    this.log('Deleting panel device', this.id)
		this.powermax.found = 'no' // make sure we don't re-open the connection
		this.powermax.closeConnection()
    this.setUnavailable()
  }

  // Update panel configuration settings
	onSettings(oldSettings, newSettings, changedItems, callback) {
		let result = { update: true, msg: Homey.__('settings.saved'), updates: {} };
		// First check the pin-code before making any changes
		let p = this.powermax
		let idx = changedItems.indexOf('pin')
		if (idx >= 0) {
			if (p.readAllSettings && newSettings.pin == p.settings.config.masterCode.val) {
				let restart = false
				// Remove the pin code
				changedItems.splice(idx, 1)
				for (let i in changedItems) {
					let item = changedItems[i]
					let newVal = newSettings[item]
					// Check if special action needed
					if (item == 'ip' || item == 'port') {
						// We will need to close connection & restart
						restart = true
					} else if (item == 'syncTime' && newVal) {
						p.syncTime()
					} else if (item == 'armUser') {
						// Check that there is a pin code for this user
						var pin = p.settings.config.userCode[newVal - 1]
						if (pin == null) {
              result = {
                update: false,
                msg: Homey.__('settings.invalid_user', { user: newVal })
              }
						}
					}
          if (result.update) {
  					// Add to results to be updated
  					result.updates[item] = newVal
          }
				}
				if (restart) {
					p.found = 'inactive'
					p.handleCommException('IP address changed')
				}
			} else {
        result = {
          update: false,
          msg: Homey.__('settings.invalid_pin')
        }
			}
		} else {
      result = {
        update: false,
        msg: Homey.__('settings.no_pin')
      }
		}
    // Make sure Homey doesn't change the settings - we do that!
		callback(result.msg, null)
    // Update the device settings
    if (result.update) {
      for (let item in result.updates) {
        p.devSettings[item] = result.updates[item] // TODO: store only in one place
      }
      this.setSettings(result.updates)
    }
	}

  // Override setAvailable - mark panel and its sensors as available
  setAvailable() {
    super.setAvailable()
    let children = [].concat(
      Homey.ManagerDrivers.getDriver('sensor').getDevices(),
      Homey.ManagerDrivers.getDriver('x10pgm').getDevices(),
    )
    children.forEach((device, key) => { device.setAvailable() })
  }

  // Override setUnavailable - mark panel and its sensors as unavailable
  setUnavailable(message) {
    if (message === undefined) {
      message = Homey.__('error.unreachable', { time: new Date().toLocaleString(this.locale) })
    }
    super.setUnavailable(message)
    let children = [].concat(
      Homey.ManagerDrivers.getDriver('sensor').getDevices(),
      Homey.ManagerDrivers.getDriver('x10pgm').getDevices()
    )
    children.forEach((device, key) => { device.setUnavailable(Homey.__('error.no_panel')) })
  }

  // Register events to listen to
  registerEvents() {
    // Handle 'found' event: mark panel (and sensors) as active or inactive
    this.powermax.events.on('found', (data) => {
			if (!data.found) {
				this.log('Marking panel', this.id, 'as unavailable')
        this.setUnavailable()
			} else {
				this.log('Marking panel', this.id, 'as available');
        this.setAvailable()
			}
		})

    // Handle 'download' event: happens e.g. after installer menu exit
    this.powermax.events.on('download', (state) => {
      // Regular download, not for adding panel
      if (state === 'start') {
        // Panel and sensors cannot be used during a download
        this.setUnavailable(Homey.__('error.downloading'))
      } else if (state === 'done') {
        // Mark all available again, download is done
        this.setAvailable()
        let list = this.powermax.settings.zones;
        let sensors = Homey.ManagerDrivers.getDriver('sensor').getDevices()
        sensors.forEach((device, key) => {
          let elem = list[device.getData().zone]
          if (elem === undefined) {
            // Sensor has been removed from panel
            device.setUnavailable(Homey.__('error.sensor_removed'))
          } else {
            device.setAvailable()
            // Update sensor setting info
            var setting = {
              location: elem.zname,
              type: elem.ztypeName,
              chime: elem.zchime,
              partition: elem.partition.join(', ')
            }
            device.setSettings(setting)
          }
        })
      }
    })

    // Handle 'system' events: changes in system status
    this.powermax.events.on('system', (field, newVal) => {
      this.log('Received system event for field', field, 'with value', newVal)
      if (field === 'status') {
        let state = 'disarmed';
        if (newVal.nr === 4) { // Armed Home
          state = 'partially_armed';
        } else if (newVal.armed) {
          state = 'armed';
        }
        let detail = newVal.nr.toString()
        let detailTxt = pm.Tables.sysStatus[this.locale][detail]
        // Only act on state changes
        if (this.getCapabilityValue('arm_state') !== detailTxt) {
          try {
            this.setCapabilityValue('homealarm_state', state)
            this.setCapabilityValue('arm_state', detailTxt)
          } catch(err) {
            this.error(err)
          }
          this.Trigger.status
          .trigger(this, { status: newVal.txt }, { panel: this.id, status: newVal.nr })
            .catch(this.error)
            .then(x => this.log('Result >status trigger<', x))
        }
      } else if (field === 'alarmType') { // e.g. Intruder, Tamper, Panic, Fire, Emergency, Gas, Flood
        let text = newVal.txt || ''
        this.Trigger.panelalarm
        .trigger(this, { type: newVal.nr, name: text }, { state: text != '' })
          .catch(this.error)
          .then(x => this.log('Result >panelalarm trigger<', x))
      } else if (field === 'troubleType') { // e.g. Communication, General, Battery, Power, Jamming, Telephone
        let text = newVal.txt || ''
        this.log('Triggering device trouble', text);
        this.Trigger.paneltrouble
        .trigger(this, { type: newVal.nr, name: text }, { state: text != '' })
          .catch(this.error)
          .then(x => this.log('Result >paneltrouble trigger<', x))
      } else if (field === 'event') {
        let text = newVal.userText + ': ' + newVal.type + ' (' + new Date().toLocaleString(this.locale) + ')';
        this.log('Triggering device event', text)
        this.Trigger.event
          .trigger(this, { type: newVal.type, trigger: newVal.userText }, { state: text != '' })
            .catch(this.error)
            .then(x => this.log('Result >event trigger<', x))
        // Show last event in the settings
        this.setSettings({ event: text })
      } else { // alarm, ready, memory, trouble are panel capabilities
        this.setCapabilityValue(field, newVal)
      }
    })

    // Zone trip alarm event
    this.powermax.events.on('zoneTripAlarm', (data) => {
      let name = this.getZoneName(data.zone)
      this.Trigger.zoneTripAlarm
        .trigger(this, { zone: data.zone, name: name }, { state: data.state })
          .catch(this.error)
          .then(x => this.log('Result >zoneTripAlarm trigger<', x))
    })

    // Catch battery events
    this.powermax.events.on('zoneBattery', (data) => {
      let name = this.getZoneName(data.zone);
      this.Trigger.zoneBattery
        .trigger(this, { zone: data.zone, name: name }, { state: data.state })
          .catch(this.error)
          .then(x => this.log('Result >zoneBattery trigger<', x))
    })

    // Handle events for the app settings page
    this.powermax.events.on('eventLog', () => {
      Homey.ManagerApi.realtime('eventlog', { panel: this.id, log: this.powermax.eventLog });
    })
    this.powermax.events.on('busy', (state) => {
      Homey.ManagerApi.realtime('busy', { panel: this.id, busy: state });
    })

  }

  // Register Homey capbility listeners
  registerListeners() {
    this.registerCapabilityListener('homealarm_state', (value, opts, callback) => {
      this.setPanelState(value, (err, success) => {
        this.log('setPanelState', err)
        callback('Update follows', null)
      })
    })
  }

  // Get the name of the zone
	getZoneName(zone) {
		let name = this.locale === 'en' ? 'Unknown' : 'Onbekend'
		let zones = this.powermax.settings.zones
		if (zones !== undefined && zones[zone] !== undefined) {
			name = zones[zone].zname
		}
		return name
	}

  // Set the state of the panel
	setPanelState(state, callback) {
    this.log('setPanelState requested to', state)
		let newState = (state === 'partially_armed' ? 'Stay' : state[0].toUpperCase() + state.slice(1))
		let armCode = pm.Tables.armMode[newState]
		let allowed = true
		let allowArming = this.powermax.settings.allowArm

		this.log('setPanelState', (state || 'N/A'))
		if (armCode != null) {
			if (allowArming === 'none') {
				allowed = false
			} else if (allowArming === 'arm') {
				allowed = (armCode & 0x4) === 0x4 // allow 0x04/0x14 & 0x05/0x15
			} else if (allowArming === 'stay') {
				allowed = (armCode & 0x5) === 0x4 // allow 0x04 / 0x14
			}
			if (allowed && this.powermax.readAllSettings) {
				let user = this.getSetting('armUser') || 1
				let instant = this.getSetting('armInstant') || false
				if (instant && (armCode & 0x4) === 0x4) {
					armCode += 0x10
				}
				let pin = this.powermax.settings.config.userCode[user - 1]
				this.powermax.sendMessage("MSG_ARM", { arm: [ armCode ], pin: pin })
				callback(null, true)
			} else {
				callback('Not allowed', false)
			}
		} else {
			callback('Invalid state requested', false)
		}
	}

  // Get the panel status
	getPanelStatus() {
		return this.powermax.zone.system
	}

  // Get all sensors the panel has registered
	getPanelSensors(type) {
    const iconPath = 'icons/'
		let items = []
    let panel = this.id
		let list = this.powermax.settings.zones
		if (this.powermax.readAllSettings) {
			for (let idx in list) {
				let elem = list[idx]
				let setting = {
					zone: idx,
					location: elem.zname,
					type: elem.ztypeName,
					chime: elem.zchime,
					partition: elem.partition.join(', ')
				}
				if (type === 'magnet' && elem.stype === 'Magnet') {
					items.push({
						name: elem.zname + ' (zone ' + idx + ')',
						data: {	id: 'magnet:' + idx, panel: panel, zone: idx },
						capabilities: ['onoff', 'alarm_contact', 'alarm_battery', 'alarm_tamper', 'alarm_generic'],
						settings: setting,
            icon: iconPath + 'magnet.svg'
					})
				} else if (type === 'motion' && (elem.stype === 'Motion' || elem.stype === 'Wired')) {
					let capabilities = ['onoff', 'alarm_motion', 'alarm_generic']
					if (elem.stype === 'Motion') {
						capabilities.splice(2, 0, 'alarm_battery', 'alarm_tamper')
					}
					items.push({
						name: elem.zname + ' (zone ' + idx + ')',
						data: {	id: 'motion:' + idx, panel: panel, zone: idx },
						capabilities: capabilities,
						settings: setting,
            icon: iconPath + 'motion.svg'

					})
				} else if (type === 'smoke' && elem.stype === 'Smoke') {
					items.push({
						name: elem.zname + ' (zone ' + idx + ')',
						data: {	id: 'smoke:' + idx, panel: panel, zone: idx },
						capabilities: ['onoff', 'alarm_smoke', 'alarm_battery', 'alarm_tamper', 'alarm_generic'],
						settings: setting,
            icon: iconPath + 'smoke.svg'

					})
				} else if (type === 'gas' && elem.stype === 'Gas') {
					items.push({
						name: elem.zname + ' (zone ' + idx + ')',
						data: {	id: 'gas:' + idx, panel: panel, zone: idx },
						capabilities: ['onoff', 'alarm_co', 'alarm_battery', 'alarm_tamper', 'alarm_generic'],
						settings: setting,
            icon: iconPath + 'gas.svg'
					})
				}
			}
		}
		return items
	}

  // Get the list of open zones
	getOpenZones() {
		let zones = []
		// We only list sensors that are visible in Homey
    let sensors = Homey.ManagerDrivers.getDriver('sensor').getDevices()
    sensors.forEach(sensorDevice => {
      let zonenr = sensorDevice.getData().zone
      let zone = this.powermax.zone['zone.' + zonenr]
      if (zone !== undefined && zone.trip) {
        zones.push({ nr: zonenr, name: sensorDevice.getName() })
      }
    })
		return zones
	}

  // Set the sensor bypass
	setZoneBypass(zonenr, state) {
		if (this.getSetting('allowBypass')) {
			let user = this.getSetting('armUser') || 1
			this.powermax.setBypass(user, [ zonenr ], state)
			return true
		} else {
			this.log('Not allowed to update sensor bypass')
      /* TODO
      this.setWarning(Homey.__('no_bypass'))
        .catch(this.error)
        .then(() => {
          setTimeout(() => {
            this.unsetWarning()
              .catch(this.error)
          }, 3000)
        })
      */
			return false
		}
	}

  // Get all X10 & PGM devices the panel has registered
	getX10Devices() {
    const X10Ternary =
      { id: "ternary", capabilities: ["dim_oneway"], options: { values: { top: "brighten", middle: "toggle", bottom: "dim" }}}

		let items = []
    if (this.powermax.readAllSettings) {
			let list = this.powermax.settings.x10
			for (let idx in list) {
				let elem = list[idx]
				let capabilities = [ 'onoff' ]
        let mobile = {
    			components: [
            { id: "icon" },
    				{ id: "toggle", capabilities: ["onoff"] }
    			]
    		}
				let id = 'x10:' + idx
				if (elem.nr !== 0) {
					capabilities.push('dim_oneway') // TODO: choice for dim
          mobile.components.push(X10Ternary) // Add ternary element
				} else {
					id = 'x10:PGM'
				}
				let loc = elem.loc == null ? '' : ' (' + elem.loc + ')'
				items.push({
					name: elem.name + loc,
					data: {	id: id, panel: this.id, nr: elem.nr },
					capabilities: capabilities,
          icon: 'icons/' + (elem.nr === 0 ? 'pgm.svg' : 'x10.svg'),
          mobile: mobile
				})
			}
		}
		return items
	}

  // Send a X10 command to the panel
	sendX10Command(nr, state) {
		this.powermax.sendX10Command([ nr ], state)
	}

  // Set the time on the PowerMax panel
	setClock() {
		this.powermax.syncTime()
	}

}

module.exports = PanelDevice
