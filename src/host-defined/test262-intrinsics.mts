// defined intrinsics that used in test262
import { isArray } from '../helpers.mts';
import {
  CreateBuiltinFunction, DetachArrayBuffer, EnsureCompletion, inspect, isArrayBufferObject, isBuiltinFunctionObject, JSStringValue, ManagedRealm, NormalCompletion, OrdinaryObjectCreate, Q, skipDebugger, surroundingAgent, ToString, Value, type Arguments, type ValueCompletion, gc,
  ParseScript,
  ThrowCompletion,
  ScriptEvaluation,
  CreateNonEnumerableDataPropertyOrThrow,
  type ValueEvaluator,
} from '#self';

/** https://github.com/tc39/test262/blob/main/INTERPRETING.md */
export function createTest262Intrinsics(realm: ManagedRealm, printCompatMode: boolean) {
  return realm.scope(() => {
    let test262PrintHandle: ((str: string) => void) | undefined;
    const setPrintHandle = (f: typeof test262PrintHandle | undefined) => {
      test262PrintHandle = f;
    };
    const print = CreateBuiltinFunction((args: Arguments): ValueCompletion => {
      if (surroundingAgent.debugger_isPreviewing) {
        return NormalCompletion(Value.undefined);
      }
      /* node:coverage ignore next */
      if (test262PrintHandle) {
        if (args[0] instanceof JSStringValue) {
          test262PrintHandle(args[0].stringValue());
          return Value.undefined;
        }
      } else {
        if (printCompatMode) {
          const str: string[] = [];
          for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            const s = EnsureCompletion(skipDebugger(ToString(arg)));
            if (s.Type === 'throw') {
              return s;
            }
            str.push(s.Value.stringValue());
          }
          // eslint-disable-next-line no-console
          console.log(...str);
          return Value.undefined;
        } else {
          const formatted = args.map((a: Value, i: number) => {
            if (i === 0 && a instanceof JSStringValue) {
              return a.stringValue();
            }
            return inspect(a);
          }).join(' ');
          console.log(formatted); // eslint-disable-line no-console
        }
      }
      return Value.undefined;
    }, 0, Value('print'), []);
    CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('print'), print);

    const $262 = OrdinaryObjectCreate.from({
      // TODO: AbstractModuleSource
      createRealm: function* createRealm(): ValueEvaluator {
        Q(surroundingAgent.debugger_cannotPreview);
        const realm = new ManagedRealm();
        const { $262 } = createTest262Intrinsics(realm, printCompatMode);
        return $262;
      },
      detachArrayBuffer: function* detachArrayBuffer(arrayBuffer) {
        if (!isArrayBufferObject(arrayBuffer)) {
          return surroundingAgent.Throw('TypeError', 'Raw', 'Argument must be an ArrayBuffer');
        }
        Q(DetachArrayBuffer(arrayBuffer));
        return Value.undefined;
      },
      evalScript: function* evalScript(sourceText) {
        if (!(sourceText instanceof JSStringValue)) {
          return surroundingAgent.Throw('TypeError', 'Raw', 'Argument must be a string');
        }
        const s = ParseScript(sourceText.stringValue(), surroundingAgent.currentRealmRecord);
        if (isArray(s)) {
          return ThrowCompletion(s[0]);
        }
        const status = yield* ScriptEvaluation(s);
        return status;
      },
      gc,
      global: realm.GlobalObject,
      // TODO: agent only if we have multi-threading.

      // engine262 only
      spec: function* spec(value) {
        if (isBuiltinFunctionObject(value) && value.nativeFunction.section) {
          return Value(value.nativeFunction.section);
        }
        return Value.undefined;
      },
      debugger: function* hostDebugger() {
        if (surroundingAgent.debugger_isPreviewing) {
          return Value.undefined;
        }
        // eslint-disable-next-line no-debugger
        debugger;
        return Value.undefined;
      },
    });
    // engine262 only
    CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('$262'), $262);
    CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('$'), $262);

    return {
      setPrintHandle,
      $262,
    };
  });
}
