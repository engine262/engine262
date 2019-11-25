'use strict';

const http = require('http');
const WebSocket = require('ws'); // eslint-disable-line import/no-extraneous-dependencies
const packagejson = require('../package.json');
const protocol = require('./js_protocol.json');
const engine262 = require('..');

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();
    return;
  }

  const json = (obj) => {
    const s = JSON.stringify(obj);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(s),
    });
    res.end(s);
  };

  switch (req.url) {
    case '/json':
    case '/json/list':
      json([{
        description: `${packagejson.name} instance`,
        devtoolsFrontendUrl: 'chrome-devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=localhost:9229/',
        devtoolsFrontendUrlCompat: 'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=localhost:9229/',
        faviconUrl: 'https://avatars0.githubusercontent.com/u/51185628',
        id: 'inspector.0',
        title: 'engine262',
        type: 'node',
        url: `file://${process.cwd()}`,
        webSocketDebuggerUrl: 'ws://localhost:9229/',
      }]);
      break;
    case '/json/version':
      json({
        'Browser': `${packagejson.name}/v${packagejson.version}`,
        'Protocol-Version': `${protocol.version.major}.${protocol.version.minor}`,
      });
      break;
    case '/json/protocol':
      json(protocol);
      break;
    default:
      res.writeHead(404);
      res.end();
      break;
  }
});

const wss = new WebSocket.Server({ server });

const contexts = [];
const getContext = (id) => (contexts[id] || contexts[0]);

const methods = {
  Debugger: {
    enable() {
      return { debuggerId: 'debugger.0' };
    },
    setAsyncCallStackDepth() {},
    setBlackboxPatterns() {},
    setPauseOnExceptions() {},
  },
  Profiler: {
    enable() {},
  },
  Runtime: {
    enable() {},
    compileScript() {
      return { scriptId: 'script.0' };
    },
    callFunctionOn({
      functionDeclaration,
      objectId,
      // arguments: args,
      executionContextId,
      returnByValue,
      generatePreview,
      objectGroup,
    }) {
      const context = getContext(executionContextId);
      const { Value: F } = context.realm.evaluateScript(`(${functionDeclaration})`);
      const thisValue = objectId ? context.getObject(objectId) : engine262.Value.undefined;
      const r = engine262.Abstract.Call(F, thisValue, []);
      return context.createEvaluationResult(r, { returnByValue, generatePreview, objectGroup });
    },
    evaluate({
      expression,
      // silent,
      contextId,
      returnByValue,
      generatePreview,
      // awaitPromise,
      throwOnSideEffect,
      objectGroup,
    }) {
      if (throwOnSideEffect) {
        return {
          exceptionDetails: {
            text: 'unsupported',
            lineNumber: 0,
            columnNumber: 0,
          },
        };
      }

      const context = getContext(contextId);

      const r = context.realm.evaluateScript(expression);
      return context.createEvaluationResult(r, { returnByValue, generatePreview, objectGroup });
    },
    getHeapUsage() {
      return { usedSize: 0, totalSize: 0 };
    },
    getIsolateId() {
      return { id: 'isolate.0' };
    },
    getProperties({ // eslint-disable-line no-empty-pattern
      // objectId,
      // ownProperties,
      // accessorPropertiesOnly,
      // generatePreview,
    }) {
      // const context = getContext();
      // const object = context.getObject(objectId);

      const properties = [];

      /*
      const keys = object.OwnPropertyKeys();
      if (keys instanceof engine262.AbruptCompletion) {
        return context.createEvaluationResult(keys);
      }
      for (const key of keys) {
        const desc = object.GetOwnProperty(key);
        if (desc instanceof engine262.AbruptCompletion) {
          return context.createEvaluationResult(keys);
        }
        const descriptor = {
          name: '',
          value: '',
          writable: '',
          get: '',
          set: '',
          configurable: '',
          enumerable: '',
          wasThrown: false,
          isOwn: true,
          symbol: '',
        };
        properties.push(descriptor);
      }
      */

      return { result: properties };
    },
    globalLexicalScopeNames({ executionContextId }) {
      const context = getContext(executionContextId);
      const envRec = context.realm.realm.GlobalEnv.EnvironmentRecord;
      const names = Map.prototype.keys.call(envRec.DeclarativeRecord.bindings);
      return {
        names: [...names],
      };
    },
    releaseObjectGroup({ objectGroup }) {
      getContext().releaseObjectGroup(objectGroup);
    },
    runIfWaitingForDebugger(params, ctx) {
      ctx.sendEvent('Runtime.executionContextCreated', {
        context: {
          id: '0',
          origin: 'file://',
          name: 'context.0',
          auxData: {},
        },
      });
    },
  },
  HeapProfiler: {
    enable() {},
    collectGarbage() {},
  },
};

wss.on('connection', (ws) => {
  const send = (obj) => {
    const s = JSON.stringify(obj);
    // console.log('<-', s);
    ws.send(s);
  };

  const context = {
    sendEvent(event, params) {
      send({ method: event, params });
    },
  };

  ws.on('message', (data) => {
    // console.log('->', data);
    const { id, method, params } = JSON.parse(data);
    const [k, v] = method.split('.');
    Promise.resolve(methods[k][v](params, context))
      .then((result = {}) => {
        send({ id, result });
      });
  });
});

server.listen(9229, '127.0.0.1', () => {
  console.log('Debugger listening at localhost:9229'); // eslint-disable-line no-console
});
server.unref();

class InspectorContext {
  constructor(realm) {
    this.objectGroups = new Map();
    this.realm = realm;
  }

  internObject(value, group = 'default') {
    if (!this.objectGroups.has(group)) {
      this.objectGroups.set(group, []);
    }
    return this.objectGroups.get(group).push(value) - 1;
  }

  releaseObjectGroup(group) {
    this.objectGroups.delete(group);
  }

  getObject(objectId) {
    for (const group of this.objectGroups.values()) {
      if (group.has(objectId)) {
        return group.get(objectId);
      }
    }
    throw new RangeError();
  }

  createEvaluationResult(completion, {
    // returnByValue,
    // generatePreview,
    objectGroup,
  }) {
    if (completion instanceof engine262.AbruptCompletion) {
      return {
        exceptionDetails: {
          text: 'uh oh',
          lineNumber: 0,
          columnNumber: 0,
        },
      };
    } else {
      const result = completion.Value;
      let type;
      let subtype;
      let value;
      let objectId;
      switch (engine262.Abstract.Type(result)) {
        case 'Object':
          type = 'object';
          objectId = this.internObject(result, objectGroup);
          break;
        case 'Null':
          type = 'object';
          subtype = 'null';
          value = null;
          break;
        case 'Undefined':
          type = 'undefined';
          break;
        case 'String':
          type = 'string';
          value = result.stringValue();
          break;
        case 'Number':
          type = 'number';
          value = result.numberValue();
          break;
        case 'Boolean':
          type = 'boolean';
          value = result.booleanValue();
          break;
        default:
          throw new RangeError();
      }
      return {
        result: {
          type,
          subtype,
          value,
          objectId,
        },
      };
    }
  }
}

module.exports = {
  attachRealm(realm) {
    contexts.push(new InspectorContext(realm));
  },
};
