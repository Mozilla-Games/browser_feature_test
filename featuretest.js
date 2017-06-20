// featuretest.js: Small test code to perform feature testing of browser capabilities.
// Call the function browserFeatureTest(successCallback) to run the test (see below).

var browserFeatureTest = (function() {

// userAgentExplained: Pass in the result from deduceUserAgent() here.
function allocateLargestPossibleContiguousBlock(userAgentExplained) {
  // Workaround https://github.com/Mozilla-Games/browser_feature_test/issues/4
  if (!userAgentExplained.productComponents || Object.keys(userAgentExplained.productComponents).length === 0
  	|| userAgentExplained.productComponents['Chrome'] || userAgentExplained.productComponents['Safari']) {
    console.warn('allocateLargestPossibleContiguousBlock() test disabled to work around Chrome/Safari crash bug.'); // Still occurring in latest Chrome 53, so disabled altogether: https://bugs.chromium.org/p/chromium/issues/detail?id=536816#c23
    return -1;
  }

  var test = [];

  var testHuge = [4*1024, 3*1024, 2*1024]; // These are not expected to work.
  var testLarge = [2*1024 - 16, 1024 + 768, 1024 + 512, 1024 + 256, 1024, 768, 640];
  var testSmall = [512, 384, 320, 256, 240, 224, 208, 192, 176, 160, 144, 128, 112, 96, 80, 64, 48, 32, 16, 8, 4, 2, 1];

  // Only test larger than 2GB on 64-bit desktops. Current web impls don't really allow these sizes to work, but be forward-looking.
  if (userAgentExplained.formFactor == 'Desktop' && userAgentExplained.bitness == 64) {
    test = test.concat(testHuge);
  }

  // Test large sizes on all desktops.
  if (userAgentExplained.formFactor == 'Desktop') {
    test = test.concat(testLarge);
  }

  // Mobiles only test small 32-bit.
  test = test.concat(testSmall);

  for(var t in test) {
    var mem = test[t]*1024*1024;
    try {
      var a = new ArrayBuffer(mem);
      if (a.byteLength != mem) throw ''; // browser bugs..

      // Touch memory
      var v = new Float64Array(a);
      for(var i = 0; i < v.length/1024/1024; ++i) {
        v[i*1024*1024] = i;
      }
      return a.byteLength;
    } catch(e) {
      // pass
    }
  }
  return 0;
}

function estimateVSyncRate(completionCallback) {
  var numFramesToRun = 60;
  var t0 = performance.now();
  var deltas = [];
  function tick() {
    var t1 = performance.now();
    deltas.push(t1-t0);
    t0 = t1;
    if (--numFramesToRun > 0) {
      requestAnimationFrame(tick);
    } else {
      deltas.sort();
      deltas = deltas.slice((deltas.length/3)|0, ((2*deltas.length+2)/3)|0);
      var sum = 0;
      for(var i in deltas) sum += deltas[i];
      completionCallback(1000.0 / (sum/deltas.length));
    }
  }
  requestAnimationFrame(tick);
}

Date.prototype.yyyymmddhhmm = function() {
   var yyyy = this.getFullYear();
   var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
   var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
   var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
   var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
   return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min;
  };

Date.prototype.yyyymmddhhmmss = function() {
   var yyyy = this.getFullYear();
   var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
   var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
   var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
   var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
   var sec = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds();
   return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + sec;
  };

var displayRefreshRate = -1; // Global value that is asynchronously computed (once), and then reported directly.

function padLengthRight(s, len, ch) {
  if (ch === undefined) ch = ' ';
  while(s.length < len) s += ch;
  return s;
}
function padLengthLeft(s, len, ch) {
  if (ch === undefined) ch = ' ';
  while(s.length < len) s = ch + s;
  return s;
}

// Returns a copy of the given array with empty/undefined string elements removed in between
function removeEmptyElements(arr) {
  return arr.filter(function(x) { return x && x.length > 0; });
}

// Trims whitespace in each string from an array of strings
function trimSpacesInEachElement(arr) {
  return arr.map(function(x) { return x.trim(); });
}

// Returns true if the given string is enclosed in parentheses, e.g. is of form "(something)"
function isEnclosedInParens(str) {
  return str[0] == '(' && str[str.length-1] == ')';
}

// Returns true if the given substring is contained in the string (case sensitive)
function contains(str, substr) {
  return str.indexOf(substr) >= 0;
}

// Returns true if the any of the given substrings in the list is contained in the first parameter string (case sensitive)
function containsAnyOf(str, substrList) {
  for(var i in substrList) if (contains(str, substrList[i])) return true;
  return false;
}

// Splits an user agent string logically into an array of tokens, e.g.
// 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MOB30M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537.36'
// -> ['Mozilla/5.0', '(Linux; Android 6.0.1; Nexus 5 Build/MOB30M)', 'AppleWebKit/537.36 (KHTML, like Gecko)', 'Chrome/51.0.2704.81', 'Mobile Safari/537.36']
function splitUserAgent(str) {
  str = str.trim();
  var uaList = [];
  var tokens = '';
  // Split by spaces, while keeping top level parentheses intact, so
  // "Mozilla/5.0 (Linux; Android 6.0.1) Mobile Safari/537.36" becomes
  // ['Mozilla/5.0', '(Linux; Android 6.0.1)', 'Mobile', 'Safari/537.36']
  var parensNesting = 0;
  for(var i = 0; i < str.length; ++i) {
    if (str[i] == ' ' && parensNesting == 0) {
      if (tokens.trim().length != 0) uaList.push(tokens.trim());
      tokens = '';
    } else if (str[i] == '(') ++parensNesting;
    else if (str[i] == ')') --parensNesting;
    tokens = tokens + str[i];
  }
  if (tokens.trim().length > 0) uaList.push(tokens.trim());

  // What follows is a number of heuristic adaptations to account for UA strings met in the wild:

  // Fuse ['a/ver', '(someinfo)'] together. For example:
  // 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MOB30M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537.36'
  // -> fuse 'AppleWebKit/537.36' and '(KHTML, like Gecko)' together
  for(var i = 1; i < uaList.length; ++i) {
    var l = uaList[i];
    if (isEnclosedInParens(l) && !contains(l, ';') && i > 1) {
      uaList[i-1] = uaList[i-1] + ' ' + l;
      uaList[i] = '';
    }
  }
  uaList = removeEmptyElements(uaList);

  // Fuse ['foo', 'bar/ver'] together, if 'foo' has only ascii chars. For example:
  // 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MOB30M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537.36'
  // -> fuse ['Mobile', 'Safari/537.36'] together
  for(var i = 0; i < uaList.length-1; ++i) {
    var l = uaList[i];
    var next = uaList[i+1];
    if (/^[a-zA-Z]+$/.test(l) && contains(next, '/')) {
      uaList[i+1] = l + ' ' + next;
      uaList[i] = '';
    }
  }
  uaList = removeEmptyElements(uaList);
  return uaList;
}

// Finds the special token in the user agent token list that corresponds to the platform info.
// This is the first element contained in parentheses that has semicolon delimited elements.
// Returns the platform info as an array split by the semicolons.
function splitPlatformInfo(uaList) {
  for(var i = 0; i < uaList.length; ++i) {
    var item = uaList[i];
    if (isEnclosedInParens(item)) {
      return removeEmptyElements(trimSpacesInEachElement(item.substr(1, item.length-2).split(';')));
    }
  }
}

// Deduces the operating system from the user agent platform info token list.
function findOS(uaPlatformInfo) {
  var oses = ['Android', 'BSD', 'Linux', 'Windows', 'iPhone OS', 'Mac OS', 'BSD', 'CrOS', 'Darwin', 'Dragonfly', 'Fedora', 'Gentoo', 'Ubuntu', 'debian', 'HP-UX', 'IRIX', 'SunOS', 'Macintosh', 'Win 9x', 'Win98', 'Win95', 'WinNT'];
  for(var os in oses) {
    for(var i in uaPlatformInfo) {
      var item = uaPlatformInfo[i];
      if (contains(item, oses[os])) return item;
    }
  }
  return 'Other';
}

// Filters the product components (items of format 'foo/version') from the user agent token list.
function parseProductComponents(uaList) {
  uaList = uaList.filter(function(x) { return contains(x, '/') && !isEnclosedInParens(x); });
  var productComponents = {};
  for(var i in uaList) {
    var x = uaList[i];
    if (contains(x, '/')) {
      x = x.split('/');
      if (x.length != 2) throw uaList[i];
      productComponents[x[0].trim()] = x[1].trim();
    } else {
      productComponents[x] = true;
    }
  }
  return productComponents;
}

// Maps Windows NT version to human-readable Windows Product version
function windowsDistributionName(winNTVersion) {
  var vers = {
    '5.0': '2000',
    '5.1': 'XP',
    '5.2': 'XP',
    '6.0': 'Vista',
    '6.1': '7',
    '6.2': '8',
    '6.3': '8.1',
    '10.0': '10'
  }
  if (!vers[winNTVersion]) return 'NT ' + winNTVersion;
  return vers[winNTVersion];
}

// The full function to decompose a given user agent to the interesting logical info bits.
function deduceUserAgent(userAgent) {
  var ua = {
    userAgent: userAgent,
    productComponents: {},
    platformInfo: []
  };

  try {
    var uaList = splitUserAgent(userAgent);
    var uaPlatformInfo = splitPlatformInfo(uaList);
    var productComponents = parseProductComponents(uaList);
    ua.productComponents = productComponents;
    ua.platformInfo = uaPlatformInfo;
    var ual = userAgent.toLowerCase();

    // Deduce arch and bitness
    var b32On64 = ['wow64'];
    if (contains(ual, 'wow64')) {
      ua.bitness = '32-on-64';
      ua.arch = 'x86_64';
    } else if (containsAnyOf(ual, ['x86_64', 'amd64', 'ia64', 'win64', 'x64'])) {
      ua.bitness = 64;
      ua.arch = 'x86_64';
    } else if (contains(ual, 'ppc64')) {
      ua.bitness = 64;
      ua.arch = 'PPC';
    } else if (contains(ual, 'sparc64')) {
      ua.bitness = 64;
      ua.arch = 'SPARC';
    } else if (containsAnyOf(ual, ['i386', 'i486', 'i586', 'i686', 'x86'])) {
      ua.bitness = 32;
      ua.arch = 'x86';
    } else if (contains(ual, 'arm7') || contains(ual, 'android') || contains(ual, 'mobile')) {
      ua.bitness = 32;
      ua.arch = 'ARM';
    // Heuristic: Assume all OS X are 64-bit, although this is not certain. On OS X, 64-bit browsers
    // don't advertise being 64-bit.
    } else if (contains(ual, 'intel mac os')) {
      ua.bitness = 64;
      ua.arch = 'x86_64';
    } else {
      ua.bitness = 32;
    }

    // Deduce operating system
    var os = findOS(uaPlatformInfo);
    var m = os.match('(.*)\\s+Mac OS X\\s+(.*)');
    if (m) {
      ua.platform = 'Mac';
      ua.arch = m[1];
      ua.os = 'Mac OS';
      ua.osVersion = m[2].replace(/_/g, '.');
    }
    if (!m) {
      m = os.match('Android\\s+(.*)');
      if (m) {
        ua.platform = 'Android';
        ua.os = 'Android';
        ua.osVersion = m[1];
      }
    }
    if (!m) {
      m = os.match('Windows NT\\s+(.*)');
      if (m) {
        ua.platform = 'PC';
        ua.os = 'Windows';
        ua.osVersion = windowsDistributionName(m[1]);
        if (!ua.arch) ua.arch = 'x86';
      }
    }
    if (!m) {
      if (contains(uaPlatformInfo[0], 'iPhone') || contains(uaPlatformInfo[0], 'iPad') || contains(uaPlatformInfo[0], 'iPod') || contains(os, 'iPhone') || os.indexOf('CPU OS') == 0) {
        m = os.match('.*OS (.*) like Mac OS X');
        if (m) {
          ua.platform = uaPlatformInfo[0];
          ua.os = 'iOS';
          ua.osVersion = m[1].replace(/_/g, '.');
          ua.bitness = parseInt(ua.osVersion) >= 7 ? 64 : 32;
        }
      }
    }  
    if (!m) {
      m = contains(os, 'BSD') || contains(os, 'Linux');
      if (m) {
        ua.platform = 'PC';
        ua.os = os.split(' ')[0];
        if (!ua.arch) ua.arch = 'x86';
      }
    }
    if (!m) {
      ua.os = os;
    }

    function findProduct(productComponents, product) {
      for(var i in productComponents) {
        if (productComponents[i] == product) return i;
      }
      return -1;
    }

    // Deduce human-readable browser vendor, product and version names
    browsers = [['SamsungBrowser', 'Samsung'], ['Edge', 'Microsoft'], ['OPR', 'Opera'], ['Chrome', 'Google'], ['Safari', 'Apple'], ['Firefox', 'Mozilla']];
    for(var i in browsers) {
      var b = browsers[i][0];
      if (productComponents[b]) {
        ua.browserVendor = browsers[i][1];
        ua.browserProduct = browsers[i][0];
        if (ua.browserProduct == 'OPR') ua.browserProduct = 'Opera';
        if (ua.browserProduct == 'Trident') ua.browserProduct = 'Internet Explorer';
        ua.browserVersion = productComponents[b];
        break;
      }
    }
    // Detect IEs
    if (!ua.browserProduct) {
      var matchIE = userAgent.match(/MSIE\s([\d.]+)/);
      if (matchIE) {
        ua.browserVendor = 'Microsoft';
        ua.browserProduct = 'Internet Explorer';
        ua.browserVersion = matchIE[1];
      } else if (contains(uaPlatformInfo, 'Trident/7.0')) {
        ua.browserVendor = 'Microsoft';
        ua.browserProduct = 'Internet Explorer';
        ua.browserVersion =  userAgent.match(/rv:([\d.]+)/)[1];
      }
    }

    // Deduce mobile platform, if present
    for(var i = 0; i < uaPlatformInfo.length; ++i) {
      var item = uaPlatformInfo[i];
      var iteml = item.toLowerCase();
      if (contains(iteml, 'nexus') || contains(iteml, 'samsung')) {
        ua.platform = item;
        ua.arch = 'ARM';
        break;
      }
    }

    // Deduce form factor
    if (contains(ual, 'tablet') || contains(ual, 'ipad')) ua.formFactor = 'Tablet';
    else if (contains(ual, 'mobile') || contains(ual, 'iphone') || contains(ual, 'ipod')) ua.formFactor = 'Mobile';
    else if (contains(ual, 'smart tv') || contains(ual, 'smart-tv')) ua.formFactor = 'TV';
    else ua.formFactor = 'Desktop';
  } catch(e) {
    ua.internalError = 'Failed to parse user agent string: ' + e.toString();
  }

  return ua;
}

// Performs the browser feature test. Immediately returns a JS object that contains the results of all synchronously computable fields, and launches asynchronous
// tasks that perform the remaining tests. Once the async tasks have finished, the given successCallback function is called, with the full browser feature test
// results object as the first parameter.
function browserFeatureTest(successCallback) {
  var supportedApis = [];
  var unsupportedApis = [];
  function storeSupport(apiname, cmp) {
    if (cmp) supportedApis.push(apiname);
    else unsupportedApis.push(apiname);
  }

  var hasBlobConstructor = false;
  try {
    new Blob();
    hasBlobConstructor = true;
  } catch(e) { }

  storeSupport('Math.imul()', typeof Math.imul !== 'undefined');
  storeSupport('Math.fround()', typeof Math.fround !== 'undefined');
  storeSupport('ArrayBuffer.transfer()', typeof ArrayBuffer.transfer !== 'undefined');
  storeSupport('Web Audio', typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
  storeSupport('Pointer Lock', document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock || document.body.msRequestPointerLock);
  storeSupport('Fullscreen API', document.body.requestFullscreen || document.body.msRequestFullscreen || document.body.mozRequestFullScreen || document.body.webkitRequestFullscreen);
  storeSupport('new Blob()', hasBlobConstructor);
  if (!hasBlobConstructor) storeSupport('BlobBuilder', typeof BlobBuilder !== 'undefined' || typeof MozBlobBuilder !== 'undefined' || typeof WebKitBlobBuilder !== 'undefined');
  storeSupport('SharedArrayBuffer', typeof SharedArrayBuffer !== 'undefined');
  storeSupport('navigator.hardwareConcurrency', typeof navigator.hardwareConcurrency !== 'undefined');
  storeSupport('SIMD.js', typeof SIMD !== 'undefined');
  storeSupport('Web Workers', typeof Worker !== 'undefined');
  storeSupport('WebAssembly', typeof WebAssembly !== 'undefined');
  storeSupport('Gamepad API', navigator.getGamepads || navigator.webkitGetGamepads);
  var hasIndexedDB = false;
  try { hasIndexedDB = typeof indexedDB !== 'undefined'; } catch (e) { hasIndexedDB = false; }
  storeSupport('IndexedDB', hasIndexedDB);
  storeSupport('Visibility API', typeof document.visibilityState !== 'undefined' || typeof document.hidden !== 'undefined');
  storeSupport('requestAnimationFrame()', typeof requestAnimationFrame !== 'undefined');
  storeSupport('performance.now()', typeof performance !== 'undefined' && performance.now);
  storeSupport('WebSockets', typeof WebSocket !== 'undefined');
  storeSupport('WebRTC', typeof RTCPeerConnection !== 'undefined' || typeof mozRTCPeerConnection !== 'undefined' || typeof webkitRTCPeerConnection !== 'undefined' || typeof msRTCPeerConnection !== 'undefined');
  storeSupport('Vibration API', navigator.vibrate);
  storeSupport('Screen Orientation API', window.screen && (window.screen.orientation || window.screen.mozOrientation || window.screen.webkitOrientation || window.screen.msOrientation));
  storeSupport('Geolocation API', navigator.geolocation);
  storeSupport('Battery Status API', navigator.getBattery);
  storeSupport('WebAssembly', typeof WebAssembly !== 'undefined');

  var webGLSupport = {};
  var bestGLContext = null; // The GL contexts are tested from best to worst (newest to oldest), and the most desirable
                            // context is stored here for later use.
  function testWebGLSupport(contextName, failIfMajorPerformanceCaveat) {
    var canvas = document.createElement('canvas');
    var errorReason = '';
    canvas.addEventListener("webglcontextcreationerror", function(e) { errorReason = e.statusMessage; }, false);
    var context = canvas.getContext(contextName, failIfMajorPerformanceCaveat ? { failIfMajorPerformanceCaveat: true } : {});
    if (context && !errorReason) {
      if (!bestGLContext) bestGLContext = context;
      var results = { supported: true, performanceCaveat: !failIfMajorPerformanceCaveat };
      if (contextName == 'experimental-webgl') results['experimental-webgl'] = true;
      return results;
    }
    else return { supported: false, errorReason: errorReason };
  }

  webGLSupport['webgl2'] = testWebGLSupport('webgl2', true);
  if (!webGLSupport['webgl2'].supported) {
    var softwareWebGL2 = testWebGLSupport('webgl2', false);
    if (softwareWebGL2.supported) {
      softwareWebGL2.hardwareErrorReason = webGLSupport['webgl2'].errorReason; // Capture the reason why hardware WebGL 2 context did not succeed.
      webGLSupport['webgl2'] = softwareWebGL2;
    }
  }

  webGLSupport['webgl1'] = testWebGLSupport('webgl', true);
  if (!webGLSupport['webgl1'].supported) {
    var experimentalWebGL = testWebGLSupport('experimental-webgl', true);
    if (experimentalWebGL.supported || (experimentalWebGL.errorReason && !webGLSupport['webgl1'].errorReason)) {
      webGLSupport['webgl1'] = experimentalWebGL;
    }
  }

  if (!webGLSupport['webgl1'].supported) {
    var softwareWebGL1 = testWebGLSupport('webgl', false);
    if (!softwareWebGL1.supported) {
      var experimentalWebGL = testWebGLSupport('experimental-webgl', false);
      if (experimentalWebGL.supported || (experimentalWebGL.errorReason && !softwareWebGL1.errorReason)) {
        softwareWebGL1 = experimentalWebGL;
      }
    }

    if (softwareWebGL1.supported) {
      softwareWebGL1.hardwareErrorReason = webGLSupport['webgl1'].errorReason; // Capture the reason why hardware WebGL 1 context did not succeed.
      webGLSupport['webgl1'] = softwareWebGL1;
    }
  }

  storeSupport('WebGL 1', webGLSupport['webgl1'].supported);
  storeSupport('WebGL 2', webGLSupport['webgl2'].supported);

  function performance_now() { return performance.now(); }
  if (!Math.fround) Math.fround = function(x) { return x; }
  function CpuBenchmark(stdlib, foreign, buffer) {
    "use asm";
    var performance_now = foreign.performance_now;
    var Math_fround = stdlib.Math.fround;
    var i32 = new stdlib.Int32Array(buffer);
    var f32 = new stdlib.Float32Array(buffer);
    var f64 = new stdlib.Float64Array(buffer);
    function cpuBenchmark() {
      var t0 = 0.0, t1 = 0.0, i = 0, a = 0, b = 0, c = 0;
      a = performance_now()|0; b = performance_now()|0; c = performance_now()|0; t0 = +performance_now(); i = 0;
      do { a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; i = i + 1 | 0; } while((i | 0) != 131072);
      t1 = +performance_now(); i32[0>>2] = c; return t1 - t0;
    }

    // Inside asm.js module
    function doesCanonicalizeNans() {
      var f = Math_fround(0.0);
      var d = 0.0;
      var canonicalizes = 0;
      // Single-precision
      i32[0] = -1;
      f = Math_fround(f32[0]);
      f32[1] = f;
      if ((i32[1]|0) != -1) canonicalizes = 1;
      i32[0] = 0x7FC00000;
      f = Math_fround(f32[0]);
      f32[1] = f;
      if ((i32[1]|0) != 0x7FC00000) canonicalizes = 1;
      // Double-precision
      i32[2] = -1;
      i32[3] = -1;
      d = +f64[1];
      f64[2] = d;
      if ((i32[4]|0) != -1) canonicalizes = 1;
      if ((i32[5]|0) != -1) canonicalizes = 1;
      i32[2] = 0;
      i32[3] = 0x7FC00000;
      d = +f64[1];
      f64[2] = d;
      if ((i32[4]|0) != 0) canonicalizes = 1;
      if ((i32[5]|0) != 0x7FC00000) canonicalizes = 1;
      return canonicalizes|0;
    }
    return { cpuBenchmark: cpuBenchmark, doesCanonicalizeNans: doesCanonicalizeNans };
  }
  var heap = new ArrayBuffer(0x10000);
  var i32 = new Int32Array(heap);
  var u32 = new Uint32Array(heap);
  var u16 = new Uint16Array(heap);
  u32[64] = 0x7FFF0100;
  var typedArrayEndianness;
  if (u16[128] === 0x7FFF && u16[129] === 0x0100) typedArrayEndianness = 'big endian';
  else if (u16[128] === 0x0100 && u16[129] === 0x7FFF) typedArrayEndianness = 'little endian';
  else typedArrayEndianness = 'unknown! (a browser bug?) (short 1: ' + u16[128].toString(16) + ', short 2: ' + u16[129].toString(16) + ')';

  var f32 = new Float32Array(heap);
  var f64 = new Float64Array(heap);
  var benchmark = CpuBenchmark(window, { performance_now: performance_now }, heap);
  // Do a few measurements
  var tStart = performance.now();
  var seconds = [];
  for(var i = 0; i < 20; ++i) {
    seconds.push(benchmark.cpuBenchmark()/1000);
    var tEnd = performance.now();
    if (tEnd - tStart > 1000) break; // Test cutoff: if the test takes more than one second, bail out from the execution here to keep the test lightweight. (loses some statistical significance)
  }
  // Take best result as an indicator of CPU performance
  var secondsAvg = seconds.sort()[0];
  // Alternative: remove some outliers & compute the average of the remaining.
//    seconds = seconds.sort().slice(30, 75); var secondsAvg = 0; for(var i in seconds) secondsAvg += seconds[i]; secondsAvg /= seconds.length;
  // Compute MIPS performance count
  var instructions = 131072/*# of loop iterations*/ * 10/*# of adds in iteration*/;
  var singleCoreMips = Math.round(instructions / secondsAvg / 1000000/*ips->mips*/);

  // Outside asm.js module
  function doesCanonicalizeNans() {
    var f = Math.fround(0.0);
    var d = 0.0;
    var canonicalizes = 0;
    // Single-precision
    i32[0] = -1;
    f = Math.fround(f32[0]);
    f32[1] = f;
    if ((i32[1]|0) != -1) canonicalizes = 1;
    i32[0] = 0x7FC00000;
    f = Math.fround(f32[0]);
    f32[1] = f;
    if ((i32[1]|0) != 0x7FC00000) canonicalizes = 1;
    // Double-precision
    i32[2] = -1;
    i32[3] = -1;
    d = +f64[1];
    f64[2] = d;
    if ((i32[4]|0) != -1) canonicalizes = 1;
    if ((i32[5]|0) != -1) canonicalizes = 1;
    i32[2] = 0;
    i32[3] = 0x7FF80000;
    d = +f64[1];
    f64[2] = d;
    if ((i32[4]|0) != 0) canonicalizes = 1;
    if ((i32[5]|0) != 0x7FF80000) canonicalizes = 1;
    return canonicalizes;
  }

  var canonicalizesNansInsideAsmModule = benchmark.doesCanonicalizeNans();
  var canonicalF32NanValueInsideAsmModule = '0x' + padLengthLeft(u32[1].toString(16), 8, '0');
  var canonicalF64NanValueInsideAsmModule = '0x' + padLengthLeft(u32[5].toString(16), 8, '0') + padLengthLeft(u32[4].toString(16), 8, '0');
  var canonicalizesNansOutsideAsmModule = doesCanonicalizeNans();
  var canonicalF32NanValueOutsideAsmModule = '0x' + padLengthLeft(u32[1].toString(16), 8, '0');
  var canonicalF64NanValueOutsideAsmModule = '0x' + padLengthLeft(u32[5].toString(16), 8, '0') + padLengthLeft(u32[4].toString(16), 8, '0');

  var userAgentExplained = deduceUserAgent(navigator.userAgent);

  var results = {
    featureTestVersion: '3', // The version number for featuretest.js itself.
    runDate: new Date().yyyymmddhhmmss(),
    userAgent: navigator.userAgent,
    userAgentExplained: userAgentExplained,
    buildID: navigator.buildID,
    appVersion: navigator.appVersion,
    mozE10sEnabled: navigator.mozE10sEnabled,
    oscpu: navigator.oscpu,
    platform: navigator.platform,
    contiguousSystemMemory: allocateLargestPossibleContiguousBlock(userAgentExplained),
    displayRefreshRate: displayRefreshRate, // Will be asynchronously filled in on first run, directly filled in later.
    windowDevicePixelRatio: window.devicePixelRatio,
    screenWidth: screen.width,
    screenHeight: screen.height,
    physicalScreenWidth: screen.width*window.devicePixelRatio,
    physicalScreenHeight: screen.height*window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency, // If browser does not support this, will be asynchronously filled in by core estimator.
    singleCoreMips: singleCoreMips,
    webGLSupport: webGLSupport,
    supportedApis: supportedApis,
    unsupportedApis: unsupportedApis,
    canonicalizesNansInsideAsmModule: canonicalizesNansInsideAsmModule,
    canonicalF32NanValueInsideAsmModule: canonicalF32NanValueInsideAsmModule,
    canonicalF64NanValueInsideAsmModule: canonicalF64NanValueInsideAsmModule,
    canonicalizesNansOutsideAsmModule: canonicalizesNansOutsideAsmModule,
    canonicalF32NanValueOutsideAsmModule: canonicalF32NanValueOutsideAsmModule,
    canonicalF64NanValueOutsideAsmModule: canonicalF64NanValueOutsideAsmModule,
    typedArrayEndianness: typedArrayEndianness
  };

  // Some fields exist don't always exist
  var optionalFields = ['vendor', 'vendorSub', 'product', 'productSub', 'language', 'appCodeName', 'appName', 'maxTouchPoints', 'pointerEnabled', 'cpuClass'];
  for(var i in optionalFields) {
    var f = optionalFields[i];
    if (navigator[f]) { results[f] = navigator[f]; }
  }

  if (bestGLContext) {
    results.GL_VENDOR = bestGLContext.getParameter(bestGLContext.VENDOR);
    results.GL_RENDERER = bestGLContext.getParameter(bestGLContext.RENDERER);
    results.GL_VERSION = bestGLContext.getParameter(bestGLContext.VERSION);
    results.GL_SHADING_LANGUAGE_VERSION = bestGLContext.getParameter(bestGLContext.SHADING_LANGUAGE_VERSION);
    results.GL_MAX_TEXTURE_IMAGE_UNITS = bestGLContext.getParameter(bestGLContext.MAX_TEXTURE_IMAGE_UNITS);

    var WEBGL_debug_renderer_info = bestGLContext.getExtension('WEBGL_debug_renderer_info');
    if (WEBGL_debug_renderer_info) {
      results.GL_UNMASKED_VENDOR_WEBGL = bestGLContext.getParameter(WEBGL_debug_renderer_info.UNMASKED_VENDOR_WEBGL);
      results.GL_UNMASKED_RENDERER_WEBGL = bestGLContext.getParameter(WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL);
    }
    results.supportedWebGLExtensions = bestGLContext.getSupportedExtensions();
  }

  // Spin off the asynchronous tasks.

  var numCoresChecked = navigator.hardwareConcurrency > 0;
  var vsyncChecked = displayRefreshRate > 0;

  // On first run, estimate the number of cores if needed.
  if (!numCoresChecked) {
    if (navigator.getHardwareConcurrency) {
      navigator.getHardwareConcurrency(function(cores) {
        results.hardwareConcurrency = cores;
        numCoresChecked = true;

        // If this was the last async task, fire success callback.
        if (numCoresChecked && vsyncChecked && successCallback) successCallback(results);
      });
    } else {
      // navigator.hardwareConcurrency is not supported, and no core estimator available either.
      // Report number of cores as 0.
      results.hardwareConcurrency = 0;
      numCoresChecked = true;

      if (numCoresChecked && vsyncChecked && successCallback) successCallback(results);
    }
  }

  // On first run, estimate the display vsync rate.
  if (!vsyncChecked) {
    estimateVSyncRate(function(rate) {
      displayRefreshRate = results.displayRefreshRate = Math.round(rate);
      vsyncChecked = true;

      // If this was the last async task, fire success callback.
      if (numCoresChecked && vsyncChecked && successCallback) successCallback(results);
    });
  }

  // If none of the async tasks were needed to be executed, queue success callback.
  if (numCoresChecked && vsyncChecked && successCallback) setTimeout(function() { successCallback(results); }, 1);

  // If caller is not interested in asynchronously fillable data, also return the results object immediately for the synchronous bits.
  return results;
}

// Returns a pretty-printed form of the test results JSON.
function prettyPrintTestResults(results) {
  var s = 'Detection code version: ' + results.featureTestVersion + '\n';
  s += 'Run date: ' + results.runDate + '\n';
  s += 'User agent: ' + results.userAgent + '\n';
  var uaFields = ['platform', 'bitness', 'arch', 'formFactor', 'os', 'osVersion', 'browserVendor', 'browserProduct', 'browserVersion', 'productComponents'];
  for(var i in uaFields) {
    var f = uaFields[i];
    if (results.userAgentExplained[f]) s += ' - ' + f + ': ' + results.userAgentExplained[f] + '\n';
  }
  if (results.buildID) s += 'buildID: ' + results.buildID + '\n';
  if (results.appVersion) s += 'appVersion: ' + results.appVersion + '\n';
  if (results.mozE10sEnabled) s += 'mozE10sEnabled: true\n';
  if (results.oscpu) s += 'OS: ' + results.oscpu + '\n';
  if (results.platform) s += 'Platform: ' + results.platform + '\n';
  var optionalFields = ['vendor', 'vendorSub', 'product', 'productSub', 'language', 'appCodeName', 'appName', 'maxTouchPoints', 'pointerEnabled', 'cpuClass'];
  for(var i in optionalFields) {
    var f = optionalFields[i];
    if (results[f]) s += f + ': ' + results[f] + '\n';
  }
  var contiguousSystemMemory = Math.round(results.contiguousSystemMemory/1024/1024) + 'MB';
  s += 'Estimated maximum contiguously allocatable system memory for asm.js heap: ' + contiguousSystemMemory + '\n';
  s += 'Display refresh rate: ' + results.displayRefreshRate + 'hz\n';
  s += 'window.devicePixelRatio: ' + results.windowDevicePixelRatio + '\n';
  s += 'display resolution in CSS pixels (screen.width x screen.height): ' + results.screenWidth + 'x' + results.screenHeight + '\n';
  s += 'display resolution in physical pixels: ' + results.physicalScreenWidth + 'x' + results.physicalScreenHeight + '\n';
  s += 'Number of logical cores: ' + results.hardwareConcurrency + '\n';
  s += 'Single core performance: ' + results.singleCoreMips + ' MIPS\n';

  if (results.supportedApis.length > 0) {
    s += 'Supports the following web APIs:\n    ';
    s += results.supportedApis.join('\n    ') + '\n';
  }
  if (results.unsupportedApis.length > 0) {
    s += 'The following web APIs are not supported:\n    ';
    s += results.unsupportedApis.join('\n    ') + '\n';
  }

  s += 'Typed array endianness: ' + results.typedArrayEndianness + '\n';
  if (typeof results.canonicalizesNansInsideAsmModule !== 'undefined') {
    if (results.canonicalizesNansInsideAsmModule) {
       s += 'The JS engine canonicalizes NaNs inside the asm.js module to the F32 value ' + results.canonicalF32NanValueInsideAsmModule + ' and F64 value ' + results.canonicalF64NanValueInsideAsmModule + '.\n';
    } else {
       s += 'The JS engine does not canonicalize NaNs inside the asm.js module.\n';
    }
  }
  if (typeof results.canonicalizesNansOutsideAsmModule !== 'undefined') {
    if (results.canonicalizesNansOutsideAsmModule) {
       s += 'The JS engine canonicalizes NaNs outside the asm.js module to the F32 value ' + results.canonicalF32NanValueOutsideAsmModule + ' and F64 value ' + results.canonicalF64NanValueOutsideAsmModule + '.\n';
    } else {
       s += 'The JS engine does not canonicalize NaNs outside the asm.js module.\n';
    }
  }

  if (results.webGLSupport['webgl1'].supported || results.webGLSupport['webgl2'].supported ) {
    s += 'GL_VENDOR: ' + results.GL_VENDOR + '\n';
    s += 'GL_RENDERER: ' + results.GL_RENDERER + '\n';
    s += 'GL_VERSION: ' + results.GL_VERSION + '\n';
    s += 'GL_SHADING_LANGUAGE_VERSION: ' + results.GL_SHADING_LANGUAGE_VERSION + '\n';
    s += 'GL_MAX_TEXTURE_IMAGE_UNITS: ' + results.GL_MAX_TEXTURE_IMAGE_UNITS + '\n';
    if (results.GL_UNMASKED_VENDOR_WEBGL) s += 'GL_UNMASKED_VENDOR_WEBGL: ' + results.GL_UNMASKED_VENDOR_WEBGL + '\n';
    if (results.GL_UNMASKED_RENDERER_WEBGL) s += 'GL_UNMASKED_RENDERER_WEBGL: ' + results.GL_UNMASKED_RENDERER_WEBGL + '\n';
    s += 'WebGL extensions:\n    ' + results.supportedWebGLExtensions.join('\n    ') + '\n';
  } else {
    s += 'WebGL is not supported.\n';
  }
  if (results.webGLSupport['webgl2'].hardwareErrorReason) s += 'Reason why hardware WebGL 2 is not supported: ' + results.webGLSupport['webgl2'].hardwareErrorReason + '\n';
  if (!results.webGLSupport['webgl2'].supported) s += 'Reason why WebGL 2 is not supported: ' + results.webGLSupport['webgl2'].errorReason + '\n';
  if (results.webGLSupport['webgl1'].hardwareErrorReason) s += 'Reason why hardware WebGL 1 is not supported: ' + results.webGLSupport['webgl1'].hardwareErrorReason + '\n';
  if (!results.webGLSupport['webgl1'].supported) s += 'Reason why WebGL 1 is not supported: ' + results.webGLSupport['webgl1'].errorReason + '\n';

  return s;
}

// Identical to browserFeatureTest(), but returns a Promise.
function browserFeatureTestAsPromise() {
  var promise = new Promise(function(resolve, reject) {
    browserFeatureTest(resolve);
  });
  return promise;
}

var siteUploaderKey = '';
var siteTitleKey = '';

function uploadTelemetryData(systemInfo, stepData, userData) {
  if (navigator.doNotTrack) return; // User has specified the Do Not Track header wishing not to be tracked by web sites, so no-op.
  var xhrBody = {
    siteUploaderKey: siteUploaderKey,
    siteTitleKey: siteTitleKey
  };
  if (systemInfo) xhrBody.systemInfo = systemInfo;
  if (stepData) xhrBody.stepData = stepData;
  if (userData) xhrBody.userData = userData;
  // TODO: Actually send to upstream telemetry.
  console.log(JSON.stringify(xhrBody, null, 2));
}

function uploadPageEnterStep(uploaderKey, titleKey, userData) {
  if (navigator.doNotTrack) return; // User has specified the Do Not Track header wishing not to be tracked by web sites, so no-op.
  siteUploaderKey = uploaderKey;
  siteTitleKey = titleKey;
  browserFeatureTestAsPromise().then((systemInfo) => {
    uploadTelemetryData(systemInfo, null, userData);
  });
}

function uploadPageLoadStep(pageStepData, userData) {
  if (navigator.doNotTrack) return; // User has specified the Do Not Track header wishing not to be tracked by web sites, so no-op.
  uploadTelemetryData(null, pageStepData, userData);
}

function uploadPageLeaveStep(pageLeaveData, userData) {
  if (navigator.doNotTrack) return; // User has specified the Do Not Track header wishing not to be tracked by web sites, so no-op.
  pageLeaveData.isPageLeaveStep = true;
  uploadTelemetryData(null, pageLeaveData, userData);
}

return {
  systemInfo: browserFeatureTestAsPromise,
  uploadPageEnterStep: uploadPageEnterStep,
  uploadPageLoadStep: uploadPageLoadStep,
  uploadPageLeaveStep: uploadPageLeaveStep
};

})();
