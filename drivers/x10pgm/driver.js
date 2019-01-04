'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Visonic PowerMax X10 Driver

const Homey = require('homey')

class X10PgmDriver extends Homey.Driver {

	onInit() {
		this.log('X10PgmDriver Init')
		this.panelDriver = Homey.ManagerDrivers.getDriver('powermax')
		this.initQueue = {}
	}

	onPair(socket) {
		this.log('X10/PGM pairing has started...')
		let selectedPanel

		// Let the front-end know which panels there are
		let panels = this.panelDriver.getPanels()
		// Make sure the page has fully loaded
		socket.on('loaded', () => {
			socket.emit('start', panels)
		})

		socket.on('selected', (id, callback) => {
			selectedPanel = id
			callback(null, id)
		})

		// this method is run when Homey.emit('list_devices') is run on the front-end
		// which happens when you use the template `list_devices`
		socket.on('list_devices', (data, callback) => {
			this.log('Selected panel', selectedPanel)
      let panelDevice = this.panelDriver.getPanelDeviceById(selectedPanel)
			let devices = panelDevice.getX10Devices()
			// err, result style
			callback(null, devices)
		})
	}

}

module.exports = X10PgmDriver
