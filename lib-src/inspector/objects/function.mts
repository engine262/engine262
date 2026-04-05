import type { Protocol } from 'devtools-protocol';
import type { Location } from '../../../src/parser/ParseNode.mts';
import { getDisplayObjectFromEnvironmentRecord } from '../context.mts';
import { nativeEvalInAnyRealm } from '../eval.mts';
import type { Inspector } from './index.mts';
import {
  type FunctionObject, isWrappedFunctionExoticObject, IntrinsicsFunctionToString, isECMAScriptFunctionObject,
  isBuiltinFunctionObject,
  type DefaultConstructorBuiltinFunction,
  EnvironmentRecord,
  NullValue,
  ObjectValue,
  CreateArrayFromList,
  unwrapCompletion,
} from '#self';

function unwrapFunction(value: FunctionObject): FunctionObject {
  if (isWrappedFunctionExoticObject(value)) {
    return unwrapFunction(value.WrappedTargetFunction);
  }
  return value;
}

function toLocation(location: Location, scriptId: string | undefined): Protocol.Runtime.InternalPropertyDescriptor {
  return {
    name: '[[FunctionLocation]]',
    value: {
      type: 'object',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtype: 'internal#location' as any,
      description: 'Object',
      value: {
        columnNumber: location.start.column,
        lineNumber: location.start.line - 1,
        scriptId,
      },
    },
  };
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
  toInternalProperties(value, getObjectId, context) {
    if (isECMAScriptFunctionObject(value)) {
      if (!value.ECMAScriptCode) return [];

      const scope: ObjectValue[] = [];
      let env: EnvironmentRecord | NullValue = value.Environment;
      while (env instanceof EnvironmentRecord) {
        const result = getDisplayObjectFromEnvironmentRecord(env);
        if (result) {
          scope.push(result.object);
        }
        env = env.OuterEnv;
      }
      const scopeObject = unwrapCompletion(nativeEvalInAnyRealm(() => CreateArrayFromList(scope), context));
      const scopeDesc: Protocol.Runtime.RemoteObject | undefined = scopeObject ? {
        className: 'Array',
        description: `Scopes[${scope.length}]`,
        objectId: getObjectId(scopeObject as ObjectValue),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subtype: 'internal#scopeList' as any,
        type: 'object',
      } : undefined;

      return [toLocation(value.ECMAScriptCode.location, value.scriptId), { name: '[[Scopes]]', value: scopeDesc }];
    }

    if (isBuiltinFunctionObject(value)) {
      const result: Protocol.Runtime.InternalPropertyDescriptor[] = [];
      if ((value as DefaultConstructorBuiltinFunction).HostLocation) {
        const [scriptId, location] = (value as DefaultConstructorBuiltinFunction).HostLocation;
        result.push(toLocation(location, scriptId));
      }
      if (value.nativeFunction.section) {
        result.push({
          name: '[[Section]]',
          value: {
            type: 'string',
            value: value.nativeFunction.section,
          },
        });
      }
      return result;
    }
    return [];
  },
  toDescription: () => 'Function',
};
