With this Homey app you can control your Visonic PowerMax alarm panel, read the status of sensors and more!

Supported panels
In principle all PowerMax based panels are supported. It has been specifically tested with the PowerMaxPro, but also PowerMax+, PowerMax Express etc. work with this app. The new PowerMaster models are partially supported. Reason is that the PowerMaster sensors don't send their status to the panel when the panel is disarmed.

Hardware interface
In order for this application to function, Homey needs to be able to read the serial data from the Visonic PowerMax panel. There are a number of options to achieve this.
1. Using the Visonic (dual) RS-232 Interface Module in combination with a RS-232 to Ethernet module (e.g. USR-TCP232-200).
2. Directly using the TTL signals of the Visonic PowerMax and interface via a TTL to Ethernet module (e.g. USR-TCP232-E).

For more information, or in case of issues, please visit the github page: https://github.com/nlrb/com.visonic.powermax.
