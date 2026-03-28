import type { Protocol } from 'devtools-protocol';
import { ObjectInspector, type AdditionalPropertyItem } from './objects.mts';
import { getInspector } from './index.mts';
import {
  type ModuleNamespaceObject, surroundingAgent, skipDebugger, performDevtoolsEval, EnsureCompletion, Get, NormalCompletion, Value, ManagedRealm,
  CreateBuiltinFunction,
} from '#self';

export const Module = new ObjectInspector<ModuleNamespaceObject>('Module', undefined, () => 'Module', {
  additionalProperties: (module) => {
    const result: AdditionalPropertyItem[] = [];
    surroundingAgent.debugger_scopePreview(() => {
      skipDebugger(performDevtoolsEval(function* accessModuleExports() {
        for (const key of module.Exports) {
          const completion = EnsureCompletion(skipDebugger(Get(module, key)));
          if (completion instanceof NormalCompletion) {
            result.push([key.stringValue(), completion.Value!]);
          }
        }
        return Value.undefined;
      }, module.Module.Realm as ManagedRealm, true, true));
    });
    return result;
  },
  exoticProperties(module, getObjectId, context, generatePreview): Protocol.Runtime.PropertyDescriptor[] {
    const result: Protocol.Runtime.PropertyDescriptor[] = [];
    surroundingAgent.debugger_scopePreview(() => {
      skipDebugger(performDevtoolsEval(function* accessModuleExports() {
        for (const key of module.Exports) {
          const completion = EnsureCompletion(skipDebugger(Get(module, key)));
          if (completion instanceof NormalCompletion) {
            result.push({
              name: key.stringValue(),
              value: getInspector(completion.Value!).toRemoteObject(completion.Value!, getObjectId, context, generatePreview),
              writable: false,
              configurable: false,
              enumerable: true,
              isOwn: true,
            });
          } else {
            const realm = module.Module.Realm as ManagedRealm;
            const evaluate = CreateBuiltinFunction(function* evaluate() {
              return yield* (Get(module, key));
            }, 0, 'Module.evaluate', [], realm);
            result.push({
              name: key.stringValue(),
              get: getInspector(evaluate).toRemoteObject(evaluate, getObjectId, context, generatePreview),
              set: { type: 'undefined' },
              writable: false,
              configurable: false,
              enumerable: true,
              isOwn: true,
            });
          }
        }
        return Value.undefined;
      }, module.Module.Realm as ManagedRealm, true, true));
    });
    return result;
  },
});
