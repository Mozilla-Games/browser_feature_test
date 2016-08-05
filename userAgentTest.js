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

// Deduces the browser and OS bitness from the user agent string.
function findBitness(userAgent) {
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
  var uaList = splitUserAgent(userAgent);
  var uaPlatformInfo = splitPlatformInfo(uaList);
  var productComponents = parseProductComponents(uaList);
  var ual = userAgent.toLowerCase();

  var ua = {
    userAgent: userAgent,
    platform: undefined,
    bitness: undefined,
    arch: undefined,
    formFactor: undefined,
    os: undefined,
    osVersion: undefined,
    browserVendor: undefined,
    browserProduct: undefined,
    browserVersion: undefined,
    productComponents: productComponents
  };
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

  // Deduce human-readable browser vendor, product and version names
  browsers = [['SamsungBrowser', 'Samsung'], ['Edge', 'Microsoft'], ['OPR', 'Opera'], ['Chrome', 'Google'], ['Safari', 'Apple'], ['Firefox', 'Mozilla']];
  for(var i in browsers) {
    var b = browsers[i][0];
    var j = productComponents.indexOf(b);
    if (j != -1) {
      ua.browserVendor = browsers[i][1];
      ua.browserProduct = browsers[i][0];
      if (ua.browserProduct == 'OPR') ua.browserProduct = 'Opera';
      if (ua.browserProduct == 'Trident') ua.browserProduct = 'Internet Explorer';
      ua.browserVersion = productComponents[j+1];
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
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: '32-on-64',
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Opera',
    browserProduct: 'Opera',
    browserVersion: '38.0.2220.41',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '51.0.2704.106', 'Safari', '537.36', 'OPR', '38.0.2220.41']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: '32-on-64',
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '51.0.2704.103',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '51.0.2704.103', 'Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:48.0) Gecko/20100101 Firefox/48.0',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: '32-on-64',
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Mozilla',
    browserProduct: 'Firefox',
    browserVersion: '48.0',
    productComponents: ['Mozilla', '5.0', 'Gecko', '20100101', 'Firefox', '48.0']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:51.0) Gecko/20100101 Firefox/51.0',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Mozilla',
    browserProduct: 'Firefox',
    browserVersion: '51.0',
    productComponents: ['Mozilla', '5.0', 'Gecko', '20100101', 'Firefox', '51.0']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Microsoft',
    browserProduct: 'Edge',
    browserVersion: '13.10586',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '46.0.2486.0', 'Safari', '537.36', 'Edge', '13.10586']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
    platform: 'PC',
    arch: 'x86',
    formFactor: 'Desktop',
    bitness: 32,
    os: 'Windows',
    osVersion: '7',
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '41.0.2228.0',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '41.0.2228.0', 'Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: 64,
    os: 'Linux',
    osVersion: undefined,
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '41.0.2227.0',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '41.0.2227.0', 'Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (X11; OpenBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
    platform: 'PC',
    arch: 'x86',
    formFactor: 'Desktop',
    bitness: 32,
    os: 'OpenBSD',
    osVersion: undefined,
    browserVendor: 'Google',
    browserProduct: 'Chrome',
    browserVersion: '36.0.1985.125',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'Chrome', '36.0.1985.125', 'Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-G935F Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36',
    platform: 'SAMSUNG SM-G935F Build/MMB29K',
    arch: 'ARM',
    formFactor: 'Mobile',
    bitness: 32,
    os: 'Android',
    osVersion: '6.0.1',
    browserVendor: 'Samsung',
    browserProduct: 'SamsungBrowser',
    browserVersion: '4.0',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.36 (KHTML, like Gecko)', 'SamsungBrowser', '4.0', 'Chrome', '44.0.2403.133', 'Mobile Safari', '537.36']
  },
  {
    userAgent: 'Mozilla/5.0 (Android 6.0.1; Mobile; rv:47.0) Gecko/47.0 Firefox/47.0',
    platform: 'Android',
    arch: 'ARM',
    formFactor: 'Mobile',
    bitness: 32,
    os: 'Android',
    osVersion: '6.0.1',
    browserVendor: 'Mozilla',
    browserProduct: 'Firefox',
    browserVersion: '47.0',
    productComponents: ['Mozilla', '5.0', 'Gecko', '47.0', 'Firefox', '47.0']
  },
  {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
    platform: 'iPhone',
    arch: 'ARM',
    formFactor: 'Mobile',
    bitness: 32,
    os: 'iOS',
    osVersion: '5.0',
    browserVendor: 'Apple',
    browserProduct: 'Safari',
    browserVersion: '7534.48.3',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '534.46 (KHTML, like Gecko)', 'Version', '5.1', 'Mobile', '9A334', 'Safari', '7534.48.3']
  },
  {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A501 Safari/9537.53',
    platform: 'iPad',
    arch: 'ARM',
    formFactor: 'Tablet',
    bitness: 64,
    os: 'iOS',
    osVersion: '7.0.2',
    browserVendor: 'Apple',
    browserProduct: 'Safari',
    browserVersion: '9537.53',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.51.1 (KHTML, like Gecko)', 'Version', '7.0', 'Mobile', '11A501', 'Safari', '9537.53']
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    platform: 'PC',
    arch: 'x86_64',
    formFactor: 'Desktop',
    bitness: '32-on-64',
    os: 'Windows',
    osVersion: '10',
    browserVendor: 'Microsoft',
    browserProduct: 'Internet Explorer',
    browserVersion: '11.0',
    productComponents: ['Mozilla', '5.0']
  },
  {
    userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
    platform: 'PC',
    arch: 'x86',
    formFactor: 'Desktop',
    bitness: '32',
    os: 'Windows',
    osVersion: '7',
    browserVendor: 'Microsoft',
    browserProduct: 'Internet Explorer',
    browserVersion: '10.0',
    productComponents: ['Mozilla', '5.0']
  },
  {
    userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_3 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B511 Safari/9537.53',
    platform: 'iPod touch',
    arch: 'ARM',
    formFactor: 'Mobile',
    bitness: '64',
    os: 'iOS',
    osVersion: '7.0.3',
    browserVendor: 'Apple',
    browserProduct: 'Safari',
    browserVersion: '9537.53',
    productComponents: ['Mozilla', '5.0', 'AppleWebKit', '537.51.1 (KHTML, like Gecko)', 'Version', '7.0', 'Mobile', '11B511', 'Safari', '9537.53']
  },
];

// Run tests
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
