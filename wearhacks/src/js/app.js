console.log('Sending data to Pebble...');
require('firebase');

Firebase.INTERNAL.forceWebSockets();
var ref = new Firebase("https://blistering-heat-4723.firebaseio.com/");
//ref.set({ name: "PebbleB" });
// Listen for realtime changes
ref.on('value', function(dataSnapshot) {
  var newPost = dataSnapshot.val();
  //prints out the latitude and longitude
  console.log("My Lat is: " + newPost.name + " And my Long is: " + newPost.text);
});

function getLocationDist(lat1, long1, lat2, long2) {
	var diffLat = lat1 - lat2;
	var diffLong = long1 - long2;
	return Math.sqrt((diffLat*diffLat) + (diffLong*diffLong));
}

function locationError(err) {
  console.log('Error requesting location!');
}

function locationSuccess(pos){
var targetLat = 43.4771239;
var targetLong = -80.5488477;
//var diff = getLocationDist(targetLat,targetLong,pos.coords.latitude,pos.coords.longitude);
  // Construct URL
  console.log("LAT: " + pos.coords.latitude);
  console.log("LONG: " + pos.coords.longitude);
  //console.log("DIFF: " + diff);
	var dictionary = {
		'KEY_LAT': pos.coords.latitude,
		'KEY_LONG': pos.coords.longitude
		//'KEY_DIFF' : diff
	};

  // Send to Pebble
  Pebble.sendAppMessage(dictionary,
    function(e) {
      console.log('Location info sent to Pebble successfully!');
    },
    function(e) {
      console.log('Error sending location info to Pebble!');
    }
  );
}


var i = 1;
//Sending data to firebase on a regular interval
function addDataInterval(){
	navigator.geolocation.getCurrentPosition(
	locationSuccess,
	locationError,
	{timeout: 15000, maximumAge: 60000}
	);
	var latitude = "Pikachu";
	var longitude = "Raichu";
	i = i + 1;
	ref.set({name: latitude+i, text: longitude+i});
}

setInterval(addDataInterval, 500);