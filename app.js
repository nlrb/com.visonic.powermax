'use strict'

/*
Copyright (c) 2016-2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')
const locale = Homey.ManagerI18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported
const pm = require('powermax-api')

// Speech ids and actions
const speechTriggers = [
	{ says: ['open', 'zone'], word: 'open', handler: 'open' },
	{ says: ['panel', 'status' ], handler: 'status' },
	{ says: ['panel', 'trouble' ], handler: 'trouble' }
]

class PowerMaxApp extends Homey.App {

	onInit() {
		this.log('PowerMaxApp is running...')
		this.panelDriver = Homey.ManagerDrivers.getDriver('powermax')

		// Register speech actions
		Homey.ManagerSpeechInput.on('speechEval', (speech, callback) => {
			let matched = false
			if (speech.triggers) {
				this.log('Received speech trigger', speech.triggers)
				for (let i = 0; i < speechTriggers.length; i++) {
					let match = 0
					speech.triggers.forEach((trigger) => {
						for (let m = 0; m < speechTriggers[i].says.length; m++) {
							if (trigger.id === speechTriggers[i].says[m]) {
								match++
							}
						}
					})
					matched = match === speechTriggers[i].says.length
					if (matched) {
						this.log('Match on', speechTriggers[i].says)
						let session = { session: speech.session }
						if (speechTriggers[i].handler === 'open') {
							this.openZoneSpeechHandler(i, session)
						} else if (speechTriggers[i].handler === 'status') {
							this.statusSpeechHandler(i, session)
						} else if (speechTriggers[i].handler === 'trouble') {
							this.troubleSpeechHandler(i, session)
						} else {
							this.defaultSpeechHandler(i, session)
						}
					}
				}
			} else {
				this.error('No speech triggers received')
			}
			callback(matched ? null : true, matched ? true : null)
		})
	}

	// Handler for open zones question
	openZoneSpeechHandler(id, session) {
		// Check for each alarm panel
		let panels = this.panelDriver.getPanels()
		for (let p = 0; p < panels.length; p++) {
			let id = panels[p].id
			let name = panels[p].hname
			let panelDevice = this.panelDriver.getPanelDeviceById(id)
			let openz = panelDevice.getOpenZones()
			let cnt = openz.length
			let zones = ''
			for (let i in openz) {
				zones += openz[i].name + ', '
			}
			let txt
			if (cnt === 0) {
				txt = Homey.__('speech.open.none', { panel: name })
			} else {
				zones = zones.slice(0, -2) // remove last ', ';
				if (cnt === 1) {
					txt = Homey.__('speech.open.one', {  panel: name, zone: zones })
				} else {
					txt = Homey.__('speech.open.more', {  panel: name, cnt: cnt, zones: zones })
				}
			}
			this.log(txt)
			Homey.ManagerSpeechOutput.say(txt, session)
		}
	}

	// Default handler for speech input: talk back
	defaultSpeechHandler(idx, session) {
		// Check for each alarm panel
		let panels = this.panelDriver.getPanels()
		for (let p = 0; p < panels.length; p++) {
			let id = panels[p].id
			let name = panels[p].hname
			let panelDevice = this.panelDriver.getPanelDeviceById(id)
			let result = panelDevice.getOpenZones()
			let cnt = result.length
			let items = ''
			for (let i in result) {
				items += result[i].name + ', ';
			}
			let word = 'speech.' + speechTriggers[idx].word
			if (cnt === 0) {
				let txt = Homey.__(word + '.none', { panel: name })
				this.log(txt)
				Homey.ManagerSpeechOutput.say(txt, session)
			} else {
				items = items.slice(0, -2) // remove last ', ';
				let txt
				if (cnt === 1) {
					txt = Homey.__(word + '.one', {  panel: name, item: items })
				} else {
					txt = Homey.__(word + '.more', {  panel: name, cnt: cnt, items: items })
				}
				this.log(txt)
				Homey.ManagerSpeechOutput.say(txt, session)
			}
		}
	}

	// statusSpeechHandler
 	statusSpeechHandler(idx, session) {
		const flags = [ 'ready', 'trouble', 'alarm', 'memory' ]
		// Check for each alarm panel
		let panels = this.panelDriver.getPanels()
		for (let p = 0; p < panels.length; p++) {
			let id = panels[p].id
			let name = panels[p].hname
			let panelDevice = this.panelDriver.getPanelDeviceById(id)
			let result = panelDevice.getPanelStatus()
			this.log(result)
			if (result != null) {
				let txt = Homey.__('speech.status.general', { panel: name, status: result.status.txt })
				// Check how many zones are open
				let opencnt = panelDevice.getOpenZones().length
				let state = []
				if (opencnt === 1) {
					state.push(Homey.__('speech.status.open.one'))
				} else if (opencnt > 1) {
					state.push(Homey.__('speech.status.open.more', { cnt: opencnt }))
				}
				for (let i = 0; i < flags.length; i++) {
					if (result[flags[i]]) {
						state.push(Homey.__('speech.status.' + flags[i]))
					}
				}
				if (state.length > 0) {
					let nextline = state.join(Homey.__('speech.status.and'));
					// Make a neat sentence
					nextline = nextline[0].toUpperCase() + nextline.slice(1) + '.'
					txt += ' ' + nextline
				}
				this.log(txt)
				Homey.ManagerSpeechOutput.say(txt, session)
			}
		}
	}

	// Trouble handler
	troubleSpeechHandler(idx, session) {
		const items = {
			panel: { en: 'panel', nl: 'paneel' },
			alarm: { en: 'alarm', nl: 'alarm' },
			battery: { en: 'low battery', nl: 'lage batterijspanning' },
			tamper: { en: 'tamper', nl: 'sabotage' }
		};
		// Check for each alarm panel
		let panels = this.panelDriver.getPanels()
		for (let p = 0; p < panels.length; p++) {
			let id = panels[p].id
			let name = panels[p].hname
			let result = this.panelDriver.getPanelTrouble(id)
			this.log(result)
			let state = []
			for (let i in items) {
				let elem = result[i]
				this.log(i, elem)
				if (elem !== undefined && elem.length > 0) {
					let x = []
					for (let j = 0; j < elem.length; j++) {
						x.push(elem[j].txt)
					}
					let cnt = x.length
					let nr = (cnt === 1 ? 'one' : 'more')
					x.join(Homey.__('speech.status.and'))
					this.log(x)
					if (i === 'panel') {
						state.push(Homey.__('speech.trouble.panel.' + nr, { panel: name, type: x }))
					} else {
						state.push(Homey.__('speech.trouble.sensor.' + nr, { panel: name, type: items[i][locale], sensor: x }))
					}
				}
			}
			let txt = Homey.__('speech.trouble.none', { panel: name })
			if (state.length > 0) {
				txt = state.join(Homey.__('speech.status.and'))
				// Make a neat sentence
				txt = txt[0].toUpperCase() + txt.slice(1) + '.'
			}
			this.log(txt)
			Homey.ManagerSpeechOutput.say(txt, session)
		}
	}

	// External API: get an array of panels (for panel selection)
	getPanels() {
		return Homey.ManagerDrivers.getDriver('powermax').getPanels()
	}

	getEventLog(panel, force) {
		return Homey.ManagerDrivers.getDriver('powermax').getEventLog(panel, force)
	}

}

module.exports = PowerMaxApp
