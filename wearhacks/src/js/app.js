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

//WRONG
function getLocationDist(lat1, long1, lat2, long2) {
	var diffLat = lat1 - lat2;
	var diffLong = long1- long2;
	return Math.sqrt((diffLat*diffLat) + (diffLong*diffLong));
}

/*function getLocationDist(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}*/


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

var targetLat=0;
var targetLong=0;

function locationSuccess(pos){
	ref.once("value", function(snapshot){
		snapshot.forEach(function(childSnapshot) {
	    	// key will be "fred" the first time and "barney" the second time
	    	var key = childSnapshot.key();
 
	    	if (key != Pebble.getWatchToken()){
	    		// childData will be the actual contents of the child
	    		var childData = childSnapshot.val();
	    		targetLat=childData.latitude;
	    		targetLong=childData.longitude;
	    		//console.log(childData.latitude + "LOL" + childData.longitude);
	    	}
		});
	});
	var diff = getLocationDist(targetLat,targetLong,pos.coords.latitude,pos.coords.longitude);
    console.log("LAT: "+pos.coords.latitude);
    console.log("LONG: "+ pos.coords.longitude);
    console.log("TLAT: "+targetLat);
    console.log("TLONG: "+targetLong);
    console.log("Diff: "+diff);
    console.log("Accuracy"+pos.coords.accuracy);
    // Construct URL
    //console.log("LAT: " + pos.coords.latitude);
    //console.log("LONG: " + pos.coords.longitude);
    //console.log("DIFF: " + diff);
	var dictionary = {
		'KEY_LAT': pos.coords.latitude*100000,
		'KEY_LONG': pos.coords.longitude*100000,
		'KEY_DIFF' : diff*10000
	};

  // Send to Pebble
  if (targetLat!=0 && pos.coords.accuracy<40)
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
    timeout: Infinity,
    maximumAge: 0
  };

  positionWatcher = navigator.geolocation.watchPosition(locationSuccess, locationError, options);
}
function positionWatcherError(){
	console.log('Error while trying to set up a position watcher');
}


//Sending data to firebase on a regular interval
function addDataInterval(){
	navigator.geolocation.getCurrentPosition(
		locationSuccess,
		locationError,
		{timeout: 30000, maximumAge: 60000}
	);
}

setInterval(addDataInterval, 500);