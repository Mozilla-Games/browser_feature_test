// This file contains unit tests for detecting information from the user agent string. Deploying this file to CDN is not needed.

// Do a hacky import of featuretest.js to keep it from having to be aware of node.js environment:
var fs = require('fs');
eval(fs.readFileSync('featuretest.js')+'');

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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '51.0.2704.106', 'Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '601.2.7 (KHTML, like Gecko)', 'Version': '9.0.1', 'Safari': '601.2.7' }
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
    productComponents: { 'Mozilla': '5.0', 'Gecko': '20100101', 'Firefox': '47.0' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '51.0.2704.81', 'Mobile Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '51.0.2704.106', 'Safari': '537.36', 'OPR': '38.0.2220.41' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '51.0.2704.103', 'Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'Gecko': '20100101', 'Firefox': '48.0' }
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
    productComponents: { 'Mozilla': '5.0', 'Gecko': '20100101', 'Firefox': '51.0' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '46.0.2486.0', 'Safari': '537.36', 'Edge': '13.10586' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '41.0.2228.0', 'Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '41.0.2227.0', 'Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'Chrome': '36.0.1985.125', 'Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.36 (KHTML, like Gecko)', 'SamsungBrowser': '4.0', 'Chrome': '44.0.2403.133', 'Mobile Safari': '537.36' }
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
    productComponents: { 'Mozilla': '5.0', 'Gecko': '47.0', 'Firefox': '47.0' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '534.46 (KHTML, like Gecko)', 'Version': '5.1', 'Mobile': '9A334', 'Safari': '7534.48.3' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.51.1 (KHTML, like Gecko)', 'Version': '7.0', 'Mobile': '11A501', 'Safari': '9537.53' }
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
    productComponents: { 'Mozilla': '5.0' }
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
    productComponents: { 'Mozilla': '5.0' }
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
    productComponents: { 'Mozilla': '5.0', 'AppleWebKit': '537.51.1 (KHTML, like Gecko)', 'Version': '7.0', 'Mobile': '11B511', 'Safari': '9537.53' }
  },
];

// Run tests
for(var i in tests) {
  var ua = tests[i];
  var detectedUa = deduceUserAgent(ua.userAgent);
  for(var j in ua) {
    if (j == 'productComponents') {
      var expectedProductComponents = ua[j];
      var detectedProductComponents = detectedUa[j];
      for(var k in expectedProductComponents) {
        var exp = expectedProductComponents[k];
        var det = detectedProductComponents[k];
        if (exp[k] != det[k]) {
          console.log(ua.userAgent + ': ');
          console.log(j + ': was "' + exp[l] + '", should have been "' + det[l] + '"');
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
