'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pkg=read('package.json'),lock=read('package-lock.json');
assert.equal(lock.lockfileVersion,3);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
assert.equal(lock.packages['node_modules/react-native-webview'].version,'13.16.1');
assert.equal(lock.packages['node_modules/react-native'].version,'0.86.3');
console.log('PASS exact Android CI dependency lock and SDK 57 WebView contract');
