"use strict";

/*
Copyright (c) 2016-2017 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const powermax = require('powermax-api');
const triggers = [ 'panelalarm', 'paneltrouble', 'zoneBattery', 'zoneTripAlarm' ]; // triggers that need state check
const locale = Homey.manager('i18n').getLanguage() == 'nl' ? 'nl' : 'en'; // only Dutch & English supported

// Handler for open zones question
function openZoneSpeechHandler(id, speech) {
	// Check for each alarm panel
	var panels = powermax.getPanels();
	for (var p = 0; p < panels.length; p++) {
		var id = panels[p].id;
		var name = panels[p].hname;
		var openz = powermax.getOpenZones(id);
		var cnt = openz.length;
		var zones = '';
		for (var i in openz) {
			zones += openz[i].name + ', ';
		}
		if (cnt == 0) {
			var txt = __('speech.no_open_zone', { panel: name });
			powermax.debug(txt);
			speech.say(txt);
		} else {
			zones = zones.slice(0, -2); // remove last ', ';
			var txt;
			if (cnt == 1) {
				txt = __('speech.open_zone', {  panel: name, zone: zones });
			} else {
				txt = __('speech.open_zones', {  panel: name, cnt: cnt, zones: zones });
			}
			powermax.debug(txt);
			speech.say(txt);
		}
	}
}

// Default handler for speech input: talk back
function defaultSpeechHandler(idx, speech) {
	// Check for each alarm panel
	var panels = powermax.getPanels();
	for (var p = 0; p < panels.length; p++) {
		var id = panels[p].id;
		var name = panels[p].hname;
		var func = speechTriggers[idx].check;
		var result = func(id);
		var cnt = result.length;
		var items = '';
		for (var i in result) {
			items += result[i].name + ', ';
		}
		var word = 'speech.' + speechTriggers[idx].word;
		if (cnt == 0) {
			var txt = __(word + '.none', { panel: name });
			powermax.debug(txt);
			Homey.manager('speech-output').say(txt, speech);
		} else {
			items = items.slice(0, -2); // remove last ', ';
			var txt;
			if (cnt == 1) {
				txt = __(word + '.one', {  panel: name, item: items });
			} else {
				txt = __(word + '.more', {  panel: name, cnt: cnt, items: items });
			}
			powermax.debug(txt);
			speech.say(txt);
		}
	}
}

// statusSpeechHandler
function statusSpeechHandler(idx, speech) {
	const flags = [ 'ready', 'trouble', 'alarm', 'memory' ];
	// Check for each alarm panel
	var panels = powermax.getPanels();
	for (var p = 0; p < panels.length; p++) {
		var id = panels[p].id;
		var name = panels[p].hname;
		var result = powermax.getPanelStatus(id);
		powermax.debug(result);
		if (result != null) {
			var txt = __('speech.status.general', { panel: name, status: result.status.txt });
			powermax.debug(txt);
			Homey.manager('speech-output').say(txt, speech);
			// Check how many zones are open
			var opencnt = powermax.getOpenZones(id).length;
			var state = [];
			if (opencnt == 1) {
				state.push(__('speech.status.open.one'));
			} else if (opencnt > 1) {
				state.push(__('speech.status.open.more', { cnt: opencnt }));
			}
			for (var i = 0; i < flags.length; i++) {
				if (result[flags[i]]) {
					state.push(__('speech.status.' + flags[i]));
				}
			}
			if (state.length > 0) {
				txt = state.join(__('speech.status.and'));
				// Make a neat sentence
				txt = txt[0].toUpperCase() + txt.slice(1) + '.';
				powermax.debug(txt);
				speech.say(txt);
			}
		}
	}
}

// Trouble handler
function troubleSpeechHandler(idx, speech) {
	const items = {
		panel: { en: 'panel', nl: 'paneel' },
		alarm: { en: 'alarm', nl: 'alarm' },
		battery: { en: 'low battery', nl: 'lage batterijspanning' },
		tamper: { en: 'tamper', nl: 'sabotage' }
	};
	// Check for each alarm panel
	var panels = powermax.getPanels();
	for (var p = 0; p < panels.length; p++) {
		var id = panels[p].id;
		var name = panels[p].hname;
		var result = powermax.getPanelTrouble(id);
		powermax.debug(result);
		var state = [];
		for (var i in items) {
			var elem = result[i];
			powermax.debug(i, elem);
			if (elem != null && elem.length > 0) {
				var x = [];
				for (var j = 0; j < elem.length; j++) {
					x.push(elem[j].txt);
				}
				var cnt = x.length;
				var nr = (cnt == 1 ? 'one' : 'more');
				x.join(__('speech.status.and'));
				powermax.debug(x);
				if (i == 'panel') {
					state.push(__('speech.trouble.panel.' + nr, { panel: name, type: x }));
				} else {
					state.push(__('speech.trouble.sensor.' + nr, { panel: name, type: items[i][locale], sensor: x }));
				}
			}
		}
		var txt = __('speech.trouble.none', { panel: name });
		if (state.length > 0) {
			var txt = state.join(__('speech.status.and'));
			// Make a neat sentence
			txt = txt[0].toUpperCase() + txt.slice(1) + '.';
		}
		powermax.debug(txt);
		speech.say(txt);
	}
}

// Speech ids and actions
const speechTriggers = [
	{ says: ['open', 'zone'], check: powermax.getOpenZones,	word: 'open' },
	{ says: ['panel', 'status' ], handler: statusSpeechHandler },
	{ says: ['panel', 'trouble' ], handler: troubleSpeechHandler }
]


// Start of the app
function init() {
	Homey.log("Starting PowerMax app!");
	powermax.setDebug(true);

	// Catch triggers
	for (let i = 0; i < triggers.length; i++) {
		Homey.manager('flow').on('trigger.' + triggers[i], function(callback, args, state) {
			let result = (state.state == false) != (args.values == 'on');
			powermax.debug('>> Checked action ' + triggers[i] + ' for ' + state.state + ' = ' + args.values + ', result = ' + result);
			callback(null, result);
		});
	}

	// Check conditions
	Homey.manager('flow').on('condition.sysflags', function(callback, args) {
		let id = args.device.id;
		let check = powermax.getPanelValue(id, args.flag);
		callback(null, check);
	});

	// Register actions
	Homey.manager('flow').on('action.setClock', function(callback, args) {
		powermax.debug('Action setClock ' + args.device.id);
		let ok = powermax.setClock(args.device.id);
		callback(null, ok);
	});

	Homey.manager('flow').on('action.setState', function(callback, args) {
		powermax.debug('Action setState ' + args.device.id, args.state);
		powermax.setPanelState(args.device.id, args.state, (err, ok) => callback(err, ok));
	});

	Homey.manager('flow').on('action.bypassOn', function(callback, args) {
		powermax.debug('Action bypass ' + args.device.id);
		let ok = powermax.setZoneBypass(args.device.panel, args.device.zone, true);
		callback((ok ? null : 'Not allowed'), ok);
	});

	Homey.manager('flow').on('action.bypassOff', function(callback, args) {
		powermax.debug('Action bypass ' + args.device.id);
		let ok = powermax.setZoneBypass(args.device.panel, args.device.zone, false);
		callback((ok ? null : 'Not allowed'), ok);
	});

	// Register speech actions
	Homey.manager('speech-input').on('speech', function(speech, callback) {
		let matched = false;
		powermax.debug('Received speech trigger');
		for (let i = 0; i < speechTriggers.length; i++) {
			let match = 0;
			speech.triggers.forEach(function(trigger) {
				for (let m = 0; m < speechTriggers[i].says.length; m++) {
					if (trigger.id == speechTriggers[i].says[m]) {
						match++;
					}
				}
			});
			matched = match == speechTriggers[i].says.length;
			if (matched) {
				powermax.debug('Match on ' + speechTriggers[i].says);
				let handler = speechTriggers[i].handler || defaultSpeechHandler;
				handler(i, speech);
			}
		}
		callback(matched ? null : true, matched ? true : null);
	});

}


var api = {
	getPanels: powermax.getPanels,
	getEventLog: powermax.getEventLog
}

module.exports = {
	init: init,
	api: api
}
