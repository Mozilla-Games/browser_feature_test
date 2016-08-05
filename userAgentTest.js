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
    if (isEnclosedInParens(l) && !contains(l, ';')) {
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
    if (isEnclosedInParens(item) && contains(item, ';')) {
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

// Deduces the browser and OS bitness from the user agent string.
function findBitness(userAgent) {
  userAgent = userAgent.toLowerCase();
  var b32On64 = ['wow64'];
  for(var b in b32On64) if (contains(userAgent, b32On64[b])) return '32-on-64';
  var b64 = ['x86_64', 'amd64', 'ia64', 'ppc64', 'win64', 'x64', 'sparc64'];
  for(var b in b64) if (contains(userAgent, b64[b])) return 64;
  var b32 = ['i386', 'i486', 'i586', 'i686', 'x86'];
  for(var b in b32) if (contains(userAgent, b32[b])) return 32;
  // Heuristic: Assume all OS X are 64-bit, although this is not certain. On OS X, 64-bit browsers
  // don't advertise being 64-bit.
  if (contains(userAgent, 'intel mac os')) return 64; 
  else return 32;
}

// Filters the product components (items of format 'foo/version') from the user agent token list.
function parseProductComponents(uaList) {
  uaList = uaList.filter(function(x) { return contains(x, '/') && !isEnclosedInParens(x); });
  var productComponents = [];
  for(var i in uaList) {
    var x = uaList[i];
    if (contains(x, '/')) {
      x = x.split('/');
      if (x.length != 2) throw uaList[i];
      productComponents.push(x[0].trim());
      productComponents.push(x[1].trim());
    }
  }
  return productComponents;
}

// The full function to decompose a given user agent to the interesting logical info bits.
function deduceUserAgent(userAgent) {
  var uaList = splitUserAgent(userAgent);
  var uaPlatformInfo = splitPlatformInfo(uaList);
  var productComponents = parseProductComponents(uaList);
  var ua = {
    userAgent: userAgent,
    platform: '?',
    arch: '?',
    bitness: findBitness(userAgent),
    formFactor: 'Desktop',
    os: '?',
    osVersion: '?',
    browserVendor: '?',
    browserProduct: '?',
    browserVersion: '?',
    productComponents: productComponents
  };

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
      ua.os = 'Android';
      ua.osVersion = m[1];
    }
  }
  if (!m) {
    ua.os = os;
  }

  // Deduce human-readable browser vendor, product and version names
  browsers = [['Chrome', 'Google'], ['Safari', 'Apple'], ['Firefox', 'Mozilla']];
  for(var i in browsers) {
    var b = browsers[i][0];
    var j = productComponents.indexOf(b);
    if (j != -1) {
      ua.browserVendor = browsers[i][1];
      ua.browserProduct = browsers[i][0];
      ua.browserVersion = productComponents[j+1];
      break;
    }
  }

  // Deduce mobile platform, if present
  for(var i = 0; i < uaPlatformInfo.length; ++i) {
    var item = uaPlatformInfo[i];
    if (contains(item, 'Nexus')) {
      ua.platform = item;
      ua.arch = 'ARM';
      break;
    }
  }

  // Deduce form factor
  var ual = userAgent.toLowerCase();
  if (contains(ual, 'tablet') || contains(ual, 'ipad')) ua.formFactor = 'Tablet';
  else if (contains(ual, 'mobile') || contains(ual, 'iphone') || contains(ual, 'ipod')) ua.formFactor = 'Mobile';

  return ua;
}

// Test cases:
var tests = [
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    platform: 'Mac',
    arch: 'Intel',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Mac OS',
    osVersion: '10.11.1',
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '51.0.2704.106',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '51.0.2704.106', 'Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.7 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.7',
    platform: 'Mac',
    arch: 'Intel',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Mac OS',
    osVersion: '10.11.1',
    browserVendor: 'Apple',
    browserProduct: 'Safari',
    browserVersion: '601.2.7',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '601.2.7 (KHTML, like Gecko)', 'Version', '9.0.1', 'Safari', '601.2.7']
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:47.0) Gecko/20100101 Firefox/47.0',
    platform: 'Mac',
    arch: 'Intel',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Mac OS',
    osVersion: '10.11',
    browserVendor: 'Mozilla',
    browserProduct: 'Firefox',
    browserVersion: '47.0',
    productComponents: ['Mozilla', '5.0', 'Gecko', '20100101', 'Firefox', '47.0']
  },
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MOB30M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537.36',
    platform: 'Nexus 5 Build/MOB30M',
    arch: 'ARM',
    formFactor: 'Mobile',
    bitness: 32,
    os: 'Android',
    osVersion: '6.0.1',
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '51.0.2704.81',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '51.0.2704.81', 'Mobile Safari', '537.36']
  },
];

for(var i in tests) {
  var ua = tests[i];
  var detectedUa = deduceUserAgent(ua.userAgent);
  for(var j in ua) {
    if (j == 'productComponents') {
      for(var k = 0; k < ua[j].length || k < detectedUa[j].length; ++k) {
        if (ua[j][k] != detectedUa[j][k]) {
          console.log(ua.userAgent + ': ');
          console.log(j + ': was "' + detectedUa[j][k] + '", should have been "' + ua[j][k] + '"');
        }
      }
    } else {
      if (ua[j] != detectedUa[j]) {
        console.log(ua.userAgent + ': ');
        console.log(j + ': was "' + detectedUa[j] + '", should have been "' + ua[j] + '"');
      }
    }
  }
}
