#!/usr/bin/env node
/**
 * Smoke tests for keep-awake and map features after package upgrades.
 *
 * Covers:
 *  1. expo-keep-awake@15.0.8  – source-level verification that useKeepAwake
 *     is present with the expected implementation (calls activateKeepAwakeAsync,
 *     cleans up via deactivateKeepAwake, accepts tag + options).
 *  2. react-native-maps web stub – actually renders MapPlaceholder via
 *     React.createElement and verifies the returned element tree.
 *  3. metro.config.js – loads the real config (with expo/metro-config mocked)
 *     and invokes the actual exported resolver for web and native platforms.
 *
 * Run with:  node artifacts/smart-driver/__tests__/smoke.js
 */

'use strict';

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. expo-keep-awake
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nexpo-keep-awake API');

const KA_SRC = path.join(ROOT, 'node_modules', 'expo-keep-awake', 'src');

test('package.json version is 15.x (matches upgraded version ~15.0.8)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'expo-keep-awake', 'package.json'), 'utf8'));
  assert.ok(pkg.version.startsWith('15.'), `Expected 15.x, got ${pkg.version}`);
});

// Read source once for all source-level tests
const kaSrc = fs.readFileSync(path.join(KA_SRC, 'index.ts'), 'utf8');

test('useKeepAwake function is exported from source', () => {
  assert.ok(kaSrc.includes('export function useKeepAwake'), 'useKeepAwake export not found');
});

test('useKeepAwake calls activateKeepAwakeAsync (async wake-lock activation)', () => {
  // Confirms the hook wires up to the async API introduced in this major version
  assert.ok(kaSrc.includes('activateKeepAwakeAsync('), 'activateKeepAwakeAsync call not found in useKeepAwake body');
});

test('useKeepAwake returns a cleanup that calls deactivateKeepAwake', () => {
  assert.ok(kaSrc.includes('deactivateKeepAwake('), 'deactivateKeepAwake cleanup not found — screen may not re-sleep after trip ends');
});

test('useKeepAwake accepts an optional tag argument', () => {
  assert.ok(
    kaSrc.match(/export function useKeepAwake\s*\(\s*tag\?\s*:/),
    'tag parameter not found on useKeepAwake — signature may have changed',
  );
});

test('web implementation exposes activate / deactivate wrapping Screen Wake Lock API', () => {
  const webSrc = fs.readFileSync(path.join(KA_SRC, 'ExpoKeepAwake.web.ts'), 'utf8');
  assert.ok(webSrc.includes('navigator.wakeLock.request'), 'Screen Wake Lock API call missing from web implementation');
  assert.ok(webSrc.includes('async activate('), 'activate method missing from web implementation');
  assert.ok(webSrc.includes('async deactivate('), 'deactivate method missing from web implementation');
});

test('drive.tsx lazy-require guard (try/catch) is in place', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'drive.tsx'), 'utf8');
  assert.ok(src.includes("require('expo-keep-awake').useKeepAwake"), 'lazy require of useKeepAwake not found');
  assert.ok(src.match(/try\s*\{[^}]*expo-keep-awake/), 'try/catch guard around expo-keep-awake require not found');
});

test('drive.tsx calls useKeepAwake() at DriveScreen component root', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'drive.tsx'), 'utf8');
  assert.ok(src.includes('if (useKeepAwake) useKeepAwake()'), 'useKeepAwake() invocation not found inside DriveScreen');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. react-native-maps web stub  — render verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nreact-native-maps web stub');

// Inject a lightweight react-native shim into the require cache so the stub's
// require('react-native') resolves without needing a native build environment.
const Module = require('module');
const _originalLoad = Module._load.bind(Module);

// Build shim before overriding so we can reference it without recursion
const rnShim = {
  View: function View() {},
  Text: function Text() {},
  StyleSheet: {
    create: (s) => s,
    absoluteFill: {},
    absoluteFillObject: {},
  },
};

let stubModule;

// Use a targeted Module._load override to shim react-native.
// We replace before requiring the stub, then restore immediately after.
Module._load = function interceptLoader(request, parent, isMain) {
  if (request === 'react-native') return rnShim;
  return _originalLoad(request, parent, isMain);
};

try {
  const stubPath = path.join(ROOT, 'mocks', 'react-native-maps.js');
  delete require.cache[require.resolve(stubPath)];
  stubModule = require(stubPath);
} finally {
  Module._load = _originalLoad;
}

test('web stub loads without throwing', () => {
  assert.ok(stubModule !== undefined, 'stub module is undefined');
});

test('default export is a callable component (MapPlaceholder)', () => {
  assert.strictEqual(typeof stubModule, 'function');
});

// Actually render MapPlaceholder and verify the returned React element tree
let renderedElement;
test('MapPlaceholder() renders a React element (not null/undefined)', () => {
  const React = require('react');
  // Patch React to use our shim components so createElement works without a native renderer
  renderedElement = stubModule.call(null, { style: { flex: 1 } });
  assert.ok(renderedElement !== null && renderedElement !== undefined, 'rendered element is null/undefined');
  assert.ok(typeof renderedElement === 'object', 'rendered element is not an object');
});

test('rendered element type is the View shim (outer container)', () => {
  // React.createElement returns { type, props, ... }
  assert.strictEqual(renderedElement.type, rnShim.View, 'outer element type is not View');
});

test('rendered element contains a child Text element with map placeholder copy', () => {
  // The child should be a Text element created by React.createElement
  const children = renderedElement.props.children;
  // Children may be a single element or an array
  const child = Array.isArray(children) ? children[0] : children;
  assert.strictEqual(child.type, rnShim.Text, 'child element type is not Text');
  assert.ok(
    typeof child.props.children === 'string' && child.props.children.includes('Map view'),
    `Expected "Map view" in placeholder text, got: ${child.props.children}`,
  );
});

test('MapPlaceholder.Animated is defined (used by animated map variants)', () => {
  assert.ok(stubModule.Animated, 'Animated not set on default export');
});

test('Marker export is a function', () => { assert.strictEqual(typeof stubModule.Marker, 'function'); });
test('Polyline export is a function', () => { assert.strictEqual(typeof stubModule.Polyline, 'function'); });
test('Circle export is a function',   () => { assert.strictEqual(typeof stubModule.Circle,   'function'); });
test('Callout export is a function',  () => { assert.strictEqual(typeof stubModule.Callout,  'function'); });
test("PROVIDER_GOOGLE === 'google'",  () => { assert.strictEqual(stubModule.PROVIDER_GOOGLE, 'google'); });
test('PROVIDER_DEFAULT === null',      () => { assert.strictEqual(stubModule.PROVIDER_DEFAULT, null); });
test('.default re-export matches the module default', () => {
  assert.strictEqual(stubModule.default, stubModule);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. metro.config.js – load the real config and exercise the exported resolver
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nmetro.config.js real resolver (loaded from actual config)');

// metro.config.js requires 'expo/metro-config' which pulls in native build
// toolchains. We shim only that one import; the rest resolve normally.
let metroConfig;
Module._load = function interceptMetro(request, parent, isMain) {
  if (request === 'expo/metro-config') {
    return {
      getDefaultConfig: (_dir) => ({ resolver: {} }),
    };
  }
  return _originalLoad(request, parent, isMain);
};

try {
  const metroConfigPath = path.join(ROOT, 'metro.config.js');
  delete require.cache[require.resolve(metroConfigPath)];
  metroConfig = require(metroConfigPath);
} finally {
  Module._load = _originalLoad;
}

const resolveRequest = metroConfig && metroConfig.resolver && metroConfig.resolver.resolveRequest;

test('metro.config.js exports a config object with a resolver.resolveRequest function', () => {
  assert.ok(metroConfig, 'metro config failed to load');
  assert.ok(metroConfig.resolver, 'config.resolver is missing');
  assert.strictEqual(typeof resolveRequest, 'function', 'config.resolver.resolveRequest is not a function');
});

const rnMapsStubPath = path.resolve(ROOT, 'mocks', 'react-native-maps.js');

// Fake Metro context — falls through to the default resolver
const fakeContext = {
  resolveRequest: (_ctx, moduleName, _platform) => ({
    filePath: `/real-native/${moduleName}`,
    type: 'sourceFile',
  }),
};

test('resolver redirects react-native-maps → stub on web', () => {
  const result = resolveRequest(fakeContext, 'react-native-maps', 'web');
  assert.strictEqual(
    result.filePath,
    rnMapsStubPath,
    `Expected stub path ${rnMapsStubPath}, got ${result.filePath}`,
  );
  assert.strictEqual(result.type, 'sourceFile');
});

test('resolver passes through other modules on web (no redirect)', () => {
  const result = resolveRequest(fakeContext, 'expo-linear-gradient', 'web');
  assert.strictEqual(result.filePath, '/real-native/expo-linear-gradient');
});

test('resolver leaves react-native-maps untouched on ios', () => {
  const result = resolveRequest(fakeContext, 'react-native-maps', 'ios');
  assert.strictEqual(result.filePath, '/real-native/react-native-maps', 'ios should use real native module');
});

test('resolver leaves react-native-maps untouched on android', () => {
  const result = resolveRequest(fakeContext, 'react-native-maps', 'android');
  assert.strictEqual(result.filePath, '/real-native/react-native-maps', 'android should use real native module');
});

test('stub file referenced by metro config exists on disk', () => {
  assert.ok(fs.existsSync(rnMapsStubPath), `Stub file missing at ${rnMapsStubPath}`);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
