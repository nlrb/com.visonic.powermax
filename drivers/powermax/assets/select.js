function startPanelSelection(title) {
	$('#all').hide();
	Homey.on('start', function(panels) {
		if (panels.length > 1) {
			Homey.setTitle(__(title)); 
			for (var i = 0; i < panels.length; i++) {
				var panel = panels[i];
				var checked = i == 0 ? ' checked' : '';
				var radioBtn = $('<input type="radio" name="select" id="' + panel.id + '" value="' + panel.id + '"' + checked + '>' +
					' <label>' + panel.model + ' (' + panel.serial + ')</label><br>');
				radioBtn.appendTo('#panelList');
			}
			$("input").on('click', function() {
				var sel = $('input:checked').val();
				Homey.emit('selected', sel);
			});
			Homey.emit('selected', panels[0].id); // default is first panel
			$('#all').show();
		} else if (panels.length == 1) {
			Homey.emit('selected', panels[0].id, function(err, selection) {
				if (!err) {
					Homey.showView('list_sensors');
				}
			});
		} else {
			$('#panelList').text(__('pair.add_panel'));
			$('#all').show();
		}
	});
}
