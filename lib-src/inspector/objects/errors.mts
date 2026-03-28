import { ObjectInspector } from './objects.mts';
import {
  ObjectValue, surroundingAgent, ManagedRealm, skipDebugger, performDevtoolsEval, evalQ, Get, Value, ToString,
} from '#self';

export const Error = new ObjectInspector<ObjectValue>('SyntaxError', 'error', (value, context) => {
  let text = '';
  const realm = (surroundingAgent.runningExecutionContext?.Realm || context.getAnyRealm()?.realm) as ManagedRealm;
  if (!realm) {
    return text;
  }
  surroundingAgent.debugger_scopePreview(() => {
    skipDebugger(performDevtoolsEval(function* getErrorStack() {
      evalQ((Q) => {
        if (value instanceof ObjectValue) {
          const stack = Q(skipDebugger(Get(value, Value('stack'))));
          if (stack !== Value.undefined) {
            text += Q(skipDebugger(ToString(stack))).stringValue();
          }
        }
      });
      return Value.undefined;
    }, realm, true, true));
  });
  return text;
});
