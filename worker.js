'use strict';

/* eslint-env worker */

importScripts('https://unpkg.com/acorn@6.3.0/dist/acorn.js');
importScripts('https://www.unpkg.com/nearley@2.18.0/lib/nearley.js');
importScripts('./engine262.js');

const {
  initializeAgent,
  Realm,
  Abstract,
  AbruptCompletion,
  Value,
  Throw,
  inspect,
  FEATURES,
} = self.engine262;

postMessage({ FEATURES });

let mode;

addEventListener('message', ({ data }) => {
  if (data.features) {
    initializeAgent({
      features: data.features,
    });
    mode = data.mode;
  }
  if (data.input) {
    const realm = new Realm();
    const print = new Value(realm, (args) => {
      postMessage({ log: args.map((a) => inspect(a)) });
      return Value.undefined;
    }, [], realm);
    Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), print);

    let result;
    if (mode === 'script') {
      result = realm.evaluateScript(data.input);
    } else {
      result = realm.createSourceTextModule('engine262.mjs', data.input);
      if (!(result instanceof AbruptCompletion)) {
        const module = result;
        realm.moduleEntry = module;
        result = module.Link();
        if (!(result instanceof AbruptCompletion)) {
          result = module.Evaluate();
          if (result.PromiseState === 'rejected') {
            result = Throw(realm, result.PromiseResult);
          }
        }
      }
    }
    if (result instanceof AbruptCompletion) {
      let inspected;
      if (Abstract.Type(result.Value) === 'Object') {
        const errorToString = realm.realm.Intrinsics['%Error.prototype%'].properties.get(new Value(realm, 'toString')).Value;
        inspected = Abstract.Call(errorToString, result.Value).stringValue();
      } else {
        inspected = inspect(result, realm);
      }
      postMessage({ error: inspected });
    }
  }
});
