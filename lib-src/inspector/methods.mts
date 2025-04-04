import type { Protocol } from 'devtools-protocol';
import type {
  DebuggerContext,
  DebuggerNamespace, HeapProfilerNamespace, ProfilerNamespace, RuntimeNamespace,
} from './types.mts';
import { getParsedEvent } from './internal-utils.mts';
import type { InspectorContext } from './context.mts';
import {
  Call, NormalCompletion, ObjectValue, ParseScript, runJobQueue, ScriptRecord, surroundingAgent, ThrowCompletion, skipDebugger, Value, type FunctionObject,
  ParseModule,
  SourceTextModuleRecord, performDevtoolsEval,
  ValueOfNormalCompletion,
  JSStringValue,
  evalQ,
  Assert,
  kInternal,
} from '#self';

export const Debugger: DebuggerNamespace = {
  enable(_req, { onDebuggerAttached }) {
    onDebuggerAttached();
    return { debuggerId: 'debugger.0' };
  },
  getScriptSource({ scriptId }) {
    const source = surroundingAgent.parsedSources.get(scriptId);
    if (!source) {
      throw new Error('Not found');
    }
    return { scriptSource: source.ECMAScriptCode.sourceText() };
  },
  setAsyncCallStackDepth() { },
  setBlackboxPatterns() { },
  setPauseOnExceptions() { },
  setBlackboxExecutionContexts() { },
  setBreakpointByUrl() {
    return { breakpointId: '0', locations: [] };
  },
  stepInto(_, { sendEvent }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({ pauseAt: 'step-in' });
  },
  resume(_, { sendEvent }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate();
  },
  stepOver(_req, { sendEvent }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({ pauseAt: 'step-over' });
  },
  stepOut(_req, { sendEvent }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({ pauseAt: 'step-out' });
  },
  evaluateOnCallFrame(req, context) {
    return evaluate({
      ...req,
      uniqueContextId: context.context.getRealm(undefined)!.descriptor.uniqueId,
      evalMode: context.context.evaluateMode,
    }, context);
  },
  engine262_setEvaluateMode({ mode }, { context }) {
    if (mode === 'module' || mode === 'script' || mode === 'console') {
      context.evaluateMode = mode;
    }
  },
  engine262_setFeatures() {
    throw new Error('Method should not be implemented here.');
  },
};
export const Profiler: ProfilerNamespace = {
  enable() { },
};
export const Runtime: RuntimeNamespace = {
  discardConsoleEntries() { },
  enable() {},
  compileScript(options, { context, sendEvent }) {
    let parsed!: ScriptRecord | SourceTextModuleRecord | ObjectValue[];
    let realm = context.getRealm(options.executionContextId);
    if (!realm && !options.persistScript) {
      realm = context.getAnyRealm();
    }
    if (!realm) {
      return unsupportedError;
    }
    realm.realm.scope(() => {
      if (context.evaluateMode === 'module') {
        parsed = ParseModule(options.expression, realm.realm, { specifier: options.sourceURL, doNotTrackScriptId: !options.persistScript });
      } else {
        parsed = ParseScript(options.expression, realm.realm, { specifier: options.sourceURL, doNotTrackScriptId: !options.persistScript, [kInternal]: { allowAllPrivateNames: true } });
      }
    });
    if (!parsed) {
      throw new Error('No parsed result');
    }
    if (Array.isArray(parsed)) {
      const e = context.createExceptionDetails(ThrowCompletion(parsed[0]), false);
      // Note: it has to be this message to trigger devtools' line wrap.
      e.exception!.description = 'SyntaxError: Unexpected end of input';
      return { exceptionDetails: e };
    }
    if (options.persistScript) {
      if (realm?.descriptor.id === undefined) {
        throw new Error('No realm id found');
      }
      const event = getParsedEvent(parsed, parsed.HostDefined.scriptId!, realm.descriptor.id);
      sendEvent['Debugger.scriptParsed'](event);
      return { scriptId: event.scriptId };
    }
    return {};
  },
  callFunctionOn(options, { context }): Protocol.Runtime.CallFunctionOnResponse {
    const realmDesc = context.getRealm(options.uniqueContextId || options.executionContextId) || context.getAnyRealm();
    if (!realmDesc) {
      throw new Error('No realm found');
    }
    const { Value: F } = realmDesc.realm.evaluateScript(`(${options.functionDeclaration})`, { doNotTrackScriptId: true }) as NormalCompletion<FunctionObject>;
    const thisValue = options.objectId
      ? context.getObject(options.objectId)!
      : Value.undefined;
    const args = options.arguments?.map((a) => {
      // TODO: revisit
      if ('value' in a) {
        return Value(a.value);
      }
      if (a.objectId) {
        return context.getObject(a.objectId)!;
      }
      if ('unserializableValue' in a) {
        throw new RangeError();
      }
      return Value.undefined;
    });
    return realmDesc.realm.scope((): Protocol.Runtime.CallFunctionOnResponse => {
      const completion = evalQ((Q, X): Protocol.Runtime.CallFunctionOnResponse => {
        const r = Q(skipDebugger(Call(F, thisValue, args || [])));
        if (options.returnByValue) {
          const value = X(Call(realmDesc.realm.Intrinsics['%JSON.stringify%'], Value.undefined, [r]));
          if (value instanceof JSStringValue) {
            const valueRealized = JSON.parse(value.stringValue());
            return { result: { type: typeof value, value: valueRealized } };
          }
        }
        return context.createEvaluationResult(r);
      });
      if (completion instanceof ThrowCompletion) {
        return { result: { type: 'undefined' }, exceptionDetails: context.createExceptionDetails(completion, false) };
      }
      return completion.Value;
    });
  },
  evaluate(options, context) {
    return evaluate({
      ...options,
      evalMode: context.context.evaluateMode,
      uniqueContextId: options.uniqueContextId!,
    }, context);
  },
  getExceptionDetails(req, { context }) {
    const object = context.getObject(req.errorObjectId)!;
    if (object instanceof ObjectValue) {
      return {
        exceptionDetails: context.createExceptionDetails(ThrowCompletion(object), false),
      };
    }
    return {
      exceptionDetails: {
        text: 'unsupported', lineNumber: 0, columnNumber: 0, exceptionId: 0,
      },
    };
  },
  getHeapUsage() {
    return {
      usedSize: 0, totalSize: 0, backingStorageSize: 0, embedderHeapUsedSize: 0,
    };
  },
  getIsolateId() {
    return { id: 'isolate.0' };
  },
  getProperties(options, { context }) {
    return context.getProperties(options);
  },
  globalLexicalScopeNames({ executionContextId }, { context }) {
    const global = context.getRealm(executionContextId)?.realm.GlobalObject;
    if (!global) {
      return { names: [] };
    }
    const keys = skipDebugger(global.OwnPropertyKeys());
    if (keys instanceof ThrowCompletion) {
      return { names: [] };
    }
    return { names: ValueOfNormalCompletion(keys).map((k) => (k instanceof JSStringValue ? k.stringValue() : null!)).filter(Boolean) };
  },
  releaseObject(req, { context }) {
    context.releaseObject(req.objectId);
  },
  releaseObjectGroup({ objectGroup }, { context }) {
    context.releaseObjectGroup(objectGroup);
  },
  runIfWaitingForDebugger() { },
};
export const HeapProfiler: HeapProfilerNamespace = {
  enable() { },
  collectGarbage() { },
};

const unsupportedError: Protocol.Runtime.EvaluateResponse = {
  result: { type: 'undefined' },
  exceptionDetails: {
    text: 'unsupported', lineNumber: 0, columnNumber: 0, exceptionId: 0,
  },
};
function evaluate(options: {
  uniqueContextId: string,
  expression: string,
  evalMode: InspectorContext['evaluateMode'],
  throwOnSideEffect?: boolean,
  awaitPromise?: boolean,
  callFrameId?: string,
}, _context: DebuggerContext): Protocol.Runtime.EvaluateResponse | Promise<Protocol.Runtime.EvaluateResponse> {
  const { context } = _context;
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
  const oldExecutionStack = [...surroundingAgent.executionContextStack];
  if (isCallOnFrame) {
    const frame = surroundingAgent.executionContextStack[options.callFrameId as `${number}`];
    if (!frame) {
      // eslint-disable-next-line no-console
      console.error('Execution context not found: ', options.callFrameId);
      return unsupportedError;
    }
    for (const currentFrame of [...surroundingAgent.executionContextStack].reverse()) {
      if (currentFrame === frame) {
        break;
      }
      callOnFramePoppedLevel += 1;
      surroundingAgent.executionContextStack.pop(currentFrame);
    }
  }
  const promise = new Promise<Protocol.Runtime.EvaluateResponse>((resolve) => {
    let toBeEvaluated;
    if (isPreview || options.evalMode === 'console' || isCallOnFrame) {
      toBeEvaluated = performDevtoolsEval(options.expression, realm.realm, false, !!(isPreview || isCallOnFrame));
    } else {
      let parsed!: ScriptRecord | SourceTextModuleRecord | ObjectValue[];
      const realm = context.getRealm(options.uniqueContextId);
      realm?.realm.scope(() => {
        if (options.evalMode === 'module') {
          parsed = ParseModule(options.expression, realm.realm);
        } else {
          parsed = ParseScript(options.expression, realm.realm);
        }
      });
      if (Array.isArray(parsed)) {
        const e = context.createExceptionDetails(ThrowCompletion(parsed[0]), false);
        // Note: it has to be this message to trigger devtools' line wrap.
        e.exception!.description = 'SyntaxError: Unexpected end of input';
        resolve({ exceptionDetails: e, result: { type: 'undefined' } });
        return;
      }
      toBeEvaluated = parsed;
    }

    const noDebuggerEvaluate = () => {
      if (!('next' in toBeEvaluated)) {
        throw new Assert.Error('Unexpected');
      }
      resolve(context.createEvaluationResult(skipDebugger(toBeEvaluated)));
    };
    if (isPreview) {
      surroundingAgent.debugger_scopePreview(noDebuggerEvaluate);
      return;
    }
    if (isCallOnFrame) {
      noDebuggerEvaluate();
      return;
    }

    const completion = realm.realm.evaluate(toBeEvaluated, (completion) => {
      resolve(context.createEvaluationResult(completion));
      runJobQueue();
    });
    if (completion) {
      return;
    }
    surroundingAgent.resumeEvaluate();
  });
  promise.then(() => {
    if (callOnFramePoppedLevel) {
      Assert(oldExecutionStack.length - callOnFramePoppedLevel === surroundingAgent.executionContextStack.length);
      for (const [newIndex, newStack] of surroundingAgent.executionContextStack.entries()) {
        Assert(newStack === oldExecutionStack[newIndex]);
      }
      surroundingAgent.executionContextStack.length = 0;
      for (const stack of oldExecutionStack) {
        surroundingAgent.executionContextStack.push(stack);
      }
    }
  });
  return promise;
}
