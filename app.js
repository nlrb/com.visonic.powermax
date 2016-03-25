"use strict";

var powermax = require('powermax-api');

var locale = Homey.manager('i18n').getLanguage();

// Start of the app
function init() {
	Homey.log("Starting PowerMax app!");
	//powermax.openComm('192.168.1.70', '23'); // test panel
	//powermax.openComm('192.168.1.75', '29'); // production panel
}


var api = {
}

module.exports = { 
	init: init,
	api: api
}