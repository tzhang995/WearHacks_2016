var __loader = (function() {

var loader = {};

loader.packages = {};

loader.packagesLinenoOrder = [{ filename: 'loader.js', lineno: 0 }];

loader.extpaths = ['?', '?.js', '?.json', '?/index.js'];

loader.paths = ['/', 'src'];

loader.basepath = function(path) {
  return path.replace(/[^\/]*$/, '');
};

var replace = function(a, regexp, b) {
  var z;
  do {
    z = a;
  } while (z !== (a = a.replace(regexp, b)));
  return z;
};

loader.normalize = function(path) {
  path = replace(path, /(?:(^|\/)\.?\/)+/g, '$1');
  path = replace(path, /[^\/]*\/\.\.\//, '');
  return path;
};

loader.require = function(path, requirer) {
  var module = loader.getPackage(path, requirer);
  if (!module) {
    throw new Error("Cannot find module '" + path + "'");
  }

  if (module.exports) {
    return module.exports;
  }

  var require = function(path) { return loader.require(path, module); };

  module.exports = {};
  module.loader(module.exports, module, require);
  module.loaded = true;

  return module.exports;
};

var compareLineno = function(a, b) { return a.lineno - b.lineno; };

loader.define = function(path, lineno, loadfun) {
  var module = {
    filename: path,
    lineno: lineno,
    loader: loadfun,
  };

  loader.packages[path] = module;
  loader.packagesLinenoOrder.push(module);
  loader.packagesLinenoOrder.sort(compareLineno);
};

loader.getPackage = function(path, requirer) {
  var module;
  if (requirer) {
    module = loader.getPackageAtPath(loader.basepath(requirer.filename) + '/' + path);
  }

  if (!module) {
    module = loader.getPackageAtPath(path);
  }

  var paths = loader.paths;
  for (var i = 0, ii = paths.length; !module && i < ii; ++i) {
    var dirpath = paths[i];
    module = loader.getPackageAtPath(dirpath + '/' + path);
  }
  return module;
};

loader.getPackageAtPath = function(path) {
  path = loader.normalize(path);

  var module;
  var extpaths = loader.extpaths;
  for (var i = 0, ii = extpaths.length; !module && i < ii; ++i) {
    var filepath = extpaths[i].replace('?', path);
    module = loader.packages[filepath];
  }
  return module;
};

loader.getPackageByLineno = function(lineno) {
  var packages = loader.packagesLinenoOrder;
  var module;
  for (var i = 0, ii = packages.length; i < ii; ++i) {
    var next = packages[i];
    if (next.lineno > lineno) {
      break;
    }
    module = next;
  }
  return module;
};

return loader;

})();

__loader.define('safe.js', 111, function(exports, module, require) {
/* safe.js - Building a safer world for Pebble.JS Developers
 *
 * This library provides wrapper around all the asynchronous handlers that developers
 * have access to so that error messages are caught and displayed nicely in the pebble tool
 * console.
 */

/* global __loader */

var safe = {};

/* The name of the concatenated file to translate */
safe.translateName = 'pebble-js-app.js';

safe.indent = '    ';

/* Translates a source line position to the originating file */
safe.translatePos = function(name, lineno, colno) {
  if (name === safe.translateName) {
    var pkg = __loader.getPackageByLineno(lineno);
    if (pkg) {
      name = pkg.filename;
      lineno -= pkg.lineno;
    }
  }
  return name + ':' + lineno + ':' + colno;
};

var makeTranslateStack = function(stackLineRegExp, translateLine) {
  return function(stack, level) {
    var lines = stack.split('\n');
    var firstStackLine = -1;
    for (var i = lines.length - 1; i >= 0; --i) {
      var m = lines[i].match(stackLineRegExp);
      if (!m) {
        continue;
      }
      var line = lines[i] = translateLine.apply(this, m);
      if (line) {
        firstStackLine = i;
        if (line.indexOf(module.filename) !== -1) {
          lines.splice(i, 1);
        }
      } else {
        lines.splice(i, lines.length - i);
      }
    }
    if (firstStackLine > -1) {
      lines.splice(firstStackLine, level);
    }
    return lines;
  };
};

/* Translates a node style stack trace line */
var translateLineV8 = function(line, msg, scope, name, lineno, colno) {
  var pos = safe.translatePos(name, lineno, colno);
  return msg + (scope ? ' ' + scope + ' (' + pos + ')' : pos);
};

/* Matches <msg> (<scope> '(')? <name> ':' <lineno> ':' <colno> ')'? */
var stackLineRegExpV8 = /(.+?)(?:\s+([^\s]+)\s+\()?([^\s@:]+):(\d+):(\d+)\)?/;

safe.translateStackV8 = makeTranslateStack(stackLineRegExpV8, translateLineV8);

/* Translates an iOS stack trace line to node style */
var translateLineIOS = function(line, scope, name, lineno, colno) {
  var pos = safe.translatePos(name, lineno, colno);
  return safe.indent + 'at ' + (scope ? scope  + ' (' + pos + ')' : pos);
};

/* Matches (<scope> '@' )? <name> ':' <lineno> ':' <colno> */
var stackLineRegExpIOS = /(?:([^\s@]+)@)?([^\s@:]+):(\d+):(\d+)/;

safe.translateStackIOS = makeTranslateStack(stackLineRegExpIOS, translateLineIOS);

/* Translates an Android stack trace line to node style */
var translateLineAndroid = function(line, msg, scope, name, lineno, colno) {
  if (name !== 'jskit_startup.js') {
    return translateLineV8(line, msg, scope, name, lineno, colno);
  }
};

/* Matches <msg> <scope> '('? filepath <name> ':' <lineno> ':' <colno> ')'? */
var stackLineRegExpAndroid = /^(.*?)(?:\s+([^\s]+)\s+\()?[^\s\(]*?([^\/]*?):(\d+):(\d+)\)?/;

safe.translateStackAndroid = makeTranslateStack(stackLineRegExpAndroid, translateLineAndroid);

/* Translates a stack trace to the originating files */
safe.translateStack = function(stack, level) {
  level = level || 0;
  if (Pebble.platform === 'pypkjs') {
    return safe.translateStackV8(stack, level);
  } else if (stack.match('com.getpebble.android')) {
    return safe.translateStackAndroid(stack, level);
  } else {
    return safe.translateStackIOS(stack, level);
  }
};

var normalizeIndent = function(lines, pos) {
  pos = pos || 0;
  var label = lines[pos].match(/^[^\s]* /);
  if (label) {
    var indent = label[0].replace(/./g, ' ');
    for (var i = pos + 1, ii = lines.length; i < ii; i++) {
      lines[i] = lines[i].replace(/^\t/, indent);
    }
  }
  return lines;
};

safe.translateError = function(err, intro, level) {
  var name = err.name;
  var message = err.message || err.toString();
  var stack = err.stack;
  var result = [intro || 'JavaScript Error:'];
  if (message && (!stack || stack.indexOf(message) === -1)) {
    if (name && message.indexOf(name + ':') === -1) {
      message = name + ': ' + message;
    }
    result.push(message);
  }
  if (stack) {
    Array.prototype.push.apply(result, safe.translateStack(stack, level));
  }
  return normalizeIndent(result, 1).join('\n');
};

/* Dumps error messages to the console. */
safe.dumpError = function(err, intro, level) {
  if (typeof err === 'object') {
    console.log(safe.translateError(err, intro, level));
  } else {
    console.log('Error: dumpError argument is not an object');
  }
};

/* Logs runtime warnings to the console. */
safe.warn = function(message, level, name) {
  var err = new Error(message);
  err.name = name || 'Warning';
  safe.dumpError(err, 'Warning:', 1);
};

/* Takes a function and return a new function with a call to it wrapped in a try/catch statement */
safe.protect = function(fn) {
  return fn ? function() {
    try {
      fn.apply(this, arguments);
    } catch (err) {
      safe.dumpError(err);
    }
  } : undefined;
};

/* Wrap event handlers added by Pebble.addEventListener */
var pblAddEventListener = Pebble.addEventListener;
Pebble.addEventListener = function(eventName, eventCallback) {
  pblAddEventListener.call(this, eventName, safe.protect(eventCallback));
};

var pblSendMessage = Pebble.sendAppMessage;
Pebble.sendAppMessage = function(message, success, failure) {
  return pblSendMessage.call(this, message, safe.protect(success), safe.protect(failure));
};

/* Wrap setTimeout and setInterval */
var originalSetTimeout = setTimeout;
window.setTimeout = function(callback, delay) {
  if (safe.warnSetTimeoutNotFunction !== false && typeof callback !== 'function') {
    safe.warn('setTimeout was called with a `' + (typeof callback) + '` type. ' +
              'Did you mean to pass a function?');
    safe.warnSetTimeoutNotFunction = false;
  }
  return originalSetTimeout(safe.protect(callback), delay);
};

var originalSetInterval = setInterval;
window.setInterval = function(callback, delay) {
  if (safe.warnSetIntervalNotFunction !== false && typeof callback !== 'function') {
    safe.warn('setInterval was called with a `' + (typeof callback) + '` type. ' +
              'Did you mean to pass a function?');
    safe.warnSetIntervalNotFunction = false;
  }
  return originalSetInterval(safe.protect(callback), delay);
};

/* Wrap the geolocation API Callbacks */
var watchPosition = navigator.geolocation.watchPosition;
navigator.geolocation.watchPosition = function(success, error, options) {
  return watchPosition.call(this, safe.protect(success), safe.protect(error), options);
};

var getCurrentPosition = navigator.geolocation.getCurrentPosition;
navigator.geolocation.getCurrentPosition = function(success, error, options) {
  return getCurrentPosition.call(this, safe.protect(success), safe.protect(error), options);
};

var ajax;

/* Try to load the ajax library if available and silently fail if it is not found. */
try {
  ajax = require('ajax');
} catch (err) {}

/* Wrap the success and failure callback of the ajax library */
if (ajax) {
  ajax.onHandler = function(eventName, callback) {
    return safe.protect(callback);
  };
}

module.exports = safe;

});
__loader.define('src/js/app.js', 328, function(exports, module, require) {
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
/*function getLocationDist(lat1, long1, lat2, long2) {
	var diffLat = lat1 - lat2;
	var diffLong = long1 - long2;
	return Math.sqrt((diffLat*diffLat) + (diffLong*diffLong));
}*/

function getLocationDist(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
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
    // Construct URL
    //console.log("LAT: " + pos.coords.latitude);
    //console.log("LONG: " + pos.coords.longitude);
    //console.log("DIFF: " + diff);
	var dictionary = {
		'KEY_LAT': pos.coords.latitude*100000,
		'KEY_LONG': pos.coords.longitude*100000,
		'KEY_DIFF' : diff*1000
	};

  // Send to Pebble
  if (targetLat!=0)
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
});
__loader.define('src/js/firebase.js', 454, function(exports, module, require) {
/*! @license Firebase v2.2.1
    License: https://www.firebase.com/terms/terms-of-service.html */
(function() {var h,aa=this;function n(a){return void 0!==a}function ba(){}function ca(a){a.Ob=function(){return a.kf?a.kf:a.kf=new a}}
function da(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ea(a){return"array"==da(a)}function fa(a){var b=da(a);return"array"==b||"object"==b&&"number"==typeof a.length}function p(a){return"string"==typeof a}function ga(a){return"number"==typeof a}function ha(a){return"function"==da(a)}function ia(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ja(a,b,c){return a.call.apply(a.bind,arguments)}
function ka(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function q(a,b,c){q=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ja:ka;return q.apply(null,arguments)}var la=Date.now||function(){return+new Date};
function ma(a,b){function c(){}c.prototype=b.prototype;a.Kg=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Gg=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};function r(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function na(a,b){var c={},d;for(d in a)c[d]=b.call(void 0,a[d],d,a);return c}function oa(a,b){for(var c in a)if(!b.call(void 0,a[c],c,a))return!1;return!0}function pa(a){var b=0,c;for(c in a)b++;return b}function qa(a){for(var b in a)return b}function ra(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function sa(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}function ta(a,b){for(var c in a)if(a[c]==b)return!0;return!1}
function ua(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d}function va(a,b){var c=ua(a,b,void 0);return c&&a[c]}function wa(a){for(var b in a)return!1;return!0}function xa(a){var b={},c;for(c in a)b[c]=a[c];return b}var ya="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function za(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<ya.length;f++)c=ya[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};function Aa(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);}function Ba(){this.Ld=void 0}
function Ca(a,b,c){switch(typeof b){case "string":Da(b,c);break;case "number":c.push(isFinite(b)&&!isNaN(b)?b:"null");break;case "boolean":c.push(b);break;case "undefined":c.push("null");break;case "object":if(null==b){c.push("null");break}if(ea(b)){var d=b.length;c.push("[");for(var e="",f=0;f<d;f++)c.push(e),e=b[f],Ca(a,a.Ld?a.Ld.call(b,String(f),e):e,c),e=",";c.push("]");break}c.push("{");d="";for(f in b)Object.prototype.hasOwnProperty.call(b,f)&&(e=b[f],"function"!=typeof e&&(c.push(d),Da(f,c),
c.push(":"),Ca(a,a.Ld?a.Ld.call(b,f,e):e,c),d=","));c.push("}");break;case "function":break;default:throw Error("Unknown type: "+typeof b);}}var Ea={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"},Fa=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
function Da(a,b){b.push('"',a.replace(Fa,function(a){if(a in Ea)return Ea[a];var b=a.charCodeAt(0),e="\\u";16>b?e+="000":256>b?e+="00":4096>b&&(e+="0");return Ea[a]=e+b.toString(16)}),'"')};function Ga(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^la()).toString(36)};var Ha;a:{var Ia=aa.navigator;if(Ia){var Ja=Ia.userAgent;if(Ja){Ha=Ja;break a}}Ha=""};function Ka(){this.Sa=-1};function La(){this.Sa=-1;this.Sa=64;this.R=[];this.fe=[];this.Ef=[];this.Ed=[];this.Ed[0]=128;for(var a=1;a<this.Sa;++a)this.Ed[a]=0;this.Xd=this.Tb=0;this.reset()}ma(La,Ka);La.prototype.reset=function(){this.R[0]=1732584193;this.R[1]=4023233417;this.R[2]=2562383102;this.R[3]=271733878;this.R[4]=3285377520;this.Xd=this.Tb=0};
function Ma(a,b,c){c||(c=0);var d=a.Ef;if(p(b))for(var e=0;16>e;e++)d[e]=b.charCodeAt(c)<<24|b.charCodeAt(c+1)<<16|b.charCodeAt(c+2)<<8|b.charCodeAt(c+3),c+=4;else for(e=0;16>e;e++)d[e]=b[c]<<24|b[c+1]<<16|b[c+2]<<8|b[c+3],c+=4;for(e=16;80>e;e++){var f=d[e-3]^d[e-8]^d[e-14]^d[e-16];d[e]=(f<<1|f>>>31)&4294967295}b=a.R[0];c=a.R[1];for(var g=a.R[2],k=a.R[3],l=a.R[4],m,e=0;80>e;e++)40>e?20>e?(f=k^c&(g^k),m=1518500249):(f=c^g^k,m=1859775393):60>e?(f=c&g|k&(c|g),m=2400959708):(f=c^g^k,m=3395469782),f=(b<<
5|b>>>27)+f+l+m+d[e]&4294967295,l=k,k=g,g=(c<<30|c>>>2)&4294967295,c=b,b=f;a.R[0]=a.R[0]+b&4294967295;a.R[1]=a.R[1]+c&4294967295;a.R[2]=a.R[2]+g&4294967295;a.R[3]=a.R[3]+k&4294967295;a.R[4]=a.R[4]+l&4294967295}
La.prototype.update=function(a,b){if(null!=a){n(b)||(b=a.length);for(var c=b-this.Sa,d=0,e=this.fe,f=this.Tb;d<b;){if(0==f)for(;d<=c;)Ma(this,a,d),d+=this.Sa;if(p(a))for(;d<b;){if(e[f]=a.charCodeAt(d),++f,++d,f==this.Sa){Ma(this,e);f=0;break}}else for(;d<b;)if(e[f]=a[d],++f,++d,f==this.Sa){Ma(this,e);f=0;break}}this.Tb=f;this.Xd+=b}};var t=Array.prototype,Na=t.indexOf?function(a,b,c){return t.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(p(a))return p(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},Oa=t.forEach?function(a,b,c){t.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=p(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},Pa=t.filter?function(a,b,c){return t.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=p(a)?
a.split(""):a,k=0;k<d;k++)if(k in g){var l=g[k];b.call(c,l,k,a)&&(e[f++]=l)}return e},Qa=t.map?function(a,b,c){return t.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=p(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e},Ra=t.reduce?function(a,b,c,d){for(var e=[],f=1,g=arguments.length;f<g;f++)e.push(arguments[f]);d&&(e[0]=q(b,d));return t.reduce.apply(a,e)}:function(a,b,c,d){var e=c;Oa(a,function(c,g){e=b.call(d,e,c,g,a)});return e},Sa=t.every?function(a,b,
c){return t.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=p(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};function Ta(a,b){var c=Ua(a,b,void 0);return 0>c?null:p(a)?a.charAt(c):a[c]}function Ua(a,b,c){for(var d=a.length,e=p(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1}function Va(a,b){var c=Na(a,b);0<=c&&t.splice.call(a,c,1)}function Wa(a,b,c){return 2>=arguments.length?t.slice.call(a,b):t.slice.call(a,b,c)}
function Xa(a,b){a.sort(b||Ya)}function Ya(a,b){return a>b?1:a<b?-1:0};var Za=-1!=Ha.indexOf("Opera")||-1!=Ha.indexOf("OPR"),$a=-1!=Ha.indexOf("Trident")||-1!=Ha.indexOf("MSIE"),ab=-1!=Ha.indexOf("Gecko")&&-1==Ha.toLowerCase().indexOf("webkit")&&!(-1!=Ha.indexOf("Trident")||-1!=Ha.indexOf("MSIE")),bb=-1!=Ha.toLowerCase().indexOf("webkit");
(function(){var a="",b;if(Za&&aa.opera)return a=aa.opera.version,ha(a)?a():a;ab?b=/rv\:([^\);]+)(\)|;)/:$a?b=/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/:bb&&(b=/WebKit\/(\S+)/);b&&(a=(a=b.exec(Ha))?a[1]:"");return $a&&(b=(b=aa.document)?b.documentMode:void 0,b>parseFloat(a))?String(b):a})();var cb=null,db=null,eb=null;function fb(a,b){if(!fa(a))throw Error("encodeByteArray takes an array as a parameter");gb();for(var c=b?db:cb,d=[],e=0;e<a.length;e+=3){var f=a[e],g=e+1<a.length,k=g?a[e+1]:0,l=e+2<a.length,m=l?a[e+2]:0,w=f>>2,f=(f&3)<<4|k>>4,k=(k&15)<<2|m>>6,m=m&63;l||(m=64,g||(k=64));d.push(c[w],c[f],c[k],c[m])}return d.join("")}
function gb(){if(!cb){cb={};db={};eb={};for(var a=0;65>a;a++)cb[a]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a),db[a]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(a),eb[db[a]]=a,62<=a&&(eb["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a)]=a)}};function u(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function v(a,b){if(Object.prototype.hasOwnProperty.call(a,b))return a[b]}function hb(a,b){for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&b(c,a[c])}function ib(a){var b={};hb(a,function(a,d){b[a]=d});return b};function x(a,b,c,d){var e;d<b?e="at least "+b:d>c&&(e=0===c?"none":"no more than "+c);if(e)throw Error(a+" failed: Was called with "+d+(1===d?" argument.":" arguments.")+" Expects "+e+".");}function z(a,b,c){var d="";switch(b){case 1:d=c?"first":"First";break;case 2:d=c?"second":"Second";break;case 3:d=c?"third":"Third";break;case 4:d=c?"fourth":"Fourth";break;default:throw Error("errorPrefix called with argumentNumber > 4.  Need to update it?");}return a=a+" failed: "+(d+" argument ")}
function A(a,b,c,d){if((!d||n(c))&&!ha(c))throw Error(z(a,b,d)+"must be a valid function.");}function jb(a,b,c){if(n(c)&&(!ia(c)||null===c))throw Error(z(a,b,!0)+"must be a valid context object.");};function kb(a){return"undefined"!==typeof JSON&&n(JSON.parse)?JSON.parse(a):Aa(a)}function B(a){if("undefined"!==typeof JSON&&n(JSON.stringify))a=JSON.stringify(a);else{var b=[];Ca(new Ba,a,b);a=b.join("")}return a};function lb(){this.Nd=C}lb.prototype.j=function(a){return this.Nd.ka(a)};lb.prototype.toString=function(){return this.Nd.toString()};function mb(){}mb.prototype.ff=function(){return null};mb.prototype.re=function(){return null};var nb=new mb;function ob(a,b,c){this.Bf=a;this.Ia=b;this.Dd=c}ob.prototype.ff=function(a){var b=this.Ia.C;if(pb(b,a))return b.j().K(a);b=null!=this.Dd?new qb(this.Dd,!0,!1):this.Ia.o();return this.Bf.Ta(a,b)};ob.prototype.re=function(a,b,c){var d=null!=this.Dd?this.Dd:rb(this.Ia);a=this.Bf.ge(d,b,1,c,a);return 0===a.length?null:a[0]};function sb(){this.ob=[]}function tb(a,b){for(var c=null,d=0;d<b.length;d++){var e=b[d],f=e.Rb();null===c||f.aa(c.Rb())||(a.ob.push(c),c=null);null===c&&(c=new ub(f));c.add(e)}c&&a.ob.push(c)}function vb(a,b,c){tb(a,c);wb(a,function(a){return a.aa(b)})}function xb(a,b,c){tb(a,c);wb(a,function(a){return a.contains(b)||b.contains(a)})}
function wb(a,b){for(var c=!0,d=0;d<a.ob.length;d++){var e=a.ob[d];if(e)if(e=e.Rb(),b(e)){for(var e=a.ob[d],f=0;f<e.kd.length;f++){var g=e.kd[f];if(null!==g){e.kd[f]=null;var k=g.Mb();yb&&zb("event: "+g.toString());Ab(k)}}a.ob[d]=null}else c=!1}c&&(a.ob=[])}function ub(a){this.Ea=a;this.kd=[]}ub.prototype.add=function(a){this.kd.push(a)};ub.prototype.Rb=function(){return this.Ea};function D(a,b,c,d){this.type=a;this.Ha=b;this.Ua=c;this.De=d;this.Jd=void 0}function Bb(a){return new D(Cb,a)}var Cb="value";function Db(a,b,c,d){this.oe=b;this.Rd=c;this.Jd=d;this.jd=a}Db.prototype.Rb=function(){var a=this.Rd.dc();return"value"===this.jd?a.path:a.parent().path};Db.prototype.se=function(){return this.jd};Db.prototype.Mb=function(){return this.oe.Mb(this)};Db.prototype.toString=function(){return this.Rb().toString()+":"+this.jd+":"+B(this.Rd.cf())};function Eb(a,b,c){this.oe=a;this.error=b;this.path=c}Eb.prototype.Rb=function(){return this.path};Eb.prototype.se=function(){return"cancel"};
Eb.prototype.Mb=function(){return this.oe.Mb(this)};Eb.prototype.toString=function(){return this.path.toString()+":cancel"};function qb(a,b,c){this.A=a;this.Z=b;this.Lb=c}function Fb(a){return a.Z}function pb(a,b){return a.Z&&!a.Lb||a.A.Da(b)}qb.prototype.j=function(){return this.A};function Gb(a,b){this.C=a;this.Pd=b}function Hb(a,b,c,d){return new Gb(new qb(b,c,d),a.Pd)}function Ib(a){return a.C.Z?a.C.j():null}Gb.prototype.o=function(){return this.Pd};function rb(a){return a.Pd.Z?a.Pd.j():null};function Jb(a){this.Pf=a;this.sd=null}Jb.prototype.get=function(){var a=this.Pf.get(),b=xa(a);if(this.sd)for(var c in this.sd)b[c]-=this.sd[c];this.sd=a;return b};function Kb(a,b){this.zf={};this.Td=new Jb(a);this.S=b;var c=1E4+2E4*Math.random();setTimeout(q(this.tf,this),Math.floor(c))}Kb.prototype.tf=function(){var a=this.Td.get(),b={},c=!1,d;for(d in a)0<a[d]&&u(this.zf,d)&&(b[d]=a[d],c=!0);c&&(a=this.S,a.ja&&(b={c:b},a.f("reportStats",b),a.Ba("s",b)));setTimeout(q(this.tf,this),Math.floor(6E5*Math.random()))};function Lb(){this.uc={}}function Mb(a,b,c){n(c)||(c=1);u(a.uc,b)||(a.uc[b]=0);a.uc[b]+=c}Lb.prototype.get=function(){return xa(this.uc)};var Nb={},Ob={};function Pb(a){a=a.toString();Nb[a]||(Nb[a]=new Lb);return Nb[a]}function Qb(a,b){var c=a.toString();Ob[c]||(Ob[c]=b());return Ob[c]};function E(a,b){this.name=a;this.V=b}function Rb(a,b){return new E(a,b)};function Sb(a,b){return Tb(a.name,b.name)}function Ub(a,b){return Tb(a,b)};function Vb(a,b,c){this.type=Wb;this.source=a;this.path=b;this.Ga=c}Vb.prototype.Mc=function(a){return this.path.e()?new Vb(this.source,F,this.Ga.K(a)):new Vb(this.source,H(this.path),this.Ga)};Vb.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" overwrite: "+this.Ga.toString()+")"};function Xb(a,b){this.type=Yb;this.source=Zb;this.path=a;this.Ne=b}Xb.prototype.Mc=function(){return this.path.e()?this:new Xb(H(this.path),this.Ne)};Xb.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" ack write revert="+this.Ne+")"};function $b(a,b){this.type=ac;this.source=a;this.path=b}$b.prototype.Mc=function(){return this.path.e()?new $b(this.source,F):new $b(this.source,H(this.path))};$b.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" listen_complete)"};function bc(a,b){this.Ja=a;this.va=b?b:cc}h=bc.prototype;h.La=function(a,b){return new bc(this.Ja,this.va.La(a,b,this.Ja).Y(null,null,!1,null,null))};h.remove=function(a){return new bc(this.Ja,this.va.remove(a,this.Ja).Y(null,null,!1,null,null))};h.get=function(a){for(var b,c=this.va;!c.e();){b=this.Ja(a,c.key);if(0===b)return c.value;0>b?c=c.left:0<b&&(c=c.right)}return null};
function dc(a,b){for(var c,d=a.va,e=null;!d.e();){c=a.Ja(b,d.key);if(0===c){if(d.left.e())return e?e.key:null;for(d=d.left;!d.right.e();)d=d.right;return d.key}0>c?d=d.left:0<c&&(e=d,d=d.right)}throw Error("Attempted to find predecessor key for a nonexistent key.  What gives?");}h.e=function(){return this.va.e()};h.count=function(){return this.va.count()};h.Ic=function(){return this.va.Ic()};h.Yb=function(){return this.va.Yb()};h.fa=function(a){return this.va.fa(a)};
h.Pb=function(a){return new ec(this.va,null,this.Ja,!1,a)};h.Qb=function(a,b){return new ec(this.va,a,this.Ja,!1,b)};h.Sb=function(a,b){return new ec(this.va,a,this.Ja,!0,b)};h.hf=function(a){return new ec(this.va,null,this.Ja,!0,a)};function ec(a,b,c,d,e){this.Md=e||null;this.ye=d;this.Na=[];for(e=1;!a.e();)if(e=b?c(a.key,b):1,d&&(e*=-1),0>e)a=this.ye?a.left:a.right;else if(0===e){this.Na.push(a);break}else this.Na.push(a),a=this.ye?a.right:a.left}
function I(a){if(0===a.Na.length)return null;var b=a.Na.pop(),c;c=a.Md?a.Md(b.key,b.value):{key:b.key,value:b.value};if(a.ye)for(b=b.left;!b.e();)a.Na.push(b),b=b.right;else for(b=b.right;!b.e();)a.Na.push(b),b=b.left;return c}function fc(a){if(0===a.Na.length)return null;var b;b=a.Na;b=b[b.length-1];return a.Md?a.Md(b.key,b.value):{key:b.key,value:b.value}}function gc(a,b,c,d,e){this.key=a;this.value=b;this.color=null!=c?c:!0;this.left=null!=d?d:cc;this.right=null!=e?e:cc}h=gc.prototype;
h.Y=function(a,b,c,d,e){return new gc(null!=a?a:this.key,null!=b?b:this.value,null!=c?c:this.color,null!=d?d:this.left,null!=e?e:this.right)};h.count=function(){return this.left.count()+1+this.right.count()};h.e=function(){return!1};h.fa=function(a){return this.left.fa(a)||a(this.key,this.value)||this.right.fa(a)};function hc(a){return a.left.e()?a:hc(a.left)}h.Ic=function(){return hc(this).key};h.Yb=function(){return this.right.e()?this.key:this.right.Yb()};
h.La=function(a,b,c){var d,e;e=this;d=c(a,e.key);e=0>d?e.Y(null,null,null,e.left.La(a,b,c),null):0===d?e.Y(null,b,null,null,null):e.Y(null,null,null,null,e.right.La(a,b,c));return ic(e)};function jc(a){if(a.left.e())return cc;a.left.ca()||a.left.left.ca()||(a=kc(a));a=a.Y(null,null,null,jc(a.left),null);return ic(a)}
h.remove=function(a,b){var c,d;c=this;if(0>b(a,c.key))c.left.e()||c.left.ca()||c.left.left.ca()||(c=kc(c)),c=c.Y(null,null,null,c.left.remove(a,b),null);else{c.left.ca()&&(c=lc(c));c.right.e()||c.right.ca()||c.right.left.ca()||(c=mc(c),c.left.left.ca()&&(c=lc(c),c=mc(c)));if(0===b(a,c.key)){if(c.right.e())return cc;d=hc(c.right);c=c.Y(d.key,d.value,null,null,jc(c.right))}c=c.Y(null,null,null,null,c.right.remove(a,b))}return ic(c)};h.ca=function(){return this.color};
function ic(a){a.right.ca()&&!a.left.ca()&&(a=nc(a));a.left.ca()&&a.left.left.ca()&&(a=lc(a));a.left.ca()&&a.right.ca()&&(a=mc(a));return a}function kc(a){a=mc(a);a.right.left.ca()&&(a=a.Y(null,null,null,null,lc(a.right)),a=nc(a),a=mc(a));return a}function nc(a){return a.right.Y(null,null,a.color,a.Y(null,null,!0,null,a.right.left),null)}function lc(a){return a.left.Y(null,null,a.color,null,a.Y(null,null,!0,a.left.right,null))}
function mc(a){return a.Y(null,null,!a.color,a.left.Y(null,null,!a.left.color,null,null),a.right.Y(null,null,!a.right.color,null,null))}function oc(){}h=oc.prototype;h.Y=function(){return this};h.La=function(a,b){return new gc(a,b,null)};h.remove=function(){return this};h.count=function(){return 0};h.e=function(){return!0};h.fa=function(){return!1};h.Ic=function(){return null};h.Yb=function(){return null};h.ca=function(){return!1};var cc=new oc;function pc(a,b){return a&&"object"===typeof a?(J(".sv"in a,"Unexpected leaf node or priority contents"),b[a[".sv"]]):a}function qc(a,b){var c=new rc;sc(a,new K(""),function(a,e){c.ec(a,tc(e,b))});return c}function tc(a,b){var c=a.L().I(),c=pc(c,b),d;if(a.M()){var e=pc(a.za(),b);return e!==a.za()||c!==a.L().I()?new uc(e,L(c)):a}d=a;c!==a.L().I()&&(d=d.$(new uc(c)));a.U(M,function(a,c){var e=tc(c,b);e!==c&&(d=d.P(a,e))});return d};function K(a,b){if(1==arguments.length){this.w=a.split("/");for(var c=0,d=0;d<this.w.length;d++)0<this.w[d].length&&(this.w[c]=this.w[d],c++);this.w.length=c;this.da=0}else this.w=a,this.da=b}function N(a,b){var c=O(a);if(null===c)return b;if(c===O(b))return N(H(a),H(b));throw Error("INTERNAL ERROR: innerPath ("+b+") is not within outerPath ("+a+")");}function O(a){return a.da>=a.w.length?null:a.w[a.da]}function vc(a){return a.w.length-a.da}
function H(a){var b=a.da;b<a.w.length&&b++;return new K(a.w,b)}function wc(a){return a.da<a.w.length?a.w[a.w.length-1]:null}h=K.prototype;h.toString=function(){for(var a="",b=this.da;b<this.w.length;b++)""!==this.w[b]&&(a+="/"+this.w[b]);return a||"/"};h.parent=function(){if(this.da>=this.w.length)return null;for(var a=[],b=this.da;b<this.w.length-1;b++)a.push(this.w[b]);return new K(a,0)};
h.u=function(a){for(var b=[],c=this.da;c<this.w.length;c++)b.push(this.w[c]);if(a instanceof K)for(c=a.da;c<a.w.length;c++)b.push(a.w[c]);else for(a=a.split("/"),c=0;c<a.length;c++)0<a[c].length&&b.push(a[c]);return new K(b,0)};h.e=function(){return this.da>=this.w.length};h.aa=function(a){if(vc(this)!==vc(a))return!1;for(var b=this.da,c=a.da;b<=this.w.length;b++,c++)if(this.w[b]!==a.w[c])return!1;return!0};
h.contains=function(a){var b=this.da,c=a.da;if(vc(this)>vc(a))return!1;for(;b<this.w.length;){if(this.w[b]!==a.w[c])return!1;++b;++c}return!0};var F=new K("");function xc(){this.children={};this.ad=0;this.value=null}function yc(a,b,c){this.yd=a?a:"";this.Oc=b?b:null;this.A=c?c:new xc}function zc(a,b){for(var c=b instanceof K?b:new K(b),d=a,e;null!==(e=O(c));)d=new yc(e,d,v(d.A.children,e)||new xc),c=H(c);return d}h=yc.prototype;h.za=function(){return this.A.value};function Ac(a,b){J("undefined"!==typeof b,"Cannot set value to undefined");a.A.value=b;Bc(a)}h.clear=function(){this.A.value=null;this.A.children={};this.A.ad=0;Bc(this)};
h.ld=function(){return 0<this.A.ad};h.e=function(){return null===this.za()&&!this.ld()};h.U=function(a){var b=this;r(this.A.children,function(c,d){a(new yc(d,b,c))})};function Cc(a,b,c,d){c&&!d&&b(a);a.U(function(a){Cc(a,b,!0,d)});c&&d&&b(a)}function Dc(a,b){for(var c=a.parent();null!==c&&!b(c);)c=c.parent()}h.path=function(){return new K(null===this.Oc?this.yd:this.Oc.path()+"/"+this.yd)};h.name=function(){return this.yd};h.parent=function(){return this.Oc};
function Bc(a){if(null!==a.Oc){var b=a.Oc,c=a.yd,d=a.e(),e=u(b.A.children,c);d&&e?(delete b.A.children[c],b.A.ad--,Bc(b)):d||e||(b.A.children[c]=a.A,b.A.ad++,Bc(b))}};function Ec(){this.pc={}}Ec.prototype.set=function(a,b){null==b?delete this.pc[a]:this.pc[a]=b};Ec.prototype.get=function(a){return u(this.pc,a)?this.pc[a]:null};Ec.prototype.remove=function(a){delete this.pc[a]};Ec.prototype.lf=!0;function Fc(a){this.vc=a;this.Id="firebase:"}h=Fc.prototype;h.set=function(a,b){null==b?this.vc.removeItem(this.Id+a):this.vc.setItem(this.Id+a,B(b))};h.get=function(a){a=this.vc.getItem(this.Id+a);return null==a?null:kb(a)};h.remove=function(a){this.vc.removeItem(this.Id+a)};h.lf=!1;h.toString=function(){return this.vc.toString()};function Gc(a){try{if("undefined"!==typeof window&&"undefined"!==typeof window[a]){var b=window[a];b.setItem("firebase:sentinel","cache");b.removeItem("firebase:sentinel");return new Fc(b)}}catch(c){}return new Ec}var Hc=Gc("localStorage"),P=Gc("sessionStorage");function Ic(a,b,c,d,e){this.host=a.toLowerCase();this.domain=this.host.substr(this.host.indexOf(".")+1);this.Bb=b;this.ub=c;this.Eg=d;this.Hd=e||"";this.Ma=Hc.get("host:"+a)||this.host}function Jc(a,b){b!==a.Ma&&(a.Ma=b,"s-"===a.Ma.substr(0,2)&&Hc.set("host:"+a.host,a.Ma))}Ic.prototype.toString=function(){var a=(this.Bb?"https://":"http://")+this.host;this.Hd&&(a+="<"+this.Hd+">");return a};var Kc=function(){var a=1;return function(){return a++}}();function J(a,b){if(!a)throw Lc(b);}function Lc(a){return Error("Firebase INTERNAL ASSERT FAILED:"+a)}
function Mc(a){try{var b;if("undefined"!==typeof atob)b=atob(a);else{gb();for(var c=eb,d=[],e=0;e<a.length;){var f=c[a.charAt(e++)],g=e<a.length?c[a.charAt(e)]:0;++e;var k=e<a.length?c[a.charAt(e)]:64;++e;var l=e<a.length?c[a.charAt(e)]:64;++e;if(null==f||null==g||null==k||null==l)throw Error();d.push(f<<2|g>>4);64!=k&&(d.push(g<<4&240|k>>2),64!=l&&d.push(k<<6&192|l))}if(8192>d.length)b=String.fromCharCode.apply(null,d);else{a="";for(c=0;c<d.length;c+=8192)a+=String.fromCharCode.apply(null,Wa(d,c,
c+8192));b=a}}return b}catch(m){zb("base64Decode failed: ",m)}return null}function Nc(a){var b=Oc(a);a=new La;a.update(b);var b=[],c=8*a.Xd;56>a.Tb?a.update(a.Ed,56-a.Tb):a.update(a.Ed,a.Sa-(a.Tb-56));for(var d=a.Sa-1;56<=d;d--)a.fe[d]=c&255,c/=256;Ma(a,a.fe);for(d=c=0;5>d;d++)for(var e=24;0<=e;e-=8)b[c]=a.R[d]>>e&255,++c;return fb(b)}
function Pc(a){for(var b="",c=0;c<arguments.length;c++)b=fa(arguments[c])?b+Pc.apply(null,arguments[c]):"object"===typeof arguments[c]?b+B(arguments[c]):b+arguments[c],b+=" ";return b}var yb=null,Qc=!0;function zb(a){!0===Qc&&(Qc=!1,null===yb&&!0===P.get("logging_enabled")&&Rc(!0));if(yb){var b=Pc.apply(null,arguments);yb(b)}}function Sc(a){return function(){zb(a,arguments)}}
function Tc(a){if("undefined"!==typeof console){var b="FIREBASE INTERNAL ERROR: "+Pc.apply(null,arguments);"undefined"!==typeof console.error?console.error(b):console.log(b)}}function Uc(a){var b=Pc.apply(null,arguments);throw Error("FIREBASE FATAL ERROR: "+b);}function Q(a){if("undefined"!==typeof console){var b="FIREBASE WARNING: "+Pc.apply(null,arguments);"undefined"!==typeof console.warn?console.warn(b):console.log(b)}}
function Vc(a){var b="",c="",d="",e="",f=!0,g="https",k=443;if(p(a)){var l=a.indexOf("//");0<=l&&(g=a.substring(0,l-1),a=a.substring(l+2));l=a.indexOf("/");-1===l&&(l=a.length);b=a.substring(0,l);e="";a=a.substring(l).split("/");for(l=0;l<a.length;l++)if(0<a[l].length){var m=a[l];try{m=decodeURIComponent(m.replace(/\+/g," "))}catch(w){}e+="/"+m}a=b.split(".");3===a.length?(c=a[1],d=a[0].toLowerCase()):2===a.length&&(c=a[0]);l=b.indexOf(":");0<=l&&(f="https"===g||"wss"===g,k=b.substring(l+1),isFinite(k)&&
(k=String(k)),k=p(k)?/^\s*-?0x/i.test(k)?parseInt(k,16):parseInt(k,10):NaN)}return{host:b,port:k,domain:c,Bg:d,Bb:f,scheme:g,Pc:e}}function Wc(a){return ga(a)&&(a!=a||a==Number.POSITIVE_INFINITY||a==Number.NEGATIVE_INFINITY)}
function Xc(a){if("complete"===document.readyState)a();else{var b=!1,c=function(){document.body?b||(b=!0,a()):setTimeout(c,Math.floor(10))};document.addEventListener?(document.addEventListener("DOMContentLoaded",c,!1),window.addEventListener("load",c,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",function(){"complete"===document.readyState&&c()}),window.attachEvent("onload",c))}}
function Tb(a,b){if(a===b)return 0;if("[MIN_NAME]"===a||"[MAX_NAME]"===b)return-1;if("[MIN_NAME]"===b||"[MAX_NAME]"===a)return 1;var c=Yc(a),d=Yc(b);return null!==c?null!==d?0==c-d?a.length-b.length:c-d:-1:null!==d?1:a<b?-1:1}function Zc(a,b){if(b&&a in b)return b[a];throw Error("Missing required key ("+a+") in object: "+B(b));}
function $c(a){if("object"!==typeof a||null===a)return B(a);var b=[],c;for(c in a)b.push(c);b.sort();c="{";for(var d=0;d<b.length;d++)0!==d&&(c+=","),c+=B(b[d]),c+=":",c+=$c(a[b[d]]);return c+"}"}function ad(a,b){if(a.length<=b)return[a];for(var c=[],d=0;d<a.length;d+=b)d+b>a?c.push(a.substring(d,a.length)):c.push(a.substring(d,d+b));return c}function bd(a,b){if(ea(a))for(var c=0;c<a.length;++c)b(c,a[c]);else r(a,b)}
function cd(a){J(!Wc(a),"Invalid JSON number");var b,c,d,e;0===a?(d=c=0,b=-Infinity===1/a?1:0):(b=0>a,a=Math.abs(a),a>=Math.pow(2,-1022)?(d=Math.min(Math.floor(Math.log(a)/Math.LN2),1023),c=d+1023,d=Math.round(a*Math.pow(2,52-d)-Math.pow(2,52))):(c=0,d=Math.round(a/Math.pow(2,-1074))));e=[];for(a=52;a;--a)e.push(d%2?1:0),d=Math.floor(d/2);for(a=11;a;--a)e.push(c%2?1:0),c=Math.floor(c/2);e.push(b?1:0);e.reverse();b=e.join("");c="";for(a=0;64>a;a+=8)d=parseInt(b.substr(a,8),2).toString(16),1===d.length&&
(d="0"+d),c+=d;return c.toLowerCase()}var dd=/^-?\d{1,10}$/;function Yc(a){return dd.test(a)&&(a=Number(a),-2147483648<=a&&2147483647>=a)?a:null}function Ab(a){try{a()}catch(b){setTimeout(function(){Q("Exception was thrown by user callback.",b.stack||"");throw b;},Math.floor(0))}}function R(a,b){if(ha(a)){var c=Array.prototype.slice.call(arguments,1).slice();Ab(function(){a.apply(null,c)})}};function Oc(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);55296<=e&&56319>=e&&(e-=55296,d++,J(d<a.length,"Surrogate pair missing trail surrogate."),e=65536+(e<<10)+(a.charCodeAt(d)-56320));128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(65536>e?b[c++]=e>>12|224:(b[c++]=e>>18|240,b[c++]=e>>12&63|128),b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b};function ed(a){var b={},c={},d={},e="";try{var f=a.split("."),b=kb(Mc(f[0])||""),c=kb(Mc(f[1])||""),e=f[2],d=c.d||{};delete c.d}catch(g){}return{Hg:b,je:c,data:d,yg:e}}function fd(a){a=ed(a).je;return"object"===typeof a&&a.hasOwnProperty("iat")?v(a,"iat"):null}function gd(a){a=ed(a);var b=a.je;return!!a.yg&&!!b&&"object"===typeof b&&b.hasOwnProperty("iat")};function hd(a){this.W=a;this.g=a.n.g}function id(a,b,c,d){var e=[],f=[];Oa(b,function(b){"child_changed"===b.type&&a.g.ve(b.De,b.Ha)&&f.push(new D("child_moved",b.Ha,b.Ua))});jd(a,e,"child_removed",b,d,c);jd(a,e,"child_added",b,d,c);jd(a,e,"child_moved",f,d,c);jd(a,e,"child_changed",b,d,c);jd(a,e,Cb,b,d,c);return e}function jd(a,b,c,d,e,f){d=Pa(d,function(a){return a.type===c});Xa(d,q(a.Qf,a));Oa(d,function(c){var d=kd(a,c,f);Oa(e,function(e){e.wf(c.type)&&b.push(e.createEvent(d,a.W))})})}
function kd(a,b,c){"value"!==b.type&&"child_removed"!==b.type&&(b.Jd=c.gf(b.Ua,b.Ha,a.g));return b}hd.prototype.Qf=function(a,b){if(null==a.Ua||null==b.Ua)throw Lc("Should only compare child_ events.");return this.g.compare(new E(a.Ua,a.Ha),new E(b.Ua,b.Ha))};function ld(){this.Za={}}
function md(a,b){var c=b.type,d=b.Ua;J("child_added"==c||"child_changed"==c||"child_removed"==c,"Only child changes supported for tracking");J(".priority"!==d,"Only non-priority child changes can be tracked.");var e=v(a.Za,d);if(e){var f=e.type;if("child_added"==c&&"child_removed"==f)a.Za[d]=new D("child_changed",b.Ha,d,e.Ha);else if("child_removed"==c&&"child_added"==f)delete a.Za[d];else if("child_removed"==c&&"child_changed"==f)a.Za[d]=new D("child_removed",e.De,d);else if("child_changed"==c&&
"child_added"==f)a.Za[d]=new D("child_added",b.Ha,d);else if("child_changed"==c&&"child_changed"==f)a.Za[d]=new D("child_changed",b.Ha,d,e.De);else throw Lc("Illegal combination of changes: "+b+" occurred after "+e);}else a.Za[d]=b};function nd(a,b,c){this.Hb=a;this.lb=b;this.nb=c||null}h=nd.prototype;h.wf=function(a){return"value"===a};h.createEvent=function(a,b){var c=b.n.g;return new Db("value",this,new S(a.Ha,b.dc(),c))};h.Mb=function(a){var b=this.nb;if("cancel"===a.se()){J(this.lb,"Raising a cancel event on a listener with no cancel callback");var c=this.lb;return function(){c.call(b,a.error)}}var d=this.Hb;return function(){d.call(b,a.Rd)}};h.Ze=function(a,b){return this.lb?new Eb(this,a,b):null};
h.matches=function(a){return a instanceof nd?a.Hb&&this.Hb?a.Hb===this.Hb&&a.nb===this.nb:!0:!1};h.jf=function(){return null!==this.Hb};function od(a,b,c){this.ea=a;this.lb=b;this.nb=c}h=od.prototype;h.wf=function(a){a="children_added"===a?"child_added":a;return("children_removed"===a?"child_removed":a)in this.ea};h.Ze=function(a,b){return this.lb?new Eb(this,a,b):null};
h.createEvent=function(a,b){J(null!=a.Ua,"Child events should have a childName.");var c=b.dc().u(a.Ua);return new Db(a.type,this,new S(a.Ha,c,b.n.g),a.Jd)};h.Mb=function(a){var b=this.nb;if("cancel"===a.se()){J(this.lb,"Raising a cancel event on a listener with no cancel callback");var c=this.lb;return function(){c.call(b,a.error)}}var d=this.ea[a.jd];return function(){d.call(b,a.Rd,a.Jd)}};
h.matches=function(a){if(a instanceof od){if(!this.ea||!a.ea)return!0;if(this.nb===a.nb){var b=pa(a.ea);if(b===pa(this.ea)){if(1===b){var b=qa(a.ea),c=qa(this.ea);return c===b&&(!a.ea[b]||!this.ea[c]||a.ea[b]===this.ea[c])}return oa(this.ea,function(b,c){return a.ea[c]===b})}}}return!1};h.jf=function(){return null!==this.ea};function pd(a){this.g=a}h=pd.prototype;h.F=function(a,b,c,d,e){J(a.Bc(this.g),"A node must be indexed if only a child is updated");d=a.K(b);if(d.aa(c))return a;null!=e&&(c.e()?a.Da(b)?md(e,new D("child_removed",d,b)):J(a.M(),"A child remove without an old child only makes sense on a leaf node"):d.e()?md(e,new D("child_added",c,b)):md(e,new D("child_changed",c,b,d)));return a.M()&&c.e()?a:a.P(b,c).hb(this.g)};
h.pa=function(a,b,c){null!=c&&(a.M()||a.U(M,function(a,e){b.Da(a)||md(c,new D("child_removed",e,a))}),b.M()||b.U(M,function(b,e){if(a.Da(b)){var f=a.K(b);f.aa(e)||md(c,new D("child_changed",e,b,f))}else md(c,new D("child_added",e,b))}));return b.hb(this.g)};h.$=function(a,b){return a.e()?C:a.$(b)};h.Ca=function(){return!1};h.Nb=function(){return this};function qd(a){this.ue=new pd(a.g);this.g=a.g;var b;a.ia?(b=rd(a),b=a.g.td(sd(a),b)):b=a.g.xd();this.Vc=b;a.ra?(b=td(a),a=a.g.td(vd(a),b)):a=a.g.vd();this.xc=a}h=qd.prototype;h.matches=function(a){return 0>=this.g.compare(this.Vc,a)&&0>=this.g.compare(a,this.xc)};h.F=function(a,b,c,d,e){this.matches(new E(b,c))||(c=C);return this.ue.F(a,b,c,d,e)};h.pa=function(a,b,c){b.M()&&(b=C);var d=b.hb(this.g),d=d.$(C),e=this;b.U(M,function(a,b){e.matches(new E(a,b))||(d=d.P(a,C))});return this.ue.pa(a,d,c)};
h.$=function(a){return a};h.Ca=function(){return!0};h.Nb=function(){return this.ue};function wd(a){this.na=new qd(a);this.g=a.g;J(a.la,"Only valid if limit has been set");this.sa=a.sa;this.Ab=!(""===a.Fb?a.ia:"l"===a.Fb)}h=wd.prototype;h.F=function(a,b,c,d,e){this.na.matches(new E(b,c))||(c=C);return a.K(b).aa(c)?a:a.vb()<this.sa?this.na.Nb().F(a,b,c,d,e):xd(this,a,b,c,d,e)};
h.pa=function(a,b,c){var d;if(b.M()||b.e())d=C.hb(this.g);else if(2*this.sa<b.vb()&&b.Bc(this.g)){d=C.hb(this.g);b=this.Ab?b.Sb(this.na.xc,this.g):b.Qb(this.na.Vc,this.g);for(var e=0;0<b.Na.length&&e<this.sa;){var f=I(b),g;if(g=this.Ab?0>=this.g.compare(this.na.Vc,f):0>=this.g.compare(f,this.na.xc))d=d.P(f.name,f.V),e++;else break}}else{d=b.hb(this.g);d=d.$(C);var k,l,m;if(this.Ab){b=d.hf(this.g);k=this.na.xc;l=this.na.Vc;var w=yd(this.g);m=function(a,b){return w(b,a)}}else b=d.Pb(this.g),k=this.na.Vc,
l=this.na.xc,m=yd(this.g);for(var e=0,y=!1;0<b.Na.length;)f=I(b),!y&&0>=m(k,f)&&(y=!0),(g=y&&e<this.sa&&0>=m(f,l))?e++:d=d.P(f.name,C)}return this.na.Nb().pa(a,d,c)};h.$=function(a){return a};h.Ca=function(){return!0};h.Nb=function(){return this.na.Nb()};
function xd(a,b,c,d,e,f){var g;if(a.Ab){var k=yd(a.g);g=function(a,b){return k(b,a)}}else g=yd(a.g);J(b.vb()==a.sa,"");var l=new E(c,d),m=a.Ab?zd(b,a.g):Ad(b,a.g),w=a.na.matches(l);if(b.Da(c)){var y=b.K(c),m=e.re(a.g,m,a.Ab);null!=m&&m.name==c&&(m=e.re(a.g,m,a.Ab));e=null==m?1:g(m,l);if(w&&!d.e()&&0<=e)return null!=f&&md(f,new D("child_changed",d,c,y)),b.P(c,d);null!=f&&md(f,new D("child_removed",y,c));b=b.P(c,C);return null!=m&&a.na.matches(m)?(null!=f&&md(f,new D("child_added",m.V,m.name)),b.P(m.name,
m.V)):b}return d.e()?b:w&&0<=g(m,l)?(null!=f&&(md(f,new D("child_removed",m.V,m.name)),md(f,new D("child_added",d,c))),b.P(c,d).P(m.name,C)):b};function Bd(a,b){this.be=a;this.Of=b}function Cd(a){this.G=a}
Cd.prototype.Ya=function(a,b,c,d){var e=new ld,f;if(b.type===Wb)b.source.pe?c=Dd(this,a,b.path,b.Ga,c,d,e):(J(b.source.ef,"Unknown source."),f=b.source.Te,c=Ed(this,a,b.path,b.Ga,c,d,f,e));else if(b.type===Fd)b.source.pe?c=Gd(this,a,b.path,b.children,c,d,e):(J(b.source.ef,"Unknown source."),f=b.source.Te,c=Hd(this,a,b.path,b.children,c,d,f,e));else if(b.type===Yb)if(b.Ne)if(f=b.path,null!=c.kc(f))c=a;else{b=new ob(c,a,d);d=a.C.j();if(f.e()||".priority"===O(f))Fb(a.o())?b=c.qa(rb(a)):(b=a.o().j(),
J(b instanceof T,"serverChildren would be complete if leaf node"),b=c.qc(b)),b=this.G.pa(d,b,e);else{f=O(f);var g=c.Ta(f,a.o());null==g&&pb(a.o(),f)&&(g=d.K(f));b=null!=g?this.G.F(d,f,g,b,e):a.C.j().Da(f)?this.G.F(d,f,C,b,e):d;b.e()&&Fb(a.o())&&(d=c.qa(rb(a)),d.M()&&(b=this.G.pa(b,d,e)))}d=Fb(a.o())||null!=c.kc(F);c=Hb(a,b,d,this.G.Ca())}else c=Id(this,a,b.path,c,d,e);else if(b.type===ac)d=b.path,b=a.o(),f=b.j(),g=b.Z||d.e(),c=Jd(this,new Gb(a.C,new qb(f,g,b.Lb)),d,c,nb,e);else throw Lc("Unknown operation type: "+
b.type);e=ra(e.Za);d=c;b=d.C;b.Z&&(f=b.j().M()||b.j().e(),g=Ib(a),(0<e.length||!a.C.Z||f&&!b.j().aa(g)||!b.j().L().aa(g.L()))&&e.push(Bb(Ib(d))));return new Bd(c,e)};
function Jd(a,b,c,d,e,f){var g=b.C;if(null!=d.kc(c))return b;var k;if(c.e())J(Fb(b.o()),"If change path is empty, we must have complete server data"),b.o().Lb?(e=rb(b),d=d.qc(e instanceof T?e:C)):d=d.qa(rb(b)),f=a.G.pa(b.C.j(),d,f);else{var l=O(c);if(".priority"==l)J(1==vc(c),"Can't have a priority with additional path components"),f=g.j(),k=b.o().j(),d=d.Zc(c,f,k),f=null!=d?a.G.$(f,d):g.j();else{var m=H(c);pb(g,l)?(k=b.o().j(),d=d.Zc(c,g.j(),k),d=null!=d?g.j().K(l).F(m,d):g.j().K(l)):d=d.Ta(l,b.o());
f=null!=d?a.G.F(g.j(),l,d,e,f):g.j()}}return Hb(b,f,g.Z||c.e(),a.G.Ca())}function Ed(a,b,c,d,e,f,g,k){var l=b.o();g=g?a.G:a.G.Nb();if(c.e())d=g.pa(l.j(),d,null);else if(g.Ca()&&!l.Lb)d=l.j().F(c,d),d=g.pa(l.j(),d,null);else{var m=O(c);if((c.e()?!l.Z||l.Lb:!pb(l,O(c)))&&1<vc(c))return b;d=l.j().K(m).F(H(c),d);d=".priority"==m?g.$(l.j(),d):g.F(l.j(),m,d,nb,null)}l=l.Z||c.e();b=new Gb(b.C,new qb(d,l,g.Ca()));return Jd(a,b,c,e,new ob(e,b,f),k)}
function Dd(a,b,c,d,e,f,g){var k=b.C;e=new ob(e,b,f);if(c.e())g=a.G.pa(b.C.j(),d,g),a=Hb(b,g,!0,a.G.Ca());else if(f=O(c),".priority"===f)g=a.G.$(b.C.j(),d),a=Hb(b,g,k.Z,k.Lb);else{var l=H(c);c=k.j().K(f);if(!l.e()){var m=e.ff(f);d=null!=m?".priority"===wc(l)&&m.ka(l.parent()).e()?m:m.F(l,d):C}c.aa(d)?a=b:(g=a.G.F(k.j(),f,d,e,g),a=Hb(b,g,k.Z,a.G.Ca()))}return a}
function Gd(a,b,c,d,e,f,g){var k=b;Kd(d,function(d,m){var w=c.u(d);pb(b.C,O(w))&&(k=Dd(a,k,w,m,e,f,g))});Kd(d,function(d,m){var w=c.u(d);pb(b.C,O(w))||(k=Dd(a,k,w,m,e,f,g))});return k}function Ld(a,b){Kd(b,function(b,d){a=a.F(b,d)});return a}
function Hd(a,b,c,d,e,f,g,k){if(b.o().j().e()&&!Fb(b.o()))return b;var l=b;c=c.e()?d:Md(Nd,c,d);var m=b.o().j();c.children.fa(function(c,d){if(m.Da(c)){var G=b.o().j().K(c),G=Ld(G,d);l=Ed(a,l,new K(c),G,e,f,g,k)}});c.children.fa(function(c,d){var G=!Fb(b.o())&&null==d.value;m.Da(c)||G||(G=b.o().j().K(c),G=Ld(G,d),l=Ed(a,l,new K(c),G,e,f,g,k))});return l}
function Id(a,b,c,d,e,f){if(null!=d.kc(c))return b;var g=new ob(d,b,e),k=e=b.C.j();if(Fb(b.o())){if(c.e())e=d.qa(rb(b)),k=a.G.pa(b.C.j(),e,f);else if(".priority"===O(c)){var l=d.Ta(O(c),b.o());null==l||e.e()||e.L().aa(l)||(k=a.G.$(e,l))}else l=O(c),e=d.Ta(l,b.o()),null!=e&&(k=a.G.F(b.C.j(),l,e,g,f));e=!0}else if(b.C.Z||c.e())k=e,e=b.C.j(),e.M()||e.U(M,function(c){var e=d.Ta(c,b.o());null!=e&&(k=a.G.F(k,c,e,g,f))}),e=b.C.Z;else{l=O(c);if(1==vc(c)||pb(b.C,l))c=d.Ta(l,b.o()),null!=c&&(k=a.G.F(e,l,c,
g,f));e=!1}return Hb(b,k,e,a.G.Ca())};function Od(a,b){this.W=a;var c=a.n,d=new pd(c.g),c=Pd(c)?new pd(c.g):c.la?new wd(c):new qd(c);this.sf=new Cd(c);var e=b.o(),f=b.C,g=d.pa(C,e.j(),null),k=c.pa(C,f.j(),null);this.Ia=new Gb(new qb(k,f.Z,c.Ca()),new qb(g,e.Z,d.Ca()));this.Va=[];this.Uf=new hd(a)}function Qd(a){return a.W}h=Od.prototype;h.o=function(){return this.Ia.o().j()};h.bb=function(a){var b=rb(this.Ia);return b&&(Pd(this.W.n)||!a.e()&&!b.K(O(a)).e())?b.ka(a):null};h.e=function(){return 0===this.Va.length};h.Gb=function(a){this.Va.push(a)};
h.gb=function(a,b){var c=[];if(b){J(null==a,"A cancel should cancel all event registrations.");var d=this.W.path;Oa(this.Va,function(a){(a=a.Ze(b,d))&&c.push(a)})}if(a){for(var e=[],f=0;f<this.Va.length;++f){var g=this.Va[f];if(!g.matches(a))e.push(g);else if(a.jf()){e=e.concat(this.Va.slice(f+1));break}}this.Va=e}else this.Va=[];return c};
h.Ya=function(a,b,c){a.type===Fd&&null!==a.source.zb&&(J(rb(this.Ia),"We should always have a full cache before handling merges"),J(Ib(this.Ia),"Missing event cache, even though we have a server cache"));var d=this.Ia;a=this.sf.Ya(d,a,b,c);b=this.sf;c=a.be;J(c.C.j().Bc(b.G.g),"Event snap not indexed");J(c.o().j().Bc(b.G.g),"Server snap not indexed");J(Fb(a.be.o())||!Fb(d.o()),"Once a server snap is complete, it should never go back");this.Ia=a.be;return Rd(this,a.Of,a.be.C.j(),null)};
function Sd(a,b){var c=a.Ia.C,d=[];c.j().M()||c.j().U(M,function(a,b){d.push(new D("child_added",b,a))});c.Z&&d.push(Bb(c.j()));return Rd(a,d,c.j(),b)}function Rd(a,b,c,d){return id(a.Uf,b,c,d?[d]:a.Va)};function Td(){}var Ud={};function yd(a){return q(a.compare,a)}Td.prototype.ve=function(a,b){return 0!==this.compare(new E("[MIN_NAME]",a),new E("[MIN_NAME]",b))};Td.prototype.xd=function(){return Vd};function Wd(a){this.Vb=a}ma(Wd,Td);h=Wd.prototype;h.rd=function(a){return!a.K(this.Vb).e()};h.compare=function(a,b){var c=a.V.K(this.Vb),d=b.V.K(this.Vb),c=c.cd(d);return 0===c?Tb(a.name,b.name):c};h.td=function(a,b){var c=L(a),c=C.P(this.Vb,c);return new E(b,c)};
h.vd=function(){var a=C.P(this.Vb,Xd);return new E("[MAX_NAME]",a)};h.toString=function(){return this.Vb};var M=new Wd(".priority");function Yd(){}ma(Yd,Td);h=Yd.prototype;h.compare=function(a,b){return Tb(a.name,b.name)};h.rd=function(){throw Lc("KeyIndex.isDefinedOn not expected to be called.");};h.ve=function(){return!1};h.xd=function(){return Vd};h.vd=function(){return new E("[MAX_NAME]",C)};h.td=function(a){J(p(a),"KeyIndex indexValue must always be a string.");return new E(a,C)};
h.toString=function(){return".key"};var Zd=new Yd;function $d(){}ma($d,Td);h=$d.prototype;h.compare=function(a,b){var c=a.V.cd(b.V);return 0===c?Tb(a.name,b.name):c};h.rd=function(){return!0};h.ve=function(a,b){return!a.aa(b)};h.xd=function(){return Vd};h.vd=function(){return ae};h.td=function(a,b){var c=L(a);return new E(b,c)};h.toString=function(){return".value"};var be=new $d;function ce(){this.wc=this.ra=this.lc=this.ia=this.la=!1;this.sa=0;this.Fb="";this.Ac=null;this.Xb="";this.zc=null;this.Ub="";this.g=M}var de=new ce;function sd(a){J(a.ia,"Only valid if start has been set");return a.Ac}function rd(a){J(a.ia,"Only valid if start has been set");return a.lc?a.Xb:"[MIN_NAME]"}function vd(a){J(a.ra,"Only valid if end has been set");return a.zc}function td(a){J(a.ra,"Only valid if end has been set");return a.wc?a.Ub:"[MAX_NAME]"}
function ee(a){var b=new ce;b.la=a.la;b.sa=a.sa;b.ia=a.ia;b.Ac=a.Ac;b.lc=a.lc;b.Xb=a.Xb;b.ra=a.ra;b.zc=a.zc;b.wc=a.wc;b.Ub=a.Ub;b.g=a.g;return b}h=ce.prototype;h.Ae=function(a){var b=ee(this);b.la=!0;b.sa=a;b.Fb="";return b};h.Be=function(a){var b=ee(this);b.la=!0;b.sa=a;b.Fb="l";return b};h.Ce=function(a){var b=ee(this);b.la=!0;b.sa=a;b.Fb="r";return b};h.Sd=function(a,b){var c=ee(this);c.ia=!0;n(a)||(a=null);c.Ac=a;null!=b?(c.lc=!0,c.Xb=b):(c.lc=!1,c.Xb="");return c};
h.hd=function(a,b){var c=ee(this);c.ra=!0;n(a)||(a=null);c.zc=a;n(b)?(c.wc=!0,c.Ub=b):(c.Jg=!1,c.Ub="");return c};function fe(a,b){var c=ee(a);c.g=b;return c}function ge(a){var b={};a.ia&&(b.sp=a.Ac,a.lc&&(b.sn=a.Xb));a.ra&&(b.ep=a.zc,a.wc&&(b.en=a.Ub));if(a.la){b.l=a.sa;var c=a.Fb;""===c&&(c=a.ia?"l":"r");b.vf=c}a.g!==M&&(b.i=a.g.toString());return b}function Pd(a){return!(a.ia||a.ra||a.la)}h.toString=function(){return B(ge(this))};function he(a,b){this.pd=a;this.Wb=b}he.prototype.get=function(a){var b=v(this.pd,a);if(!b)throw Error("No index defined for "+a);return b===Ud?null:b};function ie(a,b,c){var d=na(a.pd,function(d,f){var g=v(a.Wb,f);J(g,"Missing index implementation for "+f);if(d===Ud){if(g.rd(b.V)){for(var k=[],l=c.Pb(Rb),m=I(l);m;)m.name!=b.name&&k.push(m),m=I(l);k.push(b);return je(k,yd(g))}return Ud}g=c.get(b.name);k=d;g&&(k=k.remove(new E(b.name,g)));return k.La(b,b.V)});return new he(d,a.Wb)}
function ke(a,b,c){var d=na(a.pd,function(a){if(a===Ud)return a;var d=c.get(b.name);return d?a.remove(new E(b.name,d)):a});return new he(d,a.Wb)}var le=new he({".priority":Ud},{".priority":M});function uc(a,b){this.B=a;J(n(this.B)&&null!==this.B,"LeafNode shouldn't be created with null/undefined value.");this.ha=b||C;me(this.ha);this.tb=null}h=uc.prototype;h.M=function(){return!0};h.L=function(){return this.ha};h.$=function(a){return new uc(this.B,a)};h.K=function(a){return".priority"===a?this.ha:C};h.ka=function(a){return a.e()?this:".priority"===O(a)?this.ha:C};h.Da=function(){return!1};h.gf=function(){return null};
h.P=function(a,b){return".priority"===a?this.$(b):b.e()&&".priority"!==a?this:C.P(a,b).$(this.ha)};h.F=function(a,b){var c=O(a);if(null===c)return b;if(b.e()&&".priority"!==c)return this;J(".priority"!==c||1===vc(a),".priority must be the last token in a path");return this.P(c,C.F(H(a),b))};h.e=function(){return!1};h.vb=function(){return 0};h.I=function(a){return a&&!this.L().e()?{".value":this.za(),".priority":this.L().I()}:this.za()};
h.hash=function(){if(null===this.tb){var a="";this.ha.e()||(a+="priority:"+ne(this.ha.I())+":");var b=typeof this.B,a=a+(b+":"),a="number"===b?a+cd(this.B):a+this.B;this.tb=Nc(a)}return this.tb};h.za=function(){return this.B};h.cd=function(a){if(a===C)return 1;if(a instanceof T)return-1;J(a.M(),"Unknown node type");var b=typeof a.B,c=typeof this.B,d=Na(oe,b),e=Na(oe,c);J(0<=d,"Unknown leaf type: "+b);J(0<=e,"Unknown leaf type: "+c);return d===e?"object"===c?0:this.B<a.B?-1:this.B===a.B?0:1:e-d};
var oe=["object","boolean","number","string"];uc.prototype.hb=function(){return this};uc.prototype.Bc=function(){return!0};uc.prototype.aa=function(a){return a===this?!0:a.M()?this.B===a.B&&this.ha.aa(a.ha):!1};uc.prototype.toString=function(){return B(this.I(!0))};function T(a,b,c){this.m=a;(this.ha=b)&&me(this.ha);this.pb=c;this.tb=null}h=T.prototype;h.M=function(){return!1};h.L=function(){return this.ha||C};h.$=function(a){return new T(this.m,a,this.pb)};h.K=function(a){if(".priority"===a)return this.L();a=this.m.get(a);return null===a?C:a};h.ka=function(a){var b=O(a);return null===b?this:this.K(b).ka(H(a))};h.Da=function(a){return null!==this.m.get(a)};
h.P=function(a,b){J(b,"We should always be passing snapshot nodes");if(".priority"===a)return this.$(b);var c=new E(a,b),d,e;b.e()?(d=this.m.remove(a),c=ke(this.pb,c,this.m)):(d=this.m.La(a,b),c=ie(this.pb,c,this.m));e=d.e()?C:this.ha;return new T(d,e,c)};h.F=function(a,b){var c=O(a);if(null===c)return b;J(".priority"!==O(a)||1===vc(a),".priority must be the last token in a path");var d=this.K(c).F(H(a),b);return this.P(c,d)};h.e=function(){return this.m.e()};h.vb=function(){return this.m.count()};
var pe=/^(0|[1-9]\d*)$/;h=T.prototype;h.I=function(a){if(this.e())return null;var b={},c=0,d=0,e=!0;this.U(M,function(f,g){b[f]=g.I(a);c++;e&&pe.test(f)?d=Math.max(d,Number(f)):e=!1});if(!a&&e&&d<2*c){var f=[],g;for(g in b)f[g]=b[g];return f}a&&!this.L().e()&&(b[".priority"]=this.L().I());return b};h.hash=function(){if(null===this.tb){var a="";this.L().e()||(a+="priority:"+ne(this.L().I())+":");this.U(M,function(b,c){var d=c.hash();""!==d&&(a+=":"+b+":"+d)});this.tb=""===a?"":Nc(a)}return this.tb};
h.gf=function(a,b,c){return(c=qe(this,c))?(a=dc(c,new E(a,b)))?a.name:null:dc(this.m,a)};function zd(a,b){var c;c=(c=qe(a,b))?(c=c.Ic())&&c.name:a.m.Ic();return c?new E(c,a.m.get(c)):null}function Ad(a,b){var c;c=(c=qe(a,b))?(c=c.Yb())&&c.name:a.m.Yb();return c?new E(c,a.m.get(c)):null}h.U=function(a,b){var c=qe(this,a);return c?c.fa(function(a){return b(a.name,a.V)}):this.m.fa(b)};h.Pb=function(a){return this.Qb(a.xd(),a)};
h.Qb=function(a,b){var c=qe(this,b);if(c)return c.Qb(a,function(a){return a});for(var c=this.m.Qb(a.name,Rb),d=fc(c);null!=d&&0>b.compare(d,a);)I(c),d=fc(c);return c};h.hf=function(a){return this.Sb(a.vd(),a)};h.Sb=function(a,b){var c=qe(this,b);if(c)return c.Sb(a,function(a){return a});for(var c=this.m.Sb(a.name,Rb),d=fc(c);null!=d&&0<b.compare(d,a);)I(c),d=fc(c);return c};h.cd=function(a){return this.e()?a.e()?0:-1:a.M()||a.e()?1:a===Xd?-1:0};
h.hb=function(a){if(a===Zd||ta(this.pb.Wb,a.toString()))return this;var b=this.pb,c=this.m;J(a!==Zd,"KeyIndex always exists and isn't meant to be added to the IndexMap.");for(var d=[],e=!1,c=c.Pb(Rb),f=I(c);f;)e=e||a.rd(f.V),d.push(f),f=I(c);d=e?je(d,yd(a)):Ud;e=a.toString();c=xa(b.Wb);c[e]=a;a=xa(b.pd);a[e]=d;return new T(this.m,this.ha,new he(a,c))};h.Bc=function(a){return a===Zd||ta(this.pb.Wb,a.toString())};
h.aa=function(a){if(a===this)return!0;if(a.M())return!1;if(this.L().aa(a.L())&&this.m.count()===a.m.count()){var b=this.Pb(M);a=a.Pb(M);for(var c=I(b),d=I(a);c&&d;){if(c.name!==d.name||!c.V.aa(d.V))return!1;c=I(b);d=I(a)}return null===c&&null===d}return!1};function qe(a,b){return b===Zd?null:a.pb.get(b.toString())}h.toString=function(){return B(this.I(!0))};function L(a,b){if(null===a)return C;var c=null;"object"===typeof a&&".priority"in a?c=a[".priority"]:"undefined"!==typeof b&&(c=b);J(null===c||"string"===typeof c||"number"===typeof c||"object"===typeof c&&".sv"in c,"Invalid priority type found: "+typeof c);"object"===typeof a&&".value"in a&&null!==a[".value"]&&(a=a[".value"]);if("object"!==typeof a||".sv"in a)return new uc(a,L(c));if(a instanceof Array){var d=C,e=a;r(e,function(a,b){if(u(e,b)&&"."!==b.substring(0,1)){var c=L(a);if(c.M()||!c.e())d=
d.P(b,c)}});return d.$(L(c))}var f=[],g=!1,k=a;hb(k,function(a){if("string"!==typeof a||"."!==a.substring(0,1)){var b=L(k[a]);b.e()||(g=g||!b.L().e(),f.push(new E(a,b)))}});var l=je(f,Sb,function(a){return a.name},Ub);if(g){var m=je(f,yd(M));return new T(l,L(c),new he({".priority":m},{".priority":M}))}return new T(l,L(c),le)}var re=Math.log(2);function se(a){this.count=parseInt(Math.log(a+1)/re,10);this.af=this.count-1;this.Nf=a+1&parseInt(Array(this.count+1).join("1"),2)}
function te(a){var b=!(a.Nf&1<<a.af);a.af--;return b}
function je(a,b,c,d){function e(b,d){var f=d-b;if(0==f)return null;if(1==f){var m=a[b],w=c?c(m):m;return new gc(w,m.V,!1,null,null)}var m=parseInt(f/2,10)+b,f=e(b,m),y=e(m+1,d),m=a[m],w=c?c(m):m;return new gc(w,m.V,!1,f,y)}a.sort(b);var f=function(b){function d(b,g){var k=w-b,y=w;w-=b;var y=e(k+1,y),k=a[k],G=c?c(k):k,y=new gc(G,k.V,g,null,y);f?f.left=y:m=y;f=y}for(var f=null,m=null,w=a.length,y=0;y<b.count;++y){var G=te(b),ud=Math.pow(2,b.count-(y+1));G?d(ud,!1):(d(ud,!1),d(ud,!0))}return m}(new se(a.length));
return null!==f?new bc(d||b,f):new bc(d||b)}function ne(a){return"number"===typeof a?"number:"+cd(a):"string:"+a}function me(a){if(a.M()){var b=a.I();J("string"===typeof b||"number"===typeof b||"object"===typeof b&&u(b,".sv"),"Priority must be a string or number.")}else J(a===Xd||a.e(),"priority of unexpected type.");J(a===Xd||a.L().e(),"Priority nodes can't have a priority of their own.")}var C=new T(new bc(Ub),null,le);function ue(){T.call(this,new bc(Ub),C,le)}ma(ue,T);h=ue.prototype;
h.cd=function(a){return a===this?0:1};h.aa=function(a){return a===this};h.L=function(){throw Lc("Why is this called?");};h.K=function(){return C};h.e=function(){return!1};var Xd=new ue,Vd=new E("[MIN_NAME]",C),ae=new E("[MAX_NAME]",Xd);function ve(a,b,c){this.type=Fd;this.source=a;this.path=b;this.children=c}ve.prototype.Mc=function(a){if(this.path.e())return a=this.children.subtree(new K(a)),a.e()?null:a.value?new Vb(this.source,F,a.value):new ve(this.source,F,a);J(O(this.path)===a,"Can't get a merge for a child not on the path of the operation");return new ve(this.source,H(this.path),this.children)};ve.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"};var Wb=0,Fd=1,Yb=2,ac=3;function we(a,b,c,d){this.pe=a;this.ef=b;this.zb=c;this.Te=d;J(!d||b,"Tagged queries must be from server.")}var Zb=new we(!0,!1,null,!1),xe=new we(!1,!0,null,!1);we.prototype.toString=function(){return this.pe?"user":this.Te?"server(queryID="+this.zb+")":"server"};function ye(a,b){this.value=a;this.children=b||ze}var ze=new bc(function(a,b){return a===b?0:a<b?-1:1});function Ae(a){var b=Nd;r(a,function(a,d){b=b.set(new K(d),a)});return b}h=ye.prototype;h.e=function(){return null===this.value&&this.children.e()};function Be(a,b,c){if(null!=a.value&&c(a.value))return{path:F,value:a.value};if(b.e())return null;var d=O(b);a=a.children.get(d);return null!==a?(b=Be(a,H(b),c),null!=b?{path:(new K(d)).u(b.path),value:b.value}:null):null}
function Ce(a,b){return Be(a,b,function(){return!0})}h.subtree=function(a){if(a.e())return this;var b=this.children.get(O(a));return null!==b?b.subtree(H(a)):Nd};h.set=function(a,b){if(a.e())return new ye(b,this.children);var c=O(a),d=(this.children.get(c)||Nd).set(H(a),b),c=this.children.La(c,d);return new ye(this.value,c)};
h.remove=function(a){if(a.e())return this.children.e()?Nd:new ye(null,this.children);var b=O(a),c=this.children.get(b);return c?(a=c.remove(H(a)),b=a.e()?this.children.remove(b):this.children.La(b,a),null===this.value&&b.e()?Nd:new ye(this.value,b)):this};h.get=function(a){if(a.e())return this.value;var b=this.children.get(O(a));return b?b.get(H(a)):null};
function Md(a,b,c){if(b.e())return c;var d=O(b);b=Md(a.children.get(d)||Nd,H(b),c);d=b.e()?a.children.remove(d):a.children.La(d,b);return new ye(a.value,d)}function De(a,b){return Ee(a,F,b)}function Ee(a,b,c){var d={};a.children.fa(function(a,f){d[a]=Ee(f,b.u(a),c)});return c(b,a.value,d)}function Fe(a,b,c){return Ge(a,b,F,c)}function Ge(a,b,c,d){var e=a.value?d(c,a.value):!1;if(e)return e;if(b.e())return null;e=O(b);return(a=a.children.get(e))?Ge(a,H(b),c.u(e),d):null}
function He(a,b,c){var d=F;if(!b.e()){var e=!0;a.value&&(e=c(d,a.value));!0===e&&(e=O(b),(a=a.children.get(e))&&Ie(a,H(b),d.u(e),c))}}function Ie(a,b,c,d){if(b.e())return a;a.value&&d(c,a.value);var e=O(b);return(a=a.children.get(e))?Ie(a,H(b),c.u(e),d):Nd}function Kd(a,b){Je(a,F,b)}function Je(a,b,c){a.children.fa(function(a,e){Je(e,b.u(a),c)});a.value&&c(b,a.value)}function Ke(a,b){a.children.fa(function(a,d){d.value&&b(a,d.value)})}var Nd=new ye(null);
ye.prototype.toString=function(){var a={};Kd(this,function(b,c){a[b.toString()]=c.toString()});return B(a)};function Le(a){this.X=a}var Me=new Le(new ye(null));function Ne(a,b,c){if(b.e())return new Le(new ye(c));var d=Ce(a.X,b);if(null!=d){var e=d.path,d=d.value;b=N(e,b);d=d.F(b,c);return new Le(a.X.set(e,d))}a=Md(a.X,b,new ye(c));return new Le(a)}function Oe(a,b,c){var d=a;hb(c,function(a,c){d=Ne(d,b.u(a),c)});return d}Le.prototype.Kd=function(a){if(a.e())return Me;a=Md(this.X,a,Nd);return new Le(a)};function Pe(a,b){var c=Ce(a.X,b);return null!=c?a.X.get(c.path).ka(N(c.path,b)):null}
function Qe(a){var b=[],c=a.X.value;null!=c?c.M()||c.U(M,function(a,c){b.push(new E(a,c))}):a.X.children.fa(function(a,c){null!=c.value&&b.push(new E(a,c.value))});return b}function Re(a,b){if(b.e())return a;var c=Pe(a,b);return null!=c?new Le(new ye(c)):new Le(a.X.subtree(b))}Le.prototype.e=function(){return this.X.e()};Le.prototype.apply=function(a){return Se(F,this.X,a)};
function Se(a,b,c){if(null!=b.value)return c.F(a,b.value);var d=null;b.children.fa(function(b,f){".priority"===b?(J(null!==f.value,"Priority writes must always be leaf nodes"),d=f.value):c=Se(a.u(b),f,c)});c.ka(a).e()||null===d||(c=c.F(a.u(".priority"),d));return c};function Te(){this.T=Me;this.xa=[];this.Ec=-1}h=Te.prototype;
h.Kd=function(a){var b=Ua(this.xa,function(b){return b.ce===a});J(0<=b,"removeWrite called with nonexistent writeId.");var c=this.xa[b];this.xa.splice(b,1);for(var d=c.visible,e=!1,f=this.xa.length-1;d&&0<=f;){var g=this.xa[f];g.visible&&(f>=b&&Ue(g,c.path)?d=!1:c.path.contains(g.path)&&(e=!0));f--}if(d){if(e)this.T=Ve(this.xa,We,F),this.Ec=0<this.xa.length?this.xa[this.xa.length-1].ce:-1;else if(c.Ga)this.T=this.T.Kd(c.path);else{var k=this;r(c.children,function(a,b){k.T=k.T.Kd(c.path.u(b))})}return c.path}return null};
h.qa=function(a,b,c,d){if(c||d){var e=Re(this.T,a);return!d&&e.e()?b:d||null!=b||null!=Pe(e,F)?(e=Ve(this.xa,function(b){return(b.visible||d)&&(!c||!(0<=Na(c,b.ce)))&&(b.path.contains(a)||a.contains(b.path))},a),b=b||C,e.apply(b)):null}e=Pe(this.T,a);if(null!=e)return e;e=Re(this.T,a);return e.e()?b:null!=b||null!=Pe(e,F)?(b=b||C,e.apply(b)):null};
h.qc=function(a,b){var c=C,d=Pe(this.T,a);if(d)d.M()||d.U(M,function(a,b){c=c.P(a,b)});else if(b){var e=Re(this.T,a);b.U(M,function(a,b){var d=Re(e,new K(a)).apply(b);c=c.P(a,d)});Oa(Qe(e),function(a){c=c.P(a.name,a.V)})}else e=Re(this.T,a),Oa(Qe(e),function(a){c=c.P(a.name,a.V)});return c};h.Zc=function(a,b,c,d){J(c||d,"Either existingEventSnap or existingServerSnap must exist");a=a.u(b);if(null!=Pe(this.T,a))return null;a=Re(this.T,a);return a.e()?d.ka(b):a.apply(d.ka(b))};
h.Ta=function(a,b,c){a=a.u(b);var d=Pe(this.T,a);return null!=d?d:pb(c,b)?Re(this.T,a).apply(c.j().K(b)):null};h.kc=function(a){return Pe(this.T,a)};h.ge=function(a,b,c,d,e,f){var g;a=Re(this.T,a);g=Pe(a,F);if(null==g)if(null!=b)g=a.apply(b);else return[];g=g.hb(f);if(g.e()||g.M())return[];b=[];a=yd(f);e=e?g.Sb(c,f):g.Qb(c,f);for(f=I(e);f&&b.length<d;)0!==a(f,c)&&b.push(f),f=I(e);return b};
function Ue(a,b){return a.Ga?a.path.contains(b):!!ua(a.children,function(c,d){return a.path.u(d).contains(b)})}function We(a){return a.visible}
function Ve(a,b,c){for(var d=Me,e=0;e<a.length;++e){var f=a[e];if(b(f)){var g=f.path;if(f.Ga)c.contains(g)?(g=N(c,g),d=Ne(d,g,f.Ga)):g.contains(c)&&(g=N(g,c),d=Ne(d,F,f.Ga.ka(g)));else if(f.children)if(c.contains(g))g=N(c,g),d=Oe(d,g,f.children);else{if(g.contains(c))if(g=N(g,c),g.e())d=Oe(d,F,f.children);else if(f=v(f.children,O(g)))f=f.ka(H(g)),d=Ne(d,F,f)}else throw Lc("WriteRecord should have .snap or .children");}}return d}function Xe(a,b){this.Eb=a;this.X=b}h=Xe.prototype;
h.qa=function(a,b,c){return this.X.qa(this.Eb,a,b,c)};h.qc=function(a){return this.X.qc(this.Eb,a)};h.Zc=function(a,b,c){return this.X.Zc(this.Eb,a,b,c)};h.kc=function(a){return this.X.kc(this.Eb.u(a))};h.ge=function(a,b,c,d,e){return this.X.ge(this.Eb,a,b,c,d,e)};h.Ta=function(a,b){return this.X.Ta(this.Eb,a,b)};h.u=function(a){return new Xe(this.Eb.u(a),this.X)};function Ye(){this.wa={}}h=Ye.prototype;h.e=function(){return wa(this.wa)};h.Ya=function(a,b,c){var d=a.source.zb;if(null!==d)return d=v(this.wa,d),J(null!=d,"SyncTree gave us an op for an invalid query."),d.Ya(a,b,c);var e=[];r(this.wa,function(d){e=e.concat(d.Ya(a,b,c))});return e};h.Gb=function(a,b,c,d,e){var f=a.Fa(),g=v(this.wa,f);if(!g){var g=c.qa(e?d:null),k=!1;g?k=!0:(g=d instanceof T?c.qc(d):C,k=!1);g=new Od(a,new Gb(new qb(g,k,!1),new qb(d,e,!1)));this.wa[f]=g}g.Gb(b);return Sd(g,b)};
h.gb=function(a,b,c){var d=a.Fa(),e=[],f=[],g=null!=Ze(this);if("default"===d){var k=this;r(this.wa,function(a,d){f=f.concat(a.gb(b,c));a.e()&&(delete k.wa[d],Pd(a.W.n)||e.push(a.W))})}else{var l=v(this.wa,d);l&&(f=f.concat(l.gb(b,c)),l.e()&&(delete this.wa[d],Pd(l.W.n)||e.push(l.W)))}g&&null==Ze(this)&&e.push(new U(a.k,a.path));return{sg:e,Vf:f}};function $e(a){return Pa(ra(a.wa),function(a){return!Pd(a.W.n)})}h.bb=function(a){var b=null;r(this.wa,function(c){b=b||c.bb(a)});return b};
function af(a,b){if(Pd(b.n))return Ze(a);var c=b.Fa();return v(a.wa,c)}function Ze(a){return va(a.wa,function(a){return Pd(a.W.n)})||null};function bf(a){this.oa=Nd;this.yb=new Te;this.Se={};this.cc={};this.Fc=a}function cf(a,b,c,d,e){var f=a.yb,g=e;J(d>f.Ec,"Stacking an older write on top of newer ones");n(g)||(g=!0);f.xa.push({path:b,Ga:c,ce:d,visible:g});g&&(f.T=Ne(f.T,b,c));f.Ec=d;return e?df(a,new Vb(Zb,b,c)):[]}function ef(a,b,c,d){var e=a.yb;J(d>e.Ec,"Stacking an older merge on top of newer ones");e.xa.push({path:b,children:c,ce:d,visible:!0});e.T=Oe(e.T,b,c);e.Ec=d;c=Ae(c);return df(a,new ve(Zb,b,c))}
function ff(a,b,c){c=c||!1;b=a.yb.Kd(b);return null==b?[]:df(a,new Xb(b,c))}function gf(a,b,c){c=Ae(c);return df(a,new ve(xe,b,c))}function hf(a,b,c,d){d=jf(a,d);if(null!=d){var e=kf(d);d=e.path;e=e.zb;b=N(d,b);c=new Vb(new we(!1,!0,e,!0),b,c);return lf(a,d,c)}return[]}function mf(a,b,c,d){if(d=jf(a,d)){var e=kf(d);d=e.path;e=e.zb;b=N(d,b);c=Ae(c);c=new ve(new we(!1,!0,e,!0),b,c);return lf(a,d,c)}return[]}
bf.prototype.Gb=function(a,b){var c=a.path,d=null,e=!1;He(this.oa,c,function(a,b){var f=N(a,c);d=b.bb(f);e=e||null!=Ze(b);return!d});var f=this.oa.get(c);f?(e=e||null!=Ze(f),d=d||f.bb(F)):(f=new Ye,this.oa=this.oa.set(c,f));var g;null!=d?g=!0:(g=!1,d=C,Ke(this.oa.subtree(c),function(a,b){var c=b.bb(F);c&&(d=d.P(a,c))}));var k=null!=af(f,a);if(!k&&!Pd(a.n)){var l=nf(a);J(!(l in this.cc),"View does not exist, but we have a tag");var m=of++;this.cc[l]=m;this.Se["_"+m]=l}g=f.Gb(a,b,new Xe(c,this.yb),
d,g);k||e||(f=af(f,a),g=g.concat(pf(this,a,f)));return g};
bf.prototype.gb=function(a,b,c){var d=a.path,e=this.oa.get(d),f=[];if(e&&("default"===a.Fa()||null!=af(e,a))){f=e.gb(a,b,c);e.e()&&(this.oa=this.oa.remove(d));e=f.sg;f=f.Vf;b=-1!==Ua(e,function(a){return Pd(a.n)});var g=Fe(this.oa,d,function(a,b){return null!=Ze(b)});if(b&&!g&&(d=this.oa.subtree(d),!d.e()))for(var d=qf(d),k=0;k<d.length;++k){var l=d[k],m=l.W,l=rf(this,l);this.Fc.Pe(m,sf(this,m),l.md,l.H)}if(!g&&0<e.length&&!c)if(b)this.Fc.Ud(a,null);else{var w=this;Oa(e,function(a){a.Fa();var b=w.cc[nf(a)];
w.Fc.Ud(a,b)})}tf(this,e)}return f};bf.prototype.qa=function(a,b){var c=this.yb,d=Fe(this.oa,a,function(b,c){var d=N(b,a);if(d=c.bb(d))return d});return c.qa(a,d,b,!0)};function qf(a){return De(a,function(a,c,d){if(c&&null!=Ze(c))return[Ze(c)];var e=[];c&&(e=$e(c));r(d,function(a){e=e.concat(a)});return e})}function tf(a,b){for(var c=0;c<b.length;++c){var d=b[c];if(!Pd(d.n)){var d=nf(d),e=a.cc[d];delete a.cc[d];delete a.Se["_"+e]}}}
function pf(a,b,c){var d=b.path,e=sf(a,b);c=rf(a,c);b=a.Fc.Pe(b,e,c.md,c.H);d=a.oa.subtree(d);if(e)J(null==Ze(d.value),"If we're adding a query, it shouldn't be shadowed");else for(e=De(d,function(a,b,c){if(!a.e()&&b&&null!=Ze(b))return[Qd(Ze(b))];var d=[];b&&(d=d.concat(Qa($e(b),function(a){return a.W})));r(c,function(a){d=d.concat(a)});return d}),d=0;d<e.length;++d)c=e[d],a.Fc.Ud(c,sf(a,c));return b}
function rf(a,b){var c=b.W,d=sf(a,c);return{md:function(){return(b.o()||C).hash()},H:function(b,f){if("ok"===b){if(f&&"object"===typeof f&&u(f,"w")){var g=v(f,"w");ea(g)&&0<=Na(g,"no_index")&&Q("Using an unspecified index. Consider adding "+('".indexOn": "'+c.n.g.toString()+'"')+" at "+c.path.toString()+" to your security rules for better performance")}if(d){var k=c.path;if(g=jf(a,d))var l=kf(g),g=l.path,l=l.zb,k=N(g,k),k=new $b(new we(!1,!0,l,!0),k),g=lf(a,g,k);else g=[]}else g=df(a,new $b(xe,c.path));
return g}g="Unknown Error";"too_big"===b?g="The data requested exceeds the maximum size that can be accessed with a single request.":"permission_denied"==b?g="Client doesn't have permission to access the desired data.":"unavailable"==b&&(g="The service is unavailable");g=Error(b+": "+g);g.code=b.toUpperCase();return a.gb(c,null,g)}}}function nf(a){return a.path.toString()+"$"+a.Fa()}
function kf(a){var b=a.indexOf("$");J(-1!==b&&b<a.length-1,"Bad queryKey.");return{zb:a.substr(b+1),path:new K(a.substr(0,b))}}function jf(a,b){var c=a.Se,d="_"+b;return d in c?c[d]:void 0}function sf(a,b){var c=nf(b);return v(a.cc,c)}var of=1;function lf(a,b,c){var d=a.oa.get(b);J(d,"Missing sync point for query tag that we're tracking");return d.Ya(c,new Xe(b,a.yb),null)}function df(a,b){return uf(a,b,a.oa,null,new Xe(F,a.yb))}
function uf(a,b,c,d,e){if(b.path.e())return vf(a,b,c,d,e);var f=c.get(F);null==d&&null!=f&&(d=f.bb(F));var g=[],k=O(b.path),l=b.Mc(k);if((c=c.children.get(k))&&l)var m=d?d.K(k):null,k=e.u(k),g=g.concat(uf(a,l,c,m,k));f&&(g=g.concat(f.Ya(b,e,d)));return g}function vf(a,b,c,d,e){var f=c.get(F);null==d&&null!=f&&(d=f.bb(F));var g=[];c.children.fa(function(c,f){var m=d?d.K(c):null,w=e.u(c),y=b.Mc(c);y&&(g=g.concat(vf(a,y,f,m,w)))});f&&(g=g.concat(f.Ya(b,e,d)));return g};function wf(a){J(ea(a)&&0<a.length,"Requires a non-empty array");this.Ff=a;this.Gc={}}wf.prototype.Zd=function(a,b){for(var c=this.Gc[a]||[],d=0;d<c.length;d++)c[d].rc.apply(c[d].Ka,Array.prototype.slice.call(arguments,1))};wf.prototype.wb=function(a,b,c){xf(this,a);this.Gc[a]=this.Gc[a]||[];this.Gc[a].push({rc:b,Ka:c});(a=this.te(a))&&b.apply(c,a)};wf.prototype.$b=function(a,b,c){xf(this,a);a=this.Gc[a]||[];for(var d=0;d<a.length;d++)if(a[d].rc===b&&(!c||c===a[d].Ka)){a.splice(d,1);break}};
function xf(a,b){J(Ta(a.Ff,function(a){return a===b}),"Unknown event: "+b)};var yf=function(){var a=0,b=[];return function(c){var d=c===a;a=c;for(var e=Array(8),f=7;0<=f;f--)e[f]="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c%64),c=Math.floor(c/64);J(0===c,"Cannot push at time == 0");c=e.join("");if(d){for(f=11;0<=f&&63===b[f];f--)b[f]=0;b[f]++}else for(f=0;12>f;f++)b[f]=Math.floor(64*Math.random());for(f=0;12>f;f++)c+="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);J(20===c.length,"nextPushId: Length should be 20.");
return c}}();function zf(){wf.call(this,["online"]);this.Lc=!0;if("undefined"!==typeof window&&"undefined"!==typeof window.addEventListener){var a=this;window.addEventListener("online",function(){a.Lc||a.Zd("online",!0);a.Lc=!0},!1);window.addEventListener("offline",function(){a.Lc&&a.Zd("online",!1);a.Lc=!1},!1)}}ma(zf,wf);zf.prototype.te=function(a){J("online"===a,"Unknown event type: "+a);return[this.Lc]};ca(zf);function Af(){wf.call(this,["visible"]);var a,b;"undefined"!==typeof document&&"undefined"!==typeof document.addEventListener&&("undefined"!==typeof document.hidden?(b="visibilitychange",a="hidden"):"undefined"!==typeof document.mozHidden?(b="mozvisibilitychange",a="mozHidden"):"undefined"!==typeof document.msHidden?(b="msvisibilitychange",a="msHidden"):"undefined"!==typeof document.webkitHidden&&(b="webkitvisibilitychange",a="webkitHidden"));this.nc=!0;if(b){var c=this;document.addEventListener(b,
function(){var b=!document[a];b!==c.nc&&(c.nc=b,c.Zd("visible",b))},!1)}}ma(Af,wf);Af.prototype.te=function(a){J("visible"===a,"Unknown event type: "+a);return[this.nc]};ca(Af);var Bf=/[\[\].#$\/\u0000-\u001F\u007F]/,Cf=/[\[\].#$\u0000-\u001F\u007F]/;function Df(a){return p(a)&&0!==a.length&&!Bf.test(a)}function Ef(a){return null===a||p(a)||ga(a)&&!Wc(a)||ia(a)&&u(a,".sv")}function Ff(a,b,c){c&&!n(b)||Gf(z(a,1,c),b)}
function Gf(a,b,c,d){c||(c=0);var e=d||[];if(!n(b))throw Error(a+"contains undefined"+Hf(e));if(ha(b))throw Error(a+"contains a function"+Hf(e)+" with contents: "+b.toString());if(Wc(b))throw Error(a+"contains "+b.toString()+Hf(e));if(1E3<c)throw new TypeError(a+"contains a cyclic object value ("+e.slice(0,100).join(".")+"...)");if(p(b)&&b.length>10485760/3&&10485760<Oc(b).length)throw Error(a+"contains a string greater than 10485760 utf8 bytes"+Hf(e)+" ('"+b.substring(0,50)+"...')");if(ia(b)){var f=
!1,g=!1;hb(b,function(b,d){if(".value"===b)f=!0;else if(".priority"!==b&&".sv"!==b&&(g=!0,!Df(b)))throw Error(a+" contains an invalid key ("+b+")"+Hf(e)+'.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');e.push(b);Gf(a,d,c+1,e);e.pop()});if(f&&g)throw Error(a+' contains ".value" child'+Hf(e)+" in addition to actual children.");}}function Hf(a){return 0==a.length?"":" in property '"+a.join(".")+"'"}
function If(a,b){if(!ia(b)||ea(b))throw Error(z(a,1,!1)+" must be an Object containing the children to replace.");if(u(b,".value"))throw Error(z(a,1,!1)+' must not contain ".value".  To overwrite with a leaf value, just use .set() instead.');Ff(a,b,!1)}
function Jf(a,b,c){if(Wc(c))throw Error(z(a,b,!1)+"is "+c.toString()+", but must be a valid Firebase priority (a string, finite number, server value, or null).");if(!Ef(c))throw Error(z(a,b,!1)+"must be a valid Firebase priority (a string, finite number, server value, or null).");}
function Kf(a,b,c){if(!c||n(b))switch(b){case "value":case "child_added":case "child_removed":case "child_changed":case "child_moved":break;default:throw Error(z(a,1,c)+'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');}}function Lf(a,b,c,d){if((!d||n(c))&&!Df(c))throw Error(z(a,b,d)+'was an invalid key: "'+c+'".  Firebase keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]").');}
function Mf(a,b){if(!p(b)||0===b.length||Cf.test(b))throw Error(z(a,1,!1)+'was an invalid path: "'+b+'". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"');}function Nf(a,b){if(".info"===O(b))throw Error(a+" failed: Can't modify data under /.info/");}function Of(a,b){if(!p(b))throw Error(z(a,1,!1)+"must be a valid credential (a string).");}function Pf(a,b,c){if(!p(c))throw Error(z(a,b,!1)+"must be a valid string.");}
function V(a,b,c,d){if(!d||n(c))if(!ia(c)||null===c)throw Error(z(a,b,d)+"must be a valid object.");}function Qf(a,b,c){if(!ia(b)||null===b||!u(b,c))throw Error(z(a,1,!1)+'must contain the key "'+c+'"');if(!p(v(b,c)))throw Error(z(a,1,!1)+'must contain the key "'+c+'" with type "string"');};function Rf(){this.set={}}h=Rf.prototype;h.add=function(a,b){this.set[a]=null!==b?b:!0};h.contains=function(a){return u(this.set,a)};h.get=function(a){return this.contains(a)?this.set[a]:void 0};h.remove=function(a){delete this.set[a]};h.clear=function(){this.set={}};h.e=function(){return wa(this.set)};h.count=function(){return pa(this.set)};function Sf(a,b){r(a.set,function(a,d){b(d,a)})}h.keys=function(){var a=[];r(this.set,function(b,c){a.push(c)});return a};function rc(){this.m=this.B=null}rc.prototype.find=function(a){if(null!=this.B)return this.B.ka(a);if(a.e()||null==this.m)return null;var b=O(a);a=H(a);return this.m.contains(b)?this.m.get(b).find(a):null};rc.prototype.ec=function(a,b){if(a.e())this.B=b,this.m=null;else if(null!==this.B)this.B=this.B.F(a,b);else{null==this.m&&(this.m=new Rf);var c=O(a);this.m.contains(c)||this.m.add(c,new rc);c=this.m.get(c);a=H(a);c.ec(a,b)}};
function Tf(a,b){if(b.e())return a.B=null,a.m=null,!0;if(null!==a.B){if(a.B.M())return!1;var c=a.B;a.B=null;c.U(M,function(b,c){a.ec(new K(b),c)});return Tf(a,b)}return null!==a.m?(c=O(b),b=H(b),a.m.contains(c)&&Tf(a.m.get(c),b)&&a.m.remove(c),a.m.e()?(a.m=null,!0):!1):!0}function sc(a,b,c){null!==a.B?c(b,a.B):a.U(function(a,e){var f=new K(b.toString()+"/"+a);sc(e,f,c)})}rc.prototype.U=function(a){null!==this.m&&Sf(this.m,function(b,c){a(b,c)})};var Uf="auth.firebase.com";function Vf(a,b,c){this.bd=a||{};this.Yd=b||{};this.Xa=c||{};this.bd.remember||(this.bd.remember="default")}var Wf=["remember","redirectTo"];function Xf(a){var b={},c={};hb(a||{},function(a,e){0<=Na(Wf,a)?b[a]=e:c[a]=e});return new Vf(b,{},c)};function Yf(a,b){this.Je=["session",a.Hd,a.ub].join(":");this.Vd=b}Yf.prototype.set=function(a,b){if(!b)if(this.Vd.length)b=this.Vd[0];else throw Error("fb.login.SessionManager : No storage options available!");b.set(this.Je,a)};Yf.prototype.get=function(){var a=Qa(this.Vd,q(this.Zf,this)),a=Pa(a,function(a){return null!==a});Xa(a,function(a,c){return fd(c.token)-fd(a.token)});return 0<a.length?a.shift():null};Yf.prototype.Zf=function(a){try{var b=a.get(this.Je);if(b&&b.token)return b}catch(c){}return null};
Yf.prototype.clear=function(){var a=this;Oa(this.Vd,function(b){b.remove(a.Je)})};function Zf(){return!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(navigator.userAgent)}function $f(){var a=navigator.userAgent;if("Microsoft Internet Explorer"===navigator.appName){if((a=a.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/))&&1<a.length)return 8<=parseFloat(a[1])}else if(-1<a.indexOf("Trident")&&(a=a.match(/rv:([0-9]{2,2}[\.0-9]{0,})/))&&1<a.length)return 8<=parseFloat(a[1]);return!1};function ag(){var a=window.opener.frames,b;for(b=a.length-1;0<=b;b--)try{if(a[b].location.protocol===window.location.protocol&&a[b].location.host===window.location.host&&"__winchan_relay_frame"===a[b].name)return a[b]}catch(c){}return null}function bg(a,b,c){a.attachEvent?a.attachEvent("on"+b,c):a.addEventListener&&a.addEventListener(b,c,!1)}function cg(a,b,c){a.detachEvent?a.detachEvent("on"+b,c):a.removeEventListener&&a.removeEventListener(b,c,!1)}
function dg(a){/^https?:\/\//.test(a)||(a=window.location.href);var b=/^(https?:\/\/[\-_a-zA-Z\.0-9:]+)/.exec(a);return b?b[1]:a}function eg(a){var b="";try{a=a.replace("#","");var c={},d=a.replace(/^\?/,"").split("&");for(a=0;a<d.length;a++)if(d[a]){var e=d[a].split("=");c[e[0]]=e[1]}c&&u(c,"__firebase_request_key")&&(b=v(c,"__firebase_request_key"))}catch(f){}return b}
function fg(a){var b=[],c;for(c in a)if(u(a,c)){var d=v(a,c);if(ea(d))for(var e=0;e<d.length;e++)b.push(encodeURIComponent(c)+"="+encodeURIComponent(d[e]));else b.push(encodeURIComponent(c)+"="+encodeURIComponent(v(a,c)))}return b?"&"+b.join("&"):""}function gg(){var a=Vc(Uf);return a.scheme+"://"+a.host+"/v2"}function hg(a){return gg()+"/"+a+"/auth/channel"};function ig(a){var b=this;this.sc=a;this.Wd="*";$f()?this.Hc=this.od=ag():(this.Hc=window.opener,this.od=window);if(!b.Hc)throw"Unable to find relay frame";bg(this.od,"message",q(this.ac,this));bg(this.od,"message",q(this.nf,this));try{jg(this,{a:"ready"})}catch(c){bg(this.Hc,"load",function(){jg(b,{a:"ready"})})}bg(window,"unload",q(this.jg,this))}function jg(a,b){b=B(b);$f()?a.Hc.doPost(b,a.Wd):a.Hc.postMessage(b,a.Wd)}
ig.prototype.ac=function(a){var b=this,c;try{c=kb(a.data)}catch(d){}c&&"request"===c.a&&(cg(window,"message",this.ac),this.Wd=a.origin,this.sc&&setTimeout(function(){b.sc(b.Wd,c.d,function(a,c){b.Mf=!c;b.sc=void 0;jg(b,{a:"response",d:a,forceKeepWindowOpen:c})})},0))};ig.prototype.jg=function(){try{cg(this.od,"message",this.nf)}catch(a){}this.sc&&(jg(this,{a:"error",d:"unknown closed window"}),this.sc=void 0);try{window.close()}catch(b){}};ig.prototype.nf=function(a){if(this.Mf&&"die"===a.data)try{window.close()}catch(b){}};function kg(a){this.gc=Ga()+Ga()+Ga();this.pf=a}kg.prototype.open=function(a,b){P.set("redirect_request_id",this.gc);P.set("redirect_request_id",this.gc);b.requestId=this.gc;b.redirectTo=b.redirectTo||window.location.href;a+=(/\?/.test(a)?"":"?")+fg(b);window.location=a};kg.isAvailable=function(){return!/^file:\//.test(location.href)&&!Zf()};kg.prototype.tc=function(){return"redirect"};var lg={NETWORK_ERROR:"Unable to contact the Firebase server.",SERVER_ERROR:"An unknown server error occurred.",TRANSPORT_UNAVAILABLE:"There are no login transports available for the requested method.",REQUEST_INTERRUPTED:"The browser redirected the page before the login request could complete.",USER_CANCELLED:"The user cancelled authentication."};function mg(a){var b=Error(v(lg,a),a);b.code=a;return b};function ng(a){if(!a.window_features||-1!==navigator.userAgent.indexOf("Fennec/")||-1!==navigator.userAgent.indexOf("Firefox/")&&-1!==navigator.userAgent.indexOf("Android"))a.window_features=void 0;a.window_name||(a.window_name="_blank");this.options=a}
ng.prototype.open=function(a,b,c){function d(a){g&&(document.body.removeChild(g),g=void 0);w&&(w=clearInterval(w));cg(window,"message",e);cg(window,"unload",d);if(m&&!a)try{m.close()}catch(b){k.postMessage("die",l)}m=k=void 0}function e(a){if(a.origin===l)try{var b=kb(a.data);"ready"===b.a?k.postMessage(y,l):"error"===b.a?(d(!1),c&&(c(b.d),c=null)):"response"===b.a&&(d(b.forceKeepWindowOpen),c&&(c(null,b.d),c=null))}catch(e){}}var f=$f(),g,k;if(!this.options.relay_url)return c(Error("invalid arguments: origin of url and relay_url must match"));
var l=dg(a);if(l!==dg(this.options.relay_url))c&&setTimeout(function(){c(Error("invalid arguments: origin of url and relay_url must match"))},0);else{f&&(g=document.createElement("iframe"),g.setAttribute("src",this.options.relay_url),g.style.display="none",g.setAttribute("name","__winchan_relay_frame"),document.body.appendChild(g),k=g.contentWindow);a+=(/\?/.test(a)?"":"?")+fg(b);var m=window.open(a,this.options.window_name,this.options.window_features);k||(k=m);var w=setInterval(function(){m&&m.closed&&
(d(!1),c&&(c(mg("USER_CANCELLED")),c=null))},500),y=B({a:"request",d:b});bg(window,"unload",d);bg(window,"message",e)}};
ng.isAvailable=function(){return"postMessage"in window&&!/^file:\//.test(location.href)&&!(Zf()||navigator.userAgent.match(/Windows Phone/)||window.Windows&&/^ms-appx:/.test(location.href)||navigator.userAgent.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i)||navigator.userAgent.match(/CriOS/)||navigator.userAgent.match(/Twitter for iPhone/)||navigator.userAgent.match(/FBAN\/FBIOS/)||window.navigator.standalone)&&!navigator.userAgent.match(/PhantomJS/)};ng.prototype.tc=function(){return"popup"};function og(a){a.method||(a.method="GET");a.headers||(a.headers={});a.headers.content_type||(a.headers.content_type="application/json");a.headers.content_type=a.headers.content_type.toLowerCase();this.options=a}
og.prototype.open=function(a,b,c){function d(){c&&(c(mg("REQUEST_INTERRUPTED")),c=null)}var e=new XMLHttpRequest,f=this.options.method.toUpperCase(),g;bg(window,"beforeunload",d);e.onreadystatechange=function(){if(c&&4===e.readyState){var a;if(200<=e.status&&300>e.status){try{a=kb(e.responseText)}catch(b){}c(null,a)}else 500<=e.status&&600>e.status?c(mg("SERVER_ERROR")):c(mg("NETWORK_ERROR"));c=null;cg(window,"beforeunload",d)}};if("GET"===f)a+=(/\?/.test(a)?"":"?")+fg(b),g=null;else{var k=this.options.headers.content_type;
"application/json"===k&&(g=B(b));"application/x-www-form-urlencoded"===k&&(g=fg(b))}e.open(f,a,!0);a={"X-Requested-With":"XMLHttpRequest",Accept:"application/json;text/plain"};za(a,this.options.headers);for(var l in a)e.setRequestHeader(l,a[l]);e.send(g)};og.isAvailable=function(){return!!window.XMLHttpRequest&&"string"===typeof(new XMLHttpRequest).responseType&&(!(navigator.userAgent.match(/MSIE/)||navigator.userAgent.match(/Trident/))||$f())};og.prototype.tc=function(){return"json"};function pg(a){this.gc=Ga()+Ga()+Ga();this.pf=a}
pg.prototype.open=function(a,b,c){function d(){c&&(c(mg("USER_CANCELLED")),c=null)}var e=this,f=Vc(Uf),g;b.requestId=this.gc;b.redirectTo=f.scheme+"://"+f.host+"/blank/page.html";a+=/\?/.test(a)?"":"?";a+=fg(b);(g=window.open(a,"_blank","location=no"))&&ha(g.addEventListener)?(g.addEventListener("loadstart",function(a){var b;if(b=a&&a.url)a:{try{var m=document.createElement("a");m.href=a.url;b=m.host===f.host&&"/blank/page.html"===m.pathname;break a}catch(w){}b=!1}b&&(a=eg(a.url),g.removeEventListener("exit",
d),g.close(),a=new Vf(null,null,{requestId:e.gc,requestKey:a}),e.pf.requestWithCredential("/auth/session",a,c),c=null)}),g.addEventListener("exit",d)):c(mg("TRANSPORT_UNAVAILABLE"))};pg.isAvailable=function(){return Zf()};pg.prototype.tc=function(){return"redirect"};function qg(a){a.callback_parameter||(a.callback_parameter="callback");this.options=a;window.__firebase_auth_jsonp=window.__firebase_auth_jsonp||{}}
qg.prototype.open=function(a,b,c){function d(){c&&(c(mg("REQUEST_INTERRUPTED")),c=null)}function e(){setTimeout(function(){window.__firebase_auth_jsonp[f]=void 0;wa(window.__firebase_auth_jsonp)&&(window.__firebase_auth_jsonp=void 0);try{var a=document.getElementById(f);a&&a.parentNode.removeChild(a)}catch(b){}},1);cg(window,"beforeunload",d)}var f="fn"+(new Date).getTime()+Math.floor(99999*Math.random());b[this.options.callback_parameter]="__firebase_auth_jsonp."+f;a+=(/\?/.test(a)?"":"?")+fg(b);
bg(window,"beforeunload",d);window.__firebase_auth_jsonp[f]=function(a){c&&(c(null,a),c=null);e()};rg(f,a,c)};
function rg(a,b,c){setTimeout(function(){try{var d=document.createElement("script");d.type="text/javascript";d.id=a;d.async=!0;d.src=b;d.onerror=function(){var b=document.getElementById(a);null!==b&&b.parentNode.removeChild(b);c&&c(mg("NETWORK_ERROR"))};var e=document.getElementsByTagName("head");(e&&0!=e.length?e[0]:document.documentElement).appendChild(d)}catch(f){c&&c(mg("NETWORK_ERROR"))}},0)}qg.isAvailable=function(){return!Zf()};qg.prototype.tc=function(){return"json"};function sg(a,b,c,d){wf.call(this,["auth_status"]);this.O=a;this.Xe=b;this.Dg=c;this.Ee=d;this.jc=new Yf(a,[Hc,P]);this.ib=null;tg(this)}ma(sg,wf);h=sg.prototype;h.qe=function(){return this.ib||null};function tg(a){P.get("redirect_request_id")&&ug(a);var b=a.jc.get();b&&b.token?(vg(a,b),a.Xe(b.token,function(c,d){wg(a,c,d,!1,b.token,b)},function(b,d){xg(a,"resumeSession()",b,d)})):vg(a,null)}
function yg(a,b,c,d,e,f){"firebaseio-demo.com"===a.O.domain&&Q("Firebase authentication is not supported on demo Firebases (*.firebaseio-demo.com). To secure your Firebase, create a production Firebase at https://www.firebase.com.");a.Xe(b,function(f,k){wg(a,f,k,!0,b,c,d||{},e)},function(b,c){xg(a,"auth()",b,c,f)})}function zg(a,b){a.jc.clear();vg(a,null);a.Dg(function(a,d){if("ok"===a)R(b,null);else{var e=(a||"error").toUpperCase(),f=e;d&&(f+=": "+d);f=Error(f);f.code=e;R(b,f)}})}
function wg(a,b,c,d,e,f,g,k){"ok"===b?(d&&(b=c.auth,f.auth=b,f.expires=c.expires,f.token=gd(e)?e:"",c=null,b&&u(b,"uid")?c=v(b,"uid"):u(f,"uid")&&(c=v(f,"uid")),f.uid=c,c="custom",b&&u(b,"provider")?c=v(b,"provider"):u(f,"provider")&&(c=v(f,"provider")),f.provider=c,a.jc.clear(),gd(e)&&(g=g||{},c=Hc,"sessionOnly"===g.remember&&(c=P),"none"!==g.remember&&a.jc.set(f,c)),vg(a,f)),R(k,null,f)):(a.jc.clear(),vg(a,null),f=a=(b||"error").toUpperCase(),c&&(f+=": "+c),f=Error(f),f.code=a,R(k,f))}
function xg(a,b,c,d,e){Q(b+" was canceled: "+d);a.jc.clear();vg(a,null);a=Error(d);a.code=c.toUpperCase();R(e,a)}function Ag(a,b,c,d,e){Bg(a);c=new Vf(d||{},{},c||{});Cg(a,[og,qg],"/auth/"+b,c,e)}
function Dg(a,b,c,d){Bg(a);var e=[ng,pg];c=Xf(c);"anonymous"===b||"password"===b?setTimeout(function(){R(d,mg("TRANSPORT_UNAVAILABLE"))},0):(c.Yd.window_features="menubar=yes,modal=yes,alwaysRaised=yeslocation=yes,resizable=yes,scrollbars=yes,status=yes,height=625,width=625,top="+("object"===typeof screen?.5*(screen.height-625):0)+",left="+("object"===typeof screen?.5*(screen.width-625):0),c.Yd.relay_url=hg(a.O.ub),c.Yd.requestWithCredential=q(a.hc,a),Cg(a,e,"/auth/"+b,c,d))}
function ug(a){var b=P.get("redirect_request_id");if(b){var c=P.get("redirect_client_options");P.remove("redirect_request_id");P.remove("redirect_client_options");var d=[og,qg],b={requestId:b,requestKey:eg(document.location.hash)},c=new Vf(c,{},b);try{document.location.hash=document.location.hash.replace(/&__firebase_request_key=([a-zA-z0-9]*)/,"")}catch(e){}Cg(a,d,"/auth/session",c)}}h.me=function(a,b){Bg(this);var c=Xf(a);c.Xa._method="POST";this.hc("/users",c,function(a,c){a?R(b,a):R(b,a,c)})};
h.Le=function(a,b){var c=this;Bg(this);var d="/users/"+encodeURIComponent(a.email),e=Xf(a);e.Xa._method="DELETE";this.hc(d,e,function(a,d){!a&&d&&d.uid&&c.ib&&c.ib.uid&&c.ib.uid===d.uid&&zg(c);R(b,a)})};h.ie=function(a,b){Bg(this);var c="/users/"+encodeURIComponent(a.email)+"/password",d=Xf(a);d.Xa._method="PUT";d.Xa.password=a.newPassword;this.hc(c,d,function(a){R(b,a)})};
h.he=function(a,b){Bg(this);var c="/users/"+encodeURIComponent(a.oldEmail)+"/email",d=Xf(a);d.Xa._method="PUT";d.Xa.email=a.newEmail;d.Xa.password=a.password;this.hc(c,d,function(a){R(b,a)})};h.Me=function(a,b){Bg(this);var c="/users/"+encodeURIComponent(a.email)+"/password",d=Xf(a);d.Xa._method="POST";this.hc(c,d,function(a){R(b,a)})};h.hc=function(a,b,c){Eg(this,[og,qg],a,b,c)};
function Cg(a,b,c,d,e){Eg(a,b,c,d,function(b,c){!b&&c&&c.token&&c.uid?yg(a,c.token,c,d.bd,function(a,b){a?R(e,a):R(e,null,b)}):R(e,b||mg("UNKNOWN_ERROR"))})}
function Eg(a,b,c,d,e){b=Pa(b,function(a){return"function"===typeof a.isAvailable&&a.isAvailable()});0===b.length?setTimeout(function(){R(e,mg("TRANSPORT_UNAVAILABLE"))},0):(b=new (b.shift())(d.Yd),d=ib(d.Xa),d.v="js-2.2.1",d.transport=b.tc(),d.suppress_status_codes=!0,a=gg()+"/"+a.O.ub+c,b.open(a,d,function(a,b){if(a)R(e,a);else if(b&&b.error){var c=Error(b.error.message);c.code=b.error.code;c.details=b.error.details;R(e,c)}else R(e,null,b)}))}
function vg(a,b){var c=null!==a.ib||null!==b;a.ib=b;c&&a.Zd("auth_status",b);a.Ee(null!==b)}h.te=function(a){J("auth_status"===a,'initial event must be of type "auth_status"');return[this.ib]};function Bg(a){var b=a.O;if("firebaseio.com"!==b.domain&&"firebaseio-demo.com"!==b.domain&&"auth.firebase.com"===Uf)throw Error("This custom Firebase server ('"+a.O.domain+"') does not support delegated login.");};function Fg(a){this.ac=a;this.Gd=[];this.Jb=0;this.ke=-1;this.xb=null}function Gg(a,b,c){a.ke=b;a.xb=c;a.ke<a.Jb&&(a.xb(),a.xb=null)}function Hg(a,b,c){for(a.Gd[b]=c;a.Gd[a.Jb];){var d=a.Gd[a.Jb];delete a.Gd[a.Jb];for(var e=0;e<d.length;++e)if(d[e]){var f=a;Ab(function(){f.ac(d[e])})}if(a.Jb===a.ke){a.xb&&(clearTimeout(a.xb),a.xb(),a.xb=null);break}a.Jb++}};function Ig(a,b,c){this.le=a;this.f=Sc(a);this.jb=this.kb=0;this.Ra=Pb(b);this.Qd=c;this.yc=!1;this.Yc=function(a){b.host!==b.Ma&&(a.ns=b.ub);var c=[],f;for(f in a)a.hasOwnProperty(f)&&c.push(f+"="+a[f]);return(b.Bb?"https://":"http://")+b.Ma+"/.lp?"+c.join("&")}}var Jg,Kg;
Ig.prototype.open=function(a,b){this.$e=0;this.ga=b;this.mf=new Fg(a);this.rb=!1;var c=this;this.mb=setTimeout(function(){c.f("Timed out trying to connect.");c.eb();c.mb=null},Math.floor(3E4));Xc(function(){if(!c.rb){c.Pa=new Lg(function(a,b,d,k,l){Mg(c,arguments);if(c.Pa)if(c.mb&&(clearTimeout(c.mb),c.mb=null),c.yc=!0,"start"==a)c.id=b,c.rf=d;else if("close"===a)b?(c.Pa.Od=!1,Gg(c.mf,b,function(){c.eb()})):c.eb();else throw Error("Unrecognized command received: "+a);},function(a,b){Mg(c,arguments);
Hg(c.mf,a,b)},function(){c.eb()},c.Yc);var a={start:"t"};a.ser=Math.floor(1E8*Math.random());c.Pa.$d&&(a.cb=c.Pa.$d);a.v="5";c.Qd&&(a.s=c.Qd);"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(a.r="f");a=c.Yc(a);c.f("Connecting via long-poll to "+a);Ng(c.Pa,a,function(){})}})};
Ig.prototype.start=function(){var a=this.Pa,b=this.rf;a.cg=this.id;a.dg=b;for(a.ee=!0;Og(a););a=this.id;b=this.rf;this.Zb=document.createElement("iframe");var c={dframe:"t"};c.id=a;c.pw=b;this.Zb.src=this.Yc(c);this.Zb.style.display="none";document.body.appendChild(this.Zb)};Ig.isAvailable=function(){return!Kg&&!("object"===typeof window&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))&&!("object"===typeof Windows&&"object"===typeof Windows.Fg)&&(Jg||!0)};h=Ig.prototype;
h.ud=function(){};h.Uc=function(){this.rb=!0;this.Pa&&(this.Pa.close(),this.Pa=null);this.Zb&&(document.body.removeChild(this.Zb),this.Zb=null);this.mb&&(clearTimeout(this.mb),this.mb=null)};h.eb=function(){this.rb||(this.f("Longpoll is closing itself"),this.Uc(),this.ga&&(this.ga(this.yc),this.ga=null))};h.close=function(){this.rb||(this.f("Longpoll is being closed."),this.Uc())};
h.send=function(a){a=B(a);this.kb+=a.length;Mb(this.Ra,"bytes_sent",a.length);a=Oc(a);a=fb(a,!0);a=ad(a,1840);for(var b=0;b<a.length;b++){var c=this.Pa;c.Qc.push({ug:this.$e,Cg:a.length,bf:a[b]});c.ee&&Og(c);this.$e++}};function Mg(a,b){var c=B(b).length;a.jb+=c;Mb(a.Ra,"bytes_received",c)}
function Lg(a,b,c,d){this.Yc=d;this.fb=c;this.Ie=new Rf;this.Qc=[];this.ne=Math.floor(1E8*Math.random());this.Od=!0;this.$d=Kc();window["pLPCommand"+this.$d]=a;window["pRTLPCB"+this.$d]=b;a=document.createElement("iframe");a.style.display="none";if(document.body){document.body.appendChild(a);try{a.contentWindow.document||zb("No IE domain setting required")}catch(e){a.src="javascript:void((function(){document.open();document.domain='"+document.domain+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
a.contentDocument?a.ab=a.contentDocument:a.contentWindow?a.ab=a.contentWindow.document:a.document&&(a.ab=a.document);this.Aa=a;a="";this.Aa.src&&"javascript:"===this.Aa.src.substr(0,11)&&(a='<script>document.domain="'+document.domain+'";\x3c/script>');a="<html><body>"+a+"</body></html>";try{this.Aa.ab.open(),this.Aa.ab.write(a),this.Aa.ab.close()}catch(f){zb("frame writing exception"),f.stack&&zb(f.stack),zb(f)}}
Lg.prototype.close=function(){this.ee=!1;if(this.Aa){this.Aa.ab.body.innerHTML="";var a=this;setTimeout(function(){null!==a.Aa&&(document.body.removeChild(a.Aa),a.Aa=null)},Math.floor(0))}var b=this.fb;b&&(this.fb=null,b())};
function Og(a){if(a.ee&&a.Od&&a.Ie.count()<(0<a.Qc.length?2:1)){a.ne++;var b={};b.id=a.cg;b.pw=a.dg;b.ser=a.ne;for(var b=a.Yc(b),c="",d=0;0<a.Qc.length;)if(1870>=a.Qc[0].bf.length+30+c.length){var e=a.Qc.shift(),c=c+"&seg"+d+"="+e.ug+"&ts"+d+"="+e.Cg+"&d"+d+"="+e.bf;d++}else break;Pg(a,b+c,a.ne);return!0}return!1}function Pg(a,b,c){function d(){a.Ie.remove(c);Og(a)}a.Ie.add(c,1);var e=setTimeout(d,Math.floor(25E3));Ng(a,b,function(){clearTimeout(e);d()})}
function Ng(a,b,c){setTimeout(function(){try{if(a.Od){var d=a.Aa.ab.createElement("script");d.type="text/javascript";d.async=!0;d.src=b;d.onload=d.onreadystatechange=function(){var a=d.readyState;a&&"loaded"!==a&&"complete"!==a||(d.onload=d.onreadystatechange=null,d.parentNode&&d.parentNode.removeChild(d),c())};d.onerror=function(){zb("Long-poll script failed to load: "+b);a.Od=!1;a.close()};a.Aa.ab.body.appendChild(d)}}catch(e){}},Math.floor(1))};var Qg=null;"undefined"!==typeof MozWebSocket?Qg=MozWebSocket:"undefined"!==typeof WebSocket&&(Qg=WebSocket);function Rg(a,b,c){this.le=a;this.f=Sc(this.le);this.frames=this.Cc=null;this.jb=this.kb=this.Ue=0;this.Ra=Pb(b);this.$a=(b.Bb?"wss://":"ws://")+b.Ma+"/.ws?v=5";"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(this.$a+="&r=f");b.host!==b.Ma&&(this.$a=this.$a+"&ns="+b.ub);c&&(this.$a=this.$a+"&s="+c)}var Sg;
Rg.prototype.open=function(a,b){this.fb=b;this.hg=a;this.f("Websocket connecting to "+this.$a);this.yc=!1;Hc.set("previous_websocket_failure",!0);try{this.ua=new Qg(this.$a)}catch(c){this.f("Error instantiating WebSocket.");var d=c.message||c.data;d&&this.f(d);this.eb();return}var e=this;this.ua.onopen=function(){e.f("Websocket connected.");e.yc=!0};this.ua.onclose=function(){e.f("Websocket connection was disconnected.");e.ua=null;e.eb()};this.ua.onmessage=function(a){if(null!==e.ua)if(a=a.data,e.jb+=
a.length,Mb(e.Ra,"bytes_received",a.length),Tg(e),null!==e.frames)Ug(e,a);else{a:{J(null===e.frames,"We already have a frame buffer");if(6>=a.length){var b=Number(a);if(!isNaN(b)){e.Ue=b;e.frames=[];a=null;break a}}e.Ue=1;e.frames=[]}null!==a&&Ug(e,a)}};this.ua.onerror=function(a){e.f("WebSocket error.  Closing connection.");(a=a.message||a.data)&&e.f(a);e.eb()}};Rg.prototype.start=function(){};
Rg.isAvailable=function(){var a=!1;if("undefined"!==typeof navigator&&navigator.userAgent){var b=navigator.userAgent.match(/Android ([0-9]{0,}\.[0-9]{0,})/);b&&1<b.length&&4.4>parseFloat(b[1])&&(a=!0)}return!a&&null!==Qg&&!Sg};Rg.responsesRequiredToBeHealthy=2;Rg.healthyTimeout=3E4;h=Rg.prototype;h.ud=function(){Hc.remove("previous_websocket_failure")};function Ug(a,b){a.frames.push(b);if(a.frames.length==a.Ue){var c=a.frames.join("");a.frames=null;c=kb(c);a.hg(c)}}
h.send=function(a){Tg(this);a=B(a);this.kb+=a.length;Mb(this.Ra,"bytes_sent",a.length);a=ad(a,16384);1<a.length&&this.ua.send(String(a.length));for(var b=0;b<a.length;b++)this.ua.send(a[b])};h.Uc=function(){this.rb=!0;this.Cc&&(clearInterval(this.Cc),this.Cc=null);this.ua&&(this.ua.close(),this.ua=null)};h.eb=function(){this.rb||(this.f("WebSocket is closing itself"),this.Uc(),this.fb&&(this.fb(this.yc),this.fb=null))};h.close=function(){this.rb||(this.f("WebSocket is being closed"),this.Uc())};
function Tg(a){clearInterval(a.Cc);a.Cc=setInterval(function(){a.ua&&a.ua.send("0");Tg(a)},Math.floor(45E3))};function Vg(a){Wg(this,a)}var Xg=[Ig,Rg];function Wg(a,b){var c=Rg&&Rg.isAvailable(),d=c&&!(Hc.lf||!0===Hc.get("previous_websocket_failure"));b.Eg&&(c||Q("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),d=!0);if(d)a.Wc=[Rg];else{var e=a.Wc=[];bd(Xg,function(a,b){b&&b.isAvailable()&&e.push(b)})}}function Yg(a){if(0<a.Wc.length)return a.Wc[0];throw Error("No transports available");};function Zg(a,b,c,d,e,f){this.id=a;this.f=Sc("c:"+this.id+":");this.ac=c;this.Kc=d;this.ga=e;this.Ge=f;this.O=b;this.Fd=[];this.Ye=0;this.Af=new Vg(b);this.Qa=0;this.f("Connection created");$g(this)}
function $g(a){var b=Yg(a.Af);a.J=new b("c:"+a.id+":"+a.Ye++,a.O);a.Ke=b.responsesRequiredToBeHealthy||0;var c=ah(a,a.J),d=bh(a,a.J);a.Xc=a.J;a.Tc=a.J;a.D=null;a.sb=!1;setTimeout(function(){a.J&&a.J.open(c,d)},Math.floor(0));b=b.healthyTimeout||0;0<b&&(a.nd=setTimeout(function(){a.nd=null;a.sb||(a.J&&102400<a.J.jb?(a.f("Connection exceeded healthy timeout but has received "+a.J.jb+" bytes.  Marking connection healthy."),a.sb=!0,a.J.ud()):a.J&&10240<a.J.kb?a.f("Connection exceeded healthy timeout but has sent "+
a.J.kb+" bytes.  Leaving connection alive."):(a.f("Closing unhealthy connection after timeout."),a.close()))},Math.floor(b)))}function bh(a,b){return function(c){b===a.J?(a.J=null,c||0!==a.Qa?1===a.Qa&&a.f("Realtime connection lost."):(a.f("Realtime connection failed."),"s-"===a.O.Ma.substr(0,2)&&(Hc.remove("host:"+a.O.host),a.O.Ma=a.O.host)),a.close()):b===a.D?(a.f("Secondary connection lost."),c=a.D,a.D=null,a.Xc!==c&&a.Tc!==c||a.close()):a.f("closing an old connection")}}
function ah(a,b){return function(c){if(2!=a.Qa)if(b===a.Tc){var d=Zc("t",c);c=Zc("d",c);if("c"==d){if(d=Zc("t",c),"d"in c)if(c=c.d,"h"===d){var d=c.ts,e=c.v,f=c.h;a.Qd=c.s;Jc(a.O,f);0==a.Qa&&(a.J.start(),ch(a,a.J,d),"5"!==e&&Q("Protocol version mismatch detected"),c=a.Af,(c=1<c.Wc.length?c.Wc[1]:null)&&dh(a,c))}else if("n"===d){a.f("recvd end transmission on primary");a.Tc=a.D;for(c=0;c<a.Fd.length;++c)a.Bd(a.Fd[c]);a.Fd=[];eh(a)}else"s"===d?(a.f("Connection shutdown command received. Shutting down..."),
a.Ge&&(a.Ge(c),a.Ge=null),a.ga=null,a.close()):"r"===d?(a.f("Reset packet received.  New host: "+c),Jc(a.O,c),1===a.Qa?a.close():(fh(a),$g(a))):"e"===d?Tc("Server Error: "+c):"o"===d?(a.f("got pong on primary."),gh(a),hh(a)):Tc("Unknown control packet command: "+d)}else"d"==d&&a.Bd(c)}else if(b===a.D)if(d=Zc("t",c),c=Zc("d",c),"c"==d)"t"in c&&(c=c.t,"a"===c?ih(a):"r"===c?(a.f("Got a reset on secondary, closing it"),a.D.close(),a.Xc!==a.D&&a.Tc!==a.D||a.close()):"o"===c&&(a.f("got pong on secondary."),
a.yf--,ih(a)));else if("d"==d)a.Fd.push(c);else throw Error("Unknown protocol layer: "+d);else a.f("message on old connection")}}Zg.prototype.Ba=function(a){jh(this,{t:"d",d:a})};function eh(a){a.Xc===a.D&&a.Tc===a.D&&(a.f("cleaning up and promoting a connection: "+a.D.le),a.J=a.D,a.D=null)}
function ih(a){0>=a.yf?(a.f("Secondary connection is healthy."),a.sb=!0,a.D.ud(),a.D.start(),a.f("sending client ack on secondary"),a.D.send({t:"c",d:{t:"a",d:{}}}),a.f("Ending transmission on primary"),a.J.send({t:"c",d:{t:"n",d:{}}}),a.Xc=a.D,eh(a)):(a.f("sending ping on secondary."),a.D.send({t:"c",d:{t:"p",d:{}}}))}Zg.prototype.Bd=function(a){gh(this);this.ac(a)};function gh(a){a.sb||(a.Ke--,0>=a.Ke&&(a.f("Primary connection is healthy."),a.sb=!0,a.J.ud()))}
function dh(a,b){a.D=new b("c:"+a.id+":"+a.Ye++,a.O,a.Qd);a.yf=b.responsesRequiredToBeHealthy||0;a.D.open(ah(a,a.D),bh(a,a.D));setTimeout(function(){a.D&&(a.f("Timed out trying to upgrade."),a.D.close())},Math.floor(6E4))}function ch(a,b,c){a.f("Realtime connection established.");a.J=b;a.Qa=1;a.Kc&&(a.Kc(c),a.Kc=null);0===a.Ke?(a.f("Primary connection is healthy."),a.sb=!0):setTimeout(function(){hh(a)},Math.floor(5E3))}
function hh(a){a.sb||1!==a.Qa||(a.f("sending ping on primary."),jh(a,{t:"c",d:{t:"p",d:{}}}))}function jh(a,b){if(1!==a.Qa)throw"Connection is not connected";a.Xc.send(b)}Zg.prototype.close=function(){2!==this.Qa&&(this.f("Closing realtime connection."),this.Qa=2,fh(this),this.ga&&(this.ga(),this.ga=null))};function fh(a){a.f("Shutting down all connections");a.J&&(a.J.close(),a.J=null);a.D&&(a.D.close(),a.D=null);a.nd&&(clearTimeout(a.nd),a.nd=null)};function kh(a,b,c,d){this.id=lh++;this.f=Sc("p:"+this.id+":");this.Db=!0;this.ta={};this.ma=[];this.Nc=0;this.Jc=[];this.ja=!1;this.Wa=1E3;this.wd=3E5;this.Cd=b;this.Ad=c;this.He=d;this.O=a;this.Oe=null;this.Sc={};this.tg=0;this.Dc=this.ze=null;mh(this,0);Af.Ob().wb("visible",this.kg,this);-1===a.host.indexOf("fblocal")&&zf.Ob().wb("online",this.ig,this)}var lh=0,nh=0;h=kh.prototype;
h.Ba=function(a,b,c){var d=++this.tg;a={r:d,a:a,b:b};this.f(B(a));J(this.ja,"sendRequest call when we're not connected not allowed.");this.Oa.Ba(a);c&&(this.Sc[d]=c)};function oh(a,b,c,d,e){var f=b.Fa(),g=b.path.toString();a.f("Listen called for "+g+" "+f);a.ta[g]=a.ta[g]||{};J(!a.ta[g][f],"listen() called twice for same path/queryId.");b={H:e,md:c,qg:ge(b.n),tag:d};a.ta[g][f]=b;a.ja&&ph(a,g,f,b)}
function ph(a,b,c,d){a.f("Listen on "+b+" for "+c);var e={p:b};d.tag&&(e.q=d.qg,e.t=d.tag);e.h=d.md();a.Ba("q",e,function(e){if((a.ta[b]&&a.ta[b][c])===d){a.f("listen response",e);var g=e.s;"ok"!==g&&qh(a,b,c);e=e.d;d.H&&d.H(g,e)}})}h.Q=function(a,b,c){this.Ib={Rf:a,df:!1,rc:b,$c:c};this.f("Authenticating using credential: "+a);rh(this);(b=40==a.length)||(a=ed(a).je,b="object"===typeof a&&!0===v(a,"admin"));b&&(this.f("Admin auth credential detected.  Reducing max reconnect time."),this.wd=3E4)};
h.Ve=function(a){delete this.Ib;this.ja&&this.Ba("unauth",{},function(b){a(b.s,b.d)})};function rh(a){var b=a.Ib;a.ja&&b&&a.Ba("auth",{cred:b.Rf},function(c){var d=c.s;c=c.d||"error";"ok"!==d&&a.Ib===b&&delete a.Ib;b.df?"ok"!==d&&b.$c&&b.$c(d,c):(b.df=!0,b.rc&&b.rc(d,c))})}function sh(a,b,c,d){a.ja?th(a,"o",b,c,d):a.Jc.push({Pc:b,action:"o",data:c,H:d})}function uh(a,b,c,d){a.ja?th(a,"om",b,c,d):a.Jc.push({Pc:b,action:"om",data:c,H:d})}
h.Fe=function(a,b){this.ja?th(this,"oc",a,null,b):this.Jc.push({Pc:a,action:"oc",data:null,H:b})};function th(a,b,c,d,e){c={p:c,d:d};a.f("onDisconnect "+b,c);a.Ba(b,c,function(a){e&&setTimeout(function(){e(a.s,a.d)},Math.floor(0))})}h.put=function(a,b,c,d){vh(this,"p",a,b,c,d)};function wh(a,b,c,d){vh(a,"m",b,c,d,void 0)}function vh(a,b,c,d,e,f){d={p:c,d:d};n(f)&&(d.h=f);a.ma.push({action:b,uf:d,H:e});a.Nc++;b=a.ma.length-1;a.ja?xh(a,b):a.f("Buffering put: "+c)}
function xh(a,b){var c=a.ma[b].action,d=a.ma[b].uf,e=a.ma[b].H;a.ma[b].rg=a.ja;a.Ba(c,d,function(d){a.f(c+" response",d);delete a.ma[b];a.Nc--;0===a.Nc&&(a.ma=[]);e&&e(d.s,d.d)})}
h.Bd=function(a){if("r"in a){this.f("from server: "+B(a));var b=a.r,c=this.Sc[b];c&&(delete this.Sc[b],c(a.b))}else{if("error"in a)throw"A server-side error has occurred: "+a.error;"a"in a&&(b=a.a,c=a.b,this.f("handleServerMessage",b,c),"d"===b?this.Cd(c.p,c.d,!1,c.t):"m"===b?this.Cd(c.p,c.d,!0,c.t):"c"===b?yh(this,c.p,c.q):"ac"===b?(a=c.s,b=c.d,c=this.Ib,delete this.Ib,c&&c.$c&&c.$c(a,b)):"sd"===b?this.Oe?this.Oe(c):"msg"in c&&"undefined"!==typeof console&&console.log("FIREBASE: "+c.msg.replace("\n",
"\nFIREBASE: ")):Tc("Unrecognized action received from server: "+B(b)+"\nAre you using the latest client?"))}};h.Kc=function(a){this.f("connection ready");this.ja=!0;this.Dc=(new Date).getTime();this.He({serverTimeOffset:a-(new Date).getTime()});zh(this);this.Ad(!0)};function mh(a,b){J(!a.Oa,"Scheduling a connect when we're already connected/ing?");a.Kb&&clearTimeout(a.Kb);a.Kb=setTimeout(function(){a.Kb=null;Ah(a)},Math.floor(b))}
h.kg=function(a){a&&!this.nc&&this.Wa===this.wd&&(this.f("Window became visible.  Reducing delay."),this.Wa=1E3,this.Oa||mh(this,0));this.nc=a};h.ig=function(a){a?(this.f("Browser went online.  Reconnecting."),this.Wa=1E3,this.Db=!0,this.Oa||mh(this,0)):(this.f("Browser went offline.  Killing connection; don't reconnect."),this.Db=!1,this.Oa&&this.Oa.close())};
h.of=function(){this.f("data client disconnected");this.ja=!1;this.Oa=null;for(var a=0;a<this.ma.length;a++){var b=this.ma[a];b&&"h"in b.uf&&b.rg&&(b.H&&b.H("disconnect"),delete this.ma[a],this.Nc--)}0===this.Nc&&(this.ma=[]);if(this.Db)this.nc?this.Dc&&(3E4<(new Date).getTime()-this.Dc&&(this.Wa=1E3),this.Dc=null):(this.f("Window isn't visible.  Delaying reconnect."),this.Wa=this.wd,this.ze=(new Date).getTime()),a=Math.max(0,this.Wa-((new Date).getTime()-this.ze)),a*=Math.random(),this.f("Trying to reconnect in "+
a+"ms"),mh(this,a),this.Wa=Math.min(this.wd,1.3*this.Wa);else for(var c in this.Sc)delete this.Sc[c];this.Ad(!1)};function Ah(a){if(a.Db){a.f("Making a connection attempt");a.ze=(new Date).getTime();a.Dc=null;var b=q(a.Bd,a),c=q(a.Kc,a),d=q(a.of,a),e=a.id+":"+nh++;a.Oa=new Zg(e,a.O,b,c,d,function(b){Q(b+" ("+a.O.toString()+")");a.Db=!1})}}h.qb=function(){this.Db=!1;this.Oa?this.Oa.close():(this.Kb&&(clearTimeout(this.Kb),this.Kb=null),this.ja&&this.of())};
h.ic=function(){this.Db=!0;this.Wa=1E3;this.Oa||mh(this,0)};function yh(a,b,c){c=c?Qa(c,function(a){return $c(a)}).join("$"):"default";(a=qh(a,b,c))&&a.H&&a.H("permission_denied")}function qh(a,b,c){b=(new K(b)).toString();var d;n(a.ta[b])?(d=a.ta[b][c],delete a.ta[b][c],0===pa(a.ta[b])&&delete a.ta[b]):d=void 0;return d}
function zh(a){rh(a);r(a.ta,function(b,d){r(b,function(b,c){ph(a,d,c,b)})});for(var b=0;b<a.ma.length;b++)a.ma[b]&&xh(a,b);for(;a.Jc.length;)b=a.Jc.shift(),th(a,b.action,b.Pc,b.data,b.H)};var W={Xf:function(){Jg=Sg=!0}};W.forceLongPolling=W.Xf;W.Yf=function(){Kg=!0};W.forceWebSockets=W.Yf;W.xg=function(a,b){a.k.S.Oe=b};W.setSecurityDebugCallback=W.xg;W.Qe=function(a,b){a.k.Qe(b)};W.stats=W.Qe;W.Re=function(a,b){a.k.Re(b)};W.statsIncrementCounter=W.Re;W.gd=function(a){return a.k.gd};W.dataUpdateCount=W.gd;W.ag=function(a,b){a.k.xe=b};W.interceptServerData=W.ag;W.gg=function(a){new ig(a)};W.onPopupOpen=W.gg;W.vg=function(a){Uf=a};W.setAuthenticationServer=W.vg;function S(a,b,c){this.A=a;this.W=b;this.g=c}S.prototype.I=function(){x("Firebase.DataSnapshot.val",0,0,arguments.length);return this.A.I()};S.prototype.val=S.prototype.I;S.prototype.cf=function(){x("Firebase.DataSnapshot.exportVal",0,0,arguments.length);return this.A.I(!0)};S.prototype.exportVal=S.prototype.cf;S.prototype.Wf=function(){x("Firebase.DataSnapshot.exists",0,0,arguments.length);return!this.A.e()};S.prototype.exists=S.prototype.Wf;
S.prototype.u=function(a){x("Firebase.DataSnapshot.child",0,1,arguments.length);ga(a)&&(a=String(a));Mf("Firebase.DataSnapshot.child",a);var b=new K(a),c=this.W.u(b);return new S(this.A.ka(b),c,M)};S.prototype.child=S.prototype.u;S.prototype.Da=function(a){x("Firebase.DataSnapshot.hasChild",1,1,arguments.length);Mf("Firebase.DataSnapshot.hasChild",a);var b=new K(a);return!this.A.ka(b).e()};S.prototype.hasChild=S.prototype.Da;
S.prototype.L=function(){x("Firebase.DataSnapshot.getPriority",0,0,arguments.length);return this.A.L().I()};S.prototype.getPriority=S.prototype.L;S.prototype.forEach=function(a){x("Firebase.DataSnapshot.forEach",1,1,arguments.length);A("Firebase.DataSnapshot.forEach",1,a,!1);if(this.A.M())return!1;var b=this;return!!this.A.U(this.g,function(c,d){return a(new S(d,b.W.u(c),M))})};S.prototype.forEach=S.prototype.forEach;
S.prototype.ld=function(){x("Firebase.DataSnapshot.hasChildren",0,0,arguments.length);return this.A.M()?!1:!this.A.e()};S.prototype.hasChildren=S.prototype.ld;S.prototype.name=function(){Q("Firebase.DataSnapshot.name() being deprecated. Please use Firebase.DataSnapshot.key() instead.");x("Firebase.DataSnapshot.name",0,0,arguments.length);return this.key()};S.prototype.name=S.prototype.name;S.prototype.key=function(){x("Firebase.DataSnapshot.key",0,0,arguments.length);return this.W.key()};
S.prototype.key=S.prototype.key;S.prototype.vb=function(){x("Firebase.DataSnapshot.numChildren",0,0,arguments.length);return this.A.vb()};S.prototype.numChildren=S.prototype.vb;S.prototype.dc=function(){x("Firebase.DataSnapshot.ref",0,0,arguments.length);return this.W};S.prototype.ref=S.prototype.dc;function Bh(a){this.O=a;this.Ra=Pb(a);this.ba=new sb;this.zd=1;this.S=new kh(this.O,q(this.Cd,this),q(this.Ad,this),q(this.He,this));this.Ag=Qb(a,q(function(){return new Kb(this.Ra,this.S)},this));this.mc=new yc;this.we=new lb;var b=this;this.qd=new bf({Pe:function(a,d,e,f){d=[];e=b.we.j(a.path);e.e()||(d=df(b.qd,new Vb(xe,a.path,e)),setTimeout(function(){f("ok")},0));return d},Ud:ba});Ch(this,"connected",!1);this.ga=new rc;this.Q=new sg(a,q(this.S.Q,this.S),q(this.S.Ve,this.S),q(this.Ee,this));this.gd=
0;this.xe=null;this.N=new bf({Pe:function(a,d,e,f){oh(b.S,a,e,d,function(d,e){var l=f(d,e);xb(b.ba,a.path,l)});return[]},Ud:function(a,d){var e=b.S,f=a.path.toString(),g=a.Fa();e.f("Unlisten called for "+f+" "+g);if(qh(e,f,g)&&e.ja){var k=ge(a.n);e.f("Unlisten on "+f+" for "+g);f={p:f};d&&(f.q=k,f.t=d);e.Ba("n",f)}}})}h=Bh.prototype;h.toString=function(){return(this.O.Bb?"https://":"http://")+this.O.host};h.name=function(){return this.O.ub};
function Dh(a){a=a.we.j(new K(".info/serverTimeOffset")).I()||0;return(new Date).getTime()+a}function Eh(a){a=a={timestamp:Dh(a)};a.timestamp=a.timestamp||(new Date).getTime();return a}h.Cd=function(a,b,c,d){this.gd++;var e=new K(a);b=this.xe?this.xe(a,b):b;a=[];d?c?(b=na(b,function(a){return L(a)}),a=mf(this.N,e,b,d)):(b=L(b),a=hf(this.N,e,b,d)):c?(d=na(b,function(a){return L(a)}),a=gf(this.N,e,d)):(d=L(b),a=df(this.N,new Vb(xe,e,d)));d=e;0<a.length&&(d=Fh(this,e));xb(this.ba,d,a)};
h.Ad=function(a){Ch(this,"connected",a);!1===a&&Gh(this)};h.He=function(a){var b=this;bd(a,function(a,d){Ch(b,d,a)})};h.Ee=function(a){Ch(this,"authenticated",a)};function Ch(a,b,c){b=new K("/.info/"+b);c=L(c);var d=a.we;d.Nd=d.Nd.F(b,c);c=df(a.qd,new Vb(xe,b,c));xb(a.ba,b,c)}
h.Cb=function(a,b,c,d){this.f("set",{path:a.toString(),value:b,Ig:c});var e=Eh(this);b=L(b,c);var e=tc(b,e),f=this.zd++,e=cf(this.N,a,e,f,!0);tb(this.ba,e);var g=this;this.S.put(a.toString(),b.I(!0),function(b,c){var e="ok"===b;e||Q("set at "+a+" failed: "+b);e=ff(g.N,f,!e);xb(g.ba,a,e);Hh(d,b,c)});e=Ih(this,a);Fh(this,e);xb(this.ba,e,[])};
h.update=function(a,b,c){this.f("update",{path:a.toString(),value:b});var d=!0,e=Eh(this),f={};r(b,function(a,b){d=!1;var c=L(a);f[b]=tc(c,e)});if(d)zb("update() called with empty data.  Don't do anything."),Hh(c,"ok");else{var g=this.zd++,k=ef(this.N,a,f,g);tb(this.ba,k);var l=this;wh(this.S,a.toString(),b,function(b,d){J("ok"===b||"permission_denied"===b,"merge at "+a+" failed.");var e="ok"===b;e||Q("update at "+a+" failed: "+b);var e=ff(l.N,g,!e),f=a;0<e.length&&(f=Fh(l,a));xb(l.ba,f,e);Hh(c,b,
d)});b=Ih(this,a);Fh(this,b);xb(this.ba,a,[])}};function Gh(a){a.f("onDisconnectEvents");var b=Eh(a),c=[];sc(qc(a.ga,b),F,function(b,e){c=c.concat(df(a.N,new Vb(xe,b,e)));var f=Ih(a,b);Fh(a,f)});a.ga=new rc;xb(a.ba,F,c)}h.Fe=function(a,b){var c=this;this.S.Fe(a.toString(),function(d,e){"ok"===d&&Tf(c.ga,a);Hh(b,d,e)})};function Jh(a,b,c,d){var e=L(c);sh(a.S,b.toString(),e.I(!0),function(c,g){"ok"===c&&a.ga.ec(b,e);Hh(d,c,g)})}
function Kh(a,b,c,d,e){var f=L(c,d);sh(a.S,b.toString(),f.I(!0),function(c,d){"ok"===c&&a.ga.ec(b,f);Hh(e,c,d)})}function Lh(a,b,c,d){var e=!0,f;for(f in c)e=!1;e?(zb("onDisconnect().update() called with empty data.  Don't do anything."),Hh(d,"ok")):uh(a.S,b.toString(),c,function(e,f){if("ok"===e)for(var l in c){var m=L(c[l]);a.ga.ec(b.u(l),m)}Hh(d,e,f)})}function Mh(a,b,c){c=".info"===O(b.path)?a.qd.Gb(b,c):a.N.Gb(b,c);vb(a.ba,b.path,c)}h.qb=function(){this.S.qb()};h.ic=function(){this.S.ic()};
h.Qe=function(a){if("undefined"!==typeof console){a?(this.Td||(this.Td=new Jb(this.Ra)),a=this.Td.get()):a=this.Ra.get();var b=Ra(sa(a),function(a,b){return Math.max(b.length,a)},0),c;for(c in a){for(var d=a[c],e=c.length;e<b+2;e++)c+=" ";console.log(c+d)}}};h.Re=function(a){Mb(this.Ra,a);this.Ag.zf[a]=!0};h.f=function(a){zb("r:"+this.S.id+":",arguments)};function Hh(a,b,c){a&&Ab(function(){if("ok"==b)a(null);else{var d=(b||"error").toUpperCase(),e=d;c&&(e+=": "+c);e=Error(e);e.code=d;a(e)}})};function Nh(a,b,c,d,e){function f(){}a.f("transaction on "+b);var g=new U(a,b);g.wb("value",f);c={path:b,update:c,H:d,status:null,qf:Kc(),We:e,xf:0,ae:function(){g.$b("value",f)},de:null,ya:null,dd:null,ed:null,fd:null};d=a.N.qa(b,void 0)||C;c.dd=d;d=c.update(d.I());if(n(d)){Gf("transaction failed: Data returned ",d);c.status=1;e=zc(a.mc,b);var k=e.za()||[];k.push(c);Ac(e,k);"object"===typeof d&&null!==d&&u(d,".priority")?(k=v(d,".priority"),J(Ef(k),"Invalid priority returned by transaction. Priority must be a valid string, finite number, server value, or null.")):
k=(a.N.qa(b)||C).L().I();e=Eh(a);d=L(d,k);e=tc(d,e);c.ed=d;c.fd=e;c.ya=a.zd++;c=cf(a.N,b,e,c.ya,c.We);xb(a.ba,b,c);Oh(a)}else c.ae(),c.ed=null,c.fd=null,c.H&&(a=new S(c.dd,new U(a,c.path),M),c.H(null,!1,a))}function Oh(a,b){var c=b||a.mc;b||Ph(a,c);if(null!==c.za()){var d=Qh(a,c);J(0<d.length,"Sending zero length transaction queue");Sa(d,function(a){return 1===a.status})&&Rh(a,c.path(),d)}else c.ld()&&c.U(function(b){Oh(a,b)})}
function Rh(a,b,c){for(var d=Qa(c,function(a){return a.ya}),e=a.N.qa(b,d)||C,d=e,e=e.hash(),f=0;f<c.length;f++){var g=c[f];J(1===g.status,"tryToSendTransactionQueue_: items in queue should all be run.");g.status=2;g.xf++;var k=N(b,g.path),d=d.F(k,g.ed)}d=d.I(!0);a.S.put(b.toString(),d,function(d){a.f("transaction put response",{path:b.toString(),status:d});var e=[];if("ok"===d){d=[];for(f=0;f<c.length;f++){c[f].status=3;e=e.concat(ff(a.N,c[f].ya));if(c[f].H){var g=c[f].fd,k=new U(a,c[f].path);d.push(q(c[f].H,
null,null,!0,new S(g,k,M)))}c[f].ae()}Ph(a,zc(a.mc,b));Oh(a);xb(a.ba,b,e);for(f=0;f<d.length;f++)Ab(d[f])}else{if("datastale"===d)for(f=0;f<c.length;f++)c[f].status=4===c[f].status?5:1;else for(Q("transaction at "+b.toString()+" failed: "+d),f=0;f<c.length;f++)c[f].status=5,c[f].de=d;Fh(a,b)}},e)}function Fh(a,b){var c=Sh(a,b),d=c.path(),c=Qh(a,c);Th(a,c,d);return d}
function Th(a,b,c){if(0!==b.length){for(var d=[],e=[],f=Qa(b,function(a){return a.ya}),g=0;g<b.length;g++){var k=b[g],l=N(c,k.path),m=!1,w;J(null!==l,"rerunTransactionsUnderNode_: relativePath should not be null.");if(5===k.status)m=!0,w=k.de,e=e.concat(ff(a.N,k.ya,!0));else if(1===k.status)if(25<=k.xf)m=!0,w="maxretry",e=e.concat(ff(a.N,k.ya,!0));else{var y=a.N.qa(k.path,f)||C;k.dd=y;var G=b[g].update(y.I());n(G)?(Gf("transaction failed: Data returned ",G),l=L(G),"object"===typeof G&&null!=G&&u(G,
".priority")||(l=l.$(y.L())),y=k.ya,G=Eh(a),G=tc(l,G),k.ed=l,k.fd=G,k.ya=a.zd++,Va(f,y),e=e.concat(cf(a.N,k.path,G,k.ya,k.We)),e=e.concat(ff(a.N,y,!0))):(m=!0,w="nodata",e=e.concat(ff(a.N,k.ya,!0)))}xb(a.ba,c,e);e=[];m&&(b[g].status=3,setTimeout(b[g].ae,Math.floor(0)),b[g].H&&("nodata"===w?(k=new U(a,b[g].path),d.push(q(b[g].H,null,null,!1,new S(b[g].dd,k,M)))):d.push(q(b[g].H,null,Error(w),!1,null))))}Ph(a,a.mc);for(g=0;g<d.length;g++)Ab(d[g]);Oh(a)}}
function Sh(a,b){for(var c,d=a.mc;null!==(c=O(b))&&null===d.za();)d=zc(d,c),b=H(b);return d}function Qh(a,b){var c=[];Uh(a,b,c);c.sort(function(a,b){return a.qf-b.qf});return c}function Uh(a,b,c){var d=b.za();if(null!==d)for(var e=0;e<d.length;e++)c.push(d[e]);b.U(function(b){Uh(a,b,c)})}function Ph(a,b){var c=b.za();if(c){for(var d=0,e=0;e<c.length;e++)3!==c[e].status&&(c[d]=c[e],d++);c.length=d;Ac(b,0<c.length?c:null)}b.U(function(b){Ph(a,b)})}
function Ih(a,b){var c=Sh(a,b).path(),d=zc(a.mc,b);Dc(d,function(b){Vh(a,b)});Vh(a,d);Cc(d,function(b){Vh(a,b)});return c}
function Vh(a,b){var c=b.za();if(null!==c){for(var d=[],e=[],f=-1,g=0;g<c.length;g++)4!==c[g].status&&(2===c[g].status?(J(f===g-1,"All SENT items should be at beginning of queue."),f=g,c[g].status=4,c[g].de="set"):(J(1===c[g].status,"Unexpected transaction status in abort"),c[g].ae(),e=e.concat(ff(a.N,c[g].ya,!0)),c[g].H&&d.push(q(c[g].H,null,Error("set"),!1,null))));-1===f?Ac(b,null):c.length=f+1;xb(a.ba,b.path(),e);for(g=0;g<d.length;g++)Ab(d[g])}};function Wh(){this.fc={}}ca(Wh);Wh.prototype.qb=function(){for(var a in this.fc)this.fc[a].qb()};Wh.prototype.interrupt=Wh.prototype.qb;Wh.prototype.ic=function(){for(var a in this.fc)this.fc[a].ic()};Wh.prototype.resume=Wh.prototype.ic;function X(a,b){this.Rc=a;this.Ea=b}X.prototype.cancel=function(a){x("Firebase.onDisconnect().cancel",0,1,arguments.length);A("Firebase.onDisconnect().cancel",1,a,!0);this.Rc.Fe(this.Ea,a||null)};X.prototype.cancel=X.prototype.cancel;X.prototype.remove=function(a){x("Firebase.onDisconnect().remove",0,1,arguments.length);Nf("Firebase.onDisconnect().remove",this.Ea);A("Firebase.onDisconnect().remove",1,a,!0);Jh(this.Rc,this.Ea,null,a)};X.prototype.remove=X.prototype.remove;
X.prototype.set=function(a,b){x("Firebase.onDisconnect().set",1,2,arguments.length);Nf("Firebase.onDisconnect().set",this.Ea);Ff("Firebase.onDisconnect().set",a,!1);A("Firebase.onDisconnect().set",2,b,!0);Jh(this.Rc,this.Ea,a,b)};X.prototype.set=X.prototype.set;
X.prototype.Cb=function(a,b,c){x("Firebase.onDisconnect().setWithPriority",2,3,arguments.length);Nf("Firebase.onDisconnect().setWithPriority",this.Ea);Ff("Firebase.onDisconnect().setWithPriority",a,!1);Jf("Firebase.onDisconnect().setWithPriority",2,b);A("Firebase.onDisconnect().setWithPriority",3,c,!0);Kh(this.Rc,this.Ea,a,b,c)};X.prototype.setWithPriority=X.prototype.Cb;
X.prototype.update=function(a,b){x("Firebase.onDisconnect().update",1,2,arguments.length);Nf("Firebase.onDisconnect().update",this.Ea);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;Q("Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}If("Firebase.onDisconnect().update",a);A("Firebase.onDisconnect().update",2,b,!0);Lh(this.Rc,
this.Ea,a,b)};X.prototype.update=X.prototype.update;function Y(a,b,c,d){this.k=a;this.path=b;this.n=c;this.bc=d}
function Xh(a){var b=null,c=null;a.ia&&(b=sd(a));a.ra&&(c=vd(a));if(a.g===Zd){if(a.ia){if("[MIN_NAME]"!=rd(a))throw Error("Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().");if("string"!==typeof b)throw Error("Query: When ordering by key, the argument passed to startAt(), endAt(),or equalTo() must be a string.");}if(a.ra){if("[MAX_NAME]"!=td(a))throw Error("Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().");if("string"!==
typeof c)throw Error("Query: When ordering by key, the argument passed to startAt(), endAt(),or equalTo() must be a string.");}}else if(a.g===M){if(null!=b&&!Ef(b)||null!=c&&!Ef(c))throw Error("Query: When ordering by priority, the first argument passed to startAt(), endAt(), or equalTo() must be a valid priority value (null, a number, or a string).");}else if(J(a.g instanceof Wd||a.g===be,"unknown index type."),null!=b&&"object"===typeof b||null!=c&&"object"===typeof c)throw Error("Query: First argument passed to startAt(), endAt(), or equalTo() cannot be an object.");
}function Yh(a){if(a.ia&&a.ra&&a.la&&(!a.la||""===a.Fb))throw Error("Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead.");}function Zh(a,b){if(!0===a.bc)throw Error(b+": You can't combine multiple orderBy calls.");}Y.prototype.dc=function(){x("Query.ref",0,0,arguments.length);return new U(this.k,this.path)};Y.prototype.ref=Y.prototype.dc;
Y.prototype.wb=function(a,b,c,d){x("Query.on",2,4,arguments.length);Kf("Query.on",a,!1);A("Query.on",2,b,!1);var e=$h("Query.on",c,d);if("value"===a)Mh(this.k,this,new nd(b,e.cancel||null,e.Ka||null));else{var f={};f[a]=b;Mh(this.k,this,new od(f,e.cancel,e.Ka))}return b};Y.prototype.on=Y.prototype.wb;
Y.prototype.$b=function(a,b,c){x("Query.off",0,3,arguments.length);Kf("Query.off",a,!0);A("Query.off",2,b,!0);jb("Query.off",3,c);var d=null,e=null;"value"===a?d=new nd(b||null,null,c||null):a&&(b&&(e={},e[a]=b),d=new od(e,null,c||null));e=this.k;d=".info"===O(this.path)?e.qd.gb(this,d):e.N.gb(this,d);vb(e.ba,this.path,d)};Y.prototype.off=Y.prototype.$b;
Y.prototype.lg=function(a,b){function c(g){f&&(f=!1,e.$b(a,c),b.call(d.Ka,g))}x("Query.once",2,4,arguments.length);Kf("Query.once",a,!1);A("Query.once",2,b,!1);var d=$h("Query.once",arguments[2],arguments[3]),e=this,f=!0;this.wb(a,c,function(b){e.$b(a,c);d.cancel&&d.cancel.call(d.Ka,b)})};Y.prototype.once=Y.prototype.lg;
Y.prototype.Ae=function(a){Q("Query.limit() being deprecated. Please use Query.limitToFirst() or Query.limitToLast() instead.");x("Query.limit",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limit: First argument must be a positive integer.");if(this.n.la)throw Error("Query.limit: Limit was already set (by another call to limit, limitToFirst, orlimitToLast.");var b=this.n.Ae(a);Yh(b);return new Y(this.k,this.path,b,this.bc)};Y.prototype.limit=Y.prototype.Ae;
Y.prototype.Be=function(a){x("Query.limitToFirst",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToFirst: First argument must be a positive integer.");if(this.n.la)throw Error("Query.limitToFirst: Limit was already set (by another call to limit, limitToFirst, or limitToLast).");return new Y(this.k,this.path,this.n.Be(a),this.bc)};Y.prototype.limitToFirst=Y.prototype.Be;
Y.prototype.Ce=function(a){x("Query.limitToLast",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToLast: First argument must be a positive integer.");if(this.n.la)throw Error("Query.limitToLast: Limit was already set (by another call to limit, limitToFirst, or limitToLast).");return new Y(this.k,this.path,this.n.Ce(a),this.bc)};Y.prototype.limitToLast=Y.prototype.Ce;
Y.prototype.mg=function(a){x("Query.orderByChild",1,1,arguments.length);if("$key"===a)throw Error('Query.orderByChild: "$key" is invalid.  Use Query.orderByKey() instead.');if("$priority"===a)throw Error('Query.orderByChild: "$priority" is invalid.  Use Query.orderByPriority() instead.');if("$value"===a)throw Error('Query.orderByChild: "$value" is invalid.  Use Query.orderByValue() instead.');Lf("Query.orderByChild",1,a,!1);Zh(this,"Query.orderByChild");var b=fe(this.n,new Wd(a));Xh(b);return new Y(this.k,
this.path,b,!0)};Y.prototype.orderByChild=Y.prototype.mg;Y.prototype.ng=function(){x("Query.orderByKey",0,0,arguments.length);Zh(this,"Query.orderByKey");var a=fe(this.n,Zd);Xh(a);return new Y(this.k,this.path,a,!0)};Y.prototype.orderByKey=Y.prototype.ng;Y.prototype.og=function(){x("Query.orderByPriority",0,0,arguments.length);Zh(this,"Query.orderByPriority");var a=fe(this.n,M);Xh(a);return new Y(this.k,this.path,a,!0)};Y.prototype.orderByPriority=Y.prototype.og;
Y.prototype.pg=function(){x("Query.orderByValue",0,0,arguments.length);Zh(this,"Query.orderByValue");var a=fe(this.n,be);Xh(a);return new Y(this.k,this.path,a,!0)};Y.prototype.orderByValue=Y.prototype.pg;
Y.prototype.Sd=function(a,b){x("Query.startAt",0,2,arguments.length);Ff("Query.startAt",a,!0);Lf("Query.startAt",2,b,!0);var c=this.n.Sd(a,b);Yh(c);Xh(c);if(this.n.ia)throw Error("Query.startAt: Starting point was already set (by another call to startAt or equalTo).");n(a)||(b=a=null);return new Y(this.k,this.path,c,this.bc)};Y.prototype.startAt=Y.prototype.Sd;
Y.prototype.hd=function(a,b){x("Query.endAt",0,2,arguments.length);Ff("Query.endAt",a,!0);Lf("Query.endAt",2,b,!0);var c=this.n.hd(a,b);Yh(c);Xh(c);if(this.n.ra)throw Error("Query.endAt: Ending point was already set (by another call to endAt or equalTo).");return new Y(this.k,this.path,c,this.bc)};Y.prototype.endAt=Y.prototype.hd;
Y.prototype.Tf=function(a,b){x("Query.equalTo",1,2,arguments.length);Ff("Query.equalTo",a,!1);Lf("Query.equalTo",2,b,!0);if(this.n.ia)throw Error("Query.equalTo: Starting point was already set (by another call to endAt or equalTo).");if(this.n.ra)throw Error("Query.equalTo: Ending point was already set (by another call to endAt or equalTo).");return this.Sd(a,b).hd(a,b)};Y.prototype.equalTo=Y.prototype.Tf;Y.prototype.Fa=function(){var a=$c(ge(this.n));return"{}"===a?"default":a};
function $h(a,b,c){var d={cancel:null,Ka:null};if(b&&c)d.cancel=b,A(a,3,d.cancel,!0),d.Ka=c,jb(a,4,d.Ka);else if(b)if("object"===typeof b&&null!==b)d.Ka=b;else if("function"===typeof b)d.cancel=b;else throw Error(z(a,3,!0)+" must either be a cancel callback or a context object.");return d};var Z={};Z.oc=kh;Z.DataConnection=Z.oc;kh.prototype.zg=function(a,b){this.Ba("q",{p:a},b)};Z.oc.prototype.simpleListen=Z.oc.prototype.zg;kh.prototype.Sf=function(a,b){this.Ba("echo",{d:a},b)};Z.oc.prototype.echo=Z.oc.prototype.Sf;kh.prototype.interrupt=kh.prototype.qb;Z.Df=Zg;Z.RealTimeConnection=Z.Df;Zg.prototype.sendRequest=Zg.prototype.Ba;Zg.prototype.close=Zg.prototype.close;
Z.$f=function(a){var b=kh.prototype.put;kh.prototype.put=function(c,d,e,f){n(f)&&(f=a());b.call(this,c,d,e,f)};return function(){kh.prototype.put=b}};Z.hijackHash=Z.$f;Z.Cf=Ic;Z.ConnectionTarget=Z.Cf;Z.Fa=function(a){return a.Fa()};Z.queryIdentifier=Z.Fa;Z.bg=function(a){return a.k.S.ta};Z.listens=Z.bg;function U(a,b){var c,d,e;if(a instanceof Bh)c=a,d=b;else{x("new Firebase",1,2,arguments.length);d=Vc(arguments[0]);c=d.Bg;"firebase"===d.domain&&Uc(d.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead");c||Uc("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com");d.Bb||"undefined"!==typeof window&&window.location&&window.location.protocol&&-1!==window.location.protocol.indexOf("https:")&&Q("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");
c=new Ic(d.host,d.Bb,c,"ws"===d.scheme||"wss"===d.scheme);d=new K(d.Pc);e=d.toString();var f;!(f=!p(c.host)||0===c.host.length||!Df(c.ub))&&(f=0!==e.length)&&(e&&(e=e.replace(/^\/*\.info(\/|$)/,"/")),f=!(p(e)&&0!==e.length&&!Cf.test(e)));if(f)throw Error(z("new Firebase",1,!1)+'must be a valid firebase URL and the path can\'t contain ".", "#", "$", "[", or "]".');if(b)if(b instanceof Wh)e=b;else if(p(b))e=Wh.Ob(),c.Hd=b;else throw Error("Expected a valid Firebase.Context for second argument to new Firebase()");
else e=Wh.Ob();f=c.toString();var g=v(e.fc,f);g||(g=new Bh(c),e.fc[f]=g);c=g}Y.call(this,c,d,de,!1)}ma(U,Y);var ai=U,bi=["Firebase"],ci=aa;bi[0]in ci||!ci.execScript||ci.execScript("var "+bi[0]);for(var di;bi.length&&(di=bi.shift());)!bi.length&&n(ai)?ci[di]=ai:ci=ci[di]?ci[di]:ci[di]={};U.prototype.name=function(){Q("Firebase.name() being deprecated. Please use Firebase.key() instead.");x("Firebase.name",0,0,arguments.length);return this.key()};U.prototype.name=U.prototype.name;
U.prototype.key=function(){x("Firebase.key",0,0,arguments.length);return this.path.e()?null:wc(this.path)};U.prototype.key=U.prototype.key;U.prototype.u=function(a){x("Firebase.child",1,1,arguments.length);if(ga(a))a=String(a);else if(!(a instanceof K))if(null===O(this.path)){var b=a;b&&(b=b.replace(/^\/*\.info(\/|$)/,"/"));Mf("Firebase.child",b)}else Mf("Firebase.child",a);return new U(this.k,this.path.u(a))};U.prototype.child=U.prototype.u;
U.prototype.parent=function(){x("Firebase.parent",0,0,arguments.length);var a=this.path.parent();return null===a?null:new U(this.k,a)};U.prototype.parent=U.prototype.parent;U.prototype.root=function(){x("Firebase.ref",0,0,arguments.length);for(var a=this;null!==a.parent();)a=a.parent();return a};U.prototype.root=U.prototype.root;
U.prototype.toString=function(){x("Firebase.toString",0,0,arguments.length);var a;if(null===this.parent())a=this.k.toString();else{a=this.parent().toString()+"/";var b=this.key();a+=encodeURIComponent(String(b))}return a};U.prototype.toString=U.prototype.toString;U.prototype.set=function(a,b){x("Firebase.set",1,2,arguments.length);Nf("Firebase.set",this.path);Ff("Firebase.set",a,!1);A("Firebase.set",2,b,!0);this.k.Cb(this.path,a,null,b||null)};U.prototype.set=U.prototype.set;
U.prototype.update=function(a,b){x("Firebase.update",1,2,arguments.length);Nf("Firebase.update",this.path);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;Q("Passing an Array to Firebase.update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}If("Firebase.update",a);A("Firebase.update",2,b,!0);this.k.update(this.path,a,b||null)};U.prototype.update=U.prototype.update;
U.prototype.Cb=function(a,b,c){x("Firebase.setWithPriority",2,3,arguments.length);Nf("Firebase.setWithPriority",this.path);Ff("Firebase.setWithPriority",a,!1);Jf("Firebase.setWithPriority",2,b);A("Firebase.setWithPriority",3,c,!0);if(".length"===this.key()||".keys"===this.key())throw"Firebase.setWithPriority failed: "+this.key()+" is a read-only object.";this.k.Cb(this.path,a,b,c||null)};U.prototype.setWithPriority=U.prototype.Cb;
U.prototype.remove=function(a){x("Firebase.remove",0,1,arguments.length);Nf("Firebase.remove",this.path);A("Firebase.remove",1,a,!0);this.set(null,a)};U.prototype.remove=U.prototype.remove;
U.prototype.transaction=function(a,b,c){x("Firebase.transaction",1,3,arguments.length);Nf("Firebase.transaction",this.path);A("Firebase.transaction",1,a,!1);A("Firebase.transaction",2,b,!0);if(n(c)&&"boolean"!=typeof c)throw Error(z("Firebase.transaction",3,!0)+"must be a boolean.");if(".length"===this.key()||".keys"===this.key())throw"Firebase.transaction failed: "+this.key()+" is a read-only object.";"undefined"===typeof c&&(c=!0);Nh(this.k,this.path,a,b||null,c)};U.prototype.transaction=U.prototype.transaction;
U.prototype.wg=function(a,b){x("Firebase.setPriority",1,2,arguments.length);Nf("Firebase.setPriority",this.path);Jf("Firebase.setPriority",1,a);A("Firebase.setPriority",2,b,!0);this.k.Cb(this.path.u(".priority"),a,null,b)};U.prototype.setPriority=U.prototype.wg;U.prototype.push=function(a,b){x("Firebase.push",0,2,arguments.length);Nf("Firebase.push",this.path);Ff("Firebase.push",a,!0);A("Firebase.push",2,b,!0);var c=Dh(this.k),c=yf(c),c=this.u(c);"undefined"!==typeof a&&null!==a&&c.set(a,b);return c};
U.prototype.push=U.prototype.push;U.prototype.fb=function(){Nf("Firebase.onDisconnect",this.path);return new X(this.k,this.path)};U.prototype.onDisconnect=U.prototype.fb;U.prototype.Q=function(a,b,c){Q("FirebaseRef.auth() being deprecated. Please use FirebaseRef.authWithCustomToken() instead.");x("Firebase.auth",1,3,arguments.length);Of("Firebase.auth",a);A("Firebase.auth",2,b,!0);A("Firebase.auth",3,b,!0);yg(this.k.Q,a,{},{remember:"none"},b,c)};U.prototype.auth=U.prototype.Q;
U.prototype.Ve=function(a){x("Firebase.unauth",0,1,arguments.length);A("Firebase.unauth",1,a,!0);zg(this.k.Q,a)};U.prototype.unauth=U.prototype.Ve;U.prototype.qe=function(){x("Firebase.getAuth",0,0,arguments.length);return this.k.Q.qe()};U.prototype.getAuth=U.prototype.qe;U.prototype.fg=function(a,b){x("Firebase.onAuth",1,2,arguments.length);A("Firebase.onAuth",1,a,!1);jb("Firebase.onAuth",2,b);this.k.Q.wb("auth_status",a,b)};U.prototype.onAuth=U.prototype.fg;
U.prototype.eg=function(a,b){x("Firebase.offAuth",1,2,arguments.length);A("Firebase.offAuth",1,a,!1);jb("Firebase.offAuth",2,b);this.k.Q.$b("auth_status",a,b)};U.prototype.offAuth=U.prototype.eg;U.prototype.Hf=function(a,b,c){x("Firebase.authWithCustomToken",2,3,arguments.length);Of("Firebase.authWithCustomToken",a);A("Firebase.authWithCustomToken",2,b,!1);V("Firebase.authWithCustomToken",3,c,!0);yg(this.k.Q,a,{},c||{},b)};U.prototype.authWithCustomToken=U.prototype.Hf;
U.prototype.If=function(a,b,c){x("Firebase.authWithOAuthPopup",2,3,arguments.length);Pf("Firebase.authWithOAuthPopup",1,a);A("Firebase.authWithOAuthPopup",2,b,!1);V("Firebase.authWithOAuthPopup",3,c,!0);Dg(this.k.Q,a,c,b)};U.prototype.authWithOAuthPopup=U.prototype.If;
U.prototype.Jf=function(a,b,c){x("Firebase.authWithOAuthRedirect",2,3,arguments.length);Pf("Firebase.authWithOAuthRedirect",1,a);A("Firebase.authWithOAuthRedirect",2,b,!1);V("Firebase.authWithOAuthRedirect",3,c,!0);var d=this.k.Q;Bg(d);var e=[kg],f=Xf(c);"anonymous"===a||"firebase"===a?R(b,mg("TRANSPORT_UNAVAILABLE")):(P.set("redirect_client_options",f.bd),Cg(d,e,"/auth/"+a,f,b))};U.prototype.authWithOAuthRedirect=U.prototype.Jf;
U.prototype.Kf=function(a,b,c,d){x("Firebase.authWithOAuthToken",3,4,arguments.length);Pf("Firebase.authWithOAuthToken",1,a);A("Firebase.authWithOAuthToken",3,c,!1);V("Firebase.authWithOAuthToken",4,d,!0);p(b)?(Pf("Firebase.authWithOAuthToken",2,b),Ag(this.k.Q,a+"/token",{access_token:b},d,c)):(V("Firebase.authWithOAuthToken",2,b,!1),Ag(this.k.Q,a+"/token",b,d,c))};U.prototype.authWithOAuthToken=U.prototype.Kf;
U.prototype.Gf=function(a,b){x("Firebase.authAnonymously",1,2,arguments.length);A("Firebase.authAnonymously",1,a,!1);V("Firebase.authAnonymously",2,b,!0);Ag(this.k.Q,"anonymous",{},b,a)};U.prototype.authAnonymously=U.prototype.Gf;
U.prototype.Lf=function(a,b,c){x("Firebase.authWithPassword",2,3,arguments.length);V("Firebase.authWithPassword",1,a,!1);Qf("Firebase.authWithPassword",a,"email");Qf("Firebase.authWithPassword",a,"password");A("Firebase.authAnonymously",2,b,!1);V("Firebase.authAnonymously",3,c,!0);Ag(this.k.Q,"password",a,c,b)};U.prototype.authWithPassword=U.prototype.Lf;
U.prototype.me=function(a,b){x("Firebase.createUser",2,2,arguments.length);V("Firebase.createUser",1,a,!1);Qf("Firebase.createUser",a,"email");Qf("Firebase.createUser",a,"password");A("Firebase.createUser",2,b,!1);this.k.Q.me(a,b)};U.prototype.createUser=U.prototype.me;U.prototype.Le=function(a,b){x("Firebase.removeUser",2,2,arguments.length);V("Firebase.removeUser",1,a,!1);Qf("Firebase.removeUser",a,"email");Qf("Firebase.removeUser",a,"password");A("Firebase.removeUser",2,b,!1);this.k.Q.Le(a,b)};
U.prototype.removeUser=U.prototype.Le;U.prototype.ie=function(a,b){x("Firebase.changePassword",2,2,arguments.length);V("Firebase.changePassword",1,a,!1);Qf("Firebase.changePassword",a,"email");Qf("Firebase.changePassword",a,"oldPassword");Qf("Firebase.changePassword",a,"newPassword");A("Firebase.changePassword",2,b,!1);this.k.Q.ie(a,b)};U.prototype.changePassword=U.prototype.ie;
U.prototype.he=function(a,b){x("Firebase.changeEmail",2,2,arguments.length);V("Firebase.changeEmail",1,a,!1);Qf("Firebase.changeEmail",a,"oldEmail");Qf("Firebase.changeEmail",a,"newEmail");Qf("Firebase.changeEmail",a,"password");A("Firebase.changeEmail",2,b,!1);this.k.Q.he(a,b)};U.prototype.changeEmail=U.prototype.he;
U.prototype.Me=function(a,b){x("Firebase.resetPassword",2,2,arguments.length);V("Firebase.resetPassword",1,a,!1);Qf("Firebase.resetPassword",a,"email");A("Firebase.resetPassword",2,b,!1);this.k.Q.Me(a,b)};U.prototype.resetPassword=U.prototype.Me;U.goOffline=function(){x("Firebase.goOffline",0,0,arguments.length);Wh.Ob().qb()};U.goOnline=function(){x("Firebase.goOnline",0,0,arguments.length);Wh.Ob().ic()};
function Rc(a,b){J(!b||!0===a||!1===a,"Can't turn on custom loggers persistently.");!0===a?("undefined"!==typeof console&&("function"===typeof console.log?yb=q(console.log,console):"object"===typeof console.log&&(yb=function(a){console.log(a)})),b&&P.set("logging_enabled",!0)):a?yb=a:(yb=null,P.remove("logging_enabled"))}U.enableLogging=Rc;U.ServerValue={TIMESTAMP:{".sv":"timestamp"}};U.SDK_VERSION="2.2.1";U.INTERNAL=W;U.Context=Wh;U.TEST_ACCESS=Z;})();


});
__loader.define('src/js/ui/accel.js', 710, function(exports, module, require) {
var Emitter = require('emitter');

var Accel = new Emitter();

module.exports = Accel;

var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var simply = require('ui/simply');

var state;

Accel.init = function() {
  if (state) {
    Accel.off();
  }

  state = Accel.state = {
    rate: 100,
    samples: 25,
    subscribe: false,
    subscribeMode: 'auto',
    listeners: [],
  };
};

Accel.onAddHandler = function(type, subtype) {
  if (type === 'data') {
    Accel.autoSubscribe();
  }
};

Accel.onRemoveHandler = function(type, subtype) {
  if (!type || type === 'accelData') {
    Accel.autoSubscribe();
  }
};

var accelDataListenerCount = function() {
  var count = Accel.listenerCount('data');
  var wind = WindowStack.top();
  if (wind) {
    count += wind.listenerCount('accelData');
  }
  return count;
};

Accel.autoSubscribe = function() {
  if (state.subscribeMode !== 'auto') { return; }
  var subscribe = (accelDataListenerCount() > 0);
  if (subscribe !== state.subscribe) {
    return Accel.config(subscribe, true);
  }
};

/**
 * The accelerometer configuration parameter for {@link simply.accelConfig}.
 * The accelerometer data stream is useful for applications such as gesture recognition when accelTap is too limited.
 * However, keep in mind that smaller batch sample sizes and faster rates will drastically impact the battery life of both the Pebble and phone because of the taxing use of the processors and Bluetooth modules.
 * @typedef {object} simply.accelConf
 * @property {number} [rate] - The rate accelerometer data points are generated in hertz. Valid values are 10, 25, 50, and 100. Initializes as 100.
 * @property {number} [samples] - The number of accelerometer data points to accumulate in a batch before calling the event handler. Valid values are 1 to 25 inclusive. Initializes as 25.
 * @property {boolean} [subscribe] - Whether to subscribe to accelerometer data events. {@link simply.accelPeek} cannot be used when subscribed. Simply.js will automatically (un)subscribe for you depending on the amount of accelData handlers registered.
 */

/**
 * Changes the accelerometer configuration.
 * See {@link simply.accelConfig}
 * @memberOf simply
 * @param {simply.accelConfig} accelConf - An object defining the accelerometer configuration.
 */
Accel.config = function(opt, auto) {
  if (arguments.length === 0) {
    return {
      rate: state.rate,
      samples: state.samples,
      subscribe: state.subscribe,
    };
  } else if (typeof opt === 'boolean') {
    opt = { subscribe: opt };
  }
  for (var k in opt) {
    if (k === 'subscribe') {
      state.subscribeMode = opt[k] && !auto ? 'manual' : 'auto';
    }
    state[k] = opt[k];
  }
  return simply.impl.accelConfig(Accel.config());
};

/**
 * Peeks at the current accelerometer values.
 * @memberOf simply
 * @param {simply.eventHandler} callback - A callback function that will be provided the accel data point as an event.
 */
Accel.peek = function(callback) {
  if (state.subscribe) {
    throw new Error('Cannot use accelPeek when listening to accelData events');
  }
  return simply.impl.accelPeek.apply(this, arguments);
};

/**
 * Simply.js accel tap event.
 * Use the event type 'accelTap' to subscribe to these events.
 * @typedef simply.accelTapEvent
 * @property {string} axis - The axis the tap event occurred on: 'x', 'y', or 'z'. This is also the event subtype.
 * @property {number} direction - The direction of the tap along the axis: 1 or -1.
 */

Accel.emitAccelTap = function(axis, direction) {
  var e = {
    axis: axis,
    direction: direction,
  };
  if (Window.emit('accelTap', axis, e) === false) {
    return false;
  }
  Accel.emit('tap', axis, e);
};

/**
 * Simply.js accel data point.
 * Typical values for gravity is around -1000 on the z axis.
 * @typedef simply.accelPoint
 * @property {number} x - The acceleration across the x-axis.
 * @property {number} y - The acceleration across the y-axis.
 * @property {number} z - The acceleration across the z-axis.
 * @property {boolean} vibe - Whether the watch was vibrating when measuring this point.
 * @property {number} time - The amount of ticks in millisecond resolution when measuring this point.
 */

/**
 * Simply.js accel data event.
 * Use the event type 'accelData' to subscribe to these events.
 * @typedef simply.accelDataEvent
 * @property {number} samples - The number of accelerometer samples in this event.
 * @property {simply.accelPoint} accel - The first accel in the batch. This is provided for convenience.
 * @property {simply.accelPoint[]} accels - The accelerometer samples in an array.
 */

Accel.emitAccelData = function(accels, callback) {
  var e = {
    samples: accels.length,
    accel: accels[0],
    accels: accels,
  };
  if (callback) {
    return callback(e);
  }
  if (Window.emit('accelData', null, e) === false) {
    return false;
  }
  Accel.emit('data', e);
};

Accel.init();

});
__loader.define('src/js/ui/card.js', 870, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var Window = require('ui/window');
var simply = require('ui/simply');

var textProps = [
  'title',
  'subtitle',
  'body',
];

var textColorProps = [
  'titleColor',
  'subtitleColor',
  'bodyColor',
];

var imageProps = [
  'icon',
  'subicon',
  'banner',
];

var actionProps = [
  'up',
  'select',
  'back',
];

var configProps = [
  'style',
  'backgroundColor'
];

var accessorProps = textProps.concat(textColorProps).concat(imageProps).concat(configProps);
var clearableProps = textProps.concat(imageProps);

var defaults = {
  status: true,
  backgroundColor: 'white',
};

var Card = function(cardDef) {
  Window.call(this, myutil.shadow(defaults, cardDef || {}));
  this._dynamic = false;
};

Card._codeName = 'card';

util2.inherit(Card, Window);

util2.copy(Emitter.prototype, Card.prototype);

Propable.makeAccessors(accessorProps, Card.prototype);

Card.prototype._prop = function() {
  if (this === WindowStack.top()) {
    simply.impl.card.apply(this, arguments);
  }
};

Card.prototype._clear = function(flags_) {
  var flags = myutil.toFlags(flags_);
  if (flags === true) {
    clearableProps.forEach(Propable.unset.bind(this.state));
  }
  Window.prototype._clear.call(this, flags_);
};

module.exports = Card;

});
__loader.define('src/js/ui/circle.js', 946, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var StageElement = require('ui/element');

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
};

var Circle = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.CircleType;
};

util2.inherit(Circle, StageElement);

module.exports = Circle;

});
__loader.define('src/js/ui/element.js', 967, function(exports, module, require) {
var util2 = require('util2');
var Vector2 = require('vector2');
var myutil = require('myutil');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var simply = require('ui/simply');

var elementProps = [
  'position',
  'size',
  'backgroundColor',
  'borderColor',
  'borderWidth',
];

var accessorProps = elementProps;

var nextId = 1;

var StageElement = function(elementDef) {
  this.state = elementDef || {};
  this.state.id = nextId++;
  if (!this.state.position) {
    this.state.position = new Vector2();
  }
  if (!this.state.size) {
    this.state.size = new Vector2();
  }
  this._queue = [];
};

var Types = [
  'NoneType',
  'RectType',
  'LineType',
  'CircleType',
  'RadialType',
  'TextType',
  'ImageType',
  'InverterType',
];

Types.forEach(function(name, index) {
  StageElement[name] = index;
});

util2.copy(Propable.prototype, StageElement.prototype);

Propable.makeAccessors(accessorProps, StageElement.prototype);

StageElement.prototype._reset = function() {
  this._queue = [];
};

StageElement.prototype._id = function() {
  return this.state.id;
};

StageElement.prototype._type = function() {
  return this.state.type;
};

StageElement.prototype._prop = function(elementDef) {
  if (this.parent === WindowStack.top()) {
    simply.impl.stageElement(this._id(), this._type(), this.state);
  }
};

StageElement.prototype.index = function() {
  if (!this.parent) { return -1; }
  return this.parent.index(this);
};

StageElement.prototype.remove = function(broadcast) {
  if (!this.parent) { return this; }
  this.parent.remove(this, broadcast);
  return this;
};

StageElement.prototype._animate = function(animateDef, duration) {
  if (this.parent === WindowStack.top()) {
    simply.impl.stageAnimate(this._id(), this.state,
        animateDef, duration || 400, animateDef.easing || 'easeInOut');
  }
};

StageElement.prototype.animate = function(field, value, duration) {
  if (typeof field === 'object') {
    duration = value;
  }
  var animateDef = myutil.toObject(field, value);
  this.queue(function() {
    this._animate(animateDef, duration);
    util2.copy(animateDef, this.state);
  });
  if (!this.state.animating) {
    this.dequeue();
  }
  return this;
};

StageElement.prototype.queue = function(callback) {
  this._queue.push(callback);
};

StageElement.prototype.dequeue = function() {
  var callback = this._queue.shift();
  if (callback) {
    this.state.animating = true;
    callback.call(this, this.dequeue.bind(this));
  } else {
    this.state.animating = false;
  }
};

StageElement.emitAnimateDone = function(id) {
  var wind = WindowStack.top();
  if (!wind || !wind._dynamic) { return; }
  wind.each(function(element) {
    if (element._id() === id) {
      element.dequeue();
      return false;
    }
  });
};

module.exports = StageElement;

});
__loader.define('src/js/ui/image.js', 1097, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var imageProps = [
  'image',
  'compositing',
];

var defaults = {
  backgroundColor: 'clear',
  borderColor: 'clear',
  borderWidth: 1,
};

var ImageElement = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.ImageType;
};

util2.inherit(ImageElement, StageElement);

Propable.makeAccessors(imageProps, ImageElement.prototype);

module.exports = ImageElement;

});
__loader.define('src/js/ui/imageservice.js', 1126, function(exports, module, require) {
var imagelib = require('lib/image');
var myutil = require('myutil');
var Platform = require('platform');
var Resource = require('ui/resource');
var simply = require('ui/simply');

var ImageService = module.exports;

var state;

ImageService.init = function() {
  state = ImageService.state = {
    cache: {},
    nextId: Resource.items.length + 1,
    rootUrl: undefined,
  };
};

var makeImageHash = function(image) {
  var url = image.url;
  var hashPart = '';
  if (image.width) {
    hashPart += ',width:' + image.width;
  }
  if (image.height) {
    hashPart += ',height:' + image.height;
  }
  if (image.dither) {
    hashPart += ',dither:' + image.dither;
  }
  if (hashPart) {
    url += '#' + hashPart.substr(1);
  }
  return url;
};

var parseImageHash = function(hash) {
  var image = {};
  hash = hash.split('#');
  image.url = hash[0];
  hash = hash[1];
  if (!hash) { return image; }
  var args = hash.split(',');
  for (var i = 0, ii = args.length; i < ii; ++i) {
    var arg = args[i];
    if (arg.match(':')) {
      arg = arg.split(':');
      var v = arg[1];
      image[arg[0]] = !isNaN(Number(v)) ? Number(v) : v;
    } else {
      image[arg] = true;
    }
  }
  return image;
};

ImageService.load = function(opt, reset, callback) {
  if (typeof opt === 'string') {
    opt = parseImageHash(opt);
  }
  if (typeof reset === 'function') {
    callback = reset;
    reset = null;
  }
  var url = myutil.abspath(state.rootUrl, opt.url);
  var hash = makeImageHash(opt);
  var image = state.cache[hash];
  var fetch = false;
  if (image) {
    if ((opt.width && image.width !== opt.width) ||
        (opt.height && image.height !== opt.height) ||
        (opt.dither && image.dither !== opt.dither)) {
      reset = true;
    }
    if (reset !== true && image.loaded) {
      return image.id;
    }
  }
  if (!image || reset === true) {
    fetch = true;
    image = {
      id: state.nextId++,
      url: url,
    };
  }
  image.width = opt.width;
  image.height = opt.height;
  image.dither =  opt.dither;
  image.loaded = true;
  state.cache[hash] = image;
  var onLoad = function() {
    simply.impl.image(image.id, image.image);
    if (callback) {
      var e = {
        type: 'image',
        image: image.id,
        url: image.url,
      };
      callback(e);
    }
  };
  if (fetch) {
    var bitdepth = Platform.version() === 'basalt' ? 8 : 1;
    imagelib.load(image, bitdepth, onLoad);
  } else {
    onLoad();
  }
  return image.id;
};

ImageService.setRootUrl = function(url) {
  state.rootUrl = url;
};

/**
 * Resolve an image path to an id. If the image is defined in appinfo, the index of the resource is used,
 * otherwise a new id is generated for dynamic loading.
 */
ImageService.resolve = function(opt) {
  var id = Resource.getId(opt);
  return typeof id !== 'undefined' ? id : ImageService.load(opt);
};

ImageService.markAllUnloaded = function() {
  for (var k in state.cache) {
    delete state.cache[k].loaded;
  }
};

ImageService.init();

});
__loader.define('src/js/ui/index.js', 1259, function(exports, module, require) {
var UI = {};

UI.Vector2 = require('vector2');
UI.Window = require('ui/window');
UI.Card = require('ui/card');
UI.Menu = require('ui/menu');
UI.Rect = require('ui/rect');
UI.Line = require('ui/line');
UI.Circle = require('ui/circle');
UI.Radial = require('ui/radial');
UI.Text = require('ui/text');
UI.TimeText = require('ui/timetext');
UI.Image = require('ui/image');
UI.Inverter = require('ui/inverter');
UI.Vibe = require('ui/vibe');
UI.Light = require('ui/light');

module.exports = UI;

});
__loader.define('src/js/ui/inverter.js', 1280, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var StageElement = require('ui/element');

var Inverter = function(elementDef) {
  StageElement.call(this, elementDef);
  this.state.type = StageElement.InverterType;
};

util2.inherit(Inverter, StageElement);

module.exports = Inverter;

});
__loader.define('src/js/ui/light.js', 1295, function(exports, module, require) {
var simply = require('ui/simply');

var Light = module.exports;

Light.on = function() {
  simply.impl.light('on');
};

Light.auto = function() {
  simply.impl.light('auto');
};

Light.trigger = function() {
  simply.impl.light('trigger');
};

});
__loader.define('src/js/ui/line.js', 1313, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var accessorProps = [
  'strokeColor',
  'strokeWidth',
  'position2',
];

var defaults = {
  strokeColor: 'white',
  strokeWidth: 1,
};

var Line = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.LineType;
};

util2.inherit(Line, StageElement);

Propable.makeAccessors(accessorProps, Line.prototype);

module.exports = Line;

});
__loader.define('src/js/ui/menu.js', 1342, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var Platform = require('platform');
var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var simply = require('ui/simply');

var defaults = {
  status: true,
  backgroundColor: 'white',
  textColor: 'black',
  highlightBackgroundColor: 'black',
  highlightTextColor: 'white',
};

var Menu = function(menuDef) {
  Window.call(this, myutil.shadow(defaults, menuDef || {}));
  this._dynamic = false;
  this._sections = {};
  this._selection = { sectionIndex: 0, itemIndex: 0 };
  this._selections = [];
};

Menu._codeName = 'menu';

util2.inherit(Menu, Window);

util2.copy(Emitter.prototype, Menu.prototype);

Menu.prototype._show = function() {
  Window.prototype._show.apply(this, arguments);
  this._select();
};

Menu.prototype._select = function() {
  if (this === WindowStack.top()) {
    var select = this._selection;
    simply.impl.menuSelection(select.sectionIndex, select.itemIndex);
  }
};

Menu.prototype._numPreloadItems = (Platform.version() === 'aplite' ? 5 : 50);

Menu.prototype._prop = function(state, clear, pushing) {
  if (this === WindowStack.top()) {
    this._resolveMenu(clear, pushing);
    this._resolveSection(this._selection);
  }
};

Menu.prototype.action = function() {
  throw new Error("Menus don't support action bars.");
};

Menu.prototype.buttonConfig = function() {
  throw new Error("Menus don't support changing button configurations.");
};

Menu.prototype._buttonAutoConfig = function() {};

Menu.prototype._getMetaSection = function(sectionIndex) {
  return (this._sections[sectionIndex] || ( this._sections[sectionIndex] = {} ));
};

Menu.prototype._getSections = function() {
  var sections = this.state.sections;
  if (sections instanceof Array) {
    return sections;
  }
  if (typeof sections === 'number') {
    sections = new Array(sections);
    return (this.state.sections = sections);
  }
  if (typeof sections === 'function') {
    this.sectionsProvider = this.state.sections;
    delete this.state.sections;
  }
  if (this.sectionsProvider) {
    sections = this.sectionsProvider.call(this);
    if (sections) {
      this.state.sections = sections;
      return this._getSections();
    }
  }
  return (this.state.sections = []);
};

Menu.prototype._getSection = function(e, create) {
  var sections = this._getSections();
  var section = sections[e.sectionIndex];
  if (section) {
    return section;
  }
  if (this.sectionProvider) {
    section = this.sectionProvider.call(this, e);
    if (section) {
      return (sections[e.sectionIndex] = section);
    }
  }
  if (!create) { return; }
  return (sections[e.sectionIndex] = {});
};

Menu.prototype._getItems = function(e, create) {
  var section = this._getSection(e, create);
  if (!section) {
    if (e.sectionIndex > 0) { return; }
    section = this.state.sections[0] = {};
  }
  if (section.items instanceof Array) {
    return section.items;
  }
  if (typeof section.items === 'number') {
    return (section.items = new Array(section.items));
  }
  if (typeof section.items === 'function') {
    this._sections[e.sectionIndex] = section.items;
    delete section.items;
  }
  var itemsProvider = this._getMetaSection(e.sectionIndex).items || this.itemsProvider;
  if (itemsProvider) {
    var items = itemsProvider.call(this, e);
    if (items) {
      section.items = items;
      return this._getItems(e, create);
    }
  }
  return (section.items = []);
};

Menu.prototype._getItem = function(e, create) {
  var items = this._getItems(e, create);
  var item = items[e.itemIndex];
  if (item) {
    return item;
  }
  var itemProvider = this._getMetaSection(e.sectionIndex).item || this.itemProvider;
  if (itemProvider) {
    item = itemProvider.call(this, e);
    if (item) {
      return (items[e.itemIndex] = item);
    }
  }
  if (!create) { return; }
  return (items[e.itemIndex] = {});
};

Menu.prototype._resolveMenu = function(clear, pushing) {
  var sections = this._getSections(this);
  if (this === WindowStack.top()) {
    simply.impl.menu(this.state, clear, pushing);
    return true;
  }
};

Menu.prototype._resolveSection = function(e, clear) {
  var section = this._getSection(e);
  if (!section) { return; }
  section = myutil.shadow({
    textColor: this.state.textColor, 
    backgroundColor: this.state.backgroundColor
  }, section);
  section.items = this._getItems(e);
  if (this === WindowStack.top()) {
    simply.impl.menuSection.call(this, e.sectionIndex, section, clear);
    var select = this._selection;
    if (select.sectionIndex === e.sectionIndex) {
      this._preloadItems(select);
    }
    return true;
  }
};

Menu.prototype._resolveItem = function(e) {
  var item = this._getItem(e);
  if (!item) { return; }
  if (this === WindowStack.top()) {
    simply.impl.menuItem.call(this, e.sectionIndex, e.itemIndex, item);
    return true;
  }
};

Menu.prototype._preloadItems = function(e) {
  var select = util2.copy(e);
  select.itemIndex = Math.max(0, select.itemIndex - Math.floor(this._numPreloadItems / 2));
  for (var i = 0; i < this._numPreloadItems; ++i) {
    this._resolveItem(select);
    select.itemIndex++;
  }
};

Menu.prototype._emitSelect = function(e) {
  this._selection = e;
  var item = this._getItem(e);
  switch (e.type) {
    case 'select':
      if (item && typeof item.select === 'function') {
        if (item.select(e) === false) {
          return false;
        }
      }
      break;
    case 'longSelect':
      if (item && typeof item.longSelect === 'function') {
        if (item.longSelect(e) === false) {
          return false;
        }
      }
      break;
    case 'selection':
      var handlers = this._selections;
      this._selections = [];
      if (item && typeof item.selected === 'function') {
        if (item.selected(e) === false) {
          return false;
        }
      }
      for (var i = 0, ii = handlers.length; i < ii; ++i) {
        if (handlers[i](e) === false) {
          break;
        }
      }
      break;
  }
};

Menu.prototype.sections = function(sections) {
  if (typeof sections === 'function') {
    delete this.state.sections;
    this.sectionsProvider = sections;
    this._resolveMenu();
    return this;
  }
  this.state.sections = sections;
  this._resolveMenu();
  return this;
};

Menu.prototype.section = function(sectionIndex, section) {
  if (typeof sectionIndex === 'object') {
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.sectionProvider = sectionIndex;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex };
  if (!section) {
    return this._getSection(menuIndex);
  }
  var sections = this._getSections();
  var prevLength = sections.length;
  sections[sectionIndex] = util2.copy(section, sections[sectionIndex]);
  if (sections.length !== prevLength) {
    this._resolveMenu();
  }
  this._resolveSection(menuIndex, typeof section.items !== 'undefined');
  return this;
};

Menu.prototype.items = function(sectionIndex, items) {
  if (typeof sectionIndex === 'object') {
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.itemsProvider = sectionIndex;
    return this;
  }
  if (typeof items === 'function') {
    this._getMetaSection(sectionIndex).items = items;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex };
  if (!items) {
    return this._getItems(menuIndex);
  }
  var section = this._getSection(menuIndex, true);
  section.items = items;
  this._resolveSection(menuIndex, true);
  return this;
};

Menu.prototype.item = function(sectionIndex, itemIndex, item) {
  if (typeof sectionIndex === 'object') {
    item = itemIndex || item;
    itemIndex = sectionIndex.itemIndex;
    sectionIndex = sectionIndex.sectionIndex || 0;
  } else if (typeof sectionIndex === 'function') {
    this.itemProvider = sectionIndex;
    return this;
  }
  if (typeof itemIndex === 'function') {
    item = itemIndex;
    itemIndex = null;
  }
  if (typeof item === 'function') {
    this._getMetaSection(sectionIndex).item = item;
    return this;
  }
  var menuIndex = { sectionIndex: sectionIndex, itemIndex: itemIndex };
  if (!item) {
    return this._getItem(menuIndex);
  }
  var items = this._getItems(menuIndex, true);
  var prevLength = items.length;
  items[itemIndex] = util2.copy(item, items[itemIndex]);
  if (items.length !== prevLength) {
    this._resolveSection(menuIndex);
  }
  this._resolveItem(menuIndex);
  return this;
};

Menu.prototype.selection = function(sectionIndex, itemIndex) {
  var callback;
  if (typeof sectionIndex === 'function') {
    callback = sectionIndex;
    sectionIndex = undefined;
  }
  if (callback) {
    this._selections.push(callback);
    simply.impl.menuSelection();
  } else {
    this._selection = {
      sectionIndex: sectionIndex,
      itemIndex: itemIndex,
    };
    this._select();
  }
};

Menu.emit = Window.emit;

Menu.emitSection = function(sectionIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex
  };
  e.section = menu._getSection(e);
  if (Menu.emit('section', null, e) === false) {
    return false;
  }
  menu._resolveSection(e);
};

Menu.emitItem = function(sectionIndex, itemIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex,
    itemIndex: itemIndex,
  };
  e.section = menu._getSection(e);
  e.item = menu._getItem(e);
  if (Menu.emit('item', null, e) === false) {
    return false;
  }
  menu._resolveItem(e);
};

Menu.emitSelect = function(type, sectionIndex, itemIndex) {
  var menu = WindowStack.top();
  if (!(menu instanceof Menu)) { return; }
  var e = {
    menu: menu,
    sectionIndex: sectionIndex,
    itemIndex: itemIndex,
  };
  e.section = menu._getSection(e);
  e.item = menu._getItem(e);
  switch (type) {
    case 'menuSelect': type = 'select'; break;
    case 'menuLongSelect': type = 'longSelect'; break;
    case 'menuSelection': type = 'selection'; break;
  }
  if (Menu.emit(type, null, e) === false) {
    return false;
  }
  menu._emitSelect(e);
};

module.exports = Menu;

});
__loader.define('src/js/ui/propable.js', 1729, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');

var Propable = function(def) {
  this.state = def || {};
};

Propable.unset = function(k) {
  delete this[k];
};

Propable.makeAccessor = function(k) {
  return function(value) {
    if (arguments.length === 0) {
      return this.state[k];
    }
    this.state[k] = value;
    this._prop(myutil.toObject(k, value));
    return this;
  };
};

Propable.makeNestedAccessor = function(k) {
  var _k = '_' + k;
  return function(field, value, clear) {
    var nest = this.state[k];
    if (arguments.length === 0) {
      return nest;
    }
    if (arguments.length === 1 && typeof field === 'string') {
      return typeof nest === 'object' ? nest[field] : undefined;
    }
    if (typeof field === 'boolean') {
      value = field;
      field = k;
    }
    if (typeof field === 'object') {
      clear = value;
      value = undefined;
    }
    if (clear) {
      this._clear(k);
    }
    if (field !== undefined && typeof nest !== 'object') {
      nest = this.state[k] = {};
    }
    if (field !== undefined && typeof nest === 'object') {
      util2.copy(myutil.toObject(field, value), nest);
    }
    if (this[_k]) {
      this[_k](nest);
    }
    return this;
  };
};

Propable.makeAccessors = function(props, proto) {
  proto = proto || {};
  props.forEach(function(k) {
    proto[k] = Propable.makeAccessor(k);
  });
  return proto;
};

Propable.makeNestedAccessors = function(props, proto) {
  proto = proto || {};
  props.forEach(function(k) {
    proto[k] = Propable.makeNestedAccessor(k);
  });
  return proto;
};

Propable.prototype.unset = function(k) {
  delete this.state[k];
};

Propable.prototype._clear = function(k) {
  if (k === undefined || k === true) {
    this.state = {};
  } else if (k !== false) {
    this.state[k] = {};
  }
};

Propable.prototype._prop = function(def) {
};

Propable.prototype.prop = function(field, value, clear) {
  if (arguments.length === 0) {
    return util2.copy(this.state);
  }
  if (arguments.length === 1 && typeof field !== 'object') {
    return this.state[field];
  }
  if (typeof field === 'object') {
    clear = value;
  }
  if (clear) {
    this._clear(true);
  }
  var def = myutil.toObject(field, value);
  util2.copy(def, this.state);
  this._prop(def);
  return this;
};

module.exports = Propable;

});
__loader.define('src/js/ui/radial.js', 1839, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var safe = require('safe');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var accessorProps = [
  'radius',
  'angle',
  'angle2',
];

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
  radius: 0,
  angle: 0,
  angle2: 360,
};

var checkProps = function(def) {
  if (!def) return;
  if ('angleStart' in def && safe.warnAngleStart !== false) {
    safe.warn('`angleStart` has been deprecated in favor of `angle` in order to match\n\t' +
              "Line's `position` and `position2`. Please use `angle` intead.", 2);
    safe.warnAngleStart = false;
  }
  if ('angleEnd' in def && safe.warnAngleEnd !== false) {
    safe.warn('`angleEnd` has been deprecated in favor of `angle2` in order to match\n\t' +
              "Line's `position` and `position2`. Please use `angle2` intead.", 2);
    safe.warnAngleEnd = false;
  }
};

var Radial = function(elementDef) {
  checkProps(elementDef);
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.RadialType;
};

util2.inherit(Radial, StageElement);

Propable.makeAccessors(accessorProps, Radial.prototype);

Radial.prototype._prop = function(def) {
  checkProps(def);
  StageElement.prototype._prop.call(this, def);
};

module.exports = Radial;

});
__loader.define('src/js/ui/rect.js', 1893, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var StageElement = require('ui/element');

var defaults = {
  backgroundColor: 'white',
  borderColor: 'clear',
  borderWidth: 1,
};

var Rect = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.RectType;
};

util2.inherit(Rect, StageElement);

module.exports = Rect;

});
__loader.define('src/js/ui/resource.js', 1914, function(exports, module, require) {
var myutil = require('lib/myutil');
var appinfo = require('appinfo');

var resources = (function() {
  var resources = appinfo.resources;
  return resources && resources.media || [];
})();

var Resource = {};

Resource.items = resources;

Resource.getId = function(opt) {
  var path = opt;
  if (typeof opt === 'object') {
    path = opt.url;
  }
  path = path.replace(/#.*/, '');
  var cname = myutil.toCConstantName(path);
  for (var i = 0, ii = resources.length; i < ii; ++i) {
    var res = resources[i];
    if (res.name === cname || res.file === path) {
      return i + 1;
    }
  }
};

module.exports = Resource;

});
__loader.define('src/js/ui/simply-pebble.js', 1945, function(exports, module, require) {
var struct = require('struct');
var util2 = require('util2');
var myutil = require('myutil');
var Platform = require('platform');
var Wakeup = require('wakeup');
var Timeline = require('timeline');
var Resource = require('ui/resource');
var Accel = require('ui/accel');
var Voice = require('ui/voice');
var ImageService = require('ui/imageservice');
var WindowStack = require('ui/windowstack');
var Window = require('ui/window');
var Menu = require('ui/menu');
var StageElement = require('ui/element');
var Vector2 = require('vector2');

var simply = require('ui/simply');

/**
 * This package provides the underlying implementation for the ui/* classes.
 *
 * This implementation uses PebbleKit JS AppMessage to send commands to a Pebble Watch.
 */

/**
 * First part of this file is defining the commands and types that we will use later.
 */

var state;

var BoolType = function(x) {
  return x ? 1 : 0;
};

var StringType = function(x) {
  return '' + x;
};

var UTF8ByteLength = function(x) {
  return unescape(encodeURIComponent(x)).length;
};

var EnumerableType = function(x) {
  if (typeof x === 'string') {
    return UTF8ByteLength(x);
  } else if (x && x.hasOwnProperty('length')) {
    return x.length;
  }
  return x ? Number(x) : 0;
};

var TimeType = function(x) {
  if (x instanceof Date) {
    x = x.getTime() / 1000;
  }
  return (x ? Number(x) : 0) + state.timeOffset;
};

var ImageType = function(x) {
  if (x && typeof x !== 'number') {
    return ImageService.resolve(x);
  }
  return x ? Number(x) : 0;
};

var PositionType = function(x) {
  this.positionX(x.x);
  this.positionY(x.y);
};

var SizeType = function(x) {
  this.sizeW(x.x);
  this.sizeH(x.y);
};

var hexColorMap = {
  '#000000': 0xC0,
  '#000055': 0xC1,
  '#0000AA': 0xC2,
  '#0000FF': 0xC3,
  '#005500': 0xC4,
  '#005555': 0xC5,
  '#0055AA': 0xC6,
  '#0055FF': 0xC7,
  '#00AA00': 0xC8,
  '#00AA55': 0xC9,
  '#00AAAA': 0xCA,
  '#00AAFF': 0xCB,
  '#00FF00': 0xCC,
  '#00FF55': 0xCD,
  '#00FFAA': 0xCE,
  '#00FFFF': 0xCF,
  '#550000': 0xD0,
  '#550055': 0xD1,
  '#5500AA': 0xD2,
  '#5500FF': 0xD3,
  '#555500': 0xD4,
  '#555555': 0xD5,
  '#5555AA': 0xD6,
  '#5555FF': 0xD7,
  '#55AA00': 0xD8,
  '#55AA55': 0xD9,
  '#55AAAA': 0xDA,
  '#55AAFF': 0xDB,
  '#55FF00': 0xDC,
  '#55FF55': 0xDD,
  '#55FFAA': 0xDE,
  '#55FFFF': 0xDF,
  '#AA0000': 0xE0,
  '#AA0055': 0xE1,
  '#AA00AA': 0xE2,
  '#AA00FF': 0xE3,
  '#AA5500': 0xE4,
  '#AA5555': 0xE5,
  '#AA55AA': 0xE6,
  '#AA55FF': 0xE7,
  '#AAAA00': 0xE8,
  '#AAAA55': 0xE9,
  '#AAAAAA': 0xEA,
  '#AAAAFF': 0xEB,
  '#AAFF00': 0xEC,
  '#AAFF55': 0xED,
  '#AAFFAA': 0xEE,
  '#AAFFFF': 0xEF,
  '#FF0000': 0xF0,
  '#FF0055': 0xF1,
  '#FF00AA': 0xF2,
  '#FF00FF': 0xF3,
  '#FF5500': 0xF4,
  '#FF5555': 0xF5,
  '#FF55AA': 0xF6,
  '#FF55FF': 0xF7,
  '#FFAA00': 0xF8,
  '#FFAA55': 0xF9,
  '#FFAAAA': 0xFA,
  '#FFAAFF': 0xFB,
  '#FFFF00': 0xFC,
  '#FFFF55': 0xFD,
  '#FFFFAA': 0xFE,
  '#FFFFFF': 0xFF,
};

var namedColorMap = {
  'clear': 0x00,
  'black': 0xC0,
  'oxfordBlue': 0xC1,
  'dukeBlue': 0xC2,
  'blue': 0xC3,
  'darkGreen': 0xC4,
  'midnightGreen': 0xC5,
  'cobaltBlue': 0xC6,
  'blueMoon': 0xC7,
  'islamicGreen': 0xC8,
  'jaegerGreen': 0xC9,
  'tiffanyBlue': 0xCA,
  'vividCerulean': 0xCB,
  'green': 0xCC,
  'malachite': 0xCD,
  'mediumSpringGreen': 0xCE,
  'cyan': 0xCF,
  'bulgarianRose': 0xD0,
  'imperialPurple': 0xD1,
  'indigo': 0xD2,
  'electricUltramarine': 0xD3,
  'armyGreen': 0xD4,
  'darkGray': 0xD5,
  'liberty': 0xD6,
  'veryLightBlue': 0xD7,
  'kellyGreen': 0xD8,
  'mayGreen': 0xD9,
  'cadetBlue': 0xDA,
  'pictonBlue': 0xDB,
  'brightGreen': 0xDC,
  'screaminGreen': 0xDD,
  'mediumAquamarine': 0xDE,
  'electricBlue': 0xDF,
  'darkCandyAppleRed': 0xE0,
  'jazzberryJam': 0xE1,
  'purple': 0xE2,
  'vividViolet': 0xE3,
  'windsorTan': 0xE4,
  'roseVale': 0xE5,
  'purpureus': 0xE6,
  'lavenderIndigo': 0xE7,
  'limerick': 0xE8,
  'brass': 0xE9,
  'lightGray': 0xEA,
  'babyBlueEyes': 0xEB,
  'springBud': 0xEC,
  'inchworm': 0xED,
  'mintGreen': 0xEE,
  'celeste': 0xEF,
  'red': 0xF0,
  'folly': 0xF1,
  'fashionMagenta': 0xF2,
  'magenta': 0xF3,
  'orange': 0xF4,
  'sunsetOrange': 0xF5,
  'brilliantRose': 0xF6,
  'shockingPink': 0xF7,
  'chromeYellow': 0xF8,
  'rajah': 0xF9,
  'melon': 0xFA,
  'richBrilliantLavender': 0xFB,
  'yellow': 0xFC,
  'icterine': 0xFD,
  'pastelYellow': 0xFE,
  'white': 0xFF,
  'clearWhite': 0x3F,
};

var Color = function(color) {
  if (color.charAt(0) === '#') {
    // Convert shorthand hex to full length for rounding
    if (color.length === 4) {
      var r = color.charAt(1);
      var g = color.charAt(2);
      var b = color.charAt(3);
      color = '#'+r+r+g+g+b+b;
    }
    // Ensure upper case
    color = color.toUpperCase();
    return hexColorMap[roundColor(color)];
  }
  return namedColorMap[color] ? namedColorMap[color] : namedColorMap.clear;
};

var pebbleColors = ['00', '55', 'AA', 'FF'];

var roundColor = function (color) {
  var rHex = color.substr(1, 2);
  var gHex = color.substr(3, 2);
  var bHex = color.substr(5, 2);
  var r = findClosestColor(rHex, pebbleColors);
  var g = findClosestColor(gHex, pebbleColors);
  var b = findClosestColor(bHex, pebbleColors);
  return '#'+r+g+b;
};

var findClosestColor = function(color, colors) {
  var nearestDist = Infinity;
  var result = color;
  colors.forEach(function(col) {
    var dist = Math.abs(parseInt(color, 16) - parseInt(col, 16));
    if (dist < nearestDist) {
      nearestDist = dist;
      result = col;
    }
  });
  return result;
};

var Font = function(x) {
  var id = Resource.getId(x);
  if (id) {
    return id;
  }
  x = myutil.toCConstantName(x);
  if (!x.match(/^RESOURCE_ID/)) {
    x = 'RESOURCE_ID_' + x;
  }
  x = x.replace(/_+/g, '_');
  return x;
};

var TextOverflowMode = function(x) {
  switch (x) {
    case 'wrap'    : return 0;
    case 'ellipsis': return 1;
    case 'fill'    : return 2;
  }
  return Number(x);
};

var TextAlignment = function(x) {
  switch (x) {
    case 'left'  : return 0;
    case 'center': return 1;
    case 'right' : return 2;
  }
  return Number(x);
};

var TimeUnits = function(x) {
  var z = 0;
  x = myutil.toObject(x, true);
  for (var k in x) {
    switch (k) {
      case 'seconds': z |= (1 << 0); break;
      case 'minutes': z |= (1 << 1); break;
      case 'hours'  : z |= (1 << 2); break;
      case 'days'   : z |= (1 << 3); break;
      case 'months' : z |= (1 << 4); break;
      case 'years'  : z |= (1 << 5); break;
    }
  }
  return z;
};

var CompositingOp = function(x) {
  switch (x) {
    case 'assign':
    case 'normal': return 0;
    case 'assignInverted':
    case 'invert': return 1;
    case 'or'    : return 2;
    case 'and'   : return 3;
    case 'clear' : return 4;
    case 'set'   : return 5;
  }
  return Number(x);
};

var AnimationCurve = function(x) {
  switch (x) {
    case 'linear'   : return 0;
    case 'easeIn'   : return 1;
    case 'easeOut'  : return 2;
    case 'easeInOut': return 3;
  }
  return Number(x);
};

var MenuRowAlign = function(x) {
  switch(x) {
    case 'none'   : return 0;
    case 'center' : return 1;
    case 'top'    : return 2;
    case 'bottom' : return 3;
  }
  return x ? Number(x) : 0;
};

var makeArrayType = function(types) {
  return function(x) {
    var index = types.indexOf(x);
    if (index !== -1) {
      return index;
    }
    return Number(x);
  };
};

var makeFlagsType = function(types) {
  return function(x) {
    var z = 0;
    for (var k in x) {
      if (!x[k]) { continue; }
      var index = types.indexOf(k);
      if (index !== -1) {
        z |= 1 << index;
      }
    }
    return z;
  };
};

var LaunchReasonTypes = [
  'system',
  'user',
  'phone',
  'wakeup',
  'worker',
  'quickLaunch',
  'timelineAction'
];

var LaunchReasonType = makeArrayType(LaunchReasonTypes);

var WindowTypes = [
  'window',
  'menu',
  'card',
];

var WindowType = makeArrayType(WindowTypes);

var ButtonTypes = [
  'back',
  'up',
  'select',
  'down',
];

var ButtonType = makeArrayType(ButtonTypes);

var ButtonFlagsType = makeFlagsType(ButtonTypes);

var CardTextTypes = [
  'title',
  'subtitle',
  'body',
];

var CardTextType = makeArrayType(CardTextTypes);

var CardTextColorTypes = [
  'titleColor',
  'subtitleColor',
  'bodyColor',
];

var CardImageTypes = [
  'icon',
  'subicon',
  'banner',
];

var CardImageType = makeArrayType(CardImageTypes);

var CardStyleTypes = [
  'classic-small',
  'classic-large',
  'mono',
  'small',
  'large',
];

var CardStyleType = makeArrayType(CardStyleTypes);

var VibeTypes = [
  'short',
  'long',
  'double',
];

var VibeType = makeArrayType(VibeTypes);

var LightTypes = [
  'on',
  'auto',
  'trigger'
];

var LightType = makeArrayType(LightTypes);

var DictationSessionStatus = [
  null,
  'transcriptionRejected',
  'transcriptionRejectedWithError',
  'systemAborted',
  'noSpeechDetected',
  'connectivityError',
  'disabled',
  'internalError',
  'recognizerError',
];
// Custom Dictation Errors:
DictationSessionStatus[64] = "sessionAlreadyInProgress";
DictationSessionStatus[65] = "noMicrophone";

var StatusBarSeparatorModeTypes = [
  'none',
  'dotted',
];

var StatusBarSeparatorModeType = makeArrayType(StatusBarSeparatorModeTypes);

var Packet = new struct([
  ['uint16', 'type'],
  ['uint16', 'length'],
]);

var SegmentPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'isLast'],
  ['data', 'buffer'],
]);

var ReadyPacket = new struct([
  [Packet, 'packet'],
]);

var LaunchReasonPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'reason', LaunchReasonType],
  ['uint32', 'args'],
  ['uint32', 'time'],
  ['bool', 'isTimezone'],
]);

var WakeupSetPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'timestamp', TimeType],
  ['int32', 'cookie'],
  ['uint8', 'notifyIfMissed', BoolType],
]);

var WakeupSetResultPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
  ['int32', 'cookie'],
]);

var WakeupCancelPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
]);

var WakeupEventPacket = new struct([
  [Packet, 'packet'],
  ['int32', 'id'],
  ['int32', 'cookie'],
]);

var WindowShowPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', WindowType],
  ['bool', 'pushing', BoolType],
]);

var WindowHidePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowShowEventPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowHideEventPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var WindowPropsPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'backgroundColor', Color],
  ['bool', 'scrollable', BoolType],
]);

var WindowButtonConfigPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'buttonMask', ButtonFlagsType],
]);

var WindowStatusBarPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'backgroundColor', Color],
  ['uint8', 'color', Color],
  ['uint8', 'separator', StatusBarSeparatorModeType],
  ['uint8', 'status', BoolType],
]);

var WindowActionBarPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'up', ImageType],
  ['uint32', 'select', ImageType],
  ['uint32', 'down', ImageType],
  ['uint8', 'backgroundColor', Color],
  ['uint8', 'action', BoolType],
]);

var ClickPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'button', ButtonType],
]);

var LongClickPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'button', ButtonType],
]);

var ImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['int16', 'width'],
  ['int16', 'height'],
  ['uint16', 'pixelsLength'],
  ['data', 'pixels'],
]);

var CardClearPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'flags'],
]);

var CardTextPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'index', CardTextType],
  ['uint8', 'color', Color],
  ['cstring', 'text'],
]);

var CardImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'image', ImageType],
  ['uint8', 'index', CardImageType],
]);

var CardStylePacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'style', CardStyleType],
]);

var VibePacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', VibeType],
]);

var LightPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'type', LightType],
]);

var AccelPeekPacket = new struct([
  [Packet, 'packet'],
]);

var AccelConfigPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'samples'],
  ['uint8', 'rate'],
  ['bool', 'subscribe', BoolType],
]);

var AccelData = new struct([
  ['int16', 'x'],
  ['int16', 'y'],
  ['int16', 'z'],
  ['bool', 'vibe'],
  ['uint64', 'time'],
]);

var AccelDataPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'peek'],
  ['uint8', 'samples'],
]);

var AccelTapPacket = new struct([
  [Packet, 'packet'],
  ['uint8', 'axis'],
  ['int8', 'direction'],
]);

var MenuClearPacket = new struct([
  [Packet, 'packet'],
]);

var MenuClearSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
]);

var MenuPropsPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'sections', EnumerableType],
  ['uint8', 'backgroundColor', Color],
  ['uint8', 'textColor', Color],
  ['uint8', 'highlightBackgroundColor', Color],
  ['uint8', 'highlightTextColor', Color],
]);

var MenuSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'items', EnumerableType],
  ['uint8', 'backgroundColor', Color],
  ['uint8', 'textColor', Color],
  ['uint16', 'titleLength', EnumerableType],
  ['cstring', 'title', StringType],
]);

var MenuGetSectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
]);

var MenuItemPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
  ['uint32', 'icon', ImageType],
  ['uint16', 'titleLength', EnumerableType],
  ['uint16', 'subtitleLength', EnumerableType],
  ['cstring', 'title', StringType],
  ['cstring', 'subtitle', StringType],
]);

var MenuGetItemPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuSelectionPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
  ['uint8', 'align', MenuRowAlign],
  ['bool', 'animated', BoolType],
]);

var MenuGetSelectionPacket = new struct([
  [Packet, 'packet'],
]);

var MenuSelectionEventPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuSelectPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var MenuLongSelectPacket = new struct([
  [Packet, 'packet'],
  ['uint16', 'section'],
  ['uint16', 'item'],
]);

var StageClearPacket = new struct([
  [Packet, 'packet'],
]);

var ElementInsertPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'type'],
  ['uint16', 'index'],
]);

var ElementRemovePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var GPoint = new struct([
  ['int16', 'x'],
  ['int16', 'y'],
]);

var GSize = new struct([
  ['int16', 'w'],
  ['int16', 'h'],
]);

var GRect = new struct([
  [GPoint, 'origin', PositionType],
  [GSize, 'size', SizeType],
]);

var ElementCommonPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  [GPoint, 'position', PositionType],
  [GSize, 'size', SizeType],
  ['uint16', 'borderWidth', EnumerableType],
  ['uint8', 'backgroundColor', Color],
  ['uint8', 'borderColor', Color],
]);

var ElementRadiusPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'radius', EnumerableType],
]);

var ElementAnglePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'angle', EnumerableType],
]);

var ElementAngle2Packet = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint16', 'angle2', EnumerableType],
]);

var ElementTextPacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'updateTimeUnits', TimeUnits],
  ['cstring', 'text', StringType],
]);

var ElementTextStylePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint8', 'color', Color],
  ['uint8', 'textOverflow', TextOverflowMode],
  ['uint8', 'textAlign', TextAlignment],
  ['uint32', 'customFont'],
  ['cstring', 'systemFont', StringType],
]);

var ElementImagePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  ['uint32', 'image', ImageType],
  ['uint8', 'compositing', CompositingOp],
]);

var ElementAnimatePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
  [GPoint, 'position', PositionType],
  [GSize, 'size', SizeType],
  ['uint32', 'duration'],
  ['uint8', 'easing', AnimationCurve],
]);

var ElementAnimateDonePacket = new struct([
  [Packet, 'packet'],
  ['uint32', 'id'],
]);

var VoiceDictationStartPacket = new struct([
  [Packet, 'packet'],
  ['bool', 'enableConfirmation'],
]);

var VoiceDictationStopPacket = new struct([
  [Packet, 'packet'],
]);

var VoiceDictationDataPacket = new struct([
  [Packet, 'packet'],
  ['int8', 'status'],
  ['cstring', 'transcription'],
]);

var CommandPackets = [
  Packet,
  SegmentPacket,
  ReadyPacket,
  LaunchReasonPacket,
  WakeupSetPacket,
  WakeupSetResultPacket,
  WakeupCancelPacket,
  WakeupEventPacket,
  WindowShowPacket,
  WindowHidePacket,
  WindowShowEventPacket,
  WindowHideEventPacket,
  WindowPropsPacket,
  WindowButtonConfigPacket,
  WindowStatusBarPacket,
  WindowActionBarPacket,
  ClickPacket,
  LongClickPacket,
  ImagePacket,
  CardClearPacket,
  CardTextPacket,
  CardImagePacket,
  CardStylePacket,
  VibePacket,
  LightPacket,
  AccelPeekPacket,
  AccelConfigPacket,
  AccelDataPacket,
  AccelTapPacket,
  MenuClearPacket,
  MenuClearSectionPacket,
  MenuPropsPacket,
  MenuSectionPacket,
  MenuGetSectionPacket,
  MenuItemPacket,
  MenuGetItemPacket,
  MenuSelectionPacket,
  MenuGetSelectionPacket,
  MenuSelectionEventPacket,
  MenuSelectPacket,
  MenuLongSelectPacket,
  StageClearPacket,
  ElementInsertPacket,
  ElementRemovePacket,
  ElementCommonPacket,
  ElementRadiusPacket,
  ElementAnglePacket,
  ElementAngle2Packet,
  ElementTextPacket,
  ElementTextStylePacket,
  ElementImagePacket,
  ElementAnimatePacket,
  ElementAnimateDonePacket,
  VoiceDictationStartPacket,
  VoiceDictationStopPacket,
  VoiceDictationDataPacket,
];

var accelAxes = [
  'x',
  'y',
  'z',
];

var clearFlagMap = {
  action: (1 << 0),
  text: (1 << 1),
  image: (1 << 2),
};

/**
 * SimplyPebble object provides the actual methods to communicate with Pebble.
 *
 * It's an implementation of an abstract interface used by all the other classes.
 */

var SimplyPebble = {};

SimplyPebble.init = function() {
  // Register listeners for app message communication
  Pebble.addEventListener('appmessage', SimplyPebble.onAppMessage);

  // Register this implementation as the one currently in use
  simply.impl = SimplyPebble;

  state = SimplyPebble.state = {};

  state.timeOffset = new Date().getTimezoneOffset() * -60;

  // Initialize the app message queue
  state.messageQueue = new MessageQueue();

  // Initialize the packet queue
  state.packetQueue = new PacketQueue();

  // Signal the Pebble that the Phone's app message is ready
  SimplyPebble.ready();
};

/**
 * MessageQueue is an app message queue that guarantees delivery and order.
 */
var MessageQueue = function() {
  this._queue = [];
  this._sending = false;

  this._consume = this.consume.bind(this);
  this._cycle = this.cycle.bind(this);
};

MessageQueue.prototype.stop = function() {
  this._sending = false;
};

MessageQueue.prototype.consume = function() {
  this._queue.shift();
  if (this._queue.length === 0) {
    return this.stop();
  }
  this.cycle();
};

MessageQueue.prototype.checkSent = function(message, fn) {
  return function() {
    if (message === this._sent) {
      fn();
    }
  }.bind(this);
};

MessageQueue.prototype.cycle = function() {
  if (!this._sending) {
    return;
  }
  var head = this._queue[0];
  if (!head) {
    return this.stop();
  }
  this._sent = head;
  var success = this.checkSent(head, this._consume);
  var failure = this.checkSent(head, this._cycle);
  Pebble.sendAppMessage(head, success, failure);
};

MessageQueue.prototype.send = function(message) {
  this._queue.push(message);
  if (this._sending) {
    return;
  }
  this._sending = true;
  this.cycle();
};

var toByteArray = function(packet) {
  var type = CommandPackets.indexOf(packet);
  var size = Math.max(packet._size, packet._cursor);
  packet.packetType(type);
  packet.packetLength(size);

  var buffer = packet._view;
  var byteArray = new Array(size);
  for (var i = 0; i < size; ++i) {
    byteArray[i] = buffer.getUint8(i);
  }

  return byteArray;
};

/**
 * PacketQueue is a packet queue that combines multiple packets into a single packet.
 * This reduces latency caused by the time spacing between each app message.
 */
var PacketQueue = function() {
  this._message = [];

  this._send = this.send.bind(this);
};

PacketQueue.prototype._maxPayloadSize = (Platform.version() === 'aplite' ? 1024 : 2044) - 32;

PacketQueue.prototype.add = function(packet) {
  var byteArray = toByteArray(packet);
  if (this._message.length + byteArray.length > this._maxPayloadSize) {
    this.send();
  }
  Array.prototype.push.apply(this._message, byteArray);
  clearTimeout(this._timeout);
  this._timeout = setTimeout(this._send, 0);
};

PacketQueue.prototype.send = function() {
  if (this._message.length === 0) {
    return;
  }
  state.messageQueue.send({ 0: this._message });
  this._message = [];
};

SimplyPebble.sendMultiPacket = function(packet) {
  var byteArray = toByteArray(packet);
  var totalSize = byteArray.length;
  var segmentSize = state.packetQueue._maxPayloadSize - Packet._size;
  for (var i = 0; i < totalSize; i += segmentSize) {
    var isLast = (i + segmentSize) >= totalSize;
    var buffer = byteArray.slice(i, Math.min(totalSize, i + segmentSize));
    SegmentPacket.isLast((i + segmentSize) >= totalSize).buffer(buffer);
    state.packetQueue.add(SegmentPacket);
  }
};

SimplyPebble.sendPacket = function(packet) {
  if (packet._cursor < state.packetQueue._maxPayloadSize) {
    state.packetQueue.add(packet);
  } else {
    SimplyPebble.sendMultiPacket(packet);
  }
};

SimplyPebble.ready = function() {
  SimplyPebble.sendPacket(ReadyPacket);
};

SimplyPebble.wakeupSet = function(timestamp, cookie, notifyIfMissed) {
  WakeupSetPacket
    .timestamp(timestamp)
    .cookie(cookie)
    .notifyIfMissed(notifyIfMissed);
  SimplyPebble.sendPacket(WakeupSetPacket);
};

SimplyPebble.wakeupCancel = function(id) {
  SimplyPebble.sendPacket(WakeupCancelPacket.id(id === 'all' ? -1 : id));
};

SimplyPebble.windowShow = function(def) {
  SimplyPebble.sendPacket(WindowShowPacket.prop(def));
};

SimplyPebble.windowHide = function(id) {
  SimplyPebble.sendPacket(WindowHidePacket.id(id));
};

SimplyPebble.windowProps = function(def) {
  WindowPropsPacket
    .prop(def)
    .backgroundColor(def.backgroundColor || 'white');
  SimplyPebble.sendPacket(WindowPropsPacket);
};

SimplyPebble.windowButtonConfig = function(def) {
  SimplyPebble.sendPacket(WindowButtonConfigPacket.buttonMask(def));
};

var toStatusDef = function(statusDef) {
  if (typeof statusDef === 'boolean') {
    statusDef = { status: statusDef };
  }
  return statusDef;
};

SimplyPebble.windowStatusBar = function(def) {
  var statusDef = toStatusDef(def);
  WindowStatusBarPacket
    .separator(statusDef.separator || 'dotted')
    .status(typeof def === 'boolean' ? def : def.status !== false)
    .color(statusDef.color || 'black')
    .backgroundColor(statusDef.backgroundColor || 'white');
  SimplyPebble.sendPacket(WindowStatusBarPacket);
};

SimplyPebble.windowStatusBarCompat = function(def) {
  if (typeof def.fullscreen === 'boolean') {
    SimplyPebble.windowStatusBar(!def.fullscreen);
  } else if (def.status !== undefined) {
    SimplyPebble.windowStatusBar(def.status);
  }
};

var toActionDef = function(actionDef) {
  if (typeof actionDef === 'boolean') {
    actionDef = { action: actionDef };
  }
  return actionDef;
};

SimplyPebble.windowActionBar = function(def) {
  var actionDef = toActionDef(def);
  WindowActionBarPacket
    .up(actionDef.up)
    .select(actionDef.select)
    .down(actionDef.down)
    .action(typeof def === 'boolean' ? def : def.action !== false)
    .backgroundColor(actionDef.backgroundColor || 'black');
  SimplyPebble.sendPacket(WindowActionBarPacket);
};

SimplyPebble.image = function(id, gbitmap) {
  SimplyPebble.sendPacket(ImagePacket.id(id).prop(gbitmap));
};

var toClearFlags = function(clear) {
  if (clear === true || clear === 'all') {
    clear = ~0;
  } else if (typeof clear === 'string') {
    clear = clearFlagMap[clear];
  } else if (typeof clear === 'object') {
    var flags = 0;
    for (var k in clear) {
      if (clear[k] === true) {
        flags |= clearFlagMap[k];
      }
    }
    clear = flags;
  }
  return clear;
};

SimplyPebble.cardClear = function(clear) {
  SimplyPebble.sendPacket(CardClearPacket.flags(toClearFlags(clear)));
};

SimplyPebble.cardText = function(field, text, color) {
  CardTextPacket
    .index(field)
    .color(color || 'clearWhite')
    .text(text || '');
  SimplyPebble.sendPacket(CardTextPacket);
};

SimplyPebble.cardImage = function(field, image) {
  SimplyPebble.sendPacket(CardImagePacket.index(field).image(image));
};

SimplyPebble.cardStyle = function(field, style) {
  SimplyPebble.sendPacket(CardStylePacket.style(style));
};

SimplyPebble.card = function(def, clear, pushing) {
  if (arguments.length === 3) {
    SimplyPebble.windowShow({ type: 'card', pushing: pushing });
  }
  if (clear !== undefined) {
    SimplyPebble.cardClear(clear);
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  if (def.action !== undefined) {
    SimplyPebble.windowActionBar(def.action);
  }
  for (var k in def) {
    var textIndex = CardTextTypes.indexOf(k);
    if (textIndex !== -1) {
      SimplyPebble.cardText(k, def[k], def[CardTextColorTypes[textIndex]]);
    } else if (CardImageTypes.indexOf(k) !== -1) {
      SimplyPebble.cardImage(k, def[k]);
    } else if (k === 'style') {
      SimplyPebble.cardStyle(k, def[k]);
    }
  }
};

SimplyPebble.vibe = function(type) {
  SimplyPebble.sendPacket(VibePacket.type(type));
};

SimplyPebble.light = function(type) {
  SimplyPebble.sendPacket(LightPacket.type(type));
};

var accelListeners = [];

SimplyPebble.accelPeek = function(callback) {
  accelListeners.push(callback);
  SimplyPebble.sendPacket(AccelPeekPacket);
};

SimplyPebble.accelConfig = function(def) {
  SimplyPebble.sendPacket(AccelConfigPacket.prop(def));
};

SimplyPebble.voiceDictationStart = function(callback, enableConfirmation) {
  if (Platform.version() === 'aplite') {
    // If there is no microphone, call with an error event
    callback({
      'err': DictationSessionStatus[65],  // noMicrophone
      'failed': true,
      'transcription': null,
    });
    return;
  } else if (state.dictationCallback) {
    // If there's a transcription in progress, call with an error event
    callback({
      'err': DictationSessionStatus[64],  // dictationAlreadyInProgress
      'failed': true,
      'transcription': null,
    });
    return;
  }

  // Set the callback and send the packet
  state.dictationCallback = callback;
  SimplyPebble.sendPacket(VoiceDictationStartPacket.enableConfirmation(enableConfirmation));
};

SimplyPebble.voiceDictationStop = function() {
  // Send the message and delete the callback
  SimplyPebble.sendPacket(VoiceDictationStopPacket);
  delete state.dictationCallback;
};

SimplyPebble.onVoiceData = function(packet) {
  if (!state.dictationCallback) {
    // Something bad happened
    console.log("No callback specified for dictation session");
  } else {
    var e = {
      'err': DictationSessionStatus[packet.status()],
      'failed': packet.status() !== 0,
      'transcription': packet.transcription(),
    };
    // Invoke and delete the callback
    state.dictationCallback(e);
    delete state.dictationCallback;
  }
};

SimplyPebble.menuClear = function() {
  SimplyPebble.sendPacket(MenuClearPacket);
};

SimplyPebble.menuClearSection = function(section) {
  SimplyPebble.sendPacket(MenuClearSectionPacket.section(section));
};

SimplyPebble.menuProps = function(def) {
  SimplyPebble.sendPacket(MenuPropsPacket.prop(def));
};

SimplyPebble.menuSection = function(section, def, clear) {
  if (clear !== undefined) {
    SimplyPebble.menuClearSection(section);
  }
  MenuSectionPacket
    .section(section)
    .items(def.items)
    .backgroundColor(def.backgroundColor)
    .textColor(def.textColor)
    .titleLength(def.title)
    .title(def.title);
  SimplyPebble.sendPacket(MenuSectionPacket);
};

SimplyPebble.menuItem = function(section, item, def) {
  MenuItemPacket
    .section(section)
    .item(item)
    .icon(def.icon)
    .titleLength(def.title)
    .subtitleLength(def.subtitle)
    .title(def.title)
    .subtitle(def.subtitle);
  SimplyPebble.sendPacket(MenuItemPacket);
};

SimplyPebble.menuSelection = function(section, item, align) {
  if (section === undefined) {
    SimplyPebble.sendPacket(MenuGetSelectionPacket);
    return;
  }
  SimplyPebble.sendPacket(MenuSelectionPacket.section(section).item(item).align(align || 'center'));
};

SimplyPebble.menu = function(def, clear, pushing) {
  if (typeof pushing === 'boolean') {
    SimplyPebble.windowShow({ type: 'menu', pushing: pushing });
  }
  if (clear !== undefined) {
    SimplyPebble.menuClear();
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  SimplyPebble.menuProps(def);
};

SimplyPebble.elementInsert = function(id, type, index) {
  SimplyPebble.sendPacket(ElementInsertPacket.id(id).type(type).index(index));
};

SimplyPebble.elementRemove = function(id) {
  SimplyPebble.sendPacket(ElementRemovePacket.id(id));
};

SimplyPebble.elementFrame = function(packet, def, altDef) {
  var position = def.position || (altDef ? altDef.position : undefined);
  var position2 = def.position2 || (altDef ? altDef.position2 : undefined);
  var size = def.size || (altDef ? altDef.size : undefined);
  if (position && position2) {
    size = position2.clone().subSelf(position);
  }
  packet.position(position);
  packet.size(size);
};

SimplyPebble.elementCommon = function(id, def) {
  if ('strokeColor' in def) {
    ElementCommonPacket.borderColor(def.strokeColor);
  }
  if ('strokeWidth' in def) {
    ElementCommonPacket.borderWidth(def.strokeWidth);
  }
  SimplyPebble.elementFrame(ElementCommonPacket, def);
  ElementCommonPacket
    .id(id)
    .prop(def);
  SimplyPebble.sendPacket(ElementCommonPacket);
};

SimplyPebble.elementRadius = function(id, def) {
  SimplyPebble.sendPacket(ElementRadiusPacket.id(id).radius(def.radius));
};

SimplyPebble.elementAngle = function(id, def) {
  SimplyPebble.sendPacket(ElementAnglePacket.id(id).angle(def.angleStart || def.angle));
};

SimplyPebble.elementAngle2 = function(id, def) {
  SimplyPebble.sendPacket(ElementAngle2Packet.id(id).angle2(def.angleEnd || def.angle2));
};

SimplyPebble.elementText = function(id, text, timeUnits) {
  SimplyPebble.sendPacket(ElementTextPacket.id(id).updateTimeUnits(timeUnits).text(text));
};

SimplyPebble.elementTextStyle = function(id, def) {
  ElementTextStylePacket.id(id).prop(def);
  var font = Font(def.font);
  if (typeof font === 'number') {
    ElementTextStylePacket.customFont(font).systemFont('');
  } else {
    ElementTextStylePacket.customFont(0).systemFont(font);
  }
  SimplyPebble.sendPacket(ElementTextStylePacket);
};

SimplyPebble.elementImage = function(id, image, compositing) {
  SimplyPebble.sendPacket(ElementImagePacket.id(id).image(image).compositing(compositing));
};

SimplyPebble.elementAnimate = function(id, def, animateDef, duration, easing) {
  SimplyPebble.elementFrame(ElementAnimatePacket, animateDef, def);
  ElementAnimatePacket
    .id(id)
    .duration(duration)
    .easing(easing);
  SimplyPebble.sendPacket(ElementAnimatePacket);
};

SimplyPebble.stageClear = function() {
  SimplyPebble.sendPacket(StageClearPacket);
};

SimplyPebble.stageElement = function(id, type, def, index) {
  if (index !== undefined) {
    SimplyPebble.elementInsert(id, type, index);
  }
  SimplyPebble.elementCommon(id, def);
  switch (type) {
    case StageElement.RectType:
    case StageElement.CircleType:
      SimplyPebble.elementRadius(id, def);
      break;
    case StageElement.RadialType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementAngle(id, def);
      SimplyPebble.elementAngle2(id, def);
      break;
    case StageElement.TextType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementTextStyle(id, def);
      SimplyPebble.elementText(id, def.text, def.updateTimeUnits);
      break;
    case StageElement.ImageType:
      SimplyPebble.elementRadius(id, def);
      SimplyPebble.elementImage(id, def.image, def.compositing);
      break;
  }
};

SimplyPebble.stageRemove = SimplyPebble.elementRemove;

SimplyPebble.stageAnimate = SimplyPebble.elementAnimate;

SimplyPebble.stage = function(def, clear, pushing) {
  if (arguments.length === 3) {
    SimplyPebble.windowShow({ type: 'window', pushing: pushing });
  }
  SimplyPebble.windowProps(def);
  SimplyPebble.windowStatusBarCompat(def);
  if (clear !== undefined) {
    SimplyPebble.stageClear();
  }
  if (def.action !== undefined) {
    SimplyPebble.windowActionBar(def.action);
  }
};

SimplyPebble.window = SimplyPebble.stage;

var toArrayBuffer = function(array, length) {
  length = length || array.length;
  var copy = new DataView(new ArrayBuffer(length));
  for (var i = 0; i < length; ++i) {
    copy.setUint8(i, array[i]);
  }
  return copy;
};

SimplyPebble.onLaunchReason = function(packet) {
  var reason = LaunchReasonTypes[packet.reason()];
  var args = packet.args();
  var remoteTime = packet.time();
  var isTimezone = packet.isTimezone();
  if (isTimezone) {
    state.timeOffset = 0;
  } else {
    var time = Date.now() / 1000;
    var resolution = 60 * 30;
    state.timeOffset = Math.round((remoteTime - time) / resolution) * resolution;
  }
  if (reason === 'timelineAction') {
    Timeline.emitAction(args);
  } else {
    Timeline.emitAction();
  }
  if (reason !== 'wakeup') {
    Wakeup.emitWakeup();
  }
};

SimplyPebble.onWakeupSetResult = function(packet) {
  var id = packet.id();
  switch (id) {
    case -8: id = 'range'; break;
    case -4: id = 'invalidArgument'; break;
    case -7: id = 'outOfResources'; break;
    case -3: id = 'internal'; break;
  }
  Wakeup.emitSetResult(id, packet.cookie());
};

SimplyPebble.onAccelData = function(packet) {
  var samples = packet.samples();
  var accels = [];
  AccelData._view = packet._view;
  AccelData._offset = packet._size;
  for (var i = 0; i < samples; ++i) {
    accels.push(AccelData.prop());
    AccelData._offset += AccelData._size;
  }
  if (!packet.peek()) {
    Accel.emitAccelData(accels);
  } else {
    var handlers = accelListeners;
    accelListeners = [];
    for (var j = 0, jj = handlers.length; j < jj; ++j) {
      Accel.emitAccelData(accels, handlers[j]);
    }
  }
};

SimplyPebble.onPacket = function(buffer, offset) {
  Packet._view = buffer;
  Packet._offset = offset;
  var packet = CommandPackets[Packet.type()];

  if (!packet) {
    console.log('Received unknown packet: ' + JSON.stringify(buffer));
    return;
  }

  packet._view = Packet._view;
  packet._offset = offset;
  switch (packet) {
    case LaunchReasonPacket:
      SimplyPebble.onLaunchReason(packet);
      break;
    case WakeupSetResultPacket:
      SimplyPebble.onWakeupSetResult(packet);
      break;
    case WakeupEventPacket:
      Wakeup.emitWakeup(packet.id(), packet.cookie());
      break;
    case WindowHideEventPacket:
      ImageService.markAllUnloaded();
      WindowStack.emitHide(packet.id());
      break;
    case ClickPacket:
      Window.emitClick('click', ButtonTypes[packet.button()]);
      break;
    case LongClickPacket:
      Window.emitClick('longClick', ButtonTypes[packet.button()]);
      break;
    case AccelDataPacket:
      SimplyPebble.onAccelData(packet);
      break;
    case AccelTapPacket:
      Accel.emitAccelTap(accelAxes[packet.axis()], packet.direction());
      break;
    case MenuGetSectionPacket:
      Menu.emitSection(packet.section());
      break;
    case MenuGetItemPacket:
      Menu.emitItem(packet.section(), packet.item());
      break;
    case MenuSelectPacket:
      Menu.emitSelect('menuSelect', packet.section(), packet.item());
      break;
    case MenuLongSelectPacket:
      Menu.emitSelect('menuLongSelect', packet.section(), packet.item());
      break;
    case MenuSelectionEventPacket:
      Menu.emitSelect('menuSelection', packet.section(), packet.item());
      break;
    case ElementAnimateDonePacket:
      StageElement.emitAnimateDone(packet.id());
      break;
    case VoiceDictationDataPacket:
      SimplyPebble.onVoiceData(packet);
      break;
  }
};

SimplyPebble.onAppMessage = function(e) {
  var data = e.payload[0];
  
  Packet._view = toArrayBuffer(data);

  var offset = 0;
  var length = data.length;

  do {
    SimplyPebble.onPacket(Packet._view, offset);

    Packet._offset = offset;
    offset += Packet.length();
  } while (offset !== 0 && offset < length);
};

module.exports = SimplyPebble;


});
__loader.define('src/js/ui/simply.js', 3529, function(exports, module, require) {
/**
 * This file provides an easy way to switch the actual implementation used by all the
 * ui objects.
 *
 * simply.impl provides the actual communication layer to the hardware.
 */

var simply = {};

// Override this with the actual implementation you want to use.
simply.impl = undefined;

module.exports = simply;

});
__loader.define('src/js/ui/stage.js', 3545, function(exports, module, require) {
var util2 = require('util2');
var Emitter = require('emitter');
var WindowStack = require('ui/windowstack');
var simply = require('ui/simply');

var Stage = function(stageDef) {
  this.state = stageDef || {};
  this._items = [];
};

Stage.RectType = 1;
Stage.CircleType = 2;
Stage.RadialType = 6;
Stage.TextType = 3;
Stage.ImageType = 4;
Stage.InverterType = 5;

util2.copy(Emitter.prototype, Stage.prototype);

Stage.prototype._show = function() {
  this.each(function(element, index) {
    element._reset();
    this._insert(index, element);
  }.bind(this));
};

Stage.prototype._prop = function() {
  if (this === WindowStack.top()) {
    simply.impl.stage.apply(this, arguments);
  }
};

Stage.prototype.each = function(callback) {
  this._items.forEach(callback);
  return this;
};

Stage.prototype.at = function(index) {
  return this._items[index];
};

Stage.prototype.index = function(element) {
  return this._items.indexOf(element);
};

Stage.prototype._insert = function(index, element) {
  if (this === WindowStack.top()) {
    simply.impl.stageElement(element._id(), element._type(), element.state, index);
  }
};

Stage.prototype._remove = function(element, broadcast) {
  if (broadcast === false) { return; }
  if (this === WindowStack.top()) {
    simply.impl.stageRemove(element._id());
  }
};

Stage.prototype.insert = function(index, element) {
  element.remove(false);
  this._items.splice(index, 0, element);
  element.parent = this;
  this._insert(this.index(element), element);
  return this;
};

Stage.prototype.add = function(element) {
  return this.insert(this._items.length, element);
};

Stage.prototype.remove = function(element, broadcast) {
  var index = this.index(element);
  if (index === -1) { return this; }
  this._remove(element, broadcast);
  this._items.splice(index, 1);
  delete element.parent;
  return this;
};

module.exports = Stage;

});
__loader.define('src/js/ui/tests.js', 3628, function(exports, module, require) {

var tests = {};

tests.setTimeoutErrors = function () {
  /* global wind */
  var i = 0;
  var interval = setInterval(function() {
    clearInterval(interval);
    wind.titlex('i = ' + i++);
  }, 1000);
};

tests.ajaxErrors = function() {
  var ajax = require('ajax');
  var ajaxCallback = function(reqStatus, reqBody, request) {
    console.logx('broken call');
  };
  ajax({ url: 'http://www.google.fr/' }, ajaxCallback, ajaxCallback);
};

tests.geolocationErrors = function () {
  navigator.geolocation.getCurrentPosition(function(coords) {
    console.logx('Got coords: ' + coords);
  });
};

tests.loadAppinfo = function() {
  console.log('longName: ' + require('appinfo').longName);
};

tests.resolveBultinImagePath = function() {
  var ImageService = require('ui/imageservice');
  console.log('image-logo-splash = resource #' + ImageService.resolve('images/logo_splash.png'));
};

for (var test in tests) {
  console.log('Running test: ' + test);
  tests[test]();
}

});
__loader.define('src/js/ui/text.js', 3670, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Propable = require('ui/propable');
var StageElement = require('ui/element');

var textProps = [
  'text',
  'font',
  'color',
  'textOverflow',
  'textAlign',
  'updateTimeUnits',
];

var defaults = {
  backgroundColor: 'clear',
  borderColor: 'clear',
  borderWidth: 1,
  color: 'white',
  font: 'gothic-24',
};

var Text = function(elementDef) {
  StageElement.call(this, myutil.shadow(defaults, elementDef || {}));
  this.state.type = StageElement.TextType;
};

util2.inherit(Text, StageElement);

Propable.makeAccessors(textProps, Text.prototype);

module.exports = Text;

});
__loader.define('src/js/ui/timetext.js', 3705, function(exports, module, require) {
var util2 = require('util2');
var Text = require('ui/text');

var TimeText = function(elementDef) {
  Text.call(this, elementDef);
  if (this.state.text) {
    this.text(this.state.text);
  }
};

util2.inherit(TimeText, Text);

var formatUnits = {
  a: 'days',
  A: 'days',
  b: 'months',
  B: 'months',
  c: 'seconds',
  d: 'days',
  H: 'hours',
  I: 'hours',
  j: 'days',
  m: 'months',
  M: 'minutes',
  p: 'hours',
  S: 'seconds',
  U: 'days',
  w: 'days',
  W: 'days',
  x: 'days',
  X: 'seconds',
  y: 'years',
  Y: 'years',
};

var getUnitsFromText = function(text) {
  var units = {};
  text.replace(/%(.)/g, function(_, code) {
    var unit = formatUnits[code];
    if (unit) {
      units[unit] = true;
    }
    return _;
  });
  return units;
};

TimeText.prototype.text = function(text) {
  if (arguments.length === 0) {
    return this.state.text;
  }
  this.prop({
    text: text,
    updateTimeUnits: getUnitsFromText(text),
  });
  return this;
};

module.exports = TimeText;

});
__loader.define('src/js/ui/vibe.js', 3767, function(exports, module, require) {
var simply = require('ui/simply');

var Vibe = module.exports;

Vibe.vibrate = function(type) {
  simply.impl.vibe(type);
};

});
__loader.define('src/js/ui/voice.js', 3777, function(exports, module, require) {
var simply = require('ui/simply');

var Voice = {};

Voice.dictate = function(type, confirm, callback) {
  type = type.toLowerCase();
  switch (type){
    case 'stop':
      simply.impl.voiceDictationStop();
      break;
    case 'start':
      if (typeof callback === 'undefined') {
        callback = confirm;
        confirm = true;
      }

      simply.impl.voiceDictationStart(callback, confirm);
      break;
    default:
      console.log('Unsupported type passed to Voice.dictate');
  }
};

module.exports = Voice;

});
__loader.define('src/js/ui/window.js', 3804, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var safe = require('safe');
var Emitter = require('emitter');
var Accel = require('ui/accel');
var WindowStack = require('ui/windowstack');
var Propable = require('ui/propable');
var Stage = require('ui/stage');
var simply = require('ui/simply');

var buttons = [
  'back',
  'up',
  'select',
  'down',
];

var configProps = [
  'fullscreen',
  'style',
  'scrollable',
  'backgroundColor',
];

var statusProps = [
  'status',
  'separator',
  'color',
  'backgroundColor',
];

var actionProps = [
  'action',
  'up',
  'select',
  'back',
  'backgroundColor',
];

var accessorProps = configProps;

var nestedProps = [
  'action',
  'status',
];

var defaults = {
  status: false,
  backgroundColor: 'black',
  scrollable: false,
};

var nextId = 1;

var checkProps = function(def) {
  if (!def) return;
  if ('fullscreen' in def && safe.warnFullscreen !== false) {
    safe.warn('`fullscreen` has been deprecated by `status` which allows settings\n\t' +
              'its color and separator in a similar manner to the `action` property.\n\t' +
              'Remove usages of `fullscreen` to enable usage of `status`.', 2);
    safe.warnFullscreen = false;
  }
};

var Window = function(windowDef) {
  checkProps(windowDef);
  this.state = myutil.shadow(defaults, windowDef || {});
  this.state.id = nextId++;
  this._buttonInit();
  this._items = [];
  this._dynamic = true;
};

Window._codeName = 'window';

util2.copy(Emitter.prototype, Window.prototype);

util2.copy(Propable.prototype, Window.prototype);

util2.copy(Stage.prototype, Window.prototype);

Propable.makeAccessors(accessorProps, Window.prototype);

Propable.makeNestedAccessors(nestedProps, Window.prototype);

Window.prototype._id = function() {
  return this.state.id;
};

Window.prototype._prop = function(def, clear, pushing) {
  checkProps(def);
  Stage.prototype._prop.call(this, def, clear, pushing);
};

Window.prototype._hide = function(broadcast) {
  if (broadcast === false) { return; }
  simply.impl.windowHide(this._id());
};

Window.prototype.hide = function() {
  WindowStack.remove(this, true);
  return this;
};

Window.prototype._show = function(pushing) {
  this._prop(this.state, true, pushing || false);
  this._buttonConfig({});
  if (this._dynamic) {
    Stage.prototype._show.call(this, pushing);
  }
};

Window.prototype.show = function() {
  WindowStack.push(this);
  return this;
};

Window.prototype._insert = function() {
  if (this._dynamic) {
    Stage.prototype._insert.apply(this, arguments);
  }
};

Window.prototype._remove = function() {
  if (this._dynamic) {
    Stage.prototype._remove.apply(this, arguments);
  }
};

Window.prototype._clearStatus = function() {
  statusProps.forEach(Propable.unset.bind(this.state.status));
};

Window.prototype._clearAction = function() {
  actionProps.forEach(Propable.unset.bind(this.state.action));
};

Window.prototype._clear = function(flags_) {
  var flags = myutil.toFlags(flags_);
  if (myutil.flag(flags, 'action')) {
    this._clearAction();
  }
  if (myutil.flag(flags, 'status')) {
    this._clearStatus();
  }
  if (flags_ === true || flags_ === undefined) {
    Propable.prototype._clear.call(this);
  }
};

Window.prototype._action = function(actionDef) {
  if (this === WindowStack.top()) {
    simply.impl.windowActionBar(actionDef);
  }
};

Window.prototype._status = function(statusDef) {
  if (this === WindowStack.top()) {
    simply.impl.windowStatusBar(statusDef);
  }
};

var isBackEvent = function(type, subtype) {
  return ((type === 'click' || type === 'longClick') && subtype === 'back');
};

Window.prototype.onAddHandler = function(type, subtype) {
  if (isBackEvent(type, subtype)) {
    this._buttonAutoConfig();
  }
  if (type === 'accelData') {
    Accel.autoSubscribe();
  }
};

Window.prototype.onRemoveHandler = function(type, subtype) {
  if (!type || isBackEvent(type, subtype)) {
    this._buttonAutoConfig();
  }
  if (!type || type === 'accelData') {
    Accel.autoSubscribe();
  }
};

Window.prototype._buttonInit = function() {
  this._button = {
    config: {},
    configMode: 'auto',
  };
  for (var i = 0, ii = buttons.length; i < ii; i++) {
    var button = buttons[i];
    if (button !== 'back') {
      this._button.config[buttons[i]] = true;
    }
  }
};

/**
 * The button configuration parameter for {@link simply.buttonConfig}.
 * The button configuration allows you to enable to disable buttons without having to register or unregister handlers if that is your preferred style.
 * You may also enable the back button manually as an alternative to registering a click handler with 'back' as its subtype using {@link simply.on}.
 * @typedef {object} simply.buttonConf
 * @property {boolean} [back] - Whether to enable the back button. Initializes as false. Simply.js can also automatically register this for you based on the amount of click handlers with subtype 'back'.
 * @property {boolean} [up] - Whether to enable the up button. Initializes as true. Note that this is disabled when using {@link simply.scrollable}.
 * @property {boolean} [select] - Whether to enable the select button. Initializes as true.
 * @property {boolean} [down] - Whether to enable the down button. Initializes as true. Note that this is disabled when using {@link simply.scrollable}.
 */

/**
 * Changes the button configuration.
 * See {@link simply.buttonConfig}
 * @memberOf simply
 * @param {simply.buttonConfig} buttonConf - An object defining the button configuration.
 */
Window.prototype._buttonConfig = function(buttonConf, auto) {
  if (buttonConf === undefined) {
    var config = {};
    for (var i = 0, ii = buttons.length; i < ii; ++i) {
      var name = buttons[i];
      config[name] = this._button.config[name];
    }
    return config;
  }
  for (var k in buttonConf) {
    if (buttons.indexOf(k) !== -1) {
      if (k === 'back') {
        this._button.configMode = buttonConf.back && !auto ? 'manual' : 'auto';
      }
      this._button.config[k] = buttonConf[k];
    }
  }
  if (simply.impl.windowButtonConfig) {
    return simply.impl.windowButtonConfig(this._button.config);
  }
};

Window.prototype.buttonConfig = function(buttonConf) {
  this._buttonConfig(buttonConf);
};

Window.prototype._buttonAutoConfig = function() {
  if (!this._button || this._button.configMode !== 'auto') {
    return;
  }
  var singleBackCount = this.listenerCount('click', 'back');
  var longBackCount = this.listenerCount('longClick', 'back');
  var useBack = singleBackCount + longBackCount > 0;
  if (useBack !== this._button.config.back) {
    this._button.config.back = useBack;
    return this._buttonConfig(this._button.config, true);
  }
};

Window.prototype._toString = function() {
  return '[' + this.constructor._codeName + ' ' + this._id() + ']';
};

Window.prototype._emit = function(type, subtype, e) {
  e.window = this;
  var klass = this.constructor;
  if (klass) {
    e[klass._codeName] = this;
  }
  if (this.emit(type, subtype, e) === false) {
    return false;
  }
};

Window.prototype._emitShow = function(type) {
  return this._emit(type, null, {});
};

Window.emit = function(type, subtype, e) {
  var wind = WindowStack.top();
  if (wind) {
    return wind._emit(type, subtype, e);
  }
};

/**
 * Simply.js button click event. This can either be a single click or long click.
 * Use the event type 'click' or 'longClick' to subscribe to these events.
 * @typedef simply.clickEvent
 * @property {string} button - The button that was pressed: 'back', 'up', 'select', or 'down'. This is also the event subtype.
 */

Window.emitClick = function(type, button) {
  var e = {
    button: button,
  };
  return Window.emit(type, button, e);
};

module.exports = Window;

});
__loader.define('src/js/ui/windowstack.js', 4101, function(exports, module, require) {
var util2 = require('util2');
var myutil = require('myutil');
var Emitter = require('emitter');
var simply = require('ui/simply');

var WindowStack = function() {
  this.init();
};

util2.copy(Emitter.prototype, WindowStack.prototype);

WindowStack.prototype.init = function() {
  this.off();
  this._items = [];

};

WindowStack.prototype.top = function() {
  return util2.last(this._items);
};

WindowStack.prototype._emitShow = function(item) {
  item.forEachListener(item.onAddHandler);
  item._emitShow('show');

  var e = {
    window: item
  };
  this.emit('show', e);
};

WindowStack.prototype._emitHide = function(item) {
  var e = {
    window: item
  };
  this.emit('hide', e);

  item._emitShow('hide');
  item.forEachListener(item.onRemoveHandler);
};

WindowStack.prototype._show = function(item, pushing) {
  if (!item) { return; }
  item._show(pushing);
  this._emitShow(item);
};

WindowStack.prototype._hide = function(item, broadcast) {
  if (!item) { return; }
  this._emitHide(item);
  item._hide(broadcast);
};

WindowStack.prototype.at = function(index) {
  return this._items[index];
};

WindowStack.prototype.index = function(item) {
  return this._items.indexOf(item);
};

WindowStack.prototype.push = function(item) {
  if (item === this.top()) { return; }
  this.remove(item);
  var prevTop = this.top();
  this._items.push(item);
  this._show(item, true);
  this._hide(prevTop, false);
  console.log('(+) ' + item._toString() + ' : ' + this._toString());
};

WindowStack.prototype.pop = function(broadcast) {
  return this.remove(this.top(), broadcast);
};

WindowStack.prototype.remove = function(item, broadcast) {
  if (typeof item === 'number') {
    item = this.get(item);
  }
  if (!item) { return; }
  var index = this.index(item);
  if (index === -1) { return item; }
  var wasTop = (item === this.top());
  this._items.splice(index, 1);
  if (wasTop) {
    var top = this.top();
    this._show(top);
    this._hide(item, top && top.constructor === item.constructor ? false : broadcast);
  }
  console.log('(-) ' + item._toString() + ' : ' + this._toString());
  return item;
};

WindowStack.prototype.get = function(windowId) {
  var items = this._items;
  for (var i = 0, ii = items.length; i < ii; ++i) {
    var wind = items[i];
    if (wind._id() === windowId) {
      return wind;
    }
  }
};

WindowStack.prototype.each = function(callback) {
  var items = this._items;
  for (var i = 0, ii = items.length; i < ii; ++i) {
    if (callback(items[i], i) === false) {
      break;
    }
  }
};

WindowStack.prototype.length = function() {
  return this._items.length;
};

WindowStack.prototype.emitHide = function(windowId) {
  var wind = this.get(windowId);
  if (wind !== this.top()) { return; }
  this.remove(wind);
};

WindowStack.prototype._toString = function() {
  return this._items.map(function(x){ return x._toString(); }).join(',');
};

module.exports = new WindowStack();

});
(function() {
  var safe = __loader.require('safe');
  safe.protect(function() {
    __loader.require('src/js/app');
  })();
})();