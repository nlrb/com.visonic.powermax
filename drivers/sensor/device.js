'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')

const sensorTripMap = {
  'gas': 'alarm_co',
  'magnet': 'alarm_contact',
  'motion': 'alarm_motion',
  'smoke': 'alarm_smoke'
}
const sensorMap = {
  battery: 'alarm_battery',
  tamper: 'alarm_tamper',
  trip: sensorTripMap,
  tripAlarm: 'alarm_generic',
  bypass: 'onoff'
}

class SensorDevice extends Homey.Device {

  onInit() {
    this.panelId = this.getData().panel
    this.panelDriver = this.getDriver().panelDriver
    this.panelDevice = this.panelDriver.getPanelDeviceById(this.panelId)
    this.did = this.getData().id.split(':')
    if (this.panelDevice.powermax) {
      this.registerEvents()
      this.registerListeners()
    } else {
      this.setUnavailable(Homey.__('error.no_panel'))
      this.getDriver().initQueue.push(this)
    }
  }

  onAdded() {
    this.panelDevice.powermax.getZoneStatus(this.getData().zone)
  }

  onDeleted() {
    this.panelDevice.powermax.removeAllListeners('zone.' + this.did[1])
  }

  registerEvents() {
    this.panelDevice.powermax.on('zone.' + this.did[1], (field, newVal) => {
			this.log('Zone event', field, 'with value', newVal)
			let now = new Date().toLocaleString(this.panelDriver.locale)
      let capability = sensorMap[field]
      if (capability !== undefined) {
        if (newVal) {
          let elem = {}
          elem[field] = now
					this.setSettings(elem)
				}
        if (typeof capability !== 'string') {
          capability = capability[this.did[0]]
        }
        if (capability === 'onoff') {
          newVal = !newVal
        }
        this.setCapabilityValue(capability, newVal, (err, success) => {
					this.log('Value', field, 'update zone', this.did[1] + ':', (err ? err : 'OK'))
				})
      }
    })
  }

  // Register capbility listeners
  registerListeners() {
    this.registerCapabilityListener('onoff', (value, opts, callback) => {
      let result = this.panelDevice.setZoneBypass(this.getData().zone, !value) // invert for bypass
      callback(result ? null : Homey.__('no_bypass'), result)
    })
  }

  getTripStatus() {
    let capability = sensorTripMap[this.did[0]]
    return this.getCapabilityValue(capability)
  }

}

module.exports = SensorDevice
