// featuretest.js: Small test code to perform feature testing of browser capabilities.
// Call the function browserFeatureTest(successCallback) to run the test (see below).

function allocateLargestPossibleContiguousBlock() {
  var test = [4*1024, 3*1024, 2*1024, 2*1024 - 16, 1024 + 768, 1024 + 512, 1024 + 256, 1024, 768, 512, 256, 240, 224, 208, 192, 176, 160, 144, 128, 112, 96, 80, 64, 48, 32, 16, 8, 4, 2, 1];
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
      return a;
    } catch(e) {
      // pass
    }
  }
  return null;
}

function estimateMaxSystemMemory() {
  var contiguousBlock = allocateLargestPossibleContiguousBlock();
  if (!contiguousBlock) {
    return {
      contiguous: 0,
      noncontiguous: 0
    };
  }
  var contiguousSizeMBytes = contiguousBlock.byteLength/(1024*1024);
  var noncontiguousBlocks = [];
  var blockSizeMBytes = 32;
  var blocks = [];
  // Try up to 3GB:
  var numTriedAllocations = (3*1024 - contiguousSizeMBytes + blockSizeMBytes - 1) / blockSizeMBytes;
  for(var j = 0; j < numTriedAllocations; ++j) {
    try {
      var bytes = blockSizeMBytes * 1024 * 1024;
      var a = new ArrayBuffer(bytes);
      if (a.byteLength != bytes) break; // browser bugs..

      // Touch memory
      var v = new Float64Array(a);
      for(var i = 0; i < v.length/1024/1024; ++i) {
        v[i*1024*1024] = i;
      }
      blocks.push(a);
    } catch(e) {
      break;
    }
  }

  return {
    contiguous: contiguousBlock.byteLength,
    noncontiguous: contiguousBlock.byteLength + (blockSizeMBytes*1024*1024) * blocks.length
  };
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
  storeSupport('Gamepad API', navigator.getGamepads || navigator.webkitGetGamepads);
  var hasIndexedDB = false;
  try { hasIndexedDB = typeof indexedDB !== 'undefined'; }
  catch (e) { hasIndexedDB = false; }
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
      do { a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; i = i + 1 | 0; } while((i | 0) != 1048576);
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
  for(var i = 0; i < 100; ++i) {
    seconds.push(benchmark.cpuBenchmark()/1000);
    var tEnd = performance.now();
    if (tEnd - tStart > 1000) break; // Test cutoff: if the test takes more than one second, bail out from the execution here to keep the test lightweight. (loses some statistical significance)
  }
  // Take best result as an indicator of CPU performance
  var secondsAvg = seconds.sort()[0];
  // Alternative: remove some outliers & compute the average of the remaining.
//    seconds = seconds.sort().slice(30, 75); var secondsAvg = 0; for(var i in seconds) secondsAvg += seconds[i]; secondsAvg /= seconds.length;
  // Compute MIPS performance count
  var instructions = 1048576/*# of loop iterations*/ * 10/*# of adds in iteration*/;
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

  var availableMemory = estimateMaxSystemMemory();

  var results = {
    featureTestVersion: '1', // The version number for featuretest.js itself.
    runDate: new Date().yyyymmddhhmmss(),
    userAgent: navigator.userAgent,
    buildID: navigator.buildID,
    appVersion: navigator.appVersion,
    mozE10sEnabled: navigator.mozE10sEnabled,
    oscpu: navigator.oscpu,
    platform: navigator.platform,
    contiguousSystemMemory: availableMemory.contiguous,
    noncontiguousSystemMemory: availableMemory.noncontiguous,
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

  if (bestGLContext) {
    results.GL_VENDOR = bestGLContext.getParameter(bestGLContext.VENDOR);
    results.GL_RENDERER = bestGLContext.getParameter(bestGLContext.RENDERER);
    results.GL_VERSION = bestGLContext.getParameter(bestGLContext.VERSION);
    results.GL_SHADING_LANGUAGE_VERSION = bestGLContext.getParameter(bestGLContext.SHADING_LANGUAGE_VERSION);

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
  if (results.buildID) s += 'buildID: ' + results.buildID + '\n';
  if (results.appVersion) s += 'appVersion: ' + results.appVersion + '\n';
  if (results.mozE10sEnabled) s += 'mozE10sEnabled: true\n';
  if (results.oscpu) s += 'OS: ' + results.oscpu + '\n';
  if (results.platform) s += 'Platform: ' + results.platform + '\n';
  var contiguousSystemMemory = Math.round(results.contiguousSystemMemory/1024/1024) + 'MB';
  s += 'Estimated maximum contiguously allocatable system memory for asm.js heap: ' + contiguousSystemMemory + '\n';
  var noncontiguousSystemMemory = Math.round(results.noncontiguousSystemMemory/1024/1024) + 'MB';
  if (results.noncontiguousSystemMemory == 3271557120) {
    s += 'Estimated total (noncontiguously) allocatable system memory: ' + noncontiguousSystemMemory + '+\n';
  } else {
    s += 'Estimated total (noncontiguously) allocatable system memory: ' + noncontiguousSystemMemory + '\n';
  }
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
