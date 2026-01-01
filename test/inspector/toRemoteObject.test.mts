/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-await-in-loop */
import { expect, test } from 'vitest';
import type Protocol from 'devtools-protocol';
import { TestInspector } from './utils.mts';
import { Agent, ManagedRealm, setSurroundingAgent } from '#self';

test('primitive values', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'undefined',
    'null',
    'false',
    'true',
    '42',
    '-42',
    '42n',
    '-42n',
    '0',
    '-0',
    'Infinity',
    '-Infinity',
    'NaN',
    '"engine262"',
    'Symbol()',
    'Symbol("desc")',
    'Symbol.for("symbol")',
    'Symbol.iterator',
  ]) {
    // eslint-disable-next-line no-await-in-loop
    expect(await inspector.eval(value)).toMatchSnapshot(value);
  }
});

test('functions', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    // function declaration
    'function f() { /* comment */ }; f',
    'function* f() { /* comment */ }; f',
    'function *f() { /* comment */ }; f',
    'async function f() { /* comment */ }; f',
    'async function* f() { /* comment */ }; f',
    'async function *f() { /* comment */ }; f',
    // function expression
    '(function f() { /* comment */ })',
    '(function* f() { /* comment */ })',
    '(function *f() { /* comment */ })',
    '(async function f() { /* comment */ })',
    '(async function* f() { /* comment */ })',
    '(async function *f() { /* comment */ })',
    // arrow expression
    '(() => { /* comment */ })',
    '(() => 42)',
    '(async () => { /* comment */ })',
    '(async () => 42)',
    // computed function name
    'var a = 1; ({ [a]() {} })[a]',
    '({ *[Symbol.iterator]() {} })[Symbol.iterator]',
    // getter & setter
    'var o = { get f() { /* comment */ } }; Reflect.getOwnPropertyDescriptor(o, "f").get',
    'var o = { set f(v) { /* comment */ } }; Reflect.getOwnPropertyDescriptor(o, "f").set',
    // getter & setter with computed name
    'var o = { get [Symbol.iterator]() { /* comment */ } }; Reflect.getOwnPropertyDescriptor(o, Symbol.iterator).get',
    'var o = { set [Symbol.iterator](v) { /* comment */ } }; Reflect.getOwnPropertyDescriptor(o, Symbol.iterator).set',
    // built-in function
    'Array.prototype.map',
    // built-in getter
    'Reflect.getOwnPropertyDescriptor(Function.prototype, "caller").get',
    // method
    'class C { static method() {} }; C.method',
    'class C { constructor() {}; #f }; C.prototype.constructor',
  ]) {
    // eslint-disable-next-line no-await-in-loop
    expect(await inspector.eval(value), value).toMatchSnapshot(value);
  }
});

async function snapshotObject(inspector: TestInspector, value: string) {
  const result = await inspector.eval(value);
  expect(result).toMatchSnapshot(value);
  const properties = await inspector.runtime.getProperties({ objectId: (result as any).objectId!, ownProperties: true, generatePreview: true }) as Protocol.Protocol.Runtime.GetPropertiesResponse;
  properties.internalProperties = properties.internalProperties?.filter((prop) => prop.name !== '[[Prototype]]');
  expect(properties).toMatchSnapshot(`${value} properties`);
}

test('array', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    '[]',
    '[1]',
    'Array(10)',
    '[,,,]',
    'var a = [1,,2]; a.x = 1; a',
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('regex', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    '/cat/',
    '/cat/g',
    '/cat/i',
    'var a = /cat/; a.lastIndex = 1; a',
  ]) {
    expect(await inspector.eval(value)).toMatchSnapshot(value);
  }
});

test('date', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Date(0)',
    'new Date(NaN)',
    'new Date(-1)',
    'new Date(9999999999999)',
  ]) {
    expect(await inspector.eval(value)).toMatchSnapshot(value);
  }
});

test('map and set', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Map',
    'new Map([["a", 1], ["b", 2]])',
    'var x = new Map([["a", 1], ["b", 2]]); x.x = 1; x',
    'new Set',
    'new Set(["a", 1, "b", 2])',
    'var x = new Set(["a", 1, "b", 2]); x.x = 1; x',
    'new WeakMap',
    'new WeakMap([[{}, 1], [{}, 2]])',
    'var x = new WeakMap([[{}, 1], [{}, 2]]); x.x = 1; x',
    'new WeakSet',
    'new WeakSet([{}, {}])',
    'var x = new WeakSet([{}, {}]); x.x = 1; x',
  ]) {
    await snapshotObject(inspector, value);
  }
});

// TODO: generator

test('error', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Error()',
    'new Error("message")',
    'new Error("message", { cause: new Error("cause") })',
    'new RangeError()',
    'new (class MyError extends Error {})()',
    // TODO: className should not be syntaxError
    'new (class MyError extends Error { constructor() { super(); this.message = "hello" } })()',
  ]) {
    expect(await inspector.eval(value)).toMatchSnapshot(value);
  }
});

test('proxy', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Proxy({}, {})',
    'new Proxy({}, { get: () => {} })',
    'new Proxy({ a: 1 }, {})',
    'new Proxy(Function, {})',
    'new Proxy(() => {}, {})',
    'var a = Proxy.revocable({}, {}); a.revoke(); a.proxy',
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('promise', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Promise(() => {})',
    'var a = new Promise(() => {}); a.x = 1; a',
    'Promise.resolve()',
    'Promise.resolve(42)',
    'Promise.reject()',
    'Promise.reject(42)',
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('typed array', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new Uint8Array()',
    'new Uint8Array(10)',
    'new Uint8Array([1, 2, 3])',
    'var x = new Uint8Array(10); x.a = 1; x',
    'new Int32Array()',
    'new Int32Array(10)',
    'new Int32Array([1, 2, 3])',
    // TODO: test with detached arraybuffer
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('array buffer', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new ArrayBuffer(0)',
    'new ArrayBuffer(10)',
    'var x = new ArrayBuffer(10); x.a = 1; x',
    // TODO: test with detached arraybuffer
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('data view', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    'new DataView(new ArrayBuffer(0))',
    'new DataView(new ArrayBuffer(10))',
    'var x = new DataView(new ArrayBuffer(10), 0); x.a = 1; x',
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('module namespace', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);
  await inspector.debugger.engine262_setEvaluateMode({ mode: 'module' });

  for (const value of [
    // Note: our inspector will return the module namespace object after evaluation
    '',
    'export const a = 1',
    'export const b = 2; export { b as c }',
    'export default 42',
    'export default function() {}',
  ]) {
    await snapshotObject(inspector, value);
  }
});

test('shadow realm', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  await snapshotObject(inspector, 'new ShadowRealm');
  expect(await inspector.eval('new ShadowRealm().evaluate("(() => {})")')).toMatchSnapshot('ShadowRealm function');
});

test('normal object', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const value of [
    '({})',
    '({ a: 1 })',
    '({ a: 1, b: 2 })',
    '({ __proto__: null })',
    '({ __proto__: { a: 1 } })',
    '({ [Symbol.iterator]: () => {} })',
    '({ f() {} })',
    '({ get f() {}, set f(v) {} })',
    '{ class T { #priv = 1 }; new T }',
    '{ class T { #priv = 1; normal = 2 }; new T }',
    '({ a: 1n, b: undefined, c: null, d: true, e: Symbol.iterator, f: [] })',
  ]) {
    await snapshotObject(inspector, value);
  }
});
