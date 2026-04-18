import type { InspectorContext } from './context.mts';
import {
  isEvaluator, ManagedRealm, skipDebugger, surroundingAgent, type PlainCompletion, type PlainEvaluator,
} from '#self';

export function nativeEvalInAnyRealm<T>(closure: (() => PlainCompletion<T>) | (() => PlainEvaluator<T>), context: InspectorContext): PlainCompletion<T> | undefined {
  const realm = (surroundingAgent.runningExecutionContext?.Realm || context.getAnyRealm()?.realm) as ManagedRealm | undefined;
  if (!realm) return undefined;
  return realm.scope((): PlainCompletion<T> | undefined => {
    const result = closure();
    if (isEvaluator(result)) {
      return skipDebugger(result);
    }
    return result;
  });
}
