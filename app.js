"use strict";

var powermax = require('powermax-api');

var locale = Homey.manager('i18n').getLanguage();

// Start of the app
function init() {
	Homey.log("Starting PowerMax app!");
}


var api = {
}

module.exports = { 
	init: init,
	api: api
}