import type { Protocol } from 'devtools-protocol';
import type { Location } from '../../../src/parser/ParseNode.mts';
import { getDisplayObjectFromEnvironmentRecord } from '../context.mts';
import { nativeEvalInAnyRealm } from '../evaluator.mts';
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
  isBoundFunctionObject,
} from '#self';

function unwrapFunction(value: FunctionObject): FunctionObject {
  if (isWrappedFunctionExoticObject(value)) {
    return unwrapFunction(value.WrappedTargetFunction);
  }
  if (isBoundFunctionObject(value)) {
    return unwrapFunction(value.BoundTargetFunction);
  }
  return value;
}

function toLocation(location: Location, scriptId: string | undefined): Protocol.Runtime.InternalPropertyDescriptor {
  return {
    name: '[[FunctionLocation]]',
    value: {
      type: 'object',
      subtype: 'internal#location' as never,
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
    const result: Protocol.Runtime.RemoteObject = {
      type: 'function',
      objectId: getObjectId(value),
    };
    value = unwrapFunction(value);
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
      description: IntrinsicsFunctionToString(unwrapFunction(value)),
      overflow: false,
      properties: [],
    };
  },
  toInternalProperties(value, getObjectId, context) {
    const result: Protocol.Runtime.InternalPropertyDescriptor[] = [];

    while (true) {
      if (isWrappedFunctionExoticObject(value)) {
        if (!result.some((p) => p.name === '[[WrappedTargetFunction]]')) {
          result.push({
            name: '[[WrappedTargetFunction]]',
            value: context.toRemoteObject(value.WrappedTargetFunction, { generatePreview: true }),
          });
        }
        value = value.WrappedTargetFunction;
        continue;
      }

      if (isBoundFunctionObject(value)) {
        const v = value;
        if (!result.some((p) => p.name === '[[BoundTargetFunction]]')) {
          result.push({
            name: '[[BoundTargetFunction]]',
            value: context.toRemoteObject(v.BoundTargetFunction, { generatePreview: true }),
          }, {
            name: '[[BoundThis]]',
            value: context.toRemoteObject(v.BoundThis, { generatePreview: true }),
          }, {
            name: '[[BoundArguments]]',
            value: context.toRemoteObject(
              unwrapCompletion(nativeEvalInAnyRealm(() => CreateArrayFromList(v.BoundArguments), context))!,
              { generatePreview: true },
            ),
          });
        }
        value = v.BoundTargetFunction;
        continue;
      }
      break;
    }

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
        subtype: 'internal#scopeList' as never,
        type: 'object',
      } : undefined;
      result.push(toLocation(value.ECMAScriptCode.location, value.scriptId), { name: '[[Scopes]]', value: scopeDesc });
    }

    if (isBuiltinFunctionObject(value)) {
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
    }
    return result;
  },
  toDescription: () => 'Function',
};
