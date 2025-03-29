/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import { TestInspector } from './utils.mts';
import { Agent, ManagedRealm, setSurroundingAgent } from '#self';

test('compile script (for invalid code break line)', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  const result = await inspector.runtime.compileScript({
    expression: 'function f() {',
    persistScript: false,
    sourceURL: '',
    executionContextId: 0,
  });
  expect(result).toMatchInlineSnapshot(`
    {
      "exceptionDetails": {
        "columnNumber": 0,
        "exception": {
          "className": "SyntaxError",
          "description": "SyntaxError: Unexpected end of input",
          "objectId": "default:2",
          "preview": {
            "description": "
    function f() {
                  ^
    SyntaxError: Unexpected end of source",
            "entries": undefined,
            "overflow": false,
            "properties": [
              {
                "name": "message",
                "type": "string",
                "value": "Unexpected end of source",
              },
              {
                "name": "stack",
                "type": "accessor",
              },
            ],
            "subtype": "error",
            "type": "object",
          },
          "subtype": "error",
          "type": "object",
        },
        "exceptionId": 1,
        "lineNumber": 0,
        "scriptId": undefined,
        "stackTrace": undefined,
        "text": "Uncaught",
        "url": undefined,
      },
    }
  `);
});

test('preview evaluation', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  for (const code of [
    `1`,
    `[]`,
    `{ var a = 1; a }`,
    `{ let a = 1; a }`,
    `[1, 2, 3].map(x => x + 1)`,
    `globalThis.x = 1`,
  ]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await inspector.perview(code);
    if (result.exceptionDetails?.exception.preview.properties[0].value === 'Preview evaluator cannot evaluate side-effecting code') {
      expect('side effect').toMatchSnapshot(code);
    } else {
      expect(result).toMatchSnapshot(code);
    }
  }
});

test('get local lexical names', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  expect(await inspector.runtime.globalLexicalScopeNames({
    executionContextId: 0,
  })).toMatchInlineSnapshot(`
    {
      "names": [
        "Infinity",
        "NaN",
        "undefined",
        "globalThis",
        "eval",
        "isFinite",
        "isNaN",
        "parseFloat",
        "parseInt",
        "decodeURI",
        "decodeURIComponent",
        "encodeURI",
        "encodeURIComponent",
        "AggregateError",
        "Array",
        "ArrayBuffer",
        "Boolean",
        "BigInt",
        "BigInt64Array",
        "BigUint64Array",
        "DataView",
        "Date",
        "Error",
        "EvalError",
        "FinalizationRegistry",
        "Float32Array",
        "Float64Array",
        "Function",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Map",
        "Number",
        "Object",
        "Promise",
        "Proxy",
        "RangeError",
        "ReferenceError",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "SyntaxError",
        "TypeError",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "URIError",
        "WeakMap",
        "WeakRef",
        "WeakSet",
        "JSON",
        "Math",
        "Reflect",
      ],
    }
  `);
});

test('call function on', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  inspector.flush();
  await inspector.eval('const a = { x: 1 }; a');
  expect(inspector.flush()).toMatchInlineSnapshot(`
    [
      {
        "method": "Debugger.scriptParsed",
        "params": {
          "buildId": "",
          "endColumn": 21,
          "endLine": 1,
          "executionContextId": 0,
          "hash": "",
          "isModule": false,
          "scriptId": "0",
          "startColumn": 0,
          "startLine": 0,
          "url": "vm:///0",
        },
      },
      {
        "id": 0,
        "method": "Runtime.evaluate",
        "params": {
          "expression": "const a = { x: 1 }; a",
          "uniqueContextId": "0",
        },
      },
      {
        "id": 0,
        "result": {
          "exceptionDetails": undefined,
          "result": {
            "className": "Object",
            "description": "Object",
            "objectId": "default:1",
            "preview": {
              "description": "Object",
              "entries": undefined,
              "overflow": false,
              "properties": [
                {
                  "name": "x",
                  "type": "number",
                  "value": "1",
                },
              ],
              "subtype": undefined,
              "type": "object",
            },
            "subtype": undefined,
            "type": "object",
          },
        },
      },
    ]
  `);
  expect(await inspector.runtime.callFunctionOn({
    functionDeclaration: 'function (x) { return this.x + x }',
    arguments: [{ value: 1 }],
    executionContextId: 0,
    objectId: 'default:1',
  })).toMatchInlineSnapshot(`
    {
      "description": "2",
      "type": "number",
      "value": 2,
    }
  `);
  expect(await inspector.runtime.callFunctionOn({
    functionDeclaration: 'function (x) { return [this.x, x, 2, 3] }',
    arguments: [{ value: 1 }],
    executionContextId: 0,
    objectId: 'default:1',
    returnByValue: true,
  })).toMatchInlineSnapshot(`
    {
      "type": "object",
      "value": [
        1,
        1,
        2,
        3,
      ],
    }
  `);
});
