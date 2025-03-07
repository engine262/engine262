/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'node:path';
import fs from 'node:fs';
import {
  Value,
  CreateBuiltinFunction,
  CreateDataProperty,
  DetachArrayBuffer,
  OrdinaryObjectCreate,
  ToString,
  Type,
  Throw,
  AbruptCompletion,
  ManagedRealm,
  inspect,
  gc,
  Agent,
  Realm,
  ObjectValue,
  JSStringValue,
  type BuiltinFunctionObject,
  type OrdinaryObject,
} from '#self';

export interface CreateAgentOptions {
  features?: readonly string[];
}

export const createAgent = ({ features = [] }: CreateAgentOptions) => new Agent({
  features,
  loadImportedModule(referrer, specifier, _hostDefined, finish) {
    if (referrer instanceof Realm) {
      throw new Error('Internal error: loadImportedModule called without a ScriptOrModule referrer.');
    }
    const realm = referrer.Realm;

    try {
      const base = path.dirname(referrer.HostDefined.specifier);
      const resolved = path.resolve(base, specifier);
      if (realm.HostDefined.resolverCache.has(resolved)) {
        finish(realm.HostDefined.resolverCache.get(resolved));
        return;
      }
      const source = fs.readFileSync(resolved, 'utf8');
      const m = resolved.endsWith('.json')
        ? realm.createJSONModule(resolved, source)
        : realm.createSourceTextModule(resolved, source);
      realm.HostDefined.resolverCache.set(resolved, m);
      finish(m);
    } catch (e) {
      finish(Throw((e as any).name, 'Raw', (e as any).message));
    }
  },
});

export interface Test262CreateRealm {
  realm: ManagedRealm;
  $262: OrdinaryObject;
  resolverCache: Map<any, any>;
  setPrintHandle: (f: any) => void;
}
export interface CreateRealmOptions {
  printCompatMode?: boolean;
}

export function createRealm({ printCompatMode = false }: CreateRealmOptions = {}): Test262CreateRealm {
  const resolverCache = new Map();

  const realm = new ManagedRealm({
    resolverCache,
  });

  return realm.scope(() => {
    const $262 = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'] as ObjectValue);

    let printHandle: (...args: any[]) => void;
    const setPrintHandle = (f: typeof printHandle) => {
      printHandle = f;
    };
    CreateDataProperty(realm.GlobalObject, Value('print'), CreateBuiltinFunction((args: any) => {
      /* c8 ignore next */
      if (printHandle !== undefined) {
        printHandle(...args);
      } else {
        if (printCompatMode) {
          for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            const s = ToString(arg);
            if (s instanceof AbruptCompletion) {
              return s;
            }
            process.stdout.write(s.stringValue());
            if (i !== args.length - 1) {
              process.stdout.write(' ');
            }
          }
          process.stdout.write('\n');
          return Value.undefined;
        } else {
          const formatted = args.map((a: any, i: number) => {
            if (i === 0 && Type(a) === 'String') {
              return a.stringValue();
            }
            return inspect(a);
          }).join(' ');
          console.log(formatted); // eslint-disable-line no-console
        }
      }
      return Value.undefined;
    }, 0, Value('print'), []));

    ([
      ['global', realm.GlobalObject],
      ['createRealm', () => {
        const info = createRealm();
        return info.$262;
      }],
      ['evalScript', ([sourceText]: [JSStringValue]) => realm.evaluateScript(sourceText.stringValue()), 1],
      ['detachArrayBuffer', ([arrayBuffer]: [unknown]) => DetachArrayBuffer(arrayBuffer), 1],
      ['gc', () => {
        gc();
        return Value.undefined;
      }],
      ['spec', ([v]: [BuiltinFunctionObject]) => {
        if (v.nativeFunction && v.nativeFunction.section) {
          return Value(v.nativeFunction.section);
        }
        return Value.undefined;
      }, 1],
    ] as const).forEach(([name, value, length = 0]) => {
      const v = value instanceof Value ? value : CreateBuiltinFunction(value, length, Value(name), []);
      CreateDataProperty($262, Value(name), v as Value);
    });

    CreateDataProperty(realm.GlobalObject, Value('$262'), $262);
    CreateDataProperty(realm.GlobalObject, Value('$'), $262);

    return {
      realm,
      $262,
      resolverCache,
      setPrintHandle,
    };
  });
}
