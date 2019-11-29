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
      awaitPromise,
      throwOnSideEffect,
      objectGroup,
    }) {
      if (throwOnSideEffect || awaitPromise) {
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
      objectId,
      // ownProperties,
      // accessorPropertiesOnly,
      generatePreview,
    }) {
      const context = getContext();
      const object = context.getObject(objectId);

      const properties = context.getProperties(object, { generatePreview });
      if (properties instanceof engine262.AbruptCompletion) {
        return context.createEvaluationResult(properties);
      }

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

  ws._socket.unref(); // eslint-disable-line no-underscore-dangle

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
    this.objects = new Map();
    this.objectCounter = 0;
    this.realm = realm;
  }

  internObject(value, group = 'default') {
    const id = `${group}:${this.objectCounter}`;
    this.objectCounter += 1;
    this.objects.set(id, value);
    return id;
  }

  releaseObjectGroup(group) {
    Object.keys(this.objects)
      .forEach((key) => {
        if (key.startsWith(group)) {
          this.objects.delete(key);
        }
      });
  }

  getObject(objectId) {
    return this.objects.get(objectId);
  }

  toRemoteObject(object, options) {
    let type;
    let subtype;
    let value;
    let objectId;
    let unserializableValue;
    switch (engine262.Abstract.Type(object)) {
      case 'Object':
        type = 'object';
        objectId = this.internObject(object, options.objectGroup);
        if ('PromiseState' in object) {
          subtype = 'promise';
        } else if ('MapData' in object) {
          subtype = 'map';
        } else if ('SetData' in object) {
          subtype = 'set';
        } else if ('ErrorData' in object) {
          subtype = 'error';
        } else if ('TypedArrayName' in object) {
          subtype = 'typedarray';
        } else if ('DataView' in object) {
          subtype = 'dataview';
        } else if ('ProxyTarget' in object) {
          subtype = 'proxy';
        } else if ('DateValue' in object) {
          subtype = 'date';
        } else if ('GeneratorState' in object) {
          subtype = 'generator';
        }
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
        value = object.stringValue();
        break;
      case 'Number': {
        type = 'number';
        const v = object.numberValue();
        if (!Number.isFinite(v)) {
          unserializableValue = v.toString();
        } else {
          value = v;
        }
        break;
      }
      case 'Boolean':
        type = 'boolean';
        value = object.booleanValue();
        break;
      case 'BigInt':
        type = 'bigint';
        unserializableValue = object.bigintValue().toString();
        break;
      default:
        throw new RangeError();
    }
    let preview;
    if (options.generatePreview && type === 'object' && subtype !== 'null') {
      preview = {
        type,
        subtype,
        overflow: false,
        properties: this.getProperties(object, options),
      };
    }
    return {
      type,
      subtype,
      value,
      objectId,
      unserializableValue,
      preview,
    };
  }

  getProperties(object, options) {
    const wrap = (v) => this.toRemoteObject(v, options);

    const keys = object.OwnPropertyKeys();
    if (keys instanceof engine262.AbruptCompletion) {
      return keys;
    }

    const properties = [];
    for (const key of keys) {
      const desc = object.GetOwnProperty(key);
      if (desc instanceof engine262.AbruptCompletion) {
        return desc;
      }
      const descriptor = {
        name: key.stringValue
          ? key.stringValue()
          : undefined,
        value: desc.Value ? wrap(desc.Value) : undefined,
        writable: desc.Writable === engine262.Value.true,
        get: desc.Get ? wrap(desc.Get) : undefined,
        set: desc.Set ? wrap(desc.Set) : undefined,
        configurable: desc.Configurable === engine262.Value.true,
        enumerable: desc.Enumerable === engine262.Value.true,
        wasThrown: false,
        isOwn: true,
        symbol: key.stringValue ? undefined : wrap(key),
      };
      properties.push(descriptor);
    }

    return properties;
  }

  createEvaluationResult(completion, options) {
    if (completion instanceof engine262.AbruptCompletion) {
      return {
        exceptionDetails: {
          text: 'uh oh',
          lineNumber: 0,
          columnNumber: 0,
          exception: this.toRemoteObject(completion.Value, options),
        },
      };
    } else {
      return {
        result: this.toRemoteObject(completion.Value, options),
      };
    }
  }
}

module.exports = {
  attachRealm(realm) {
    contexts.push(new InspectorContext(realm));
  },
};
