/*!
 * engine262 0.0.1 b249d351e89be2efdb59fecbc291d7aca6fd6e4c
 *
 * Copyright (c) 2018 engine262 Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('./engine262.mjs')) :
  typeof define === 'function' && define.amd ? define(['exports', './engine262.mjs'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@magic-works/engine262/inspector"] = {}, global["@engine262/engine262"]));
})(this, (function (exports, engine262_mjs) { 'use strict';

  const Null = {
    toRemoteObject: () => ({
      type: 'object',
      subtype: 'null',
      value: null
    }),
    toObjectPreview: () => ({
      type: 'object',
      subtype: 'null',
      properties: [],
      overflow: false
    }),
    toPropertyPreview: name => ({
      name,
      type: 'object',
      subtype: 'null',
      value: 'null'
    }),
    toDescription: () => ''
  };
  const Undefined = {
    toRemoteObject: () => ({
      type: 'undefined'
    }),
    toObjectPreview: () => ({
      type: 'undefined',
      properties: [],
      overflow: false
    }),
    toPropertyPreview: name => ({
      name,
      type: 'undefined',
      value: 'undefined'
    }),
    toDescription: () => 'undefined'
  };
  const Boolean$1 = {
    toRemoteObject: value => ({
      type: 'boolean',
      value: value.booleanValue()
    }),
    toPropertyPreview: (name, value) => ({
      name,
      type: 'boolean',
      value: value.booleanValue().toString()
    }),
    toObjectPreview(value) {
      return {
        type: 'boolean',
        value: value.booleanValue(),
        description: value.booleanValue().toString(),
        overflow: false,
        properties: []
      };
    },
    toDescription: value => value.booleanValue().toString()
  };
  const Symbol = {
    toRemoteObject: (value, getObjectId) => ({
      type: 'symbol',
      description: engine262_mjs.SymbolDescriptiveString(value).stringValue(),
      objectId: getObjectId(value)
    }),
    toPropertyPreview: (name, value) => ({
      name,
      type: 'symbol',
      value: engine262_mjs.SymbolDescriptiveString(value).stringValue()
    }),
    toObjectPreview: value => ({
      type: 'symbol',
      description: engine262_mjs.SymbolDescriptiveString(value).stringValue(),
      overflow: false,
      properties: []
    }),
    toDescription: value => engine262_mjs.SymbolDescriptiveString(value).stringValue()
  };
  const String$1 = {
    toRemoteObject: value => ({
      type: 'string',
      value: value.stringValue()
    }),
    toPropertyPreview(name, value) {
      return {
        name,
        type: 'string',
        value: value.stringValue()
      };
    },
    toObjectPreview(value) {
      return {
        type: 'string',
        description: value.stringValue(),
        overflow: false,
        properties: []
      };
    },
    toDescription: value => value.stringValue()
  };
  const Number = {
    toRemoteObject(value) {
      const v = engine262_mjs.R(value);
      let description = v.toString();
      const isNeg0 = Object.is(v, -0);
      // Includes values `-0`, `NaN`, `Infinity`, `-Infinity`, and bigint literals.
      if (isNeg0 || !globalThis.Number.isFinite(v)) {
        if (typeof v === 'bigint') {
          description += 'n';
          return {
            type: 'bigint',
            unserializableValue: description,
            description
          };
        }
        return {
          type: 'number',
          unserializableValue: description,
          description: isNeg0 ? '-0' : description
        };
      }
      return {
        type: 'number',
        value: v,
        description
      };
    },
    toPropertyPreview(name, value, context) {
      return {
        name,
        type: 'number',
        value: this.toDescription(value, context)
      };
    },
    toObjectPreview(value, context) {
      return {
        type: 'number',
        description: this.toDescription(value, context),
        overflow: false,
        properties: []
      };
    },
    toDescription: value => {
      const r = engine262_mjs.R(value);
      return value instanceof engine262_mjs.BigIntValue ? `${r}n` : r.toString();
    }
  };

  const cascadeStack = new WeakMap();
  // This is modified based on PerformEval, used internally for devtools console.
  function* performDevtoolsEval(source, evalRealm, strictCaller, doNotTrack) {
    let inFunction = false;
    let inMethod = false;
    let inDerivedConstructor = false;
    let inClassFieldInitializer = false;
    let scriptContext;
    if (!engine262_mjs.surroundingAgent.runningExecutionContext?.LexicalEnvironment) {
      // top level devtools eval
      const globalEnv = evalRealm.GlobalEnv;
      scriptContext = new engine262_mjs.ExecutionContext();
      scriptContext.Function = engine262_mjs.Value.null;
      scriptContext.Realm = evalRealm;
      scriptContext.VariableEnvironment = globalEnv;
      if (!cascadeStack.has(globalEnv)) {
        cascadeStack.set(globalEnv, new engine262_mjs.DeclarativeEnvironmentRecord(globalEnv));
      }
      scriptContext.LexicalEnvironment = cascadeStack.get(evalRealm.GlobalEnv);
      scriptContext.PrivateEnvironment = engine262_mjs.Value.null;
      engine262_mjs.surroundingAgent.executionContextStack.push(scriptContext);
    }
    const thisEnv = engine262_mjs.GetThisEnvironment();
    if (thisEnv instanceof engine262_mjs.FunctionEnvironmentRecord) {
      const F = thisEnv.FunctionObject;
      inFunction = true;
      inMethod = thisEnv.HasSuperBinding() === engine262_mjs.Value.true;
      if (F.ConstructorKind === 'derived') {
        inDerivedConstructor = true;
      }
      const classFieldInitializerName = F.ClassFieldInitializerName;
      if (classFieldInitializerName !== undefined) {
        inClassFieldInitializer = true;
      }
    }
    let isAsync = false;
    const script = engine262_mjs.wrappedParse({
      source,
      allowAllPrivateNames: true
    }, parser => parser.scope.with({
      strict: strictCaller,
      newTarget: inFunction,
      superProperty: inMethod,
      superCall: inDerivedConstructor,
      private: true
    }, () => parser.try(() => parser.parseScript()) || parser.scope.with({
      await: true
    }, () => {
      isAsync = true;
      return parser.parseScript();
    })));
    if (Array.isArray(script)) {
      if (scriptContext) {
        engine262_mjs.surroundingAgent.executionContextStack.pop(scriptContext);
      }
      return engine262_mjs.ThrowCompletion(script[0]);
    }
    if (!script.ScriptBody) {
      if (scriptContext) {
        engine262_mjs.surroundingAgent.executionContextStack.pop(scriptContext);
      }
      return engine262_mjs.Value.undefined;
    }
    const body = script.ScriptBody;
    if (inClassFieldInitializer && engine262_mjs.ContainsArguments(body)) {
      return engine262_mjs.Throw.SyntaxError('arguments cannot be referenced in a class field initializer');
    }
    const scriptId = doNotTrack ? undefined : engine262_mjs.surroundingAgent.addDynamicParsedSource(engine262_mjs.surroundingAgent.currentRealmRecord, source, script);
    if (!doNotTrack) {
      engine262_mjs.surroundingAgent.parsedSources.get(scriptId).HostDefined.isInspectorEval = true;
      if (scriptContext) {
        scriptContext.HostDefined ??= {};
        scriptContext.HostDefined.scriptId = scriptId;
      }
    }
    let strictEval;
    if (script) {
      strictEval = engine262_mjs.IsStrict(script);
    } else {
      strictEval = true;
    }
    const runningContext = engine262_mjs.surroundingAgent.runningExecutionContext;
    let parentLexicalEnvironment;
    if (cascadeStack.has(runningContext.LexicalEnvironment)) {
      parentLexicalEnvironment = cascadeStack.get(runningContext.LexicalEnvironment);
    } else {
      parentLexicalEnvironment = runningContext.LexicalEnvironment;
    }
    const lexEnv = new engine262_mjs.DeclarativeEnvironmentRecord(parentLexicalEnvironment);
    cascadeStack.set(runningContext.LexicalEnvironment, lexEnv);
    let varEnv;
    const privateEnv = runningContext.PrivateEnvironment;
    varEnv = runningContext.VariableEnvironment;
    if (strictEval === true) {
      varEnv = lexEnv;
    }
    const evalContext = new engine262_mjs.ExecutionContext();
    evalContext.HostDefined ??= {};
    evalContext.HostDefined.scriptId = scriptId;
    evalContext.Function = engine262_mjs.Value.null;
    evalContext.Realm = evalRealm;
    evalContext.ScriptOrModule = runningContext.ScriptOrModule;
    evalContext.VariableEnvironment = varEnv;
    evalContext.LexicalEnvironment = lexEnv;
    evalContext.PrivateEnvironment = privateEnv;
    engine262_mjs.surroundingAgent.executionContextStack.push(evalContext);
    let result;
    result = engine262_mjs.EnsureCompletion(yield* engine262_mjs.EvalDeclarationInstantiation(body, varEnv, lexEnv, privateEnv, strictEval));
    if (result.Type === 'normal') {
      if (isAsync) {
        const promiseCapability = engine262_mjs.unwrapCompletion(engine262_mjs.NewPromiseCapability(engine262_mjs.surroundingAgent.intrinsic('%Promise%')));
        engine262_mjs.unwrapCompletion(yield* engine262_mjs.AsyncBlockStart(promiseCapability, function* evaluate() {
          return yield* engine262_mjs.Evaluate(body);
        }, evalContext));
        result = promiseCapability.Promise;
      } else {
        result = engine262_mjs.EnsureCompletion(yield* engine262_mjs.Evaluate(body));
      }
    }
    result = engine262_mjs.EnsureCompletion(result);
    if (result.Type === 'normal' && result.Value === undefined) {
      result = engine262_mjs.NormalCompletion(engine262_mjs.Value.undefined);
    }
    engine262_mjs.surroundingAgent.executionContextStack.pop(evalContext);
    if (scriptContext) {
      engine262_mjs.surroundingAgent.executionContextStack.pop(scriptContext);
    }
    return result;
  }
  function nativeEvalInAnyRealm(closure, context) {
    const realm = engine262_mjs.surroundingAgent.runningExecutionContext?.Realm || context.getAnyRealm()?.realm;
    if (!realm) return undefined;
    return realm.scope(() => {
      const result = closure();
      if (engine262_mjs.isEvaluator(result)) {
        return engine262_mjs.skipDebugger(result);
      }
      return result;
    });
  }

  function unwrapFunction(value) {
    if (engine262_mjs.isWrappedFunctionExoticObject(value)) {
      return unwrapFunction(value.WrappedTargetFunction);
    }
    return value;
  }
  function toLocation(location, scriptId) {
    return {
      name: '[[FunctionLocation]]',
      value: {
        type: 'object',
        subtype: 'internal#location',
        description: 'Object',
        value: {
          columnNumber: location.start.column,
          lineNumber: location.start.line - 1,
          scriptId
        }
      }
    };
  }
  const Function = {
    toRemoteObject(value, getObjectId) {
      value = unwrapFunction(value);
      const result = {
        type: 'function',
        objectId: getObjectId(value)
      };
      result.description = engine262_mjs.IntrinsicsFunctionToString(value);
      if (engine262_mjs.isECMAScriptFunctionObject(value) && value.ECMAScriptCode) {
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
    toPropertyPreview: name => ({
      name,
      type: 'function',
      value: ''
    }),
    toObjectPreview(value) {
      return {
        type: 'function',
        description: engine262_mjs.IntrinsicsFunctionToString(value),
        overflow: false,
        properties: []
      };
    },
    toInternalProperties(value, getObjectId, context) {
      if (engine262_mjs.isECMAScriptFunctionObject(value)) {
        if (!value.ECMAScriptCode) return [];
        const scope = [];
        let env = value.Environment;
        while (env instanceof engine262_mjs.EnvironmentRecord) {
          const result = getDisplayObjectFromEnvironmentRecord(env);
          if (result) {
            scope.push(result.object);
          }
          env = env.OuterEnv;
        }
        const scopeObject = engine262_mjs.unwrapCompletion(nativeEvalInAnyRealm(() => engine262_mjs.CreateArrayFromList(scope), context));
        const scopeDesc = scopeObject ? {
          className: 'Array',
          description: `Scopes[${scope.length}]`,
          objectId: getObjectId(scopeObject),
          subtype: 'internal#scopeList',
          type: 'object'
        } : undefined;
        return [toLocation(value.ECMAScriptCode.location, value.scriptId), {
          name: '[[Scopes]]',
          value: scopeDesc
        }];
      }
      if (engine262_mjs.isBuiltinFunctionObject(value)) {
        const result = [];
        if (value.HostLocation) {
          const [scriptId, location] = value.HostLocation;
          result.push(toLocation(location, scriptId));
        }
        if (value.nativeFunction.section) {
          result.push({
            name: '[[Section]]',
            value: {
              type: 'string',
              value: value.nativeFunction.section
            }
          });
        }
        return result;
      }
      return [];
    },
    toDescription: () => 'Function'
  };

  class ObjectInspector {
    subtype;
    className;
    toDescription;
    toCustomPreview;
    toEntries;
    additionalProperties;
    internalProperties;
    exoticProperties;
    constructor(className, subtype, toDescription, additionalOptions) {
      this.className = className;
      this.subtype = subtype;
      this.toDescription = toDescription;
      this.toEntries = additionalOptions?.entries;
      this.additionalProperties = additionalOptions?.additionalProperties;
      this.internalProperties = additionalOptions?.internalProperties;
      this.exoticProperties = additionalOptions?.exoticProperties;
      this.toCustomPreview = additionalOptions?.customPreview;
    }
    toRemoteObject(value, getObjectId, context) {
      const object = {
        type: 'object',
        subtype: this.subtype,
        objectId: getObjectId(value),
        className: typeof this.className === 'string' ? this.className : this.className(value),
        description: this.toDescription(value, context),
        preview: this.toObjectPreview(value, context)
      };
      const customPreview = this.toCustomPreview?.(value, getObjectId, context);
      if (customPreview) object.customPreview = customPreview;
      return object;
    }
    toPropertyPreview(name, value, context) {
      return {
        name,
        type: 'object',
        subtype: this.subtype,
        value: this.toDescription(value, context)
      };
    }
    toInternalProperties(value, getObjectId, context, generatePreview) {
      const internalProperties = [...(this.internalProperties?.(value, context) || [])];
      if (!internalProperties.length) {
        return [];
      }
      return internalProperties.map(([name, val]) => {
        let value;
        if (val instanceof engine262_mjs.Value) {
          value = getInspector(val).toRemoteObject(val, getObjectId, context, generatePreview);
        } else {
          const array = new engine262_mjs.ObjectValue([]);
          array.DefineOwnProperty = engine262_mjs.ArrayExoticObjectInternalMethods.DefineOwnProperty;
          array.properties.set('length', engine262_mjs.Descriptor({
            Value: engine262_mjs.F(val.length)
          }));
          for (const [index, item] of val.entries()) {
            let value;
            if (item instanceof engine262_mjs.Value) {
              value = item;
            } else {
              if (!item?.Key || !item.Value) {
                continue;
              }
              value = new engine262_mjs.ObjectValue(['InspectorEntry']);
              value.properties.set('key', engine262_mjs.Descriptor({
                Value: item.Key
              }));
              value.properties.set('value', engine262_mjs.Descriptor({
                Value: item.Value
              }));
            }
            array.properties.set(engine262_mjs.Value(index.toString()), engine262_mjs.Descriptor({
              Value: value
            }));
          }
          value = getInspector(array).toRemoteObject(array, getObjectId, context, generatePreview);
        }
        return {
          name,
          value
        };
      });
    }
    toObjectPreview(value, context) {
      const e = this.toEntries?.(value, context);
      return {
        type: 'object',
        subtype: this.subtype,
        description: this.toDescription(value, context),
        entries: e?.length ? e : undefined,
        ...propertiesToPropertyPreview(value, [...(this.internalProperties?.(value, context) || []), ...(this.additionalProperties?.(value, context) || [])], context)
      };
    }
  }
  const DefaultObject = new ObjectInspector('Object', undefined, object => {
    const [ctor] = object.ConstructedBy;
    if (!ctor) {
      return 'Object';
    }
    return propertyNameToString(ctor.HostInitialName);
  });
  const InternalInspectorEntry = new ObjectInspector('Object', 'internal#entry', (value, context) => {
    const key = value.properties.get(engine262_mjs.Value('key')).Value;
    const val = value.properties.get(engine262_mjs.Value('value')).Value;
    return `{${getInspector(key).toDescription(key, context)} => ${getInspector(val).toDescription(val, context)}}`;
  });
  function propertyNameToString(value) {
    if (value instanceof engine262_mjs.JSStringValue) {
      return value.stringValue();
    } else if (value instanceof engine262_mjs.PrivateName) {
      return value.Description.stringValue();
    } else {
      return engine262_mjs.SymbolDescriptiveString(value).stringValue();
    }
  }
  function propertyToPropertyPreview(key, desc, context) {
    const name = propertyNameToString(key);
    if (desc.Get || desc.Set) {
      return {
        name,
        type: 'accessor'
      };
    } else {
      return getInspector(desc.Value).toPropertyPreview(name, desc.Value, context);
    }
  }
  function propertiesToPropertyPreview(value, extra, context, max = 5) {
    let overflow = false;
    const properties = [];
    if (extra) {
      for (const [key, value] of extra) {
        if (value instanceof engine262_mjs.Value) {
          properties.push(getInspector(value).toPropertyPreview(key, value, context));
        }
        // TODO:... handle Value[]
      }
    }
    if (engine262_mjs.isTypedArrayObject(value) && value.ViewedArrayBuffer instanceof engine262_mjs.ObjectValue && value.ViewedArrayBuffer.ArrayBufferData instanceof engine262_mjs.DataBlock) {
      const record = engine262_mjs.MakeTypedArrayWithBufferWitnessRecord(value, 'seq-cst');
      const length = engine262_mjs.TypedArrayLength(record);
      for (let index = 0; index < length; index += 1) {
        const index_value = engine262_mjs.TypedArrayGetElement(value, engine262_mjs.Value(index));
        if (index_value instanceof engine262_mjs.UndefinedValue) {
          break;
        }
        if (properties.length > 100) {
          overflow = true;
          break;
        }
        properties.push(getInspector(index_value).toPropertyPreview(index.toString(), index_value, context));
      }
      properties.push({
        name: 'buffer',
        type: 'object',
        subtype: 'arraybuffer',
        value: `ArrayBuffer(${value.ViewedArrayBuffer.ArrayBufferData.byteLength})`
      }, {
        name: 'byteLength',
        type: 'number',
        value: globalThis.String(value.ArrayLength)
      }, {
        name: 'byteOffset',
        type: 'number',
        value: globalThis.String(value.ByteOffset)
      }, {
        name: 'length',
        type: 'number',
        value: globalThis.String(length)
      });
    }
    for (const [key, desc] of value.properties) {
      if (properties.length > max) {
        overflow = true;
        break;
      }
      properties.push(propertyToPropertyPreview(key, desc, context));
    }
    for (const desc of value.PrivateElements) {
      if (properties.length > max) {
        overflow = true;
        break;
      }
      properties.push(propertyToPropertyPreview(desc.Key, desc, context));
    }
    return {
      overflow,
      properties
    };
  }

  const ShadowRealm = new ObjectInspector('ShadowRealm', undefined, () => 'ShadowRealm', {
    internalProperties: realm => [['[[GlobalObject]]', realm.ShadowRealm.GlobalObject]]
  });

  const Module = new ObjectInspector('Module', undefined, () => 'Module', {
    additionalProperties: (module, context) => {
      const result = [];
      engine262_mjs.surroundingAgent.debugger_scopePreview(() => {
        nativeEvalInAnyRealm(() => {
          for (const key of module.Exports) {
            const completion = engine262_mjs.EnsureCompletion(engine262_mjs.skipDebugger(engine262_mjs.Get(module, key)));
            if (completion instanceof engine262_mjs.NormalCompletion) {
              result.push([key.stringValue(), completion.Value]);
            }
          }
          return engine262_mjs.Value.undefined;
        }, context);
      });
      return result;
    },
    exoticProperties(module, getObjectId, context, generatePreview) {
      const result = [];
      engine262_mjs.surroundingAgent.debugger_scopePreview(() => {
        nativeEvalInAnyRealm(() => {
          for (const key of module.Exports) {
            const completion = engine262_mjs.EnsureCompletion(engine262_mjs.skipDebugger(engine262_mjs.Get(module, key)));
            if (completion instanceof engine262_mjs.NormalCompletion) {
              result.push({
                name: key.stringValue(),
                value: getInspector(completion.Value).toRemoteObject(completion.Value, getObjectId, context, generatePreview),
                writable: false,
                configurable: false,
                enumerable: true,
                isOwn: true
              });
            } else {
              const realm = module.Module.Realm;
              const evaluate = engine262_mjs.CreateBuiltinFunction(function* evaluate() {
                return yield* engine262_mjs.Get(module, key);
              }, 0, 'Module.evaluate', [], realm);
              result.push({
                name: key.stringValue(),
                get: getInspector(evaluate).toRemoteObject(evaluate, getObjectId, context, generatePreview),
                set: {
                  type: 'undefined'
                },
                writable: false,
                configurable: false,
                enumerable: true,
                isOwn: true
              });
            }
          }
          return engine262_mjs.Value.undefined;
        }, context);
      });
      return result;
    }
  });

  const RegExp = new ObjectInspector('RegExp', 'regexp', value => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);

  const Proxy$1 = new ObjectInspector('Proxy', 'proxy', value => {
    if (engine262_mjs.IsCallable(value.ProxyTarget)) {
      return 'Proxy(Function)';
    }
    if (value.ProxyTarget instanceof engine262_mjs.ObjectValue) {
      return 'Proxy(Object)';
    }
    return 'Proxy';
  });

  const Promise$1 = new ObjectInspector('Promise', 'promise', () => 'Promise', {
    internalProperties: value => [['[[PromiseState]]', engine262_mjs.Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || engine262_mjs.Value.undefined]]
  });

  const Array$1 = {
    toRemoteObject(value, getObjectId, context) {
      return {
        type: 'object',
        className: 'Array',
        subtype: 'array',
        objectId: getObjectId(value),
        description: getInspector(value).toDescription(value, context),
        preview: this.toObjectPreview?.(value, context)
      };
    },
    toPropertyPreview(name, value, context) {
      return {
        name,
        type: 'object',
        subtype: 'array',
        value: this.toDescription(value, context)
      };
    },
    toObjectPreview(value, context) {
      const result = {
        type: 'object',
        subtype: 'array',
        overflow: false,
        properties: [],
        description: this.toDescription(value, context)
      };
      const indexProp = [];
      const otherProp = [];
      for (const [key, desc] of value.properties) {
        if (indexProp.length > 100) {
          result.overflow = true;
          break;
        }
        if (engine262_mjs.isIntegerIndex(key)) {
          indexProp.push(propertyToPropertyPreview(key, desc, context));
        } else if (!(key instanceof engine262_mjs.JSStringValue && key.stringValue() === 'length')) {
          otherProp.push(propertyToPropertyPreview(key, desc, context));
        }
      }
      result.properties = indexProp.concat(otherProp).slice(0, 100);
      return result;
    },
    toDescription(value) {
      const length = [...value.properties.entries()].find(([key]) => key instanceof engine262_mjs.JSStringValue && key.stringValue() === 'length');
      if (!length || !(length[1].Value instanceof engine262_mjs.NumberValue)) {
        throw new TypeError('Bad ArrayExoticObject');
      }
      return `Array(${engine262_mjs.R(length[1].Value)})`;
    }
  };
  const globalId = new WeakMap();
  const id = new WeakMap();
  const ArrayBuffer = new ObjectInspector('ArrayBuffer', 'arraybuffer', value => `ArrayBuffer(${value.ArrayBufferByteLength})`, {
    internalProperties(value, context) {
      if (value.ArrayBufferData instanceof engine262_mjs.DataBlock) {
        if (!id.has(value.ArrayBufferData)) id.set(value.ArrayBufferData, (globalId.get(context) ?? 1000) + 1);
        const blockId = id.get(value.ArrayBufferData);
        globalId.set(context, blockId);
        return [['[[ArrayBufferByteLength]]', engine262_mjs.Value(value.ArrayBufferByteLength)], ['[[ArrayBufferData]]', engine262_mjs.Value(blockId)]];
      }
      return [];
    }
  });
  const DataView = new ObjectInspector('DataView', 'dataview', value => `DataView(${value.ByteLength})`);
  const TypedArray = new ObjectInspector('TypedArray', 'typedarray', value => `${value.TypedArrayName.stringValue()}(${value.ArrayLength})`);

  const Date$1 = new ObjectInspector('Date', 'date', value => {
    if (!globalThis.Number.isFinite(engine262_mjs.R(value.DateValue))) {
      return 'Invalid Date';
    }
    const val = engine262_mjs.DateProto_toISOString([], {
      thisValue: value,
      NewTarget: engine262_mjs.Value.undefined
    });
    return engine262_mjs.ValueOfNormalCompletion(val).stringValue();
  });
  const TemporalInstant = new ObjectInspector('Temporal.Instant', 'date', value => `Temporal.Instant <${engine262_mjs.TemporalInstantToString(value, undefined, 'auto')}>`);
  const TemporalDuration = new ObjectInspector('Temporal.Duration', 'date', value => `Temporal.Duration <${engine262_mjs.TemporalDurationToString(value, 'auto')}>`);
  const TemporalPlainDate = new ObjectInspector('Temporal.PlainDate', 'date', value => `Temporal.PlainDate <${engine262_mjs.TemporalDateToString(value, 'auto')}>`);
  const TemporalPlainDateTime = new ObjectInspector('Temporal.PlainDateTime', 'date', value => `Temporal.PlainDateTime <${engine262_mjs.ISODateTimeToString(value.ISODateTime, value.Calendar, 'auto', 'auto')}>`);
  const TemporalPlainMonthDay = new ObjectInspector('Temporal.PlainMonthDay', 'date', value => `Temporal.PlainMonthDay <${engine262_mjs.TemporalMonthDayToString(value, 'auto')}>`);
  const TemporalPlainTime = new ObjectInspector('Temporal.PlainTime', 'date', value => `Temporal.PlainTime <${engine262_mjs.TimeRecordToString(value.Time, 'auto')}>`);
  const TemporalPlainYearMonth = new ObjectInspector('Temporal.PlainYearMonth', 'date', value => `Temporal.PlainYearMonth <${engine262_mjs.TemporalYearMonthToString(value, 'auto')}>`);
  const TemporalZonedDateTime = new ObjectInspector('Temporal.ZonedDateTime', 'date', value => `Temporal.ZonedDateTime <${engine262_mjs.TemporalZonedDateTimeToString(value, 'auto', 'auto', 'auto', 'auto')}>`);

  const Map$1 = new ObjectInspector('Map', 'map', value => `Map(${value.MapData.filter(x => !!x.Key).length})`, {
    additionalProperties: value => [['size', engine262_mjs.Value(value.MapData.filter(x => !!x.Key).length)]],
    internalProperties: value => [['[[Entries]]', value.MapData]],
    entries: (value, context) => value.MapData.filter(x => x.Key).map(({
      Key,
      Value
    }) => ({
      key: getInspector(Key).toObjectPreview(Key, context),
      value: getInspector(Value).toObjectPreview(Value, context)
    }))
  });
  const Set = new ObjectInspector('Set', 'set', value => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
    additionalProperties: value => [['size', engine262_mjs.Value(value.SetData.filter(globalThis.Boolean).length)]],
    internalProperties: value => [['[[Entries]]', value.SetData]],
    entries: (value, context) => value.SetData.filter(globalThis.Boolean).map(Value => ({
      value: getInspector(Value).toObjectPreview(Value, context)
    }))
  });
  const WeakMap$1 = new ObjectInspector('WeakMap', 'weakmap', () => 'WeakMap', {
    internalProperties: value => [['[[Entries]]', value.WeakMapData]],
    entries: (value, context) => value.WeakMapData.filter(x => x.Key).map(({
      Key,
      Value
    }) => ({
      key: getInspector(Key).toObjectPreview(Key, context),
      value: getInspector(Value).toObjectPreview(Value, context)
    }))
  });
  const WeakSet = new ObjectInspector('WeakSet', 'weakset', () => 'WeakSet', {
    internalProperties: value => [['[[Entries]]', value.WeakSetData]],
    entries: (value, context) => value.WeakSetData.filter(globalThis.Boolean).map(Value => ({
      value: getInspector(Value).toObjectPreview(Value, context)
    }))
  });

  const Error$1 = new ObjectInspector('Error', 'error', (value, context) => {
    let text = '';
    engine262_mjs.surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => {
      const completion = engine262_mjs.EnsureCompletion(engine262_mjs.surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => engine262_mjs.skipDebugger(engine262_mjs.Get(value, engine262_mjs.Value('stack'))), context)));
      if (completion instanceof engine262_mjs.NormalCompletion && completion.Value instanceof engine262_mjs.JSStringValue) {
        text = completion.Value.stringValue();
        if (!text.includes('  at') && !text.includes('SyntaxError')) {
          text = '';
        }
      }
      return engine262_mjs.Value.undefined;
    }, context));
    return text || 'Error';
  }, {
    internalProperties: (error, context) => {
      const unformattedMessage = engine262_mjs.getHostDefinedErrorDetails(error).message;
      if (!unformattedMessage) return [];
      const value = nativeEvalInAnyRealm(() => engine262_mjs.CreateArrayFromList(unformattedMessage.map(part => typeof part === 'string' ? engine262_mjs.Value(part) : part)), context);
      if (!value) return [];
      return [['[[UnformattedErrorMessage]]', engine262_mjs.unwrapCompletion(value)]];
    },
    customPreview: (error, getObjectId, context) => {
      const {
        message,
        stack,
        stackGetterValue
      } = engine262_mjs.getHostDefinedErrorDetails(error);
      if (!message || !stackGetterValue) return undefined;
      const stackC = engine262_mjs.EnsureCompletion(engine262_mjs.surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => engine262_mjs.skipDebugger(engine262_mjs.Get(error, engine262_mjs.Value('stack'))), context)));
      if (stackC instanceof engine262_mjs.NormalCompletion && stackC.Value instanceof engine262_mjs.JSStringValue) {
        const stackMaybeModified = stackC.Value.stringValue();
        if (stackMaybeModified !== stackGetterValue) return undefined;
      }
      let constructorName = 'Error';
      const nameC = engine262_mjs.EnsureCompletion(engine262_mjs.surroundingAgent.debugger_scopePreview(() => nativeEvalInAnyRealm(() => engine262_mjs.skipDebugger(engine262_mjs.Get(error, engine262_mjs.Value('name'))), context)));
      if (nameC instanceof engine262_mjs.NormalCompletion && nameC.Value instanceof engine262_mjs.JSStringValue) constructorName = nameC.Value.stringValue();
      const header = JSON.stringify(['span', null, constructorName, ': ', ...message.map(part => typeof part === 'string' ? part : ['object', getInspector(part).toRemoteObject(part, getObjectId, context, false)]), stack]);
      return {
        header
      };
    }
  });

  function getInspector(value) {
    switch (true) {
      case value === engine262_mjs.Value.null:
        return Null;
      case value === engine262_mjs.Value.undefined:
        return Undefined;
      case value === engine262_mjs.Value.true || value === engine262_mjs.Value.false:
        return Boolean$1;
      case value instanceof engine262_mjs.SymbolValue:
        return Symbol;
      case value instanceof engine262_mjs.JSStringValue:
        return String$1;
      case value instanceof engine262_mjs.NumberValue:
      case value instanceof engine262_mjs.BigIntValue:
        return Number;
      case engine262_mjs.isProxyExoticObject(value):
        return Proxy$1;
      case engine262_mjs.IsCallable(value):
        return Function;
      case engine262_mjs.isArrayExoticObject(value):
        return Array$1;
      case engine262_mjs.isRegExpObject(value):
        return RegExp;
      case engine262_mjs.isDateObject(value):
        return Date$1;
      case engine262_mjs.isMapObject(value):
        return Map$1;
      case engine262_mjs.isSetObject(value):
        return Set;
      case engine262_mjs.isWeakMapObject(value):
        return WeakMap$1;
      case engine262_mjs.isWeakSetObject(value):
        return WeakSet;
      // generator
      case engine262_mjs.isErrorObject(value):
        return Error$1;
      case engine262_mjs.isPromiseObject(value):
        return Promise$1;
      case engine262_mjs.isTypedArrayObject(value):
        return TypedArray;
      case engine262_mjs.isArrayBufferObject(value):
        return ArrayBuffer;
      case engine262_mjs.isDataViewObject(value):
        return DataView;
      case engine262_mjs.isModuleNamespaceObject(value):
        return Module;
      case engine262_mjs.isShadowRealmObject(value):
        return ShadowRealm;
      case engine262_mjs.isTemporalInstantObject(value):
        return TemporalInstant;
      case engine262_mjs.isTemporalDurationObject(value):
        return TemporalDuration;
      case engine262_mjs.isTemporalPlainDateObject(value):
        return TemporalPlainDate;
      case engine262_mjs.isTemporalPlainDateTimeObject(value):
        return TemporalPlainDateTime;
      case engine262_mjs.isTemporalPlainMonthDayObject(value):
        return TemporalPlainMonthDay;
      case engine262_mjs.isTemporalPlainTimeObject(value):
        return TemporalPlainTime;
      case engine262_mjs.isTemporalPlainYearMonthObject(value):
        return TemporalPlainYearMonth;
      case engine262_mjs.isTemporalZonedDateTimeObject(value):
        return TemporalZonedDateTime;
      case value.internalSlotsList.includes('InspectorEntry'):
        return InternalInspectorEntry;
      default:
        return DefaultObject;
    }
  }

  class InspectorContext {
    #io;
    constructor(io) {
      this.#io = io;
    }
    realms = [];
    attachRealm(realm, agent) {
      const id = this.realms.length;
      const descriptor = {
        id,
        origin: realm.HostDefined.specifier || 'vm://repl',
        name: realm.HostDefined.name || 'engine262',
        uniqueId: id.toString()
      };
      this.realms.push({
        realm,
        descriptor,
        agent,
        detach: () => {
          realm.HostDefined.attachingInspector = oldInspector;
          realm.HostDefined.attachingInspectorReportError = function attachingInspectorReportError(realm, error) {
            if (this.attachingInspector && realm instanceof engine262_mjs.ManagedRealm) {
              this.attachingInspector.console(realm, 'error', [error]);
            }
          };
        }
      });
      const oldInspector = realm.HostDefined.attachingInspector;
      realm.HostDefined.attachingInspector = this.#io;
      const oldPromiseRejectionTracker = realm.HostDefined.promiseRejectionTracker;
      realm.HostDefined.promiseRejectionTracker = (promise, operation) => {
        oldPromiseRejectionTracker?.(promise, operation);
        if (operation === 'reject') {
          this.#io.sendEvent['Runtime.exceptionThrown']({
            timestamp: Date.now(),
            exceptionDetails: this.createExceptionDetails(promise, true)
          });
        } else {
          const id = this.#exceptionMap.get(promise);
          if (id) {
            this.#io.sendEvent['Runtime.exceptionRevoked']({
              reason: 'Handler added to rejected promise',
              exceptionId: id
            });
          }
        }
      };
      this.#io.sendEvent['Runtime.executionContextCreated']({
        context: descriptor
      });
    }
    detachAgent(agent) {
      for (const realm of this.realms) {
        if (realm?.agent === agent) {
          this.detachRealm(realm.realm);
        }
      }
    }
    detachRealm(realm) {
      const index = this.realms.findIndex(c => c?.realm === realm);
      if (index === -1) {
        return;
      }
      const {
        descriptor
      } = this.realms[index];
      realm.HostDefined.attachingInspector = undefined;
      realm.HostDefined.attachingInspectorReportError = undefined;
      this.realms[index] = undefined;
      this.#io.sendEvent['Runtime.executionContextDestroyed']({
        executionContextId: descriptor.id,
        executionContextUniqueId: descriptor.uniqueId
      });
    }
    getRealm(realm) {
      if (realm === undefined) {
        if (engine262_mjs.surroundingAgent.runningExecutionContext && engine262_mjs.surroundingAgent.currentRealmRecord instanceof engine262_mjs.ManagedRealm) {
          realm = engine262_mjs.surroundingAgent.currentRealmRecord;
        } else {
          return undefined;
        }
      }
      if (typeof realm === 'string') {
        return this.realms.find(c => c?.descriptor.uniqueId === realm);
      } else if (typeof realm === 'number') {
        return this.realms[realm];
      }
      return this.realms.find(c => c?.realm === realm);
    }

    /** @deprecated in this case we are guessing the realm should be using, which may create bad result */
    getAnyRealm() {
      return this.realms.find(Boolean);
    }
    #idToObject = new Map();
    #objectToId = new Map();
    #objectCounter = 1;
    #internObject(object, group = 'default') {
      if (this.#objectToId.has(object)) {
        return this.#objectToId.get(object);
      }
      const id = `${group}:${this.#objectCounter}`;
      this.#objectCounter += 1;
      this.#idToObject.set(id, object);
      this.#objectToId.set(object, id);
      return id;
    }
    releaseObject(id) {
      const object = this.#idToObject.get(id);
      if (object) {
        this.#idToObject.delete(id);
        this.#objectToId.delete(object);
      }
    }
    releaseObjectGroup(group) {
      for (const [id, object] of this.#idToObject.entries()) {
        if (id.startsWith(group)) {
          this.#idToObject.delete(id);
          this.#objectToId.delete(object);
        }
      }
    }
    getObject(objectId) {
      return this.#idToObject.get(objectId);
    }
    toRemoteObject(value, options) {
      return getInspector(value).toRemoteObject(value, val => this.#internObject(val, options.objectGroup), this, options.generatePreview);
    }
    getProperties({
      objectId,
      accessorPropertiesOnly,
      generatePreview,
      nonIndexedPropertiesOnly,
      ownProperties
    }) {
      const object = this.getObject(objectId);
      if (!(object instanceof engine262_mjs.ObjectValue)) {
        return {
          result: []
        };
      }
      const wrap = v => this.toRemoteObject(v, {
        generatePreview
      });
      const properties = [];
      const internalProperties = [];
      const privateProperties = [];
      if (!accessorPropertiesOnly) {
        object.PrivateElements.forEach(value => {
          const desc = {
            name: value.Key.Description.stringValue()
          };
          if (value.Value) desc.value = wrap(value.Value);
          if (value.Get) desc.get = wrap(value.Get);
          if (value.Set) desc.set = wrap(value.Set);
          privateProperties.push(desc);
        });
        const exoticProperties = getInspector(object).exoticProperties?.(object, val => this.#internObject(val), this, generatePreview);
        if (exoticProperties) {
          properties.push(...exoticProperties);
        }
      }
      (() => {
        let p = object;
        while (p instanceof engine262_mjs.ObjectValue) {
          for (const key of p.properties.keys()) {
            if (nonIndexedPropertiesOnly && engine262_mjs.isIntegerIndex(key)) {
              continue;
            }
            const desc = p.properties.get(key);
            if (!desc) {
              return;
            }
            if (accessorPropertiesOnly && !engine262_mjs.IsAccessorDescriptor(desc)) {
              continue;
            }
            const descriptor = {
              name: key instanceof engine262_mjs.JSStringValue ? key.stringValue() : engine262_mjs.SymbolDescriptiveString(key).stringValue(),
              writable: desc.Writable === engine262_mjs.Value.true,
              configurable: desc.Configurable === engine262_mjs.Value.true,
              enumerable: desc.Enumerable === engine262_mjs.Value.true,
              isOwn: p === object
            };
            if (desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value)) descriptor.value = wrap(desc.Value);
            if (desc.Get) descriptor.get = wrap(desc.Get);
            if (desc.Set) descriptor.set = wrap(desc.Set);
            if (key instanceof engine262_mjs.SymbolValue) descriptor.symbol = wrap(key);
            properties.push(descriptor);
          }
          if (ownProperties) {
            break;
          }
          if ('Prototype' in p) {
            p = p.Prototype;
          } else {
            p = engine262_mjs.Value.null;
          }
        }
      })();
      const additionalInternalFields = getInspector(object).toInternalProperties?.(object, val => this.#internObject(val, 'default'), this, generatePreview);
      if (additionalInternalFields) {
        internalProperties.push(...additionalInternalFields);
      }
      if ('Prototype' in object) {
        internalProperties.push({
          name: '[[Prototype]]',
          value: wrap(object.Prototype)
        });
      }
      return {
        result: properties,
        internalProperties,
        privateProperties
      };
    }
    #exceptionMap = new WeakMap();
    createExceptionDetails(completion, isPromise) {
      const value = completion instanceof engine262_mjs.ThrowCompletion ? completion.Value : completion;
      const {
        callStack
      } = engine262_mjs.getHostDefinedErrorDetails(value);
      const frames = InspectorContext.callSiteToCallFrame(callStack);
      const exceptionId = this.#objectCounter;
      this.#objectCounter += 1;
      this.#exceptionMap.set(value, exceptionId);
      return {
        text: isPromise ? 'Uncaught (in promise)' : 'Uncaught',
        stackTrace: callStack ? {
          callFrames: frames
        } : undefined,
        exception: getInspector(value).toRemoteObject(value, val => this.#internObject(val), this, false),
        lineNumber: frames[0]?.lineNumber || 0,
        columnNumber: frames[0]?.columnNumber || 0,
        exceptionId,
        scriptId: frames[0]?.scriptId,
        url: frames[0]?.url
      };
    }
    static callSiteToCallFrame(callSite) {
      return callSite?.map(call => call.toCallFrame()).filter(Boolean) || [];
    }
    createEvaluationResult(completion) {
      completion = engine262_mjs.EnsureCompletion(completion);
      if (!(completion.Value instanceof engine262_mjs.Value)) {
        throw new RangeError('Invalid completion value');
      }
      return {
        exceptionDetails: completion instanceof engine262_mjs.ThrowCompletion ? this.createExceptionDetails(completion, false) : undefined,
        result: this.toRemoteObject(completion.Value, {})
      };
    }
    getDebuggerCallFrame() {
      const stacks = engine262_mjs.getCurrentStack(false);
      const length = engine262_mjs.surroundingAgent.executionContextStack.length;
      return stacks.map((stack, index) => {
        if (!stack.getScriptId()) {
          return undefined;
        }
        const scopeChain = [];
        let env = stack.context.LexicalEnvironment;
        while (env instanceof engine262_mjs.EnvironmentRecord) {
          const result = getDisplayObjectFromEnvironmentRecord(env);
          if (result) {
            scopeChain.push({
              type: result.type,
              object: this.toRemoteObject(result.object, {})
            });
          }
          env = env.OuterEnv;
        }
        return {
          callFrameId: String(length - index - 1),
          functionName: stack.getFunctionName() || '<anonymous>',
          location: {
            scriptId: stack.getScriptId(),
            lineNumber: (stack.lineNumber || 1) - 1,
            columnNumber: (stack.columnNumber || 1) - 1
          },
          this: this.toRemoteObject(HostGetThisEnvironment(stack.context.LexicalEnvironment), {}),
          url: stack.getSpecifier() || '',
          canBeRestarted: false,
          functionLocation: engine262_mjs.isECMAScriptFunctionObject(stack.context.Function) ? {
            lineNumber: (stack.context.Function.ECMAScriptCode?.location.start.line || 1) - 1,
            columnNumber: (stack.context.Function.ECMAScriptCode?.location.start.column || 1) - 1,
            scriptId: stack.getScriptId() || ''
          } : undefined,
          scopeChain
        };
      }).filter(Boolean);
    }
    evaluateMode = 'script';
  }
  function HostGetThisEnvironment(env) {
    while (!(env instanceof engine262_mjs.NullValue)) {
      const exists = env.HasThisBinding();
      if (exists === engine262_mjs.Value.true) {
        const value = env.GetThisBinding();
        if (value instanceof engine262_mjs.ThrowCompletion) {
          return engine262_mjs.Value.undefined;
        }
        return value;
      }
      const outer = env.OuterEnv;
      env = outer;
    }
    throw new ReferenceError('No this environment found');
  }
  function getDisplayObjectFromEnvironmentRecord(record) {
    if (record instanceof engine262_mjs.DeclarativeEnvironmentRecord) {
      const object = engine262_mjs.OrdinaryObjectCreate(engine262_mjs.Value.null, ['HostInspectorScopePreview']);
      for (const [key, binding] of record.bindings) {
        const value = binding.initialized ? binding.value : engine262_mjs.OrdinaryObjectCreate(engine262_mjs.Value.null, ['HostUninitializedBindingMarkerObject']);
        if (engine262_mjs.isArgumentExoticObject(value)) {
          continue;
        }
        object.properties.set(key, engine262_mjs.Descriptor({
          Enumerable: engine262_mjs.isArgumentExoticObject(value) ? engine262_mjs.Value.false : engine262_mjs.Value.true,
          Value: value,
          Writable: binding.mutable ? engine262_mjs.Value.true : engine262_mjs.Value.false
        }));
      }
      let type = 'block';
      if (record instanceof engine262_mjs.FunctionEnvironmentRecord) {
        type = 'local';
      } else if (record instanceof engine262_mjs.ModuleEnvironmentRecord) {
        type = 'module';
      }
      if (type !== 'local' && !object.properties.size) {
        return undefined;
      }
      return {
        type,
        object
      };
    } else if (record instanceof engine262_mjs.ObjectEnvironmentRecord) {
      return {
        type: record.IsWithEnvironment === engine262_mjs.Value.true ? 'with' : 'global',
        object: record.BindingObject
      };
    } else if (record instanceof engine262_mjs.GlobalEnvironmentRecord) {
      return {
        type: 'global',
        object: record.GlobalThisValue
      };
    }
    throw new TypeError('Unknown environment record');
  }

  function getParsedEvent(source, id, executionContextId) {
    const lines = source.ECMAScriptCode.sourceText.split('\n');
    return {
      isModule: source instanceof engine262_mjs.SourceTextModuleRecord,
      scriptId: id,
      url: source.HostDefined?.specifier || `vm:///${id}`,
      startLine: 0,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines.pop().length,
      executionContextId,
      hash: '',
      buildId: ''
    };
  }

  const Debugger = {
    enable(_req, context) {
      context.onDebuggerConnect();
      return {
        debuggerId: 'debugger.0'
      };
    },
    disable(_req, context) {
      context.onDebuggerDisconnect();
    },
    getScriptSource({
      scriptId
    }) {
      const source = engine262_mjs.surroundingAgent.parsedSources.get(scriptId);
      if (!source) {
        throw new Error('Not found');
      }
      return {
        scriptSource: source.ECMAScriptCode.sourceText
      };
    },
    setAsyncCallStackDepth() {},
    setBlackboxPatterns() {},
    setBlackboxExecutionContexts() {},
    // #region breakpoints
    getPossibleBreakpoints() {
      // getPossibleBreakpoints({ start, end, restrictToFunction }) {
      return {
        locations: []
      };
      // return { locations: getBreakpointCandidates(start, end, restrictToFunction) };
    },
    removeBreakpoint({
      breakpointId
    }) {
      engine262_mjs.surroundingAgent?.removeBreakpoint(breakpointId);
    },
    // setBreakpoint({ location, condition }) { },
    setBreakpointByUrl(req) {
      return engine262_mjs.surroundingAgent?.addBreakpointByUrl(req);
    },
    // setBreakpointOnFunctionCall({ objectId, condition }) { },
    setBreakpointsActive({
      active
    }) {
      engine262_mjs.surroundingAgent.breakpointsEnabled = active;
    },
    // setInstrumentationBreakpoint({ instrumentation }) { },
    setPauseOnExceptions({
      state
    }) {
      if (engine262_mjs.surroundingAgent) {
        engine262_mjs.surroundingAgent.pauseOnExceptions = state === 'none' ? undefined : state;
      }
    },
    // #endregion

    stepInto(_, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate({
        pauseAt: 'step-in'
      });
    },
    resume(_, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate();
    },
    stepOver(_req, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate({
        pauseAt: 'step-over'
      });
    },
    stepOut(_req, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate({
        pauseAt: 'step-out'
      });
    },
    evaluateOnCallFrame(req, context) {
      return evaluate({
        ...req,
        uniqueContextId: context.context.getRealm(undefined).descriptor.uniqueId,
        evalMode: context.context.evaluateMode
      }, context);
    },
    engine262_setEvaluateMode({
      mode
    }, {
      context
    }) {
      if (mode === 'module' || mode === 'script' || mode === 'console') {
        context.evaluateMode = mode;
      }
    },
    engine262_setFeatures() {
      throw new Error('Method should not be implemented here.');
    }
  };
  const Profiler = {
    enable() {}
  };
  const Runtime = {
    discardConsoleEntries() {},
    enable() {},
    compileScript(options, {
      context,
      sendEvent
    }) {
      let parsed;
      let realm = context.getRealm(options.executionContextId);
      if (!realm && !options.persistScript) {
        realm = context.getAnyRealm();
      }
      if (!realm) {
        return unsupportedError;
      }
      realm.realm.scope(() => {
        if (context.evaluateMode === 'module') {
          parsed = engine262_mjs.ParseModule(options.expression, realm.realm, {
            specifier: options.sourceURL,
            doNotTrackScriptId: !options.persistScript
          });
        } else {
          parsed = engine262_mjs.ParseScript(options.expression, realm.realm, {
            specifier: options.sourceURL,
            doNotTrackScriptId: !options.persistScript,
            [engine262_mjs.kInternal]: {
              allowAllPrivateNames: true,
              allowAwait: true
            }
          });
        }
      });
      if (!parsed) {
        throw new Error('No parsed result');
      }
      if (Array.isArray(parsed)) {
        const e = context.createExceptionDetails(engine262_mjs.ThrowCompletion(parsed[0]), false);
        // Note: it has to be this message to trigger devtools' line wrap.
        e.exception.description = 'SyntaxError: Unexpected end of input';
        return {
          exceptionDetails: e
        };
      }
      if (options.persistScript) {
        if (realm?.descriptor.id === undefined) {
          throw new Error('No realm id found');
        }
        const event = getParsedEvent(parsed, parsed.HostDefined.scriptId, realm.descriptor.id);
        sendEvent['Debugger.scriptParsed'](event);
        return {
          scriptId: event.scriptId
        };
      }
      return {};
    },
    callFunctionOn(options, {
      context
    }) {
      const realmDesc = context.getRealm(options.uniqueContextId || options.executionContextId) || context.getAnyRealm();
      if (!realmDesc) {
        throw new Error('No realm found');
      }
      const {
        Value: F
      } = realmDesc.realm.evaluateScript(`(${options.functionDeclaration})`, {
        doNotTrackScriptId: true
      });
      const thisValue = options.objectId ? context.getObject(options.objectId) : engine262_mjs.Value.undefined;
      const args = options.arguments?.map(a => {
        // TODO: revisit
        if ('value' in a) {
          return engine262_mjs.Value(a.value);
        }
        if (a.objectId) {
          return context.getObject(a.objectId);
        }
        if ('unserializableValue' in a) {
          throw new RangeError();
        }
        return engine262_mjs.Value.undefined;
      });
      return realmDesc.realm.scope(() => {
        const completion = engine262_mjs.evalQ((Q, X) => {
          const r = Q(engine262_mjs.skipDebugger(engine262_mjs.Call(F, thisValue, args || [])));
          if (options.returnByValue) {
            const value = X(engine262_mjs.Call(realmDesc.realm.Intrinsics['%JSON.stringify%'], engine262_mjs.Value.undefined, [r]));
            if (value instanceof engine262_mjs.JSStringValue) {
              const valueRealized = JSON.parse(value.stringValue());
              return {
                result: {
                  type: typeof value,
                  value: valueRealized
                }
              };
            }
          }
          return context.createEvaluationResult(r);
        });
        if (completion instanceof engine262_mjs.ThrowCompletion) {
          return {
            result: {
              type: 'undefined'
            },
            exceptionDetails: context.createExceptionDetails(completion, false)
          };
        }
        return completion.Value;
      });
    },
    evaluate(options, context) {
      return evaluate({
        ...options,
        evalMode: context.context.evaluateMode,
        uniqueContextId: options.uniqueContextId
      }, context);
    },
    getExceptionDetails(req, {
      context
    }) {
      const object = context.getObject(req.errorObjectId);
      if (object instanceof engine262_mjs.ObjectValue) {
        return {
          exceptionDetails: context.createExceptionDetails(engine262_mjs.ThrowCompletion(object), false)
        };
      }
      return {
        exceptionDetails: {
          text: 'unsupported',
          lineNumber: 0,
          columnNumber: 0,
          exceptionId: 0
        }
      };
    },
    getHeapUsage() {
      return {
        usedSize: 0,
        totalSize: 0,
        backingStorageSize: 0,
        embedderHeapUsedSize: 0
      };
    },
    getIsolateId() {
      return {
        id: 'isolate.0'
      };
    },
    getProperties(options, {
      context
    }) {
      return context.getProperties(options);
    },
    globalLexicalScopeNames({
      executionContextId
    }, {
      context
    }) {
      const global = context.getRealm(executionContextId)?.realm.GlobalObject;
      if (!global) {
        return {
          names: []
        };
      }
      const keys = engine262_mjs.skipDebugger(global.OwnPropertyKeys());
      if (keys instanceof engine262_mjs.ThrowCompletion) {
        return {
          names: []
        };
      }
      return {
        names: engine262_mjs.ValueOfNormalCompletion(keys).map(k => k instanceof engine262_mjs.JSStringValue ? k.stringValue() : null).filter(Boolean)
      };
    },
    releaseObject(req, {
      context
    }) {
      context.releaseObject(req.objectId);
    },
    releaseObjectGroup({
      objectGroup
    }, {
      context
    }) {
      context.releaseObjectGroup(objectGroup);
    },
    runIfWaitingForDebugger() {}
  };
  const HeapProfiler = {
    enable() {},
    collectGarbage() {}
  };
  const Target = {
    setDiscoverTargets() {},
    // @ts-expect-error no doc
    setRemoteLocations() {}
  };
  const unsupportedError = {
    result: {
      type: 'undefined'
    },
    exceptionDetails: {
      text: 'unsupported',
      lineNumber: 0,
      columnNumber: 0,
      exceptionId: 0
    }
  };
  function evaluate(options, inspectorContext) {
    const {
      context
    } = inspectorContext;
    const isPreview = options.throwOnSideEffect;
    if (options.awaitPromise) {
      return unsupportedError;
    }
    const realm = context.getRealm(options.uniqueContextId);
    if (!realm) {
      return unsupportedError;
    }
    const isCallOnFrame = typeof options.callFrameId === 'string';
    let callOnFramePoppedLevel = 0;
    const oldExecutionStack = [...engine262_mjs.surroundingAgent.executionContextStack];
    if (isCallOnFrame) {
      const frame = engine262_mjs.surroundingAgent.executionContextStack[options.callFrameId];
      if (!frame) {
        inspectorContext.sendEvent['Runtime.exceptionThrown']({
          timestamp: Date.now(),
          exceptionDetails: {
            columnNumber: 0,
            exceptionId: 0,
            lineNumber: 0,
            text: `Execution context not found for callFrameId ${options.callFrameId}`
          }
        });
        return unsupportedError;
      }
      for (const currentFrame of [...engine262_mjs.surroundingAgent.executionContextStack].reverse()) {
        if (currentFrame === frame) {
          break;
        }
        callOnFramePoppedLevel += 1;
        engine262_mjs.surroundingAgent.executionContextStack.pop(currentFrame);
      }
    }
    const promise = new Promise(resolve => {
      let toBeEvaluated;
      if (isPreview || options.evalMode === 'console' || isCallOnFrame) {
        toBeEvaluated = performDevtoolsEval(options.expression, realm.realm, false, !!(isPreview || isCallOnFrame));
      } else {
        let parsed;
        const realm = context.getRealm(options.uniqueContextId);
        realm?.realm.scope(() => {
          if (options.evalMode === 'module') {
            parsed = engine262_mjs.ParseModule(options.expression, realm.realm);
          } else {
            parsed = engine262_mjs.ParseScript(options.expression, realm.realm);
          }
        });
        if (Array.isArray(parsed)) {
          const e = context.createExceptionDetails(engine262_mjs.ThrowCompletion(parsed[0]), false);
          resolve({
            exceptionDetails: e,
            result: {
              type: 'undefined'
            }
          });
          return;
        }
        toBeEvaluated = parsed;
      }
      const noDebuggerEvaluate = () => {
        if (!engine262_mjs.isEvaluator(toBeEvaluated)) {
          throw new engine262_mjs.Assert.Error('Unexpected');
        }
        resolve(context.createEvaluationResult(engine262_mjs.skipDebugger(toBeEvaluated)));
      };
      if (isPreview) {
        engine262_mjs.surroundingAgent.debugger_scopePreview(noDebuggerEvaluate);
        return;
      }
      if (isCallOnFrame) {
        noDebuggerEvaluate();
        return;
      }
      const completion = realm.realm.evaluate(toBeEvaluated, completion => {
        resolve(context.createEvaluationResult(completion));
        engine262_mjs.runJobQueue();
      });
      if (completion) {
        return;
      }
      engine262_mjs.surroundingAgent.resumeEvaluate();
    });
    promise.then(() => {
      if (callOnFramePoppedLevel) {
        engine262_mjs.Assert(oldExecutionStack.length - callOnFramePoppedLevel === engine262_mjs.surroundingAgent.executionContextStack.length);
        for (const [newIndex, newStack] of engine262_mjs.surroundingAgent.executionContextStack.entries()) {
          engine262_mjs.Assert(newStack === oldExecutionStack[newIndex]);
        }
        engine262_mjs.surroundingAgent.executionContextStack.length = 0;
        for (const stack of oldExecutionStack) {
          engine262_mjs.surroundingAgent.executionContextStack.push(stack);
        }
      }
    }, err => {
      const expr = engine262_mjs.surroundingAgent.runningExecutionContext?.callSite.lastNode?.sourceText;
      const frame = InspectorContext.callSiteToCallFrame(engine262_mjs.captureStack().stack);
      inspectorContext.sendEvent['Runtime.exceptionThrown']({
        timestamp: Date.now(),
        exceptionDetails: {
          stackTrace: frame.length ? {
            callFrames: frame
          } : undefined,
          text: `engine262 error when evaluating the following node:\n\n    ${expr}\n\n${err.constructor.name}: ${err.message}\n${err.stack.slice(err.stack.indexOf(err.message) + err.message.length + 1)}\n\nFrom now on, the engine262 VM state is broken, please press the reload button.`,
          columnNumber: frame[0]?.columnNumber,
          lineNumber: frame[0]?.lineNumber,
          scriptId: frame[0]?.scriptId,
          url: frame[0]?.url,
          exceptionId: 0
        }
      });
      return {
        result: {
          type: 'undefined'
        }
      };
    });
    return promise;
  }

  var impl = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Debugger: Debugger,
    HeapProfiler: HeapProfiler,
    Profiler: Profiler,
    Runtime: Runtime,
    Target: Target
  });

  const consoleMethods = ['log', 'debug', 'info', 'error', 'warning', 'dir', 'dirxml', 'table', 'trace', 'clear', 'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd'];
  function createConsole(realm, defaultBehaviour) {
    realm.scope(() => {
      const console = engine262_mjs.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
      engine262_mjs.skipDebugger(engine262_mjs.DefinePropertyOrThrow(realm.GlobalObject, engine262_mjs.Value('console'), engine262_mjs.Descriptor({
        Configurable: engine262_mjs.Value.true,
        Enumerable: engine262_mjs.Value.false,
        Writable: engine262_mjs.Value.true,
        Value: console
      })));
      consoleMethods.forEach(method => {
        const f = engine262_mjs.CreateBuiltinFunction(function* Console(args) {
          if (engine262_mjs.surroundingAgent.debugger_isPreviewing) {
            return engine262_mjs.Value.undefined;
          }
          let completion;
          if (defaultBehaviour[method]) {
            completion = defaultBehaviour[method](args);
          } else if (defaultBehaviour.default) {
            completion = defaultBehaviour.default(method, args);
          }
          if (completion) {
            if (engine262_mjs.isEvaluator(completion)) {
              completion = yield* completion;
            }
            // Do not use Q(host) here. A host may return something invalid like ReturnCompletion.
            if (completion instanceof engine262_mjs.ThrowCompletion) {
              return completion;
            }
          }
          if (realm.HostDefined.attachingInspector) {
            realm.HostDefined.attachingInspector.console(realm, method, args);
          }
          return engine262_mjs.Value.undefined;
        }, 1, engine262_mjs.Value(method), []);
        engine262_mjs.skipDebugger(engine262_mjs.CreateDataProperty(console, engine262_mjs.Value(method), f));
      });
    });
  }

  const ignoreNamespaces = ['Network'];
  const ignoreMethods = [];
  class Inspector {
    #context = new InspectorContext(this);
    #agents = [];
    attachAgent(agent, priorRealms) {
      const oldOnDebugger = agent.hostDefinedOptions.onDebugger;
      agent.hostDefinedOptions.onDebugger = () => {
        oldOnDebugger?.();
        this.sendEvent['Debugger.paused']({
          reason: 'debugCommand',
          callFrames: this.#context.getDebuggerCallFrame()
        });
      };
      const oldOnRealmCreated = agent.hostDefinedOptions.onRealmCreated;
      agent.hostDefinedOptions.onRealmCreated = realm => {
        oldOnRealmCreated?.(realm);
        this.#context.attachRealm(realm, agent);
      };
      const oldOnScriptParsed = agent.hostDefinedOptions.onScriptParsed;
      agent.hostDefinedOptions.onScriptParsed = (script, id) => {
        oldOnScriptParsed?.(script, id);
        const realmId = this.#context.getRealm(script.Realm)?.descriptor.id;
        if (realmId === undefined) {
          return;
        }
        this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
      };
      this.#agents.push({
        agent,
        onDetach: () => {
          agent.hostDefinedOptions.onDebugger = oldOnDebugger;
          agent.hostDefinedOptions.onRealmCreated = oldOnRealmCreated;
          agent.hostDefinedOptions.onScriptParsed = oldOnScriptParsed;
          this.#agents = this.#agents.filter(x => x.agent !== agent);
        }
      });
      priorRealms.forEach(realm => {
        this.#context.attachRealm(realm, agent);
      });
    }
    detachAgent(agent) {
      const record = this.#agents.find(x => x.agent === agent);
      record?.onDetach();
      this.#context.detachAgent(agent);
    }
    preference = {
      previewDebug: false
    };
    onMessage(id, methodArg, params) {
      if (ignoreMethods.includes(methodArg)) {
        return;
      }
      const [namespace, method] = methodArg.split('.');
      if (ignoreNamespaces.includes(namespace)) {
        return;
      }
      if (!(namespace in impl)) {
        this.sendEvent['Runtime.consoleAPICalled']({
          timestamp: Date.now(),
          type: 'warning',
          executionContextId: 0,
          args: [{
            type: 'string',
            value: `engine262 internal error: Namespace not implemented: ${namespace}.*`
          }]
        });
        return;
      }
      const ns = impl[namespace];
      if (!(method in ns)) {
        this.sendEvent['Runtime.consoleAPICalled']({
          timestamp: Date.now(),
          type: 'warning',
          executionContextId: 0,
          args: [{
            type: 'string',
            value: `engine262 internal error: Method not implemented: ${namespace}.${method}`
          }]
        });
        return;
      }
      const f = ns[method];
      new Promise(resolve => {
        resolve(f(params, this.#debugContext));
      }).then((result = {}) => {
        this.send({
          id,
          result
        });
      });
    }
    sendEvent = Object.create(new Proxy({}, {
      get: (_, key) => {
        const f = params => {
          if (this.#debuggerAttached) {
            this.send({
              method: key,
              params
            });
          }
        };
        Object.defineProperty(this.sendEvent, key, {
          value: f
        });
        return f;
      }
    }));
    console(realm, type, args) {
      const context = this.#context.getRealm(realm);
      if (!context) {
        return;
      }
      this.sendEvent['Runtime.consoleAPICalled']({
        type,
        args: args.map(x => this.#context.toRemoteObject(x, {})),
        executionContextId: context.descriptor.id,
        timestamp: Date.now()
      });
    }
    #debuggerAttached = false;
    onDebuggerDisconnect() {
      this.#debuggerAttached = false;
    }
    #onDebuggerConnected() {
      this.#context.realms.forEach(realm => {
        if (realm) {
          this.sendEvent['Runtime.executionContextCreated']({
            context: realm.descriptor
          });
        }
      });
      this.#agents.forEach(({
        agent
      }) => {
        agent.parsedSources.forEach((script, id) => {
          const realmId = this.#context.getRealm(script.Realm)?.descriptor.id;
          if (realmId === undefined) {
            return;
          }
          this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
        });
      });
    }
    #debugContext = {
      sendEvent: this.sendEvent,
      preference: this.preference,
      context: this.#context,
      onDebuggerConnect: () => {
        if (!this.#debuggerAttached) {
          this.#debuggerAttached = true;
          this.#onDebuggerConnected();
        }
      },
      onDebuggerDisconnect: () => {
        this.#debuggerAttached = false;
      }
    };
  }

  exports.Inspector = Inspector;
  exports.createConsole = createConsole;

}));
//# sourceMappingURL=inspector.js.map
