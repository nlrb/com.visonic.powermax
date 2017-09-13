module.exports = [
  {
    description: 'Get all the available panels',
    method: 'GET',
    path: '/getPanels/',
    requires_authorizaton: true,
    fn: function(callback, args) {
      var getPanels = Homey.app.api.getPanels;
	    var ok = getPanels();
	    callback(null, ok);
    }
  },
  {
    description: 'Get the panel event log',
    method: 'PUT',
    path: '/getEventLog/',
    requires_authorizaton: true,
    fn: function(callback, args) {
      var getEventLog = Homey.app.api.getEventLog;
      var ok = getEventLog(args.body.panel, args.body.force);
	    callback(null, ok);
    }
  }
];
