/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import { TestInspector } from './utils.mts';
import { Agent, ManagedRealm, setSurroundingAgent } from '#self';

test('evaluate on frame', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  const paused = inspector.eval(`
    'use strict';
    function f() {
      const a = 1;
      debugger;
    }
    function y() {
      const a = 0;
      f();
    }
    y();
  `);
  expect(inspector.flush()).toMatchInlineSnapshot(`
    [
      {
        "method": "Runtime.executionContextCreated",
        "params": {
          "context": {
            "id": 0,
            "name": "engine262",
            "origin": "vm://realm",
            "uniqueId": "0",
          },
        },
      },
      {
        "method": "Debugger.scriptParsed",
        "params": {
          "buildId": "",
          "endColumn": 2,
          "endLine": 12,
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
        "method": "Debugger.paused",
        "params": {
          "callFrames": [
            {
              "callFrameId": "3",
              "canBeRestarted": false,
              "functionLocation": {
                "columnNumber": 17,
                "lineNumber": 2,
                "scriptId": "0",
              },
              "functionName": "f",
              "location": {
                "columnNumber": 6,
                "lineNumber": 4,
                "scriptId": "0",
              },
              "scopeChain": [
                {
                  "object": {
                    "className": "Object",
                    "description": "Object",
                    "objectId": "default:1",
                    "preview": {
                      "description": "Object",
                      "entries": undefined,
                      "overflow": false,
                      "properties": [
                        {
                          "name": "a",
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
                  "type": "local",
                },
                {
                  "object": {
                    "className": "Object",
                    "description": "Object",
                    "objectId": "default:2",
                    "preview": {
                      "description": "Object",
                      "entries": undefined,
                      "overflow": true,
                      "properties": [
                        {
                          "name": "Infinity",
                          "type": "number",
                          "value": "Infinity",
                        },
                        {
                          "name": "NaN",
                          "type": "number",
                          "value": "NaN",
                        },
                        {
                          "name": "undefined",
                          "type": "undefined",
                          "value": "undefined",
                        },
                        {
                          "name": "globalThis",
                          "subtype": undefined,
                          "type": "object",
                          "value": "Object",
                        },
                        {
                          "name": "eval",
                          "type": "function",
                          "value": "",
                        },
                        {
                          "name": "isFinite",
                          "type": "function",
                          "value": "",
                        },
                      ],
                      "subtype": undefined,
                      "type": "object",
                    },
                    "subtype": undefined,
                    "type": "object",
                  },
                  "type": "global",
                },
              ],
              "this": {
                "type": "undefined",
              },
              "url": "",
            },
            {
              "callFrameId": "2",
              "canBeRestarted": false,
              "functionLocation": {
                "columnNumber": 17,
                "lineNumber": 6,
                "scriptId": "0",
              },
              "functionName": "y",
              "location": {
                "columnNumber": 6,
                "lineNumber": 8,
                "scriptId": "0",
              },
              "scopeChain": [
                {
                  "object": {
                    "className": "Object",
                    "description": "Object",
                    "objectId": "default:3",
                    "preview": {
                      "description": "Object",
                      "entries": undefined,
                      "overflow": false,
                      "properties": [
                        {
                          "name": "a",
                          "type": "number",
                          "value": "0",
                        },
                      ],
                      "subtype": undefined,
                      "type": "object",
                    },
                    "subtype": undefined,
                    "type": "object",
                  },
                  "type": "local",
                },
                {
                  "object": {
                    "className": "Object",
                    "description": "Object",
                    "objectId": "default:2",
                    "preview": {
                      "description": "Object",
                      "entries": undefined,
                      "overflow": true,
                      "properties": [
                        {
                          "name": "Infinity",
                          "type": "number",
                          "value": "Infinity",
                        },
                        {
                          "name": "NaN",
                          "type": "number",
                          "value": "NaN",
                        },
                        {
                          "name": "undefined",
                          "type": "undefined",
                          "value": "undefined",
                        },
                        {
                          "name": "globalThis",
                          "subtype": undefined,
                          "type": "object",
                          "value": "Object",
                        },
                        {
                          "name": "eval",
                          "type": "function",
                          "value": "",
                        },
                        {
                          "name": "isFinite",
                          "type": "function",
                          "value": "",
                        },
                      ],
                      "subtype": undefined,
                      "type": "object",
                    },
                    "subtype": undefined,
                    "type": "object",
                  },
                  "type": "global",
                },
              ],
              "this": {
                "type": "undefined",
              },
              "url": "",
            },
            {
              "callFrameId": "1",
              "canBeRestarted": false,
              "functionLocation": undefined,
              "functionName": "<anonymous>",
              "location": {
                "columnNumber": 4,
                "lineNumber": 10,
                "scriptId": "0",
              },
              "scopeChain": [
                {
                  "object": {
                    "className": "Object",
                    "description": "Object",
                    "objectId": "default:2",
                    "preview": {
                      "description": "Object",
                      "entries": undefined,
                      "overflow": true,
                      "properties": [
                        {
                          "name": "Infinity",
                          "type": "number",
                          "value": "Infinity",
                        },
                        {
                          "name": "NaN",
                          "type": "number",
                          "value": "NaN",
                        },
                        {
                          "name": "undefined",
                          "type": "undefined",
                          "value": "undefined",
                        },
                        {
                          "name": "globalThis",
                          "subtype": undefined,
                          "type": "object",
                          "value": "Object",
                        },
                        {
                          "name": "eval",
                          "type": "function",
                          "value": "",
                        },
                        {
                          "name": "isFinite",
                          "type": "function",
                          "value": "",
                        },
                      ],
                      "subtype": undefined,
                      "type": "object",
                    },
                    "subtype": undefined,
                    "type": "object",
                  },
                  "type": "global",
                },
              ],
              "this": {
                "className": "Object",
                "description": "Object",
                "objectId": "default:2",
                "preview": {
                  "description": "Object",
                  "entries": undefined,
                  "overflow": true,
                  "properties": [
                    {
                      "name": "Infinity",
                      "type": "number",
                      "value": "Infinity",
                    },
                    {
                      "name": "NaN",
                      "type": "number",
                      "value": "NaN",
                    },
                    {
                      "name": "undefined",
                      "type": "undefined",
                      "value": "undefined",
                    },
                    {
                      "name": "globalThis",
                      "subtype": undefined,
                      "type": "object",
                      "value": "Object",
                    },
                    {
                      "name": "eval",
                      "type": "function",
                      "value": "",
                    },
                    {
                      "name": "isFinite",
                      "type": "function",
                      "value": "",
                    },
                  ],
                  "subtype": undefined,
                  "type": "object",
                },
                "subtype": undefined,
                "type": "object",
              },
              "url": "",
            },
          ],
          "reason": "debugCommand",
        },
      },
      {
        "id": 0,
        "method": "Runtime.evaluate",
        "params": {
          "expression": "
        'use strict';
        function f() {
          const a = 1;
          debugger;
        }
        function y() {
          const a = 0;
          f();
        }
        y();
      ",
          "uniqueContextId": "0",
        },
      },
    ]
  `);
  expect(await inspector.debugger.evaluateOnCallFrame({
    callFrameId: "3",
    expression: 'a',
  })).toMatchInlineSnapshot(`
    {
      "description": "1",
      "type": "number",
      "value": 1,
    }
  `);
  expect(await inspector.debugger.evaluateOnCallFrame({
    callFrameId: "2",
    expression: 'a',
  })).toMatchInlineSnapshot(`
    {
      "description": "0",
      "type": "number",
      "value": 0,
    }
  `);
  expect(await inspector.debugger.evaluateOnCallFrame({
    callFrameId: "1",
    expression: 'a',
  })).toMatchInlineSnapshot(`
    {
      "exceptionDetails": {
        "columnNumber": 0,
        "exception": {
          "className": "SyntaxError",
          "description": "ReferenceError: 'a' is not defined
        at <anonymous>:1:1
        at <anonymous>:11:5",
          "objectId": "default:5",
          "preview": {
            "description": "ReferenceError: 'a' is not defined
        at <anonymous>:1:1
        at <anonymous>:11:5",
            "entries": undefined,
            "overflow": false,
            "properties": [
              {
                "name": "message",
                "type": "string",
                "value": "'a' is not defined",
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
        "exceptionId": 4,
        "lineNumber": 0,
        "scriptId": undefined,
        "stackTrace": undefined,
        "text": "Uncaught",
        "url": undefined,
      },
      "result": {
        "className": "SyntaxError",
        "description": "ReferenceError: 'a' is not defined
        at <anonymous>:1:1
        at <anonymous>:11:5",
        "objectId": "default:5",
        "preview": {
          "description": "ReferenceError: 'a' is not defined
        at <anonymous>:1:1
        at <anonymous>:11:5",
          "entries": undefined,
          "overflow": false,
          "properties": [
            {
              "name": "message",
              "type": "string",
              "value": "'a' is not defined",
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
    }
  `);
  await inspector.debugger.resume();
  await paused;
});
