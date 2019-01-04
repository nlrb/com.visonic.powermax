'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')

class X10PgmDevice extends Homey.Device {

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

  onDeleted() {
    this.panelDevice.powermax.events.removeAllListeners('x10.' + this.did[1])
  }

  registerEvents() {
    this.log(this.did, this.did[1])
    this.panelDevice.powermax.events.on('x10.' + this.did[1], (field, newVal) => {
      this.log('x10 event for', this.did[1], 'with data', field, newVal)
      if (field === 'on') {
        this.setCapabilityValue('onoff', newVal, (err, success) => {
          this.log('Value on/off update x10', this.did[1] + ':', (err ? err : 'OK'))
        })
      }
    })
  }

  registerListeners() {
    this.registerCapabilityListener('onoff', (value, opts) => {
      this.log('* sending X10 command', this.getData().nr, (value ? 'on' : 'off'))
      this.panelDevice.sendX10Command(this.getData().nr, (value ? 'on' : 'off'))
    })

    // PGM does not have dim capability
    if (this.did[1] !== 'PGM') {
      this.registerCapabilityListener('dim_oneway', (value, opts) => {
  			this.log('dim_oneway:set', value)
        if (value === 'toggle') {
          value = (this.getCapabilityValue('onoff') ? 'off' : 'on')
        }
  			this.panelDevice.sendX10Command(this.getData().nr, value)
      })
    }
  }

}

module.exports = X10PgmDevice
