import { expect, test } from 'vitest';
import { TestInspector } from './utils.mts';
import {
  Agent, ManagedRealm, runJobQueue, setSurroundingAgent,
} from '#self';
import { createConsole } from '#self/inspector';

test('console', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  let count = 0;
  createConsole(realm, {
    log(args) {
      count += args.length;
    },
  });

  inspector.flush();
  await inspector.eval('console.log("hello", "world")');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = inspector.flush();
  a[1].params.timestamp = 0;
  expect(a).toMatchInlineSnapshot(`
    [
      {
        "method": "Debugger.scriptParsed",
        "params": {
          "buildId": "",
          "endColumn": 29,
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
        "method": "Runtime.consoleAPICalled",
        "params": {
          "args": [
            {
              "type": "string",
              "value": "hello",
            },
            {
              "type": "string",
              "value": "world",
            },
          ],
          "executionContextId": 0,
          "timestamp": 0,
          "type": "log",
        },
      },
      {
        "id": 0,
        "method": "Runtime.evaluate",
        "params": {
          "expression": "console.log("hello", "world")",
          "uniqueContextId": "0",
        },
      },
      {
        "id": 0,
        "result": {
          "exceptionDetails": undefined,
          "result": {
            "type": "undefined",
          },
        },
      },
    ]
  `);
  expect(count).eq(2);

  await inspector.perview('console.log("hello", "world")');
  expect(count).eq(2);
});

test('unhandled promise rejection', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);

  inspector.flush();
  await inspector.eval('var a = Promise.reject(new Error())');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const i: any = inspector.flush();
  i[1].params.timestamp = 0;
  expect(i).toMatchInlineSnapshot(`
    [
      {
        "method": "Debugger.scriptParsed",
        "params": {
          "buildId": "",
          "endColumn": 35,
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
        "method": "Runtime.exceptionThrown",
        "params": {
          "exceptionDetails": {
            "columnNumber": 0,
            "exception": {
              "className": "Promise",
              "description": "Promise",
              "objectId": "default:2",
              "preview": {
                "description": "Promise",
                "entries": undefined,
                "overflow": false,
                "properties": [
                  {
                    "name": "[[PromiseState]]",
                    "type": "string",
                    "value": "rejected",
                  },
                  {
                    "name": "[[PromiseResult]]",
                    "subtype": "error",
                    "type": "object",
                    "value": "Error
        at <anonymous>:1:28",
                  },
                ],
                "subtype": "promise",
                "type": "object",
              },
              "subtype": "promise",
              "type": "object",
            },
            "exceptionId": 1,
            "lineNumber": 0,
            "scriptId": undefined,
            "stackTrace": undefined,
            "text": "Uncaught (in promise)",
            "url": undefined,
          },
          "timestamp": 0,
        },
      },
      {
        "id": 0,
        "method": "Runtime.evaluate",
        "params": {
          "expression": "var a = Promise.reject(new Error())",
          "uniqueContextId": "0",
        },
      },
      {
        "id": 0,
        "result": {
          "exceptionDetails": undefined,
          "result": {
            "type": "undefined",
          },
        },
      },
    ]
  `);

  await inspector.eval('void a.catch(() => {});');
  runJobQueue();
  expect(inspector.flush()).toMatchInlineSnapshot(`
    [
      {
        "method": "Debugger.scriptParsed",
        "params": {
          "buildId": "",
          "endColumn": 23,
          "endLine": 1,
          "executionContextId": 0,
          "hash": "",
          "isModule": false,
          "scriptId": "1",
          "startColumn": 0,
          "startLine": 0,
          "url": "vm:///1",
        },
      },
      {
        "method": "Runtime.exceptionRevoked",
        "params": {
          "exceptionId": 1,
          "reason": "Handler added to rejected promise",
        },
      },
      {
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {
          "expression": "void a.catch(() => {});",
          "uniqueContextId": "0",
        },
      },
      {
        "id": 1,
        "result": {
          "exceptionDetails": undefined,
          "result": {
            "type": "undefined",
          },
        },
      },
    ]
  `);
});
