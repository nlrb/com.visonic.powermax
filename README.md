## Homey Visonic PowerMax application
With this Homey app you can control your Visonic PowerMax alarm panel, read the status of sensors and more!

## Hardware
### Supported panels
In principle all PowerMax based panels are supported. It has been specifically tested with the PowerMaxPro, but also PowerMax+, PowerMax Express etc. work with this app. The new PowerMaster models are partially supported. Reason is that the PowerMaster sensors don't send their status to the panel when the panel is disarmed.

### Hardware interface
In order for this application to function, Homey needs to be able to read the serial data from the Visonic PowerMax panel. There are a number of options to achieve this.

1. Using the Visonic (dual) RS-232 Interface Module in combination with a RS-232 to Ethernet module (e.g. USR-TCP232-200).
![RS232 kit](http://www.visonic.com/Data/Uploads/RSS-32_1.jpg)
![USR-TCP232-200](http://www.ramonbaas.nl/Homey/visonic/TCP232-200.png)

2. Directly using the TTL signals of the Visonic PowerMax and interface via a TTL to Ethernet module (e.g. USR-TCP232-E). 
![TTL Interface](http://www.ramonbaas.nl/Homey/visonic/Visonic-TTL.png)
![USR-TCP232-E](http://www.ramonbaas.nl/Homey/visonic/TCP232-E.png)

3. **[UNTESTED]** Using the Visonic USB Programming Lead and e.g. a Raspberry Pi or Onion which runs 'ser2net'.

## Application

### Devices
#### Panel device
First create an Alarm Panel device. You can add multiple panels if needed.

![add device](http://www.ramonbaas.nl/Homey/visonic/add_device.png)

##### Pairing
Specify on which IP address and port the serial connection to the Visonic PowerMax can be made and press the 'Search' button.

![add panel](http://www.ramonbaas.nl/Homey/visonic/add_panel.png)

As soon as communication with a PowerMax panel has been established, the pairing will move to the second screen. In the second step the panel will need to be brought into Powerlink mode. This enables the application to retrieve all information from the panel, like zone names, pin codes etc.

![add panel](http://www.ramonbaas.nl/Homey/visonic/enroll_download.png)

Please wait until all information is downloaded. Once that is completed, the panel device will be added automatically.

![add panel](http://www.ramonbaas.nl/Homey/visonic/device_panel.png)

##### Settings
Each panel device has a number of settings that control the behavior of the device.

![add panel](http://www.ramonbaas.nl/Homey/visonic/device_settings.png)
> Network settings

**NOTE**: In the current application version changing the network settings has no effect, until Homey reboots.

> Homey options

* *Allow flow arming and disarming*: This option controls whether you can arm and/or disarm the panel via a flow in Homey. From a security perspective one might opt to e.g. only allow arming or to disallow arming & disarming all together. [default: allow all]
* *Seconds to show motion detected*: Here you can specify how long (in seconds) the sensor should show a motion alarm once a motion sensor has been tripped. [default: 8 seconds]
* *Synchronize panel time from Homey*: When this option is checked, the time as set in Homey will be programmed in the panel as well. [default: on]

#### Door/window, motion sensors and smoke detectors
After a panel device has been created, the following sensors can be added.

* Door/window sensors
* Motion sensors
* Smoke detectors

The sensors will show whether it is tripped (contact/motion/smoke alarm in Homey), whether the battery of the sensor is low and it will show a tamper alarm when the sensor is being tampered with.

![sensor](http://www.ramonbaas.nl/Homey/visonic/battery_alarm.png)

##### Pairing
In case multiple panels are present in Homey, you will first need to select the panel for which you want to pair extra sensors. The panels can be identified by their model name and serial number. In case only one panel device is present, this selection step is skipped.

![sensor](http://www.ramonbaas.nl/Homey/visonic/select_panel.png)

A list of sensors will be displayed with their name (as present in the panel) and their zone number. Names for the devices can be changed in this screen. Select the sensors you want to have added in Homey and press 'Next'.

![sensor](http://www.ramonbaas.nl/Homey/visonic/select_devices.png)

The devices will now be shown in Homey.

![magnet](http://www.ramonbaas.nl/Homey/visonic/device_magnet.png)
![motion](http://www.ramonbaas.nl/Homey/visonic/device_motion.png)
![smoke](http://www.ramonbaas.nl/Homey/visonic/device_smoke.png)

### Flows
When the needed devices are available in Homey, you can use them to create some cool flows. See a couple of simple examples below.

![flow1](http://www.ramonbaas.nl/Homey/visonic/flow_motion.png)

![flow2](http://www.ramonbaas.nl/Homey/visonic/flow_away.png)

### Version history
* 0.2.0 First App store release
* 0.1.0 Initial release