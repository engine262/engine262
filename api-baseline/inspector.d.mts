import type { Agent } from '#self';
import { Arguments } from '#self';
import { ManagedRealm } from '#self';
import { PlainCompletion } from '#self';
import { PlainEvaluator } from '#self';
import type { Protocol } from 'devtools-protocol';
import type { Realm } from '#self';

export declare type ConsoleMethod = (typeof consoleMethods)[number];

export declare const consoleMethods: readonly ['log', 'debug', 'info', 'error', 'warning', 'dir', 'dirxml', 'table', 'trace', 'clear', 'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd'];

export declare function createConsole(realm: ManagedRealm, defaultBehaviour: Partial<Record<ConsoleMethod, (args: Arguments) => void | PlainCompletion<void> | PlainEvaluator<void>>> & {
    default?: (method: ConsoleMethod, args: Arguments) => void | PlainCompletion<void> | PlainEvaluator<void>;
}): void;

export declare interface DebuggerPreference {
    previewDebug: boolean;
}

export declare interface DevtoolEvents {
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

export declare abstract class Inspector {
    #private;
    attachAgent(agent: Agent, priorRealms: ManagedRealm[]): void;
    detachAgent(agent: Agent): void;
    protected abstract send(data: object): void;
    readonly preference: DebuggerPreference;
    protected onMessage(id: unknown, methodArg: string, params: unknown): void;
    sendEvent: DevtoolEvents;
    console(realm: Realm, type: Protocol.Runtime.ConsoleAPICalledEventType, args: Arguments): void;
    onDebuggerDisconnect(): void;
}

export { }
