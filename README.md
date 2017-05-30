# browser_feature_test

JavaScript SDK for performing feature tests for browser API capabilities, especially specific to asm.js/wasm games, and submitting telemetry information about page startup success behavior. This SDK serves two purposes:

 - enables capturing information about current browser's functionality relevant to web games.
 - enables sending telemetry to Mozilla upstream data storage for games bug tracking purposes.

These two functionalities can be enabled separately, i.e. submitting telemetry data is an opt-in process.

### Quick Getting Started

To integrate the library to a web page to locally examine browser's API capabilities, copy the file featuretest.js to your project, and add the following HTML content:

```html
<script src='featuretest.js'></script>
<script>
browserFeatureTest.systemInfo().then((systemInfo) => {
  // Example: how to test for the presence of a certain API
  if (systemInfo.supportedApis.indexOf('IndexedDB') != -1) console.log('IndexedDB is supported!');

  // Example: how to find if WebGL comes without a performance caveat.
  if (systemInfo.webGLSupport.webgl1.supported &amp;&amp; !systemInfo.webGLSupport.webgl1.performanceCaveat) console.log('Hardware-accelerated WebGL is supported!');

  // Example: dump all results as a whitespace-readable JSON string.
  console.log(JSON.stringify(systemInfo, null, 2));
});
</script>
```

The contents of the `systemInfo` object above are explained in detail in the file `example.html` in this repository.

### Submitting Data

Uploading data to Mozilla's games telemetry backend is performed in three steps:

1. Call the function `browserFeatureTest.uploadPageEnterStep(uploaderKey, titleKey, userData);` when the user first navigates to the page.

2. (Optional) Call the function `browserFeatureTest.uploadPageLoadStep(pageStepData, userData);` as the page progresses to load.

3. (Optional) Call the function `browserFeatureTest.uploadPageLeaveStep(pageLeaveData, userData);` when the user leaves the page.

In all of the three functions above, `userData` is a custom JavaScript object that can contain additional debugging related fields. The intent is to allow room for passing custom fields that can aid in debugging bug-specific causes or distinguishing between different scenarios. The contents of `userData` may vary between different calls to the API function, and it is best to keep the contents of this object small.

The `pageStepData` object has the following structure:

```javascript
var pageStepData = {
	stepNumber:	1, /* optional: can be used to specify a 0-based sequence number of loading steps, if there are multiple. This allows establishing a loading "funnel" relationship between steps. */
	stepName: 'string', /* optional: specifies a human-readable name for this step. */
	result: 'string', /* optional: if specified, this should be one of 'success', 'warning', 'error' or 'cancel'. */
	info: 'string', /* optional: if specified, can contain a readable error string, e.g. a call stack or some other error reason that can be used to debug issues. */
};
```

The `pageStepData` object should not contain any other fields. If any custom fields are desired, they can be passed in the separate `userData` object.

The `pageLeaveData` object has the following structure:

```javascript
var pageLeaveData = {
	result: 'string', /* optional: if specified, this should be one of 'success', 'warning', 'error' or 'cancel'. */
	info: 'string', /* optional: if specified, can contain a readable error string, e.g. a call stack or some other error reason that can be used to debug issues. */
};
```

The contents of this field can be used to indicate a final result of the page load, e.g. `'success'` if the user visit session had no detected problems, or `'cancel'` if user aborted page navigation in the middle of the loading sequence by leaving the page before loading was finished.

### Data Submission Example Flow

For a full example of how page load flow could proceed while sending telemetry, see the file `submissionExample.html`.
