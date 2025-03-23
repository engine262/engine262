import type { Protocol } from 'devtools-protocol';
import type {
  DebuggerContext,
  DebuggerNamespace, HeapProfilerNamespace, ProfilerNamespace, RuntimeNamespace,
} from './types.mts';
import { getParsedEvent, ParsedScripts } from './internal-utils.mts';
import {
  Call, NormalCompletion, ObjectValue, ParseScript, runJobQueue, surroundingAgent, ThrowCompletion, skipDebugger, Value, type FunctionObject,
  type ScriptRecord,
} from '#self';

export const Debugger: DebuggerNamespace = {
  enable(_req, { onDebuggerAttached }) {
    onDebuggerAttached();
    return { debuggerId: 'debugger.0' };
  },
  getScriptSource({ scriptId }) {
    const id = parseInt(scriptId, 10);
    if (Number.isNaN(id)) {
      return { scriptSource: '// Invalid script id' };
    }
    const record = ParsedScripts[id];
    if (!record) {
      return { scriptSource: '// Not found' };
    }
    return { scriptSource: record.ECMAScriptCode.sourceText() };
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
    return evaluate(req, context);
  },
};
export const Profiler: ProfilerNamespace = {
  enable() { },
};
export const Runtime: RuntimeNamespace = {
  discardConsoleEntries() { },
  enable() {},
  compileScript(options, { getContext, sendEvent }) {
    const context = getContext(options.executionContextId);
    const scriptId = ParsedScripts.length;
    let rec!: ScriptRecord | ObjectValue[];
    context.realm.scope(() => {
      rec = ParseScript(options.expression, context.realm, { specifier: options.sourceURL, scriptId: options.persistScript ? String(scriptId) : undefined });
    });
    if (Array.isArray(rec)) {
      const e = context.createExceptionDetails(ThrowCompletion(rec[0]));
      // Note: it has to be this message to trigger devtools' line wrap.
      e.exception!.description = 'SyntaxError: Unexpected end of input';
      return { exceptionDetails: e };
    }
    if (options.persistScript) {
      ParsedScripts.push(rec);
      const event = getParsedEvent(rec, scriptId, options.executionContextId || 0);
      sendEvent['Debugger.scriptParsed'](event);
      return { scriptId: event.scriptId };
    }
    return {};
  },
  callFunctionOn(options, { getContext }) {
    const context = getContext(options.executionContextId);
    const { Value: F } = context.realm.evaluateScript(`(${options.functionDeclaration})`) as NormalCompletion<FunctionObject>;
    const thisValue = options.objectId
      ? context.getObject(options.objectId)!
      : Value.undefined;
    const args = options.arguments?.map((a) => {
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
    const r = skipDebugger(Call(F, thisValue, args || []));
    return context.createEvaluationResult(r);
  },
  evaluate(options, _context) {
    return evaluate(options, _context);
  },
  getExceptionDetails(req, { getContext }) {
    const context = getContext();
    const object = context.getObject(req.errorObjectId)!;
    if (object instanceof ObjectValue) {
      return {
        // @ts-expect-error
        exceptionDetails: context.createExceptionDetails(ThrowCompletion(object), {}),
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
  getProperties(options, { getContext }) {
    const context = getContext();
    const object = context.getObject(options.objectId)!;
    // @ts-expect-error
    return context.getProperties(object, options);
  },
  globalLexicalScopeNames({ executionContextId }, { getContext }) {
    const context = getContext(executionContextId);
    const envRec = context.realm.GlobalEnv;
    const names = Array.from(envRec.DeclarativeRecord.bindings.keys(), (v) => v.stringValue());
    return { names };
  },
  releaseObject(req, { getContext }) {
    getContext().releaseObject(req.objectId);
  },
  releaseObjectGroup({ objectGroup }, { getContext }) {
    getContext().releaseObjectGroup(objectGroup);
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
  throwOnSideEffect?: boolean,
  awaitPromise?: boolean,
  contextId?: number | undefined,
  callFrameId?: string,
  expression: string,
}, _context: DebuggerContext) {
  const { getContext, preference } = _context;
  const isPreview = options.throwOnSideEffect;
  if (options.awaitPromise || (!preference.preview && isPreview)) {
    return unsupportedError;
  }

  const context = getContext(options.contextId);
  if (options.callFrameId) {
    const frame = surroundingAgent.executionContextStack[options.callFrameId as `${number}`];
    if (!frame) {
      // eslint-disable-next-line no-console
      console.error('Execution context not found: ', options.callFrameId);
      return unsupportedError;
    }
    // const old = surroundingAgent.executionContextStack;
  }
  // TODO: introduce devtool scoping
  if (isPreview) {
    const completion = context.realm.evaluateScript(options.expression, { inspectorPreview: true });
    return context.createEvaluationResult(completion);
  } else {
    const compileResult = Runtime.compileScript!({
      expression: options.expression, executionContextId: options.contextId, persistScript: true, sourceURL: '',
    }, _context);
    if (compileResult.exceptionDetails) {
      return { exceptionDetails: compileResult.exceptionDetails, result: { type: 'undefined' } } as Protocol.Runtime.EvaluateResponse;
    }
    const parsedScript = ParsedScripts[compileResult.scriptId! as `${number}`];
    return new Promise<Protocol.Runtime.EvaluateResponse>((resolve) => {
      context.realm.evaluate(parsedScript, (completion) => {
        resolve(context.createEvaluationResult(completion));
        runJobQueue();
      });
      surroundingAgent.resumeEvaluate();
    });
  }
}
