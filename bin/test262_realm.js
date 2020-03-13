'use strict';

const path = require('path');
const fs = require('fs');
const {
  Realm, Throw,
  Abstract, Value,
  Object: APIObject,
  ToString,
  AbruptCompletion,
  inspect,
} = require('..');

const createRealm = ({ printCompatMode = false } = {}) => {
  const resolverCache = new Map();
  const trackedPromises = new Set();

  const realm = new Realm({
    promiseRejectionTracker(promise, operation) {
      switch (operation) {
        case 'reject':
          trackedPromises.add(promise);
          break;
        case 'handle':
          trackedPromises.delete(promise);
          break;
        default:
          throw new RangeError('promiseRejectionTracker', operation);
      }
    },
    resolveImportedModule(referencingScriptOrModule, specifier) {
      try {
        const base = path.dirname(referencingScriptOrModule.specifier);
        const resolved = path.resolve(base, specifier);
        if (resolverCache.has(resolved)) {
          return resolverCache.get(resolved);
        }
        const source = fs.readFileSync(resolved, 'utf8');
        const m = realm.createSourceTextModule(resolved, source);
        resolverCache.set(resolved, m);
        return m;
      } catch (e) {
        return Throw(realm, e.name, e.message);
      }
    },
  });

  const $262 = new APIObject(realm);

  let printHandle;
  const setPrintHandle = (f) => {
    printHandle = f;
  };
  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => {
    if (printHandle !== undefined) {
      printHandle(...args);
    } else {
      if (printCompatMode) {
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          const s = ToString(realm, arg);
          if (s instanceof AbruptCompletion) {
            return s;
          }
          process.stdout.write(s);
          if (i !== args.length - 1) {
            process.stdout.write(' ');
          }
        }
        process.stdout.write('\n');
        return Value.undefined;
      } else {
        const formatted = args.map((a, i) => {
          if (i === 0 && Abstract.Type(a) === 'String') {
            return a.stringValue();
          }
          return inspect(a, realm);
        }).join(' ');
        console.log(formatted); // eslint-disable-line no-console
      }
    }
    return Value.undefined;
  }));

  [
    ['global', realm.global],
    ['createRealm', () => {
      const info = createRealm();
      return info.$262;
    }],
    ['evalScript', ([sourceText]) => realm.evaluateScript(sourceText.stringValue())],
    ['detachArrayBuffer', ([arrayBuffer]) => Abstract.DetachArrayBuffer(arrayBuffer)],
    ['gc', () => Value.undefined],
  ].forEach(([name, value]) => {
    const v = value instanceof Value ? value : new Value(realm, value);
    Abstract.CreateDataProperty($262, new Value(realm, name), v);
  });

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);
  Abstract.CreateDataProperty(realm.global, new Value(realm, '$'), $262);

  return {
    realm,
    $262,
    resolverCache,
    trackedPromises,
    setPrintHandle,
  };
};

module.exports = { createRealm };
