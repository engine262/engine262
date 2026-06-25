import type { InspectorContext } from './context.mts';
import {
  isEvaluator, ManagedRealm, skipDebugger, surroundingAgent, type PlainCompletion, type PlainEvaluator,
} from '#self';

export function nativeEvalInAnyRealm<T>(enterPreview: boolean, context: InspectorContext, closure: (() => PlainCompletion<T>) | (() => PlainEvaluator<T>)): PlainCompletion<T> | undefined {
  const realm = surroundingAgent.runningExecutionContext?.Realm as ManagedRealm || context.getAnyRealm()?.realm;
  if (!realm) return undefined;

  const exitPreview = enterPreview ? surroundingAgent.debugger_scopePreview() : undefined;
  const pop = realm.pushTopContext();
  let result = closure();
  if (isEvaluator(result)) {
    result = skipDebugger(result);
  }
  pop?.();
  exitPreview?.[Symbol.dispose]();
  return result;
}
