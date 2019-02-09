var midi = require("midi");
var output = new midi.output();
var util = require('util');
var async = require('async');
var SensorTag = require('sensortag');
var _ = require('lodash');
var USE_READ = true;
const DEVICE_NAME = "TI SensorTag";

output.openVirtualPort("node-midi Virtual Output");
normalize = function(data, min, max){
  range = max - min;
  unit = range / 128;
  return _.min([127, _.max([0, _.toInteger((data - min) / unit)])]);
}

//console.log('here');

SensorTag.discover(function(sensorTag) {
  console.log('discovered: ' + sensorTag);

  sensorTag.on('disconnect', function() {
    console.log('disconnected!');
    process.exit(0);
  });

  async.series([
    function(callback) {
      console.log('connectAndSetUp');
      sensorTag.connectAndSetUp(callback);
    },
    function(callback) {
      console.log('readDeviceName');
      sensorTag.readDeviceName(function(error, deviceName) {
        console.log('\tdevice name = ' + deviceName);
        callback();
      });
    },

    function(callback) {
      console.log('readSimpleRead - waiting for button press ...');
      var message = [176, 12, 1];
      sensorTag.on('simpleKeyChange', function(left, right, reedRelay) {
        console.log('left: ' + left);
        console.log('right: ' + right);
        console.log('sendMessage', message);
        output.sendMessage(message);
        setTimeout(function() {callback();}, 1000);
      });
      sensorTag.notifySimpleKey();
    },
    function(callback) {
      console.log('readSimpleRead - waiting for button press ...');
      var message = [176, 13, 1];

      sensorTag.on('simpleKeyChange', function(left, right, reedRelay) {
        console.log('left: ' + left);
        console.log('right: ' + right);
        console.log('sendMessage', message);
        output.sendMessage(message);
        setTimeout(function() {callback();}, 1000);
      });
      sensorTag.notifySimpleKey();
    },

    function(callback) {
      setTimeout(function() {
        console.log('sendMessage 12');
        output.sendMessage([176, 12, 1]);
      }, 5000);
      setTimeout(function() {
        console.log('sendMessage 13');
        output.sendMessage([176, 13, 1]);
      }, 10000);
      setTimeout(function() {
        console.log('sendMessage 14');
        output.sendMessage([176, 14, 1]);
      }, 15000);
      setTimeout(function() {
        callback();
      }, 20000);
    },
    function(callback) {
      console.log('enable sensors');
      sensorTag.enableAccelerometer();
      sensorTag.enableGyroscope();
      sensorTag.enableBarometricPressure(callback);
    },
    function(callback) {
      console.log('readAccelerometer');
      setInterval(function() {
        sensorTag.readAccelerometer(function(error, x, y, z) {
          // var message = [
          //   normalize(x, -1.0, 1.0),
          //   normalize(y, -1.0, 1.0),
          //   normalize(z, -1.0, 1.0)];
          output.sendMessage([176, 12, normalize(x, -1.0, 1.0)]);
          output.sendMessage([176, 13, normalize(y, -1.0, 1.0)]);
          output.sendMessage([176, 14, normalize(z, -1.0, 1.0)]);
        });
      }, 100);
      callback();
    },
    function(callback) {
      console.log('readSimpleRead - waiting for button press ...');
      sensorTag.on('simpleKeyChange', function(left, right, reedRelay) {
        console.log('left: ' + left);
        console.log('right: ' + right);
        if (sensorTag.type === 'cc2650') {
          console.log('reed relay: ' + reedRelay);
        }
        if (left || right) {
          sensorTag.notifySimpleKey(callback);
        }
      });
      sensorTag.notifySimpleKey();
    },
    function(callback) {
      console.log('disable sensors');
      sensorTag.disableAccelerometer();
      sensorTag.disableGyroscope();
      sensorTag.disableBarometricPressure(callback);
    },
    function(callback) {
      console.log('disconnect');
      output.closePort();
      sensorTag.disconnect(callback);
    }
  ]);
});
