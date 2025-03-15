import type { Protocol } from 'devtools-protocol';
import type { InspectorContext } from './context.mts';

export interface DebuggerPreference {
  preview: boolean;
  previewDebug: boolean;
}

export interface DebuggerContext {
  sendEvent: DevtoolEvents;
  getContext(executionContextId?: number | undefined): InspectorContext;
  preference: DebuggerPreference;
}
export interface DebuggerNamespace {
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-continueToLocation */
  continueToLocation?(req: Protocol.Debugger.ContinueToLocationRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-disable */
  disable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-enable */
  enable?(req: Protocol.Debugger.EnableRequest, context: DebuggerContext): Protocol.Debugger.EnableResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-evaluateOnCallFrame */
  evaluateOnCallFrame?(req: Protocol.Debugger.EvaluateOnCallFrameRequest, context: DebuggerContext): Protocol.Debugger.EvaluateOnCallFrameResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-getPossibleBreakpoints */
  getPossibleBreakpoints?(req: Protocol.Debugger.GetPossibleBreakpointsRequest, context: DebuggerContext): Protocol.Debugger.GetPossibleBreakpointsResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-getScriptSource */
  getScriptSource?(req: Protocol.Debugger.GetScriptSourceRequest, context: DebuggerContext): Protocol.Debugger.GetScriptSourceResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-pause */
  pause?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-removeBreakpoint */
  removeBreakpoint?(req: Protocol.Debugger.RemoveBreakpointRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-restartFrame */
  restartFrame?(req: Protocol.Debugger.RestartFrameRequest, context: DebuggerContext): Protocol.Debugger.RestartFrameResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-resume */
  resume?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-searchInContent */
  searchInContent?(req: Protocol.Debugger.SearchInContentRequest, context: DebuggerContext): Protocol.Debugger.SearchInContentResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setAsyncCallStackDepth */
  setAsyncCallStackDepth?(req: Protocol.Debugger.SetAsyncCallStackDepthRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBreakpoint */
  setBreakpoint?(req: Protocol.Debugger.SetBreakpointRequest, context: DebuggerContext): Protocol.Debugger.SetBreakpointResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBreakpointByUrl */
  setBreakpointByUrl?(req: Protocol.Debugger.SetBreakpointByUrlRequest, context: DebuggerContext): Protocol.Debugger.SetBreakpointByUrlResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBreakpointsActive */
  setBreakpointsActive?(req: Protocol.Debugger.SetBreakpointsActiveRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setInstrumentationBreakpoint */
  setInstrumentationBreakpoint?(req: Protocol.Debugger.SetInstrumentationBreakpointRequest, context: DebuggerContext): Protocol.Debugger.SetInstrumentationBreakpointResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setPauseOnExceptions */
  setPauseOnExceptions?(req: Protocol.Debugger.SetPauseOnExceptionsRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setScriptSource */
  setScriptSource?(req: Protocol.Debugger.SetScriptSourceRequest, context: DebuggerContext): Protocol.Debugger.SetScriptSourceResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setSkipAllPauses */
  setSkipAllPauses?(req: Protocol.Debugger.SetSkipAllPausesRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setVariableValue */
  setVariableValue?(req: Protocol.Debugger.SetVariableValueRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-stepInto */
  stepInto?(req: Protocol.Debugger.StepIntoRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-stepOut */
  stepOut?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-stepOver */
  stepOver?(req: Protocol.Debugger.StepOverRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-getStackTrace */
  getStackTrace?(req: Protocol.Debugger.GetStackTraceRequest, context: DebuggerContext): Protocol.Debugger.GetStackTraceResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBlackboxedRanges */
  setBlackboxedRanges?(req: Protocol.Debugger.SetBlackboxedRangesRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBlackboxExecutionContexts */
  setBlackboxExecutionContexts?(req: Protocol.Debugger.SetBlackboxExecutionContextsRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBlackboxPatterns */
  setBlackboxPatterns?(req: Protocol.Debugger.SetBlackboxPatternsRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setBreakpointOnFunctionCall */
  setBreakpointOnFunctionCall?(req: Protocol.Debugger.SetBreakpointOnFunctionCallRequest, context: DebuggerContext): Protocol.Debugger.SetBreakpointOnFunctionCallResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#method-setReturnValue */
  setReturnValue?(req: Protocol.Debugger.SetReturnValueRequest, context: DebuggerContext): void;
}

export interface ProfilerNamespace {
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-disable */
  disable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-enable */
  enable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-getBestEffortCoverage */
  getBestEffortCoverage?(req: void, context: DebuggerContext): Protocol.Profiler.GetBestEffortCoverageResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-setSamplingInterval */
  setSamplingInterval?(req: Protocol.Profiler.SetSamplingIntervalRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-start */
  start?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-startPreciseCoverage */
  startPreciseCoverage?(req: Protocol.Profiler.StartPreciseCoverageRequest, context: DebuggerContext): Protocol.Profiler.StartPreciseCoverageResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-stop */
  stop?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-stopPreciseCoverage */
  stopPreciseCoverage?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#method-takePreciseCoverage */
  takePreciseCoverage?(req: void, context: DebuggerContext): Protocol.Profiler.TakePreciseCoverageResponse;
}

export interface RuntimeNamespace {
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-addBinding */
  addBinding?(req: Protocol.Runtime.AddBindingRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-awaitPromise */
  awaitPromise?(req: Protocol.Runtime.AwaitPromiseRequest, context: DebuggerContext): Protocol.Runtime.AwaitPromiseResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-callFunctionOn */
  callFunctionOn?(req: Protocol.Runtime.CallFunctionOnRequest, context: DebuggerContext): Protocol.Runtime.CallFunctionOnResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-compileScript */
  compileScript?(req: Protocol.Runtime.CompileScriptRequest, context: DebuggerContext): Protocol.Runtime.CompileScriptResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-disable */
  disable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-discardConsoleEntries */
  discardConsoleEntries?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-enable */
  enable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-evaluate */
  evaluate?(req: Protocol.Runtime.EvaluateRequest, context: DebuggerContext): Protocol.Runtime.EvaluateResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-getProperties */
  getProperties?(req: Protocol.Runtime.GetPropertiesRequest, context: DebuggerContext): Protocol.Runtime.GetPropertiesResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-globalLexicalScopeNames */
  globalLexicalScopeNames?(req: Protocol.Runtime.GlobalLexicalScopeNamesRequest, context: DebuggerContext): Protocol.Runtime.GlobalLexicalScopeNamesResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-queryObjects */
  queryObjects?(req: Protocol.Runtime.QueryObjectsRequest, context: DebuggerContext): Protocol.Runtime.QueryObjectsResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-releaseObject */
  releaseObject?(req: Protocol.Runtime.ReleaseObjectRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-releaseObjectGroup */
  releaseObjectGroup?(req: Protocol.Runtime.ReleaseObjectGroupRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-removeBinding */
  removeBinding?(req: Protocol.Runtime.RemoveBindingRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-runIfWaitingForDebugger */
  runIfWaitingForDebugger?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-runScript */
  runScript?(req: Protocol.Runtime.RunScriptRequest, context: DebuggerContext): Protocol.Runtime.RunScriptResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-setAsyncCallStackDepth */
  setAsyncCallStackDepth?(req: Protocol.Runtime.SetAsyncCallStackDepthRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-getExceptionDetails */
  getExceptionDetails?(req: Protocol.Runtime.GetExceptionDetailsRequest, context: DebuggerContext): Protocol.Runtime.GetExceptionDetailsResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-getHeapUsage */
  getHeapUsage?(req: void, context: DebuggerContext): Protocol.Runtime.GetHeapUsageResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-getIsolateId */
  getIsolateId?(req: void, context: DebuggerContext): Protocol.Runtime.GetIsolateIdResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-setCustomObjectFormatterEnabled */
  setCustomObjectFormatterEnabled?(req: Protocol.Runtime.SetCustomObjectFormatterEnabledRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-setMaxCallStackSizeToCapture */
  setMaxCallStackSizeToCapture?(req: Protocol.Runtime.SetMaxCallStackSizeToCaptureRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#method-terminateExecution */
  terminateExecution?(req: void, context: DebuggerContext): void;
}

export interface HeapProfilerNamespace {
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-addInspectedHeapObject */
  addInspectedHeapObject?(req: Protocol.HeapProfiler.AddInspectedHeapObjectRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-collectGarbage */
  collectGarbage?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-disable */
  disable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-enable */
  enable?(req: void, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-getHeapObjectId */
  getHeapObjectId?(req: Protocol.HeapProfiler.GetHeapObjectIdRequest, context: DebuggerContext): Protocol.HeapProfiler.GetHeapObjectIdResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-getObjectByHeapObjectId */
  getObjectByHeapObjectId?(req: Protocol.HeapProfiler.GetObjectByHeapObjectIdRequest, context: DebuggerContext): Protocol.HeapProfiler.GetObjectByHeapObjectIdResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-getSamplingProfile */
  getSamplingProfile?(req: void, context: DebuggerContext): Protocol.HeapProfiler.GetSamplingProfileResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-startSampling */
  startSampling?(req: Protocol.HeapProfiler.StartSamplingRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-startTrackingHeapObjects */
  startTrackingHeapObjects?(req: Protocol.HeapProfiler.StartTrackingHeapObjectsRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-stopSampling */
  stopSampling?(req: void, context: DebuggerContext): Protocol.HeapProfiler.StopSamplingResponse;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-stopTrackingHeapObjects */
  stopTrackingHeapObjects?(req: Protocol.HeapProfiler.StopTrackingHeapObjectsRequest, context: DebuggerContext): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-takeHeapSnapshot */
  takeHeapSnapshot?(req: Protocol.HeapProfiler.TakeHeapSnapshotRequest, context: DebuggerContext): void;
}

export interface DevtoolEvents {
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#event-paused */
  'Debugger.paused'(event: Protocol.Debugger.PausedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#event-resumed */
  'Debugger.resumed'(event: void): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#event-scriptFailedToParse */
  'Debugger.scriptFailedToParse'(event: Protocol.Debugger.ScriptFailedToParseEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#event-scriptParsed */
  'Debugger.scriptParsed'(event: Protocol.Debugger.ScriptParsedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#event-addHeapSnapshotChunk */
  'HeapProfiler.addHeapSnapshotChunk'(event: Protocol.HeapProfiler.AddHeapSnapshotChunkEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#event-heapStatsUpdate */
  'HeapProfiler.heapStatsUpdate'(event: Protocol.HeapProfiler.HeapStatsUpdateEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#event-lastSeenObjectId */
  'HeapProfiler.lastSeenObjectId'(event: Protocol.HeapProfiler.LastSeenObjectIdEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#event-reportHeapSnapshotProgress */
  'HeapProfiler.reportHeapSnapshotProgress'(event: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#event-resetProfiles */
  'HeapProfiler.resetProfiles'(event: void): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#event-consoleProfileFinished */
  'Profiler.consoleProfileFinished'(event: Protocol.Profiler.ConsoleProfileFinishedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#event-consoleProfileStarted */
  'Profiler.consoleProfileStarted'(event: Protocol.Profiler.ConsoleProfileStartedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Profiler/#event-preciseCoverageDeltaUpdate */
  'Profiler.preciseCoverageDeltaUpdate'(event: Protocol.Profiler.PreciseCoverageDeltaUpdateEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-consoleAPICalled */
  'Runtime.consoleAPICalled'(event: Protocol.Runtime.ConsoleAPICalledEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-exceptionRevoked */
  'Runtime.exceptionRevoked'(event: Protocol.Runtime.ExceptionRevokedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-exceptionThrown */
  'Runtime.exceptionThrown'(event: Protocol.Runtime.ExceptionThrownEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-executionContextCreated */
  'Runtime.executionContextCreated'(event: Protocol.Runtime.ExecutionContextCreatedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-executionContextDestroyed */
  'Runtime.executionContextDestroyed'(event: Protocol.Runtime.ExecutionContextDestroyedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-executionContextsCleared */
  'Runtime.executionContextsCleared'(event: void): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-inspectRequested */
  'Runtime.inspectRequested'(event: Protocol.Runtime.InspectRequestedEvent): void;
  /** https://chromedevtools.github.io/devtools-protocol/v8/Runtime/#event-bindingCalled */
  'Runtime.bindingCalled'(event: Protocol.Runtime.BindingCalledEvent): void;
}
