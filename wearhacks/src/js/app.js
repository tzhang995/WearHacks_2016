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
	var targetLat;
	var targetLong;
	ref.once("value", function(snapshot){
		snapshot.forEach(function(childSnapshot) {
	    	// key will be "fred" the first time and "barney" the second time
	    	var key = childSnapshot.key();
 
	    	if (key != Pebble.getWatchToken()){
	    		// childData will be the actual contents of the child
	    		var childData = childSnapshot.val();
	    		targetLat=childData.latitude;
	    		targetLong=childData.longitude;
	    		console.log(childData.latitude + "LOL" + childData.longitude);
	    	}
		});
	});
	var diff = getLocationDist(targetLat,targetLong,pos.coords.latitude,pos.coords.longitude);
    // Construct URL
    //console.log("LAT: " + pos.coords.latitude);
    //console.log("LONG: " + pos.coords.longitude);
    //console.log("DIFF: " + diff);
	var dictionary = {
		'KEY_LAT': pos.coords.latitude*100000,
		'KEY_LONG': pos.coords.longitude*100000,
		'KEY_DIFF' : diff*100000
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

var positionWatcher;
setPositionWatcher();
function setPositionWatcher(){
  target = {
  latitude : 0,
  longitude: 0
  };

  options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  positionWatcher = navigator.geolocation.watchPosition(addDataInterval, positionWatcherError, options);
}
function positionWatcherError(){
	console.log('Error while trying to set up a position watcher');
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