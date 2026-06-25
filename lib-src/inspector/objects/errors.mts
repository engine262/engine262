import { nativeEvalInAnyRealm } from '../evaluator.mts';
import { ObjectInspector } from './objects.mts';
import { getInspector } from './index.mts';
import {
  ObjectValue, skipDebugger, Get, Value, getHostDefinedErrorDetails,
  CreateArrayFromList,
  X,
  JSStringValue,
  EnsureCompletion,
  NormalCompletion,
} from '#self';

export const Error = new ObjectInspector<ObjectValue>('Error', 'error', (value, context) => {
  let text = '';
  nativeEvalInAnyRealm(true, context, () => {
    const completion = EnsureCompletion(skipDebugger(Get(value, Value('stack'))));
    if (completion instanceof NormalCompletion && completion.Value instanceof JSStringValue) {
      text = completion.Value.stringValue();
      if (!text.includes('  at') && !text.includes('SyntaxError')) {
        text = '';
      }
    }
    return Value.undefined;
  });
  return text || 'Error';
}, {
  internalProperties: (error, context) => {
    const unformattedMessage = getHostDefinedErrorDetails(error).message;
    if (!unformattedMessage) return [];
    const value = nativeEvalInAnyRealm(false, context, () => CreateArrayFromList(unformattedMessage.map((part) => (typeof part === 'string' ? Value(part) : part))));
    if (!value) return [];
    return [['[[UnformattedErrorMessage]]', X(value)]];
  },
  customPreview: (error, getObjectId, context) => {
    const { message, stack, stackGetterValue } = getHostDefinedErrorDetails(error);
    if (!message || !stackGetterValue) return undefined;

    const stackC = EnsureCompletion(nativeEvalInAnyRealm(true, context, () => skipDebugger(Get(error, Value('stack')))));
    if (stackC instanceof NormalCompletion && stackC.Value instanceof JSStringValue) {
      const stackMaybeModified = stackC.Value.stringValue();
      if (stackMaybeModified !== stackGetterValue) return undefined;
    }

    let constructorName = 'Error';
    const nameC = EnsureCompletion(nativeEvalInAnyRealm(true, context, () => skipDebugger(Get(error, Value('name')))));
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
