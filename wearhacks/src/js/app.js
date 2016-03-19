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

function writeToFirebase(pos) {
	var uid = Pebble.getWatchToken();
	ref.child(uid).update({
 		latitude: pos.coords.latitude,
 		longitude: pos.coords.longitude
	});
  
	//ref.set({name: pos.coords.latitude, text: pos.coords.longitude});
}

function locationSuccess(pos){
	ref.once("value", function(snapshot){
		snapshot.forEach(function(childSnapshot) {
	    	// key will be "fred" the first time and "barney" the second time
	    	var key = childSnapshot.key();

	    	//if ()

	    	// childData will be the actual contents of the child
	    	var childData = childSnapshot.val();
	    	console.log(key + "WHAH" + JSON.stringify(childData));
		});
	});
	//var diff = getLocationDist(targetLat,targetLong,pos.coords.latitude,pos.coords.longitude);
    // Construct URL
    //console.log("LAT: " + pos.coords.latitude);
    //console.log("LONG: " + pos.coords.longitude);
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
      writeToFirebase(pos);
    },
    function(e) {
      console.log('Error sending location info to Pebble!');
    }
  );
}


//Sending data to firebase on a regular interval
function addDataInterval(){
	navigator.geolocation.getCurrentPosition(
		locationSuccess,
		locationError,
		{timeout: 15000, maximumAge: 60000}
	);
}

setInterval(addDataInterval, 500);