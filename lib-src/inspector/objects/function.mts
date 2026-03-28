import type { Protocol } from 'devtools-protocol';
import type { Inspector } from './index.mts';
import {
  type FunctionObject, isWrappedFunctionExoticObject, IntrinsicsFunctionToString, isECMAScriptFunctionObject,
  isBuiltinFunctionObject,
} from '#self';

function unwrapFunction(value: FunctionObject): FunctionObject {
  if (isWrappedFunctionExoticObject(value)) {
    return unwrapFunction(value.WrappedTargetFunction);
  }
  return value;
}

export const Function: Inspector<FunctionObject> = {
  toRemoteObject(value, getObjectId) {
    value = unwrapFunction(value);
    const result: Protocol.Runtime.RemoteObject = {
      type: 'function',
      objectId: getObjectId(value),
    };
    result.description = IntrinsicsFunctionToString(value);
    if (isECMAScriptFunctionObject(value) && value.ECMAScriptCode) {
      if (value.ECMAScriptCode.type === 'FunctionBody') {
        result.className = 'Function';
      } else if (value.ECMAScriptCode.type === 'GeneratorBody') {
        result.className = 'GeneratorFunction';
      } else if (value.ECMAScriptCode.type === 'AsyncBody') {
        result.className = 'AsyncFunction';
      } else if (value.ECMAScriptCode.type === 'AsyncGeneratorBody') {
        result.className = 'AsyncGeneratorFunction';
      }
    } else {
      result.className = 'Function';
    }
    return result;
  },
  toPropertyPreview: (name) => ({ name, type: 'function', value: '' }),
  toObjectPreview(value) {
    return {
      type: 'function',
      description: IntrinsicsFunctionToString(value),
      overflow: false,
      properties: [],
    };
  },
  toInternalProperties(value) {
    if (isECMAScriptFunctionObject(value)) {
      return [{
        name: '[[FunctionLocation]]',
        value: value.ECMAScriptCode ? {
          type: 'object',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subtype: 'internal#location' as any,
          description: 'Object',
          value: {
            columnNumber: value.ECMAScriptCode.location.start.column,
            lineNumber: value.ECMAScriptCode.location.start.line - 1,
            scriptId: value.scriptId!,
          },
        } : undefined,
      }];
    }

    if (isBuiltinFunctionObject(value) && value.nativeFunction.section) {
      return [{
        name: '[[Section]]',
        value: {
          type: 'string',
          value: value.nativeFunction.section,
        },
      }];
    }
    return [];
  },
  toDescription: () => 'Function',
};
