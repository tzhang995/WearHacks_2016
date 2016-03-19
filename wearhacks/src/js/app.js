console.log('Sending data to Pebble...');
require('firebase');

Firebase.INTERNAL.forceWebSockets();
var ref = new Firebase("https://blistering-heat-4723.firebaseio.com/");
//ref.set({ name: "PebbleB" });
// Listen for realtime changes
ref.on('value', function(dataSnapshot) {
  var newPost = dataSnapshot.val();

  console.log("My Lat is: " + newPost.name + " And my Long is: " + newPost.text);
});

var method = 'GET';
var url = 'http://discover-380bg7t8.cloudapp.net/';

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

