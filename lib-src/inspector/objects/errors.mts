import { nativeEvalInAnyRealm } from '../eval.mts';
import { ObjectInspector } from './objects.mts';
import { getInspector } from './index.mts';
import {
  ObjectValue, surroundingAgent, skipDebugger, Get, Value, getHostDefinedErrorDetails,
  CreateArrayFromList,
  unwrapCompletion,
  JSStringValue,
  EnsureCompletion,
  NormalCompletion,
} from '#self';

export const Error = new ObjectInspector<ObjectValue>('Error', 'error', (value, context) => {
  let text = '';
  surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => {
    const completion = EnsureCompletion(surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => skipDebugger(Get(value, Value('stack'))), context)));
    if (completion instanceof NormalCompletion && completion.Value instanceof JSStringValue) {
      text = completion.Value.stringValue();
      if (!text.includes('  at') && !text.includes('SyntaxError')) {
        text = '';
      }
    }
    return Value.undefined;
  }, context));
  return text || 'Error';
}, {
  internalProperties: (error, context) => {
    const unformattedMessage = getHostDefinedErrorDetails(error).message;
    if (!unformattedMessage) return [];
    const value = nativeEvalInAnyRealm(() => CreateArrayFromList(unformattedMessage.map((part) => (typeof part === 'string' ? Value(part) : part))), context);
    if (!value) return [];
    return [['[[UnformattedErrorMessage]]', unwrapCompletion(value)]];
  },
  customPreview: (error, getObjectId, context) => {
    const { message, stack, stackGetterValue } = getHostDefinedErrorDetails(error);
    if (!message || !stackGetterValue) return undefined;

    const stackC = EnsureCompletion(surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => skipDebugger(Get(error, Value('stack'))), context)));
    if (stackC instanceof NormalCompletion && stackC.Value instanceof JSStringValue) {
      const stackMaybeModified = stackC.Value.stringValue();
      if (stackMaybeModified !== stackGetterValue) return undefined;
    }

    let constructorName = 'Error';
    const nameC = EnsureCompletion(surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => skipDebugger(Get(error, Value('name'))), context)));
    if (nameC instanceof NormalCompletion && nameC.Value instanceof JSStringValue) constructorName = nameC.Value.stringValue();

    const header = JSON.stringify(['span', null,
      constructorName,
      ': ',
      ...message.map((part) => (
        typeof part === 'string' ? part : ['object', getInspector(part).toRemoteObject(part, getObjectId, context, false)]
      )),
      stack,
    ]);
    return { header };
  },
});
