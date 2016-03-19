console.log('Sending data to Pebble...');
require('firebase');

Firebase.INTERNAL.forceWebSockets();
var ref = new Firebase("https://sizzling-heat-5359.firebaseio.com/");
ref.set({ name: "PebbleB" });
// Listen for realtime changes
ref.on("value", function(data) {
  var name = data.val().name;
  console.log("My name is " + name);
});

var method = 'GET';
var url = 'http://example.com';

// Create the request
var request = new XMLHttpRequest();

// Specify the callback for when the request is completed
request.onload = function() {
  // The request was successfully completed!
  console.log('Got response: ' + this.responseText);
};

// Send the request
request.open(method, url);
request.send();

