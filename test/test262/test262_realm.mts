/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadImportedModuleSync } from '../../lib-src/node/module.mts';
import {
  Value,
  CreateBuiltinFunction,
  CreateDataProperty,
  DetachArrayBuffer,
  OrdinaryObjectCreate,
  ToString,
  Type,
  ManagedRealm,
  inspect,
  gc,
  Agent,
  type OrdinaryObject,
  type Arguments,
  SourceTextModuleRecord,
  type ExpressionCompletion,
  EnsureCompletion,
  evalQ,
  surroundingAgent,
  isArrayBufferObject,
  isBuiltinFunctionObject,
  type NativeSteps,
  NormalCompletion,
} from '#self';

export interface CreateAgentOptions {
  features?: readonly string[];
}

export const createAgent = ({ features = [] }: CreateAgentOptions) => new Agent({
  features,
  loadImportedModule: loadImportedModuleSync,
});

export interface Test262CreateRealm {
  realm: ManagedRealm;
  $262: OrdinaryObject;
  resolverCache: Map<string, SourceTextModuleRecord>;
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
    const $262 = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);

    let printHandle: (...args: any[]) => void;
    const setPrintHandle = (f: typeof printHandle) => {
      printHandle = f;
    };
    CreateDataProperty(realm.GlobalObject, Value('print'), CreateBuiltinFunction((args: Arguments): ExpressionCompletion => {
      if (surroundingAgent.debugger_isPreviewing) {
        return NormalCompletion(Value.undefined);
      }
      /* c8 ignore next */
      if (printHandle !== undefined) {
        printHandle(...args);
      } else {
        if (printCompatMode) {
          for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            const s = EnsureCompletion(ToString(arg));
            if (s.Type === 'throw') {
              return s;
            }
            process.stdout.write(s.Value.stringValue());
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
      ['evalScript', ([sourceText]) => evalQ((Q) => realm.evaluateScript(Q(ToString(sourceText)).stringValue())), 1],
      ['detachArrayBuffer', ([arrayBuffer]) => {
        if (!isArrayBufferObject(arrayBuffer)) {
          return surroundingAgent.Throw('TypeError', 'Raw', 'Argument must be an ArrayBuffer');
        }
        return DetachArrayBuffer(arrayBuffer);
      }, 1],
      ['gc', () => {
        gc();
        return Value.undefined;
      }],
      ['spec', ([v]) => {
        if (isBuiltinFunctionObject(v) && v.nativeFunction.section) {
          return Value(v.nativeFunction.section);
        }
        return Value.undefined;
      }, 1],
    ] as [string, NativeSteps | Value][]).forEach(([name, value, length = 0]) => {
      const v = value instanceof Value ? value : CreateBuiltinFunction(value as NativeSteps, length, Value(name), []);
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
