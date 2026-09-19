import decimal from 'jsbd';
import type { Protocol } from 'devtools-protocol';
import type { RoundOption } from 'jsbd/dist/type.js';

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare type AbruptCompletion = ThrowCompletion | ReturnCompletion | BreakCompletion | ContinueCompletion;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare const AbruptCompletion: abstract new <const T>(init: AbruptCompletionInit) => {
    readonly Type: 'break' | 'continue' | 'return' | 'throw';
    readonly Value: T | Value;
    readonly Target: string | undefined;
    mark(m: GCMarker): void;
};

export declare type AbruptCompletionInit = BreakCompletionInit | ContinueCompletionInit | ReturnCompletionInit | ThrowCompletionInit;

export declare abstract class AbstractEventLoop implements EventLoop {
    #private;
    protected readonly surroundingAgent: Agent;
    readonly onNoPendingJob: Set<() => void>;
    constructor(surroundingAgent: Agent);
    abstract enqueue(type: NodeJSJobType | string, job: Job): void;
    protected abstract shiftNextJob(): Job | undefined;
    protected abstract get hasQueuedJobs(): boolean;
    protected tryScheduleAutomaticFlush(): void;
    /**
     * Enqueue a host job (macrotask) in the future.
     * It will keep `hasPendingJobs` to be `true` until `enqueue` is called.
     *
     * @example
     * ```
     * eventLoop.enqueueAsync('timers', job, (enqueue, cancel) => {
     *   setTimeout(() => {
     *     enqueue();
     *   }, timeout);
     * });
     * ```
     */
    enqueueAsync(type: NodeJSJobType | string, job: Job, doAsyncEnqueue: (enqueue: () => void, cancel: () => void) => void): void;
    get hasPendingJobs(): boolean;
    /** Change the automatic run type of the event loop */
    run(type: EventLoopRunType): void;
    runOnce(): void;
    mark(marker: GCMarker): void;
}

export declare interface AbstractModuleInit {
    readonly Realm: AbstractModuleRecord['Realm'];
    readonly Environment: AbstractModuleRecord['Environment'];
    readonly HostDefined: AbstractModuleRecord['HostDefined'];
    readonly ModuleSource?: AbstractModuleRecord['ModuleSource'];
    readonly Namespace: AbstractModuleRecord['Namespace'];
}

/** https://tc39.es/ecma262/#sec-abstract-module-records */
declare abstract class AbstractModuleRecord {
    abstract LoadRequestedModules(importedNames?: ImportedNamesValue, hostDefined?: ModuleRecordHostDefined): PromiseObject;
    abstract GetExportedNames(exportStarSet?: AbstractModuleRecord[]): readonly string[];
    abstract ResolveExport(exportName: string, resolveSet?: ResolveSetItem[], deferNamespaceExportSet?: AbstractModuleRecord[]): 'ambiguous' | ResolvedBindingRecord | null;
    abstract Link(importedNames?: ImportedNamesValue): PlainCompletion<void>;
    abstract Evaluate(importedNames?: ImportedNamesValue): Evaluator<PromiseObject>;
    /** https://tc39.es/proposal-deferred-reexports/#abstract-getoptionalindirectexportsmodulerequests */
    GetOptionalIndirectExportsModuleRequests(_importedNames?: ImportedNamesValue): readonly ModuleRequestRecord[];
    GetModuleSourceKind(): string;
    readonly Realm: Realm;
    readonly Environment: ModuleEnvironmentRecord | undefined;
    readonly Namespace: ObjectValue | undefined;
    readonly DeferredNamespace: ObjectValue | undefined;
    readonly ModuleSource: ObjectValue | undefined;
    readonly HostDefined: ModuleRecordHostDefined | undefined;
    constructor(init: AbstractModuleInit);
    mark(m: GCMarker): void;
}
export { AbstractModuleRecord }
export { AbstractModuleRecord as ModuleRecord }

/** https://tc39.es/ecma262/#sec-isaccessordescriptor */
export declare interface AccessorDescriptor extends Descriptor {
    readonly Get: FunctionObject | UndefinedValue;
    readonly Set: FunctionObject | UndefinedValue;
}

export declare type AccessorDescriptorInit = ({
    readonly Get: FunctionObject | UndefinedValue;
    readonly Set?: FunctionObject | UndefinedValue;
} | {
    readonly Get?: FunctionObject | UndefinedValue;
    readonly Set: FunctionObject | UndefinedValue;
}) & Partial<DescriptorWithEnumerableAndConfigurable>;

/** https://tc39.es/ecma262/#active-function-object */
export declare function activeFunctionObject(): NullValue | FunctionObject;

/** https://tc39.es/proposal-temporal/#sec-temporal-add24hourdaystotimeduration */
export declare function Add24HourDaysToTimeDuration(timeDuration: TimeDuration, days: Integer): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddaystoisodate */
export declare function AddDaysToISODate(isoDate: ISODateRecord, days: Integer): ISODateRecord;

/** https://tc39.es/ecma262/#sec-adddisposableresource */
export declare function AddDisposableResource(disposableResourceStack: DisposableResourceRecord[], value: Value, kind: DisposableResourceKind, method?: FunctionObject): PlainEvaluator<void>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurations */
export declare function AddDurations(operation: 'add' | 'subtract', duration: TemporalDurationObject, _other: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodate */
export declare function AddDurationToDate(operation: 'add' | 'subtract', temporalDate: TemporalPlainDateObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodatetime */
export declare function AddDurationToDateTime(operation: 'add' | 'subtract', dateTime: TemporalPlainDateTimeObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoinstant */
export declare function AddDurationToInstant(operation: 'add' | 'subtract', instant: TemporalInstantObject, temporalDurationLike: Value): ValueEvaluator<TemporalInstantObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtotime */
export declare function AddDurationToTime(operation: 'add' | 'subtract', temporalTime: TemporalPlainTimeObject, temporalDurationLike: Value): ValueEvaluator<TemporalPlainTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoyearmonth */
export declare function AddDurationToYearMonth(operation: 'add' | 'subtract', yearMonth: TemporalPlainYearMonthObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalPlainYearMonthObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adddurationtozoneddatetime */
export declare function AddDurationToZonedDateTime(operation: 'add' | 'subtract', zonedDateTime: TemporalZonedDateTimeObject, temporalDurationLike: Value, options: Value): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-addepochnanoseconds */
export declare function AddEpochNanoseconds(epochNanoseconds: EpochNanoseconds, timeDuration: TimeDuration): PlainCompletion<EpochNanoseconds>;

export declare function AddRestrictedFunctionProperties(F: ObjectValue, realm: Realm): void;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtime */
export declare function AddTime(time: TimeRecord, timeDuration: TimeDuration): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimeduration */
export declare function AddTimeDuration(xTimeDuration: TimeDuration, yTimeDuration: TimeDuration): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-addtimedurationtoepochnanoseconds */
export declare function AddTimeDurationToEpochNanoseconds(timeDuration: TimeDuration, epochNanoseconds: EpochNanoseconds): Integer;

/** https://tc39.es/ecma262/#sec-addtokeptobjects */
export declare function AddToKeptObjects(object: ObjectValue | SymbolValue): void;

/** https://tc39.es/ecma262/#sec-add-value-to-keyed-group */
export declare function AddValueToKeyedGroup(groups: KeyedGroupRecord[], key: PropertyKeyValue, value: Value): void;

/** https://tc39.es/proposal-temporal/#sec-temporal-addzoneddatetime */
export declare function AddZonedDateTime(epochNanoseconds: EpochNanoseconds, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, duration: InternalDurationRecord, overflow: 'constrain' | 'reject'): PlainCompletion<EpochNanoseconds>;

/** https://tc39.es/proposal-temporal/#sec-temporal-adjustdatedurationrecord */
export declare function AdjustDateDurationRecord(dateDuration: DateDurationRecord, days: Integer, weeks?: Integer, months?: Integer): PlainCompletion<DateDurationRecord>;

/** https://tc39.es/ecma262/#sec-agents */
export declare class Agent {
    #private;
    readonly executionContextStack: ExecutionContextStack;
    /** https://tc39.es/ecma262/#running-execution-context */
    get runningExecutionContext(): ExecutionContext;
    get hasRunningExecutionContext(): boolean;
    readonly AgentRecord: AgentRecord;
    readonly jobQueue: JobQueue;
    readonly eventLoop: EventLoop;
    readonly finalizationRegistryScheduledForCleanup: Set<FinalizationRegistryObject>;
    hostDefinedOptions: AgentHostDefined;
    constructor(options?: AgentHostDefined);
    /** https://tc39.es/ecma262/#current-realm */
    get currentRealmRecord(): Realm;
    /** https://tc39.es/ecma262/#active-function-object */
    get activeFunctionObject(): NullValue | FunctionObject;
    intrinsic<const T extends keyof Intrinsics>(name: T): Intrinsics[T];
    feature(name: Feature): boolean;
    mark(m: GCMarker): void;
    /** Evaluate an evaluator. It will skip the debugger if the agent is already debugger-paused. */
    evaluate<T extends Value>(evaluator: ValueEvaluator<T>, onFinished: (completion: NormalCompletion<T> | ThrowCompletion) => void, evaluationOptions?: ResumeEvaluateOptions | false): void;
    isPaused(): boolean;
    resumeEvaluate(options?: ResumeEvaluateOptions): IteratorResult<void, ValueCompletion>;
    parsedSources: Map<string, DynamicParsedCodeRecord | ScriptRecord | SourceTextModuleRecord>;
    addParsedSource(source: ScriptRecord | SourceTextModuleRecord): void;
    addDynamicParsedSource(realm: Realm, sourceText: string, ast?: unknown[] | ParseNode.Expression | ParseNode.Script): string | undefined;
    breakpointsEnabled: boolean;
    pauseOnExceptions: undefined | 'caught' | 'uncaught' | 'all';
    breakpointsByFunction: WeakSet<FunctionObject>;
    testBreakpoint(node: ParseNode): boolean;
    addBreakpointByUrl(breakpoint: Protocol.Debugger.SetBreakpointByUrlRequest): Protocol.Debugger.SetBreakpointByUrlResponse;
    addBreakpointOnFunctionCall(f: FunctionObject, condition: string | undefined): Protocol.Debugger.SetBreakpointOnFunctionCallResponse;
    addInstrumentationBreakpoint(breakpoint: Protocol.Debugger.SetInstrumentationBreakpointRequest): Protocol.Debugger.SetInstrumentationBreakpointResponse;
    addBreakpointByLocation(breakpoint: Protocol.Debugger.SetBreakpointRequest): Protocol.Debugger.SetBreakpointResponse;
    removeBreakpoint(breakpointId: string): void;
    get debugger_isPreviewing(): boolean;
    get debugger_cannotPreview(): ThrowCompletion<ObjectValue> | undefined;
    debugger_tryTouchDuringPreview(object: ObjectValue): ThrowCompletion<ObjectValue> | undefined;
    debugger_markObjectCreated(object: ObjectValue): void;
    debugger_scopePreview(): Disposable | null;
    debugger_scopePreview<T>(cb: () => T): T;
}

/** https://tc39.es/ecma262/#sec-agentcansuspend */
export declare function AgentCanSuspend(): boolean;

export declare interface AgentHostDefined {
    errorStackAttachNativeStack?: boolean;
    features?: readonly string[];
    hostHooks?: HostHooks;
    jobQueue?: JobQueue;
    eventLoop?: (agent: Agent) => EventLoop;
    eventLoopRunType?: EventLoopRunType;
    startEventLoop?: boolean;
    onDebugger?(reason?: DebuggerPauseReason): void;
    onNodeEvaluation?(node: ParseNode, realm: Realm): void;
    onRealmCreated?(realm: ManagedRealm): void;
    onScriptParsed?(script: ScriptRecord | SourceTextModuleRecord | DynamicParsedCodeRecord, scriptId: string): void;
    resizableArrayBufferMaxByteLength?: number;
    supportedImportAttributes?: readonly string[];
    /** Promise rejection is standardized, but uncaught exception is not. */
    uncaughtExceptionTrackers?: Set<(error: Value) => void>;
}

/** https://tc39.es/ecma262/#table-agent-record */
export declare interface AgentRecord {
    readonly LittleEndian: boolean;
    readonly CanBlock: boolean;
    readonly Signifier: number;
    readonly IsLockFree1: boolean;
    readonly IsLockFree2: boolean;
    readonly IsLockFree8: boolean;
    readonly CandidateExecution?: never;
    KeptAlive: Set<ObjectValue | SymbolValue>;
    ModuleAsyncEvaluationCount: number;
    readonly GlobalSymbolRegistry: GlobalSymbolRegistryRecord[];
    readonly GetAvailableNamedTimeZoneIdentifierReturns: AvailableNamedTimeZoneIdentifierReturnRecord[];
}

/** https://tc39.es/ecma262/#sec-agentsignifier */
export declare function AgentSignifier(): number;

/** https://tc39.es/ecma262/#sec-AllImportAttributesSupported */
export declare function AllImportAttributesSupported(attributes: readonly ImportAttributeRecord[]): string | undefined;

/** https://tc39.es/ecma262/#sec-allocatearraybuffer */
export declare function AllocateArrayBuffer(constructor: FunctionObject, byteLength: number, maxByteLength?: number): ValueEvaluator<ArrayBufferObject>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-applydecoratorsanddefinemethod */
export declare function ApplyDecoratorsAndDefineMethod(homeObject: ObjectValue, methodDefinition: ClassElementDefinitionRecord, extraInitializers: FunctionObject[], isStatic: boolean): PlainEvaluator<void>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-applydecoratorstoclassdefinition */
export declare function ApplyDecoratorsToClassDefinition(classDef: FunctionObject, decorators: readonly DecoratorDefinitionRecord[], className: string | PropertyKeyValue | PrivateName, extraInitializers: FunctionObject[]): PlainEvaluator<FunctionObject>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-applydecoratorstoelementdefinition */
export declare function ApplyDecoratorsToElementDefinition(_homeObject: ObjectValue, elementRecord: ClassElementDefinitionRecord, extraInitializers: FunctionObject[], isStatic: boolean): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator */
export declare function ApplyStringOrNumericBinaryOperator(lval: Value, opText: BinaryOperator, rval: Value): Generator<EvaluatorYieldType, BigIntValue | JSStringValue | NumberValue | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/proposal-temporal/#sec-applyunsignedroundingmode */
export declare function ApplyUnsignedRoundingMode(quantity: MathematicalValue, lowerBound: MathematicalValue, upperBound: MathematicalValue, unsignedRoundingMode: UnsignedRoundingMode): MathematicalValue;

export declare function ArgumentListEvaluation(ArgumentsOrTemplateLiteral: ParseNode.TemplateLiteral | ParseNode.Arguments): PlainEvaluator<Arguments>;

export declare type Arguments = Omit<readonly (Value | undefined)[], SafeAccessMethods> & Pick<readonly Value[], SafeAccessMethods>;

/** https://tc39.es/ecma262/#sec-arraybufferbytelength */
export declare function ArrayBufferByteLength(arrayBuffer: ArrayBufferObject, _order: 'seq-cst' | 'unordered'): number;

/** https://tc39.es/ecma262/#sec-arraybuffercopyanddetach */
export declare function ArrayBufferCopyAndDetach(_arrayBuffer: Value, newLength: Value, preserveResizability: 'preserve-resizability' | 'fixed-length'): ValueEvaluator<ArrayBufferObject>;

export declare interface ArrayBufferObject extends OrdinaryObject {
    readonly ArrayBufferData: DataBlock | null;
    readonly ArrayBufferByteLength: number;
    readonly ArrayBufferDetachKey: Value | undefined;
}

/** https://tc39.es/ecma262/#sec-arraycreate */
export declare function ArrayCreate(length: number, proto?: ObjectValue): ValueCompletion<OrdinaryObject>;

export declare const ArrayExoticObjectInternalMethods: {
    /** https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc */
    DefineOwnProperty(this: OrdinaryObject, P: string | PropertyKeyValue, Desc: Descriptor): PlainEvaluator<boolean>;
};

/** https://tc39.es/ecma262/#sec-arraysetlength */
export declare function ArraySetLength(array: OrdinaryObject, Desc: Descriptor): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-arrayspeciescreate */
export declare function ArraySpeciesCreate(originalArray: ObjectValue, length: number): ValueEvaluator<ObjectValue>;

export declare interface ArrowInfo {
    readonly isAsync: boolean;
    hasTrailingComma: boolean;
    readonly yieldExpressions: ParseNode[];
    readonly awaitExpressions: ParseNode[];
    readonly awaitIdentifiers: ParseNode[];
    merge(other: ArrowInfo): void;
}

export declare interface ArrowParameterConversions {
    'IdentifierReference': ParseNode.SingleNameBinding;
    'BindingRestElement': ParseNode.BindingRestElement;
    'Elision': ParseNode.Elision;
    'ArrayLiteral': ParseNode.BindingElement;
    'ObjectLiteral': ParseNode.BindingElement;
    'AssignmentExpression': ParseNode.SingleNameBinding | ParseNode.BindingElement;
    'CoverInitializedName': ParseNode.SingleNameBinding;
    'PropertyDefinition': ParseNode.BindingRestProperty | ParseNode.BindingProperty;
    'SpreadElement': ParseNode.BindingRestElement;
    'AssignmentRestElement': ParseNode.BindingRestElement;
}

export declare function Assert(invariant: boolean, source?: string, completion?: Completion<unknown>): asserts invariant;

export declare namespace Assert {
    var Error: typeof AssertError;
}

export declare namespace Assert {
    var Throw: (source?: string, completion?: Completion<unknown>) => never;
}

export declare class AssertError extends Error {
    constructor(source?: string, options?: {
        cause?: Completion<unknown>;
    });
}

export declare interface AssignmentInfo {
    readonly type: 'assign' | 'arrow' | 'for';
    readonly earlyErrors: ErrorObject[];
    clear(): void;
}

/** https://tc39.es/ecma262/#sec-async-function-objects */
/** https://tc39.es/ecma262/#sec-asyncblockstart */
export declare function AsyncBlockStart(promiseCapability: PromiseCapabilityRecord, asyncBody: ParseNode.AsyncBody | ParseNode.ExpressionBody | ParseNode.Module | AsyncBuiltinSteps, asyncContext: ExecutionContext): PlainEvaluator<void>;

export declare type AsyncBuiltinSteps = () => Evaluator<Value | NormalCompletion<Value> | ThrowCompletion | ReturnCompletion>;

/** https://tc39.es/ecma262/#sec-asyncfromsynciteratorcontinuation */
export declare function AsyncFromSyncIteratorContinuation(result: ObjectValue, promiseCapability: PromiseCapabilityRecord, syncIteratorRecord: IteratorRecord, closeOnRejection: boolean): ValueEvaluator<PromiseObject>;

/** https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start */
export declare function AsyncFunctionStart(promiseCapability: PromiseCapabilityRecord, asyncFunctionBody: ParseNode.AsyncBody | ParseNode.ExpressionBody | AsyncBuiltinSteps): Generator<EvaluatorYieldType, void, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-asyncgeneratorawaitreturn */
export declare function AsyncGeneratorAwaitReturn(generator: AsyncGeneratorObject): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-asyncgeneratorenqueue */
export declare function AsyncGeneratorEnqueue(generator: AsyncGeneratorObject, completion: YieldCompletion, promiseCapability: PromiseCapabilityRecord): void;

export declare interface AsyncGeneratorObject extends OrdinaryObject {
    AsyncGeneratorState: 'suspendedStart' | 'suspendedYield' | 'executing' | 'completed' | 'draining-queue';
    AsyncGeneratorContext: ExecutionContext;
    AsyncGeneratorQueue: AsyncGeneratorRequestRecord[];
    GeneratorBrand: string | undefined;
}

/** https://tc39.es/ecma262/#sec-asyncgenerator-objects */
/** https://tc39.es/ecma262/#sec-asyncgeneratorrequest-records */
export declare interface AsyncGeneratorRequestRecord {
    readonly Completion: YieldCompletion;
    readonly Capability: PromiseCapabilityRecord;
}

export declare const AsyncGeneratorRequestRecord: {
    (value: AsyncGeneratorRequestRecord): AsyncGeneratorRequestRecord;
    [Symbol.hasInstance](instance: unknown): instance is AsyncGeneratorRequestRecord;
};

/** https://tc39.es/ecma262/#sec-asyncgeneratorresume */
export declare function AsyncGeneratorResume(generator: AsyncGeneratorObject, completion: YieldCompletion): Generator<EvaluatorYieldType, undefined, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-asyncgeneratorstart */
export declare function AsyncGeneratorStart(generator: AsyncGeneratorObject, generatorBody: ParseNode.AsyncGeneratorBody | (() => YieldEvaluator)): void;

/** https://tc39.es/ecma262/#sec-asyncgeneratorvalidate */
export declare function AsyncGeneratorValidate(generator: Value, generatorBrand: string | undefined): ThrowCompletion | undefined;

/** https://tc39.es/ecma262/#sec-asyncgeneratoryield */
export declare function AsyncGeneratorYield(arg: Value): YieldEvaluator;

/** https://tc39.es/ecma262/#sec-asynciteratorclose */
export declare function AsyncIteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C | T): Generator<EvaluatorYieldType, C | T | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-availablecalendars */
export declare function AvailableCalendars(): KnownCalendarType[];

/** https://tc39.es/proposal-temporal/#sec-available-named-time-zone-identifier-return-record */
export declare interface AvailableNamedTimeZoneIdentifierReturnRecord {
    readonly Identifier: TimeZoneIdentifier;
    readonly Result: TimeZoneIdentifierRecord | undefined;
}

/** https://tc39.es/ecma262/#sec-availablenamedtimezoneidentifiers */
export declare function AvailableNamedTimeZoneIdentifiers(): TimeZoneIdentifierRecord[];

export declare function Await(arg: Value): ValueEvaluator;

export declare type AwaitEvaluator = Evaluator<void>;

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisodatetime */
export declare function BalanceISODateTime(year: Integer, month: Integer, day: Integer, hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-balanceisoyearmonth */
export declare function BalanceISOYearMonth(year: Integer, month: Integer): ISOYearMonthRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-balancetime */
export declare function BalanceTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer): TimeRecord;

export declare interface BaseFunctionObject extends OrdinaryObject {
    readonly Realm: Realm;
    InitialName: string | null;
    readonly Async: boolean;
    readonly IsClassConstructor: boolean;
    Call(thisValue: Value, args: Arguments): ValueEvaluator;
    Construct(args: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;
}

export declare abstract class BaseParser extends Lexer {
    protected abstract scope: Scope;
    abstract startNode<T extends ParseNode>(inheritStart?: ParseNode): ParseNode.Unfinished<T>;
    abstract finishNode<T extends ParseNode.Unfinished, K extends T['type'] & ParseNode['type']>(node: T, type: K): ParseNodesByType[K];
    /**
     * Repurpose a {@link ParseNode} of one type as a {@link ParseNode} of another type.
     * @param node The node to repurpose.
     * @param type The name of the new node type.
     * @param update an optional callback that can be used to mutate {@link node} to match the new node type.
     */
    protected repurpose<T extends ParseNode, K extends ParseNode['type']>(node: T, type: K, update?: (
    /** The same value as {@link node}, but cast to an unfinished node of the provided type */
    asNewNode: ParseNode.Unfinished<ParseNodesByType[K]>, 
    /** The same value as {@link node} */
    asOldNode: T, 
    /** The same value as {@link node}, but cast to a partial, mutable type so that excess properties can be removed. */
    asPartialNode: {
        -readonly [P in keyof T]?: T[P];
    }) => void): ParseNodesByType[K];
}

export declare abstract class BaseValue {
    static readonly null: NullValue;
    static readonly undefined: UndefinedValue;
    static readonly true: BooleanValue<true>;
    static readonly false: BooleanValue<false>;
    abstract type: Value['type'];
    static [Symbol.hasInstance]: (value: unknown) => value is Value;
}

export declare class BasicJobQueue extends Set<Job> implements JobQueue, Markable {
    enqueueFinalizationRegistryCleanupJob(job: Job): void;
    enqueuePromiseJob(job: Job): void;
    enqueueTimeoutJob(job: Job): void;
    enqueueGenericJob(job: Job): void;
    onNewJob: JobQueue['onNewJob'];
    shift(): Job | undefined;
    get length(): number;
    mark(marker: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type */
export declare type BigInts = bigint & {
    type?: 'bigint';
};

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type */
export declare class BigIntValue extends PrimitiveValue {
    readonly type: 'BigInt';
    readonly value: bigint;
    private constructor();
    bigintValue(): bigint;
    isNaN(): boolean;
    isFinite(): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-unaryMinus */
    static unaryMinus(x: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseNOT */
    static bitwiseNOT(x: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-exponentiate */
    static exponentiate(base: BigIntValue, exponent: BigIntValue): BigIntValue | ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-multiply */
    static multiply(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-divide */
    static divide(x: BigIntValue, y: BigIntValue): BigIntValue | ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-remainder */
    static remainder(n: BigIntValue, d: BigIntValue): BigIntValue | ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-add */
    static add(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-subtract */
    static subtract(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-leftShift */
    static leftShift(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-signedRightShift */
    static signedRightShift(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-unsignedRightShift */
    static unsignedRightShift(_x: BigIntValue, _y: BigIntValue): ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-lessThan */
    static lessThan(x: BigIntValue, y: BigIntValue): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-equal */
    static equal(x: BigIntValue, y: BigIntValue): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseAND */
    static bitwiseAND(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseXOR */
    static bitwiseXOR(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseOR */
    static bitwiseOR(x: BigIntValue, y: BigIntValue): BigIntValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-bigint-tostring */
    static toString(x: BigIntValue, radix: Integer): string;
    static readonly unit: BigIntValue;
    static [Symbol.hasInstance]: (value: unknown) => value is BigIntValue;
}

export declare type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '**' | '<<' | '>>' | '>>>' | '&' | '^' | '|';

/** https://tc39.es/ecma262/#sec-runtime-semantics-bindingclassdeclarationevaluation */
export declare function BindingClassDeclarationEvaluation(ClassDeclaration: ParseNode.ClassDeclaration, decorators: readonly DecoratorDefinitionRecord[]): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-bindingevaluation */
export declare function BindingEvaluation(BindingList: ParseNode.BindingList, kind: 'normal' | DisposableResourceKind): Generator<EvaluatorYieldType, void | BigIntValue | BooleanValue<boolean> | BreakCompletion | ContinueCompletion | JSStringValue | NormalCompletion<void | Value> | NullValue | NumberValue | ObjectValue | ReturnCompletion_ | SymbolValue | ThrowCompletion<Value> | UndefinedValue, EvaluatorNextType>;

export declare function BindingInitialization(node: ParseNode.ForBinding | ParseNode.BindingIdentifier | ParseNode.ObjectBindingPattern | ParseNode.ArrayBindingPattern | ParseNode.BindingPattern, value: Value, environment: EnvironmentRecord | undefined): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-blockdeclarationinstantiation */
export declare function BlockDeclarationInstantiation(code: ParseNode.StatementList | ParseNode.CaseBlock, env: DeclarativeEnvironmentRecord): Generator<never, void, unknown>;

/** https://tc39.es/ecma262/#sec-pattern-semantics */
export declare type BMPCharacter = string & {
    description: 'A code unit';
    length: 1;
};

declare type Body_2 = ParseNode.AsyncGeneratorBody | ParseNode.GeneratorBody | ParseNode.AsyncBody | ParseNode.FunctionBody | ParseNode.AsyncConciseBodyLike | ParseNode.ConciseBodyLike | ParseNode.ClassStaticBlockBody | ParseNode.AssignmentExpressionOrHigher;
export { Body_2 as Body }

/** https://tc39.es/ecma262/#sec-static-semantics-bodytext */
export declare function BodyText(RegularExpressionLiteral: ParseNode.RegularExpressionLiteral): string;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type */
export declare class BooleanValue<T extends boolean = boolean> extends PrimitiveValue {
    readonly type: 'Boolean';
    readonly value: T;
    private constructor();
    booleanValue(): T;
    static [Symbol.hasInstance]: (value: unknown) => value is BooleanValue;
}

export declare function boostTest262Harness(realm: ManagedRealm): void;

export declare interface BoundFunctionObject extends ExoticObject, BaseFunctionObject {
    readonly BoundTargetFunction: FunctionObject;
    readonly BoundThis: Value;
    readonly BoundArguments: Arguments;
}

export declare function BoundNames(node: ParseNode | readonly ParseNode[]): string[];

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare class BreakCompletion extends AbruptCompletion<void> {
    readonly Type: 'break';
    readonly Value: void;
    private constructor();
}

export declare type BreakCompletionInit = Pick<BreakCompletion, 'Type' | 'Value' | 'Target'>;

export declare interface Breakpoint extends Partial<Protocol.Debugger.SetBreakpointByUrlRequest>, Partial<Protocol.Debugger.SetBreakpointOnFunctionCallRequest>, Partial<Protocol.Debugger.SetInstrumentationBreakpointRequest> {
    readonly id: string;
    readonly resolvedBreakpoints: Set<ParseNode>;
    readonly function?: FunctionObject;
}

export declare interface BreakpointLocation {
    scriptId: string;
    lineNumber: number;
    columnNumber?: number;
}

export declare type BreakpointRequest = Partial<Protocol.Debugger.SetBreakpointRequest> & Partial<Protocol.Debugger.SetBreakpointByUrlRequest> & {
    readonly function?: FunctionObject;
} & Partial<Protocol.Debugger.SetInstrumentationBreakpointRequest>;

/** https://tc39.es/proposal-temporal/#sec-temporal-bubblerelativeduration */
export declare function BubbleRelativeDuration(sign: -1n | 1n, duration: InternalDurationRecord, nudgedEpochNanoseconds: EpochNanoseconds, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier | undefined, calendar: KnownCalendarType, largestUnit: TemporalUnit, startUnit: 'month' | 'day'): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-deferred-reexports/#sec-BuildEvaluationList */
export declare function BuildEvaluationList(evaluationList: AbstractModuleRecord[], referrer: CyclicModuleRecord, moduleRequests: readonly ModuleRequestRecord[]): void;

/** https://tc39.es/proposal-deferred-reexports/#sec-BuildLinkingList */
export declare function BuildLinkingList(linkingList: AbstractModuleRecord[], referrer: CyclicModuleRecord, moduleRequests: readonly ModuleRequestRecord[], previouslyImportedNames: PreviouslyImportedNamesEntry[]): void;

export declare interface BuiltinFunctionObject extends BaseFunctionObject {
    readonly nativeFunction: NativeSteps;
    HostCapturedValues?: readonly Value[];
}

export declare interface BuiltinModuleLoaderOptions {
    getModuleCache?: (realm: ManagedRealm) => ModuleCache;
    /** preloaded builtin module */
    builtinModules?: Map<ModuleCacheKeyObject, BuiltinModuleSource>;
    /** dynamically loaded builtin module */
    loadBuiltinModule?: (moduleRequest: ModuleCacheKeyObject, realm: Realm, callback: (result: BuiltinModuleSource | NormalCompletion<BuiltinModuleSource> | ThrowCompletion<JSStringValue>) => void) => void;
    isBuiltinModule?: (specifier: string) => boolean;
}

export declare type BuiltinModuleSource = string | ((realm: Realm) => AbstractModuleRecord) | Uint8Array;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateadd */
export declare function CalendarDateAdd(calendar: KnownCalendarType, isoDate: ISODateRecord, duration: DateDurationRecord, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatefromfields */
export declare function CalendarDateFromFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainEvaluator<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendar-date-records */
export declare interface CalendarDateRecord {
    readonly Era: string | undefined;
    readonly EraYear: Integer | undefined;
    readonly Year: Integer;
    readonly Month: Integer;
    readonly MonthCode: string;
    readonly Day: Integer;
    readonly DayOfWeek: Integer;
    readonly DayOfYear: Integer;
    readonly WeekOfYear: YearWeekRecord;
    readonly DaysInWeek: Integer;
    readonly DaysInMonth: Integer;
    readonly DaysInYear: Integer;
    readonly MonthsInYear: Integer;
    readonly InLeapYear: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardatetoiso */
export declare function CalendarDateToISO(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendardateuntil */
export declare function CalendarDateUntil(calendar: KnownCalendarType, isoDateFrom: ISODateRecord, isoDateTo: ISODateRecord, largestUnit: DateUnit): DateDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarextrafields */
export declare function CalendarExtraFields(calendar: KnownCalendarType, _fields: readonly CalendarPropertyKey[]): CalendarPropertyKey[];

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarfieldkeystoignore */
export declare function CalendarFieldKeysToIgnore(calendar: KnownCalendarType, fields: CalendarFieldsRecord): CalendarPropertyKey[];

export declare type CalendarFields = 'date-fields' | 'year-month-fields' | 'only-day' | 'only-year';

/** https://tc39.es/proposal-temporal/#table-temporal-calendar-fields-record-fields */
export declare interface CalendarFieldsRecord {
    readonly Era: string | undefined;
    readonly EraYear: Integer | undefined;
    Year: Integer | undefined;
    Month: Integer | undefined;
    MonthCode: string | undefined;
    Day: Integer | undefined;
    Hour: Integer | undefined;
    Minute: Integer | undefined;
    Second: Integer | undefined;
    Millisecond: Integer | undefined;
    Microsecond: Integer | undefined;
    Nanosecond: Integer | undefined;
    OffsetString: string | undefined;
    readonly TimeZone: string | undefined;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarisotodate */
export declare function CalendarISOToDate(calendar: KnownCalendarType, isoDate: ISODateRecord): CalendarDateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmergefields */
export declare function CalendarMergeFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, additionalFields: CalendarFieldsRecord): CalendarFieldsRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdayfromfields */
export declare function CalendarMonthDayFromFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainEvaluator<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarmonthdaytoisoreferencedate */
export declare function CalendarMonthDayToISOReferenceDate(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord>;

export declare type CalendarPropertyKey = 'era' | 'eraYear' | 'year' | 'month' | 'monthCode' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond' | 'offset' | 'timeZone';

/** https://tc39.es/proposal-temporal/#sec-temporal-calendarresolvefields */
export declare function CalendarResolveFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, type: 'date' | 'year-month' | 'month-day'): PlainEvaluator<void>;

/** https://tc39.es/proposal-temporal/#sec-temporal-calendaryearmonthfromfields */
export declare function CalendarYearMonthFromFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainEvaluator<ISODateRecord>;

/** https://tc39.es/ecma262/#sec-call */
export declare function Call(F: Value, V: Value, argumentsList?: Arguments): ValueEvaluator;

export declare class CallFrame {
    columnNumber: number | undefined;
    lineNumber: number | undefined;
    functionName: string | undefined;
    scriptId: string | undefined;
    url: string | undefined;
    toCallFrame(): Protocol.Runtime.CallFrame | undefined;
}

export declare class CallSite {
    context: ExecutionContext;
    lastNode: ParseNode | null;
    nextNode: ParseNode | null;
    lastCallNode: ParseNode.CallExpression | null;
    inheritedLastCallNode: ParseNode.CallExpression | null;
    constructCall: boolean;
    constructor(context: ExecutionContext);
    clone(context?: ExecutionContext): CallSite;
    isTopLevel(): boolean;
    isConstructCall(): boolean;
    isAsync(): boolean;
    isNative(): boolean;
    static getFunctionName(func: FunctionObject): string | null;
    getFunctionName(): string | null;
    getSpecifier(): string | null | undefined;
    getScriptId(): string | undefined;
    setLocation(node: ParseNode): void;
    setNextLocation(node: ParseNode): void;
    setCallLocation(node: ParseNode.CallExpression | null): void;
    get lineNumber(): number | null;
    get columnNumber(): number | null;
    loc(): string;
    toString(): string;
    toCallFrame(): Protocol.Runtime.CallFrame | undefined;
}

/** https://tc39.es/ecma262/#sec-canbeheldweakly */
export declare function CanBeHeldWeakly(v: Value): v is ObjectValue | SymbolValue;

export declare interface CanBeNativeSteps {
    (...args: (Value | undefined)[]): PlainEvaluator<Value | void> | PlainCompletion<Value | void>;
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-canonicalize-ch */
export declare function Canonicalize(rer: RegExpRecord, char: Character): Character;

/** https://tc39.es/proposal-temporal/#sec-temporal-canonicalizecalendar */
export declare function CanonicalizeCalendar(id: string): PlainCompletion<KnownCalendarType>;

/** https://tc39.es/ecma262/#sec-canonicalizekeyedcollectionkey */
export declare function CanonicalizeKeyedCollectionKey(key: Value): Value;

/** https://tc39.es/ecma262/#sec-canonicalnumericindexstring */
export declare function CanonicalNumericIndexString(arg: string): NumberValue | undefined;

export declare function captureStack(): {
    stack: CallSite[];
    nativeStack: string | undefined;
};

/** https://tc39.es/ecma262/#sec-pattern-semantics */
export declare type Character = BMPCharacter | UnicodeCharacter;

/** https://tc39.es/ecma262/#sec-patterns-static-semantics-character-value */
export declare function CharacterValue(node: CharacterValueAcceptNode): CodePoint;

export declare type CharacterValueAcceptNode = ParseNode.RegExp.CharacterEscape | ParseNode.RegExp.RegExpUnicodeEscapeSequence | ParseNode.RegExp.ClassAtom | ParseNode.RegExp.ClassEscape | ParseNode.RegExp.ClassSetCharacter;

/** https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation */
/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-runtime-semantics-classdefinitionevaluation */
export declare function ClassDefinitionEvaluation(ClassTail: ParseNode.ClassTail, classBinding: string | undefined, className: string | PropertyKeyValue | PrivateName, sourceText: string, decorators: readonly DecoratorDefinitionRecord[]): ValueEvaluator<FunctionObject>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-classfielddefinition-record-specification-type */
export declare type ClassElementDefinitionRecord = ClassElementDefinitionRecord_Method | ClassElementDefinitionRecord_Field | ClassElementDefinitionRecord_Accessor | ClassElementDefinitionRecord_Getter | ClassElementDefinitionRecord_Setter;

export declare const ClassElementDefinitionRecord: {
    (record: ClassElementDefinitionRecord): ClassElementDefinitionRecord;
    [Symbol.hasInstance](instance: unknown): instance is ClassElementDefinitionRecord;
};

export declare interface ClassElementDefinitionRecord_Accessor {
    readonly Kind: 'accessor';
    readonly Key: PrivateName | PropertyKeyValue;
    Get: FunctionObject;
    Set: FunctionObject;
    readonly BackingStorageKey: PrivateName;
    Decorators: readonly DecoratorDefinitionRecord[] | undefined;
    readonly Initializers: FunctionObject[];
    readonly ExtraInitializers: FunctionObject[];
}

export declare interface ClassElementDefinitionRecord_Field {
    readonly Kind: 'field';
    readonly Key: PrivateName | PropertyKeyValue;
    Decorators: DecoratorDefinitionRecord[] | undefined;
    readonly Initializers: FunctionObject[];
    readonly ExtraInitializers: FunctionObject[];
}

export declare interface ClassElementDefinitionRecord_Getter {
    readonly Kind: 'getter';
    readonly Key: PrivateName | PropertyKeyValue;
    Get: FunctionObject;
    Decorators: readonly DecoratorDefinitionRecord[] | undefined;
}

export declare interface ClassElementDefinitionRecord_Method {
    readonly Kind: 'method';
    readonly Key: PrivateName | PropertyKeyValue;
    Value: FunctionObject;
    Decorators: DecoratorDefinitionRecord[] | undefined;
}

export declare interface ClassElementDefinitionRecord_Setter {
    readonly Kind: 'setter';
    readonly Key: PrivateName | PropertyKeyValue;
    Set: FunctionObject;
    Decorators: readonly DecoratorDefinitionRecord[] | undefined;
}

export declare function ClassFieldDefinitionEvaluation(FieldDefinition: ParseNode.FieldDefinition, homeObject: ObjectValue): PlainEvaluator<ClassFieldDefinitionRecord>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-runtime-semantics-classfielddefinitionevaluation */
export declare function ClassFieldDefinitionEvaluation_decorator(FieldDefinition: ParseNode.FieldDefinition, homeObject: ObjectValue): PlainEvaluator<ClassElementDefinitionRecord>;

/** https://tc39.es/ecma262/#sec-classfielddefinition-record-specification-type */
export declare interface ClassFieldDefinitionRecord {
    readonly Name: PropertyKeyValue | PrivateName;
    readonly Initializer: ECMAScriptFunctionObject | undefined;
}

export declare const ClassFieldDefinitionRecord: {
    (value: ClassFieldDefinitionRecord): ClassFieldDefinitionRecord;
    [Symbol.hasInstance](instance: unknown): instance is ClassFieldDefinitionRecord;
};

/** https://tc39.es/ecma262/#sec-runtime-semantics-classstaticblockdefinitionevaluation */
export declare function ClassStaticBlockDefinitionEvaluation({ ClassStaticBlockBody }: ParseNode.ClassStaticBlock, homeObject: ObjectValue): ClassStaticBlockDefinitionRecord;

/** https://tc39.es/ecma262/#sec-classstaticblockdefinition-record-specification-type */
export declare interface ClassStaticBlockDefinitionRecord {
    readonly BodyFunction: ECMAScriptFunctionObject;
}

export declare const ClassStaticBlockDefinitionRecord: {
    (value: ClassStaticBlockDefinitionRecord): ClassStaticBlockDefinitionRecord;
    [Symbol.hasInstance](instance: unknown): instance is ClassStaticBlockDefinitionRecord;
};

/** https://tc39.es/ecma262/#sec-cleanup-finalization-registry */
export declare function CleanupFinalizationRegistry(finalizationRegistry: FinalizationRegistryObject, callback?: JobCallbackRecord): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-clear-kept-objects */
export declare function ClearKeptObjects(): void;

export declare function CloneArrayBuffer(srcBuffer: ArrayBufferObject, srcByteOffset: number, srcLength: number): ValueEvaluator<ArrayBufferObject>;

/** https://developer.mozilla.org/en-US/docs/Glossary/Code_point */
export declare type CodePoint = number & {
    __brand__: 'CodePoint';
};

/** https://tc39.es/ecma262/#sec-codepointat */
export declare function CodePointAt(string: string, position: number): {
    CodePoint: CodePoint;
    CodeUnitCount: number;
    IsUnpairedSurrogate: boolean;
};

/** https://tc39.es/ecma262/#sec-codepointstostring */
export declare function CodePointsToString(text: string): string;

/** https://developer.mozilla.org/en-US/docs/Glossary/Code_unit */
export declare type CodeUnit = number & {
    __brand__: 'CodeUnit';
};

/** https://tc39.es/proposal-temporal/#sec-temporal-combinedateandtimeduration */
export declare function CombineDateAndTimeDuration(dateDuration: DateDurationRecord, timeDuration: TimeDuration): InternalDurationRecord;

/** https://tc39.es/ecma262/#sec-comparearrayelements */
export declare function CompareArrayElements(x: Value, y: Value, comparefn: FunctionObject | UndefinedValue): ValueEvaluator<NumberValue>;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareepochnanoseconds */
export declare function CompareEpochNanoseconds(xEpochNanoseconds: EpochNanoseconds, yEpochNanoseconds: EpochNanoseconds): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodate */
export declare function CompareISODate(xISODate: ISODateRecord, yISODate: ISODateRecord): 1n | -1n | 0n;

/** https://tc39.es/proposal-temporal/#sec-temporal-compareisodatetime */
export declare function CompareISODateTime(xISODateTime: ISODateTimeRecord, yISODateTime: ISODateTimeRecord): 1n | -1n | 0n;

/** https://tc39.es/proposal-temporal/#sec-temporal-comparesurpasses */
export declare function CompareSurpasses(sign: 1n | -1n, year: Integer, monthOrMonthCode: bigint | string, day: Integer, target: CalendarDateRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimeduration */
export declare function CompareTimeDuration(one: TimeDuration, two: TimeDuration): -1 | 0 | 1;

/** https://tc39.es/proposal-temporal/#sec-temporal-comparetimerecord */
export declare function CompareTimeRecord(xTime: TimeRecord, yTime: TimeRecord): -1n | 0n | 1n;

/** https://tc39.es/ecma262/#sec-compilepattern */
export declare function CompilePattern(pattern: ParseNode.RegExp.Pattern, rer: RegExpRecord): RegExpMatcher;

/** https://tc39.es/ecma262/#sec-completepropertydescriptor */
export declare function CompletePropertyDescriptor(propertyDesc: Descriptor): Descriptor;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare type Completion<T> = NormalCompletion<T> | AbruptCompletion;

/** https://tc39.es/ecma262/#sec-completion-ao */
export declare const Completion: {
    /** https://tc39.es/ecma262/#sec-completion-ao */
    <T extends Completion<unknown>>(completionRecord: T): T;
    /** https://tc39.es/ecma262/#sec-completion-record-specification-type */
    new <const T>(completion: {
        Type: 'normal';
        Value: T;
        Target: undefined;
    }): NormalCompletion<T>;
    new (completion: {
        Type: 'break';
        Value: void;
        Target: string | undefined;
    }): BreakCompletion;
    new (completion: {
        Type: 'continue';
        Value: void;
        Target: string | undefined;
    }): ContinueCompletion;
    new (completion: {
        Type: 'return';
        Value: Value;
        Target: undefined;
    }): ReturnCompletion;
    new (completion: {
        Type: 'throw';
        Value: Value;
        Target: undefined;
    }): ThrowCompletion;
    readonly prototype: CompletionImpl<unknown>;
};

export declare class CompletionImpl<const T> {
    readonly Type: 'normal' | 'break' | 'continue' | 'return' | 'throw';
    readonly Value: T | Value;
    readonly Target: string | undefined;
    constructor(init: CompletionInit<T>);
    mark(m: GCMarker): void;
}

export declare type CompletionInit<T> = NormalCompletionInit<T> | AbruptCompletionInit;

export declare function composeModuleLoaders(loaders: readonly ModuleLoader[]): NonNullable<HostHooks['HostLoadImportedModule']>;

/** https://tc39.es/proposal-temporal/#sec-temporal-computenudgewindow */
export declare function ComputeNudgeWindow(sign: -1n | 1n, duration: InternalDurationRecord, originEpochNanoseconds: EpochNanoseconds, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier | undefined, calendar: KnownCalendarType, increment: Integer, unit: DateUnit, additionalShift: boolean): PlainCompletion<{
    InnerBound: MathematicalValue;
    OuterBound: MathematicalValue;
    StartEpochNanoseconds: EpochNanoseconds;
    EndEpochNanoseconds: EpochNanoseconds;
    StartDuration: InternalDurationRecord;
    EndDuration: InternalDurationRecord;
}>;

/** https://tc39.es/ecma262/#sec-construct */
export declare function Construct(F: FunctionObject, argumentsList?: Arguments, newTarget?: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;

/** https://tc39.es/ecma262/#sec-static-semantics-constructormethod */
export declare function ConstructorMethod(ClassElementList: ParseNode.ClassElementList): ParseNode.MethodDefinition | undefined;

/** https://tc39.es/ecma262/#sec-static-semantics-containsarguments */
export declare function ContainsArguments(node: ParseNode): ParseNode.IdentifierReference | null;

export declare function ContainsExpression(node: ParseNode | readonly ParseNode[]): boolean;

/** https://tc39.es/ecma262/#sec-static-semantics-containsusing */
export declare function ContainsUsing(node: ParseNode.StatementList | ParseNode.StatementListItem): boolean;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare class ContinueCompletion extends AbruptCompletion<void> {
    readonly Type: 'continue';
    readonly Value: void;
    readonly Target: string | undefined;
    private constructor();
}

export declare type ContinueCompletionInit = Pick<ContinueCompletion, 'Type' | 'Value' | 'Target'>;

/** https://tc39.es/ecma262/#sec-ContinueDynamicImport */
export declare function ContinueDynamicImport(promiseCapability: PromiseCapabilityRecord, phase: 'source' | 'defer' | 'evaluation', moduleCompletion: PlainCompletion<AbstractModuleRecord>): void;

/** https://tc39.es/ecma262/#sec-ContinueModuleLoading */
export declare function ContinueModuleLoading(state: GraphLoadingState, moduleCompletion: PlainCompletion<AbstractModuleRecord>, importedNames: ImportedNamesValue, phase: 'source' | 'defer' | 'evaluation'): void;

export declare type ConvertArrowParameterResult<T> = T extends keyof ArrowParameterConversions ? ArrowParameterConversions[T] : never;

/** https://tc39.es/ecma262/#sec-copydatablockbytes */
export declare function CopyDataBlockBytes(toBlock: DataBlock, toIndex: number, fromBlock: DataBlock, fromIndex: number, count: number): void;

/** https://tc39.es/ecma262/#sec-copydataproperties */
export declare function CopyDataProperties(target: ObjectValue, source: Value, excludedItems: readonly PropertyKeyValue[]): ValueEvaluator<ObjectValue>;

/** https://tc39.es/proposal-shadowrealm/#sec-copynameandlength */
export declare function CopyNameAndLength(F: FunctionObject, Target: FunctionObject, prefix?: string, argCount?: number): PlainEvaluator;

export declare function CountLeftCapturingParensWithin(node: ParseNode.RegExp.Term_Atom | ParseNode.RegExp.Pattern): number;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-createaddinitializerfunction */
export declare function CreateAddInitializerFunction(initializers: FunctionObject[], decorationState: {
    Finished: boolean;
}): FunctionObject;

/** https://tc39.es/ecma262/#sec-createarrayfromlist */
export declare function CreateArrayFromList(elements: Arguments): OrdinaryObject;

/** https://tc39.es/ecma262/#sec-createarrayiterator */
export declare function CreateArrayIterator(array: ObjectValue, kind: 'key+value' | 'key' | 'value'): ValueCompletion<GeneratorObject>;

/** https://tc39.es/ecma262/#sec-createasyncfromsynciterator */
export declare function CreateAsyncFromSyncIterator(syncIteratorRecord: IteratorRecord): IteratorRecord;

/** https://tc39.es/ecma262/#sec-createbuiltinfunction */
export declare function CreateBuiltinFunction(behaviour: NativeSteps, length: number, name: string | PropertyKeyValue | PrivateName, additionalInternalSlotsList: readonly string[], realm?: Realm, prototype?: ObjectValue | NullValue, prefix?: string, async?: boolean): BuiltinFunctionObject;

export declare namespace CreateBuiltinFunction {
    var from: (steps: CanBeNativeSteps, name?: string, async?: boolean) => BuiltinFunctionObject;
}

export declare function createBuiltinModuleLoader(options?: BuiltinModuleLoaderOptions): ModuleLoader;

/** https://tc39.es/ecma262/#sec-createbytedatablock */
export declare function CreateByteDataBlock(size: number, _notInSpecMaxByteLength?: number | undefined): DataBlock | ThrowCompletion;

export declare function CreateBytesModule(arrayBuffer: ArrayBufferObject): SyntheticModuleRecord;

/** https://tc39.es/ecma262/#sec-createdataproperty */
export declare function CreateDataProperty(O: ObjectValue, P: PropertyKeyValue | string, V: Value): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-createdatapropertyorthrow */
export declare function CreateDataPropertyOrThrow(O: ObjectValue, P: PropertyKeyValue | string, V: Value): Generator<EvaluatorYieldType, true | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createdatedurationrecord */
export declare function CreateDateDurationRecord(years: Integer, months: Integer, weeks: Integer, days: Integer): PlainCompletion<DateDurationRecord>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-createdecoratoraccessobject */
export declare function CreateDecoratorAccessObject(kind: ClassElementDefinitionRecord['Kind'], name: string | PropertyKeyValue | PrivateName): ObjectValue;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-createdecoratorcontextobject */
export declare function CreateDecoratorContextObject(kind: 'class' | ClassElementDefinitionRecord['Kind'], name: string | PropertyKeyValue | PrivateName, initializers: FunctionObject[], decorationState: {
    Finished: boolean;
}, isStatic?: boolean): ObjectValue;

/** https://tc39.es/ecma262/#sec-create-default-export-synthetic-module */
export declare function CreateDefaultExportSyntheticModule(defaultExport: Value): SyntheticModuleRecord;

/** https://tc39.es/ecma262/#sec-createdisposableresource */
export declare function CreateDisposableResource(_value: Value, kind: DisposableResourceKind, _method?: FunctionObject): PlainEvaluator<DisposableResourceRecord>;

export declare function CreateDynamicFunction(constructor: FunctionObject, newTarget: FunctionObject | UndefinedValue, kind: 'normal' | 'generator' | 'async' | 'asyncGenerator', parameterArgs: Arguments, bodyArg: Value): ValueEvaluator;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-createfieldinitializerfunction */
export declare function CreateFieldInitializerFunction(homeObject: ObjectValue, propName: PropertyKeyValue | PrivateName, Initializer: ParseNode.AssignmentExpressionOrHigher): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-createintrinsics */
export declare function CreateIntrinsics(realmRec: Realm): any;

/** https://tc39.es/proposal-temporal/#sec-temporal-create-iso-date-record */
export declare function CreateISODateRecord(y: Integer, m: Integer, d: Integer): PlainCompletion<ISODateRecord>;

/** https://tc39.es/ecma262/#sec-createiteratorfromclosure */
export declare function CreateIteratorFromClosure(closure: () => YieldEvaluator, generatorBrand: string | undefined, generatorPrototype: ObjectValue, extraSlots?: string[], enclosedValues?: readonly Value[]): Mutable<GeneratorObject>;

/** https://tc39.es/ecma262/#sec-createiterresultobject */
export declare function CreateIteratorResultObject(value: Value, done: boolean): OrdinaryObject;

/** https://tc39.es/ecma262/#sec-createlistfromarraylike */
export declare function CreateListFromArrayLike(obj: Value, validElementTypes?: undefined | 'all'): PlainEvaluator<Value[]>;

export declare function CreateListFromArrayLike(obj: Value, validElementTypes: 'property-key'): PlainEvaluator<PropertyKeyValue[]>;

/** https://tc39.es/ecma262/#sec-createlistiteratorRecord */
export declare function CreateListIteratorRecord(list: Iterable<Value>): IteratorRecord;

/** https://tc39.es/ecma262/#sec-createmappedargumentsobject */
export declare function CreateMappedArgumentsObject(func: ECMAScriptFunctionObject, formals: ParseNode.FormalParameters, argumentsList: Arguments, env: EnvironmentRecord): ObjectValue & Record<"Extensible" | "ParameterMap" | "Prototype", unknown>;

/** https://tc39.es/ecma262/#sec-createmethodproperty */
export declare function CreateMethodProperty(O: ObjectValue, P: PropertyKeyValue | string, V: Value): PlainEvaluator<boolean>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createmonthcode */
export declare function CreateMonthCode(monthNumber: Integer, isLeapMonth: boolean): MonthCode;

/** https://tc39.es/proposal-temporal/#sec-temporal-createnegatedtemporalduration */
export declare function CreateNegatedTemporalDuration(duration: TemporalDurationObject): TemporalDurationObject;

export declare function CreateNonEnumerableDataPropertyOrThrow(O: ObjectValue, P: PropertyKeyValue | string, V: Value): void;

/** https://tc39.es/ecma262/#sec-createresolvingfunctions */
export declare function CreateResolvingFunctions(toResolve: PromiseObject): {
    Resolve: BuiltinFunctionObject;
    Reject: BuiltinFunctionObject;
};

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldate */
export declare function CreateTemporalDate(isoDate: ISODateRecord, calendar: KnownCalendarType, NewTarget?: FunctionObject): ValueEvaluator<TemporalPlainDateObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldatetime */
export declare function CreateTemporalDateTime(isoDateTime: ISODateTimeRecord, calendar: KnownCalendarType, newTarget?: FunctionObject): PlainEvaluator<TemporalPlainDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalduration */
export declare function CreateTemporalDuration(years: Integer, months: Integer, weeks: Integer, days: Integer, hours: Integer, minutes: Integer, seconds: Integer, milliseconds: Integer, microseconds: Integer, nanoseconds: Integer, newTarget?: FunctionObject): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalinstant */
export declare function CreateTemporalInstant(epochNanoseconds: EpochNanoseconds, newTarget?: FunctionObject): ValueEvaluator<TemporalInstantObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalmonthday */
export declare function CreateTemporalMonthDay(isoDate: ISODateRecord, calendar: KnownCalendarType, newTarget?: FunctionObject): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporaltime */
export declare function CreateTemporalTime(time: TimeRecord, newTarget?: FunctionObject): ValueEvaluator<TemporalPlainTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalyearmonth */
export declare function CreateTemporalYearMonth(isoDate: ISODateRecord, calendar: KnownCalendarType, newTarget?: FunctionObject): ValueEvaluator<TemporalPlainYearMonthObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtemporalzoneddatetime */
export declare function CreateTemporalZonedDateTime(epochNanoseconds: EpochNanoseconds, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, newTarget?: FunctionObject): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://github.com/tc39/test262/blob/main/INTERPRETING.md */
export declare function createTest262Intrinsics(realm: ManagedRealm, printCompatMode: boolean, log?: (...args: unknown[]) => void): {
    $262: OrdinaryObject;
};

/** https://tc39.es/proposal-import-text/#sec-create-text-module */
export declare function CreateTextModule(source: string): SyntheticModuleRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-createtimerecord */
export declare function CreateTimeRecord(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer, deltaDays?: Integer): PlainCompletion<TimeRecord>;

/** https://tc39.es/proposal-shadowrealm/#sec-create-type-error-copy */
export declare function CreateTypeErrorCopy(realmRecord: Realm, non_spec_evalRealm: Realm, originalError: Value): ObjectValue;

/** https://tc39.es/ecma262/#sec-createunmappedargumentsobject */
export declare function CreateUnmappedArgumentsObject(argumentsList: Arguments): Mutable<UnmappedArgumentsObject>;

/** https://tc39.es/ecma262/#current-realm */
export declare function currentRealmRecord(): Realm;

/** https://tc39.es/ecma262/#sec-cyclic-module-records */
export declare abstract class CyclicModuleRecord extends AbstractModuleRecord {
    Status: CyclicModuleRecordStatus;
    EvaluationError: ThrowCompletion | undefined;
    DFSAncestorIndex: number | undefined;
    readonly RequestedModules: readonly ModuleRequestRecord[];
    readonly LoadedModules: LoadedModuleRequestRecord[];
    readonly HasTLA: boolean;
    AsyncEvaluationOrder: 'unset' | number | 'done';
    AsyncParentModules: CyclicModuleRecord[];
    CycleRoot: CyclicModuleRecord | undefined;
    TopLevelCapability: PromiseCapabilityRecord | undefined;
    PendingAsyncDependencies: number | undefined;
    constructor(init: CyclicModuleRecordInit);
    abstract ExecuteModule(capability?: PromiseCapabilityRecord): ValueEvaluator;
    /** https://tc39.es/ecma262/#sec-LoadRequestedModules */
    LoadRequestedModules(importedNames?: ImportedNamesValue, hostDefined?: ModuleRecordHostDefined): PromiseObject;
    /** https://tc39.es/ecma262/#sec-moduledeclarationlinking */
    Link(importedNames?: ImportedNamesValue): PlainCompletion<void>;
    /** https://tc39.es/ecma262/#sec-moduleevaluation */
    Evaluate(importedNames?: ImportedNamesValue): Evaluator<PromiseObject>;
    mark(m: GCMarker): void;
}

export declare type CyclicModuleRecordInit = AbstractModuleInit & Readonly<Pick<CyclicModuleRecord, 'Status' | 'EvaluationError' | 'DFSAncestorIndex' | 'RequestedModules' | 'LoadedModules' | 'CycleRoot' | 'HasTLA' | 'AsyncEvaluationOrder' | 'TopLevelCapability' | 'AsyncParentModules' | 'PendingAsyncDependencies'>>;

export declare type CyclicModuleRecordStatus = 'new' | 'unlinked' | 'linking' | 'linked' | 'evaluating' | 'evaluating-async' | 'evaluated';

export declare class DataBlock extends Uint8Array {
}

/** https://tc39.es/ecma262/#sec-isdatadescriptor */
export declare interface DataDescriptor extends Descriptor {
    readonly Value: Value;
    readonly Writable: boolean;
}

export declare type DataDescriptorInit = ({
    readonly Value: Value;
    readonly Writable?: boolean;
} | {
    readonly Value?: Value;
    readonly Writable: boolean;
}) & Partial<DescriptorWithEnumerableAndConfigurable>;

/** https://tc39.es/ecma262/#sec-dataview-objects */
export declare interface DataViewObject extends OrdinaryObject {
    readonly DataView: string;
    readonly ViewedArrayBuffer: Value;
    readonly ByteLength: number | 'auto';
    readonly ByteOffset: number;
}

/** https://tc39.es/ecma262/#sec-dataview-objects */
/** https://tc39.es/ecma262/#sec-dataview-with-buffer-witness-records */
export declare interface DataViewWithBufferWitnessRecord {
    readonly Object: DataViewObject;
    CachedBufferByteLength: number | 'detached';
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationdays */
export declare function DateDurationDays(dateDuration: DateDurationRecord, plainRelativeTo: TemporalPlainDateObject): PlainCompletion<Integer>;

/** https://tc39.es/proposal-temporal/#sec-temporal-date-duration-records */
export declare interface DateDurationRecord {
    readonly Years: Float64RepresentableInteger;
    readonly Months: Float64RepresentableInteger;
    readonly Weeks: Float64RepresentableInteger;
    Days: Float64RepresentableInteger;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-datedurationsign */
export declare function DateDurationSign(dateDuration: DateDurationRecord): -1n | 0n | 1n;

/** https://tc39.es/ecma262/#sec-date-number */
export declare function DateFromTime(t: FiniteTimeValue): Integer;

export declare interface DateObject extends OrdinaryObject {
    DateValue: number;
}

/** https://tc39.es/ecma262/#sec-date.prototype.toisostring */
export declare function DateProto_toISOString(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion<JSStringValue>;

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export declare type DateUnit = 'year' | 'month' | 'week' | 'day';

/** https://tc39.es/ecma262/#sec-day-number-and-time-within-day */
export declare function Day(t: FiniteTimeValue): Integer;

/** https://tc39.es/ecma262/#sec-dayfromyear */
export declare function DayFromYear(y: Integer): Integer;

export declare function DayWithinYear(t: FiniteTimeValue): Integer;

export declare interface DebuggerPauseReason {
    readonly reason: 'debugCommand' | 'other';
    readonly hitBreakpoints?: readonly string[];
}

export declare function Decimal(value: DecimalInit): Decimal;

export declare class Decimal {
    private value;
    private constructor();
    add(other: DecimalInit, option?: RoundOption): Decimal;
    subtract(other: DecimalInit, option?: RoundOption): Decimal;
    multiply(other: DecimalInit, option?: RoundOption): Decimal;
    divide(other: DecimalInit, option?: RoundOption): Decimal;
    remainder(other: DecimalInit, option?: RoundOption): Decimal;
    equals(other: DecimalInit): boolean;
    notEqual(other: DecimalInit): boolean;
    lessThan(other: DecimalInit): boolean;
    lessThanOrEqual(other: DecimalInit): boolean;
    greaterThan(other: DecimalInit): boolean;
    greaterThanOrEqual(other: DecimalInit): boolean;
    abs(): Decimal;
    negate(): Decimal;
    toBigInt(): bigint;
    toNumber(): number;
    modulo(y: DecimalInit): Decimal;
    truncate(): Decimal;
    floor(): Decimal;
    ceil(): Decimal;
}

export declare type DecimalInit = string | number | bigint | decimal.Decimal | Decimal;

export declare function DeclarationPart<T extends ParseNode>(node: T): T;

export declare interface DeclarativeEnvironmentBinding {
    readonly indirect: boolean;
    initialized: boolean;
    readonly mutable?: boolean;
    readonly strict?: boolean;
    readonly deletable?: boolean;
    value?: Value | undefined;
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-declarative-environment-records */
export declare class DeclarativeEnvironmentRecord extends EnvironmentRecord {
    readonly bindings: Map<string, DeclarativeEnvironmentBinding>;
    /** https://tc39.es/ecma262/#table-additional-fields-of-declarative-environment-records */
    readonly DisposableResourceStack: DisposableResourceRecord[];
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-hasbinding-n */
    HasBinding(name: string): Generator<never, boolean, unknown>;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-createmutablebinding-n-d */
    CreateMutableBinding(name: string, deletable: boolean): Generator<never, NormalCompletion<undefined>, unknown>;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-createimmutablebinding-n-s */
    CreateImmutableBinding(name: string, strict: boolean): NormalCompletion<undefined>;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-initializebinding-n-v */
    InitializeBinding(name: string, value: Value): Generator<never, NormalCompletion<undefined>, unknown>;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-setmutablebinding-n-v-s */
    SetMutableBinding(name: string, value: Value, strict: boolean): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-getbindingvalue-n-s */
    GetBindingValue(name: string, _strict: boolean): ValueEvaluator;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-deletebinding-n */
    DeleteBinding(name: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-hasthisbinding */
    HasThisBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-hassuperbinding */
    HasSuperBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-declarative-environment-records-withbaseobject */
    WithBaseObject(): UndefinedValue;
    mark(m: GCMarker): void;
}

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-decoratordefinition-record-specification-type */
export declare interface DecoratorDefinitionRecord {
    readonly Decorator: Value;
    readonly Receiver: ReferenceRecord | Value;
}

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-decoratorevaluation */
export declare function DecoratorEvaluation(decorator: ParseNode.Decorator): PlainEvaluator<DecoratorDefinitionRecord>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-decoratorelistvaluation */
export declare function DecoratorListEvaluation(decoratorList: readonly ParseNode.Decorator[]): PlainEvaluator<DecoratorDefinitionRecord[]>;

export declare interface DefaultConstructorBuiltinFunction extends BuiltinFunctionObject {
    readonly PrivateMethods: ECMAScriptFunctionObject['PrivateMethods'];
    readonly Fields: ECMAScriptFunctionObject['Fields'];
    readonly Initializers: ECMAScriptFunctionObject['Initializers'];
    readonly Elements: ECMAScriptFunctionObject['Elements'];
    readonly SourceText: ECMAScriptFunctionObject['SourceText'];
    readonly ConstructorKind: ECMAScriptFunctionObject['ConstructorKind'];
    /**
     * Note: this is different than InitialName, which is used and observable in Function.prototype.toString.
     * This is only used in the inspector.
     */
    readonly HostInitialName: PropertyKeyValue | PrivateName;
    readonly HostLocation: [scriptId: string | undefined, location: Location_2];
}

/** https://tc39.es/proposal-temporal/#sec-temporal-defaulttemporallargestunit */
export declare function DefaultTemporalLargestUnit(duration: TemporalDurationObject): TemporalUnit;

/** https://tc39.es/ecma262/#sec-definefield */
export declare function DefineField(receiver: ObjectValue, fieldRecord: ClassFieldDefinitionRecord): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-runtime-semantics-definemethod */
export declare function DefineMethod(MethodDefinition: ParseNode.MethodDefinition, object: ObjectValue, functionPrototype?: ObjectValue): PlainEvaluator<DefineMethodRecord>;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-definemethodproperty */
export declare function DefineMethodProperty(homeObject: ObjectValue, methodDefinition: ClassElementDefinitionRecord, enumerable: boolean): PlainEvaluator<void>;

export declare interface DefineMethodRecord {
    readonly Key: PropertyKeyValue | PrivateName;
    readonly Closure: ECMAScriptFunctionObject;
}

/** https://tc39.es/ecma262/#sec-definepropertyorthrow */
export declare function DefinePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue | string, desc: Descriptor): Generator<EvaluatorYieldType, true | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-deletepropertyorthrow */
export declare function DeletePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue | string): Generator<EvaluatorYieldType, true | ThrowCompletion, EvaluatorNextType>;

export declare function Descriptor(init: Required<AccessorDescriptorInit>): FullyPopulatedAccessorDescriptor;

export declare function Descriptor(init: Required<DataDescriptorInit>): FullyPopulatedDataDescriptor;

export declare function Descriptor(init: AccessorDescriptorInit): AccessorDescriptor;

export declare function Descriptor(init: DataDescriptorInit): DataDescriptor;

export declare function Descriptor(init: Partial<AccessorDescriptorInit>): GenericDescriptor;

export declare function Descriptor(init: Partial<DataDescriptorInit>): GenericDescriptor;

export declare function Descriptor(init: Partial<GenericDescriptorInit>): GenericDescriptor;

export declare class Descriptor {
    readonly Value?: Value;
    readonly Get?: FunctionObject | UndefinedValue;
    readonly Set?: FunctionObject | UndefinedValue;
    readonly Writable?: boolean;
    readonly Enumerable?: boolean;
    readonly Configurable?: boolean;
    private constructor();
    static everyFieldIsAbsent(descriptor: Descriptor): boolean;
    mark(m: GCMarker): void;
}

export declare interface DescriptorWithEnumerableAndConfigurable {
    readonly Configurable: boolean;
    readonly Enumerable: boolean;
}

export declare function DestructuringAssignmentEvaluation(node: ParseNode.ObjectAssignmentPattern | ParseNode.ArrayAssignmentPattern, value: Value): StatementEvaluator;

export declare type DestructuringParseNode = ParseNode.ObjectBindingPattern | ParseNode.ArrayBindingPattern | ParseNode.ObjectLiteral | ParseNode.ArrayLiteral | ParseNode.ForDeclaration | ParseNode.ForBinding;

/** https://tc39.es/ecma262/#sec-detacharraybuffer */
export declare function DetachArrayBuffer(arrayBuffer: Mutable<ArrayBufferObject>, key?: Value): ThrowCompletion | undefined;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceinstant */
export declare function DifferenceEpochNanoseconds(epochNanosecondsFrom: EpochNanoseconds, epochNanosecondsTo: EpochNanoseconds, roundingIncrement: Integer, smallestUnit: TimeUnit, roundingMode: RoundingMode): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceisodatetime */
export declare function DifferenceISODateTime(xISODateTime: ISODateTimeRecord, yISODateTime: ISODateTimeRecord, calendar: KnownCalendarType, largestUnit: TemporalUnit): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithrounding */
export declare function DifferencePlainDateTimeWithRounding(isoDateTimeFrom: ISODateTimeRecord, isoDateTimeTo: ISODateTimeRecord, calendar: KnownCalendarType, largestUnit: TemporalUnit, roundingIncrement: Integer, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differenceplaindatetimewithtotal */
export declare function DifferencePlainDateTimeWithTotal(isoDateTimeFrom: ISODateTimeRecord, isoDateTimeTo: ISODateTimeRecord, calendar: KnownCalendarType, unit: TemporalUnit): PlainCompletion<MathematicalValue>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalinstant */
export declare function DifferenceTemporalInstant(operation: 'since' | 'until', instant: TemporalInstantObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindate */
export declare function DifferenceTemporalPlainDate(operation: 'since' | 'until', temporalDate: TemporalPlainDateObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindatetime */
export declare function DifferenceTemporalPlainDateTime(operation: 'since' | 'until', dateTime: TemporalPlainDateTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaintime */
export declare function DifferenceTemporalPlainTime(operation: 'since' | 'until', temporalTime: TemporalPlainTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplainyearmonth */
export declare function DifferenceTemporalPlainYearMonth(operation: 'since' | 'until', yearMonth: TemporalPlainYearMonthObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalzoneddatetime */
export declare function DifferenceTemporalZonedDateTime(operation: 'until' | 'since', zonedDateTime: TemporalZonedDateTimeObject, _other: Value, options: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencetime */
export declare function DifferenceTime(timeFrom: TimeRecord, timeTo: TimeRecord): TimeDuration;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetime */
export declare function DifferenceZonedDateTime(epochNanosecondsFrom: EpochNanoseconds, epochNanosecondsTo: EpochNanoseconds, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, largestUnit: TemporalUnit): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithrounding */
export declare function DifferenceZonedDateTimeWithRounding(epochNanosecondsFrom: EpochNanoseconds, epochNanosecondsTo: EpochNanoseconds, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, largestUnit: TemporalUnit, roundingIncrement: Integer, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithtotal */
export declare function DifferenceZonedDateTimeWithTotal(epochNanosecondsFrom: EpochNanoseconds, epochNanosecondsTo: EpochNanoseconds, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, unit: TemporalUnit): PlainCompletion<MathematicalValue>;

export declare type DirectionOption = 'next' | 'previous';

export declare function DisambiguatePossibleEpochNanoseconds(possibleEpochNanoseconds: readonly EpochNanoseconds[], timeZone: TimeZoneIdentifier, isoDateTime: ISODateTimeRecord, disambiguation: 'compatible' | 'earlier' | 'later' | 'reject'): PlainCompletion<EpochNanoseconds>;

export declare type DisposableResourceKind = 'sync-dispose' | 'async-dispose';

export declare interface DisposableResourceRecord {
    readonly ResourceValue: ObjectValue | UndefinedValue;
    readonly Kind: DisposableResourceKind;
    readonly DisposeMethod: FunctionObject | UndefinedValue;
}

/** https://tc39.es/ecma262/#sec-disposeresources */
export declare function DisposeResources<C extends Completion<unknown>>(disposableResourceStack: DisposableResourceRecord[], completion: C): Evaluator<C | ThrowCompletion>;

/** https://tc39.es/proposal-temporal/#sec-temporal-duration-nudge-result-records */
export declare interface DurationNudgeResultRecord {
    readonly Duration: InternalDurationRecord;
    readonly NudgedEpochNanoseconds: EpochNanoseconds;
    readonly DidExpandCalendarUnit: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-durationsign */
export declare function DurationSign(duration: TemporalDurationObject): -1 | 0 | 1;

export declare class DynamicParsedCodeRecord {
    Realm: Realm;
    constructor(Realm: Realm, sourceText: string | ParseNode.Script | ParseNode.Expression);
    HostDefined: {
        scriptId: string | undefined;
        specifier: undefined;
        isInspectorEval: boolean;
    };
    ECMAScriptCode: {
        sourceText: string;
    } | ParseNode.Script | ParseNode.Expression;
}

export declare interface ECMAScriptFunctionObject extends BaseFunctionObject {
    readonly Environment: EnvironmentRecord;
    readonly PrivateEnvironment: PrivateEnvironmentRecord | null;
    readonly FormalParameters: ParseNode.FormalParameters;
    readonly ECMAScriptCode: Body_2 | null;
    readonly ConstructorKind: 'base' | 'derived';
    readonly ScriptOrModule: ScriptRecord | AbstractModuleRecord;
    readonly scriptId?: string;
    readonly ThisMode: 'lexical' | 'strict' | 'global';
    readonly Strict: boolean;
    readonly HomeObject: ObjectValue | UndefinedValue;
    readonly SourceText: string;
    readonly Fields: readonly ClassFieldDefinitionRecord[];
    readonly PrivateMethods: readonly PrivateElementRecord[];
    readonly Elements: readonly ClassElementDefinitionRecord[];
    readonly Initializers: readonly FunctionObject[];
    readonly ClassFieldInitializerName: undefined | PropertyKeyValue | PrivateName;
    /**
     * Note: this is different than InitialName, which is used and observable in Function.prototype.toString.
     * This is only used in the inspector.
     */
    HostInitialName: PropertyKeyValue | PrivateName;
}

export declare interface Engine262Feature {
    name: string;
    flag: string;
    url: string;
    enableInPlayground?: boolean;
}

/** https://tc39.es/ecma262/#sec-implicit-normal-completion */
export declare function EnsureCompletion(val: Value): NormalCompletion<Value>;

export declare function EnsureCompletion<const T>(val: T): EnsureCompletion<T>;

export declare type EnsureCompletion<T> = EnsureCompletionWorker<T, T>;

export declare type EnsureCompletionWorker<T, _T> = T extends Completion<unknown> ? T : NormalCompletion<Exclude<_T, PlainCompletion<unknown>>>;

/** https://tc39.es/ecma262/#sec-enumerableownpropertynames */
export declare function EnumerableOwnProperties(O: ObjectValue, kind: 'key'): PlainEvaluator<JSStringValue[]>;

export declare function EnumerableOwnProperties(O: ObjectValue, kind: 'value'): PlainEvaluator<Value[]>;

export declare function EnumerableOwnProperties(O: ObjectValue, kind: 'key' | 'value' | 'key+value'): PlainEvaluator<ObjectValue[]>;

/** https://tc39.es/ecma262/#sec-environment-records */
export declare abstract class EnvironmentRecord {
    readonly OuterEnv: EnvironmentRecord | null;
    constructor(outerEnv: EnvironmentRecord | null);
    abstract HasBinding(name: string): PlainEvaluator<boolean>;
    abstract CreateMutableBinding(name: string, deletable: boolean): PlainEvaluator;
    abstract CreateImmutableBinding(name: string, strict: boolean): void;
    abstract InitializeBinding(name: string, value: Value): PlainEvaluator;
    abstract SetMutableBinding(name: string, value: Value, strict: boolean): PlainEvaluator;
    abstract GetBindingValue(name: string, strict: boolean): ValueEvaluator;
    abstract DeleteBinding(name: string): PlainEvaluator<boolean>;
    abstract HasThisBinding(): boolean;
    abstract HasSuperBinding(): boolean;
    abstract WithBaseObject(): ObjectValue | UndefinedValue;
    mark(m: GCMarker): void;
}

export declare type EnvironmentRecordWithThisBinding = FunctionEnvironmentRecord | GlobalEnvironmentRecord | ModuleEnvironmentRecord;

/** https://tc39.es/proposal-temporal/#sec-epochdaystoepochmilliseconds */
export declare function EpochDaysToEpochMilliseconds(day: Integer, time: Integer): Integer;

export declare type EpochNanoseconds = Integer & {
    specName?: 'EpochNanoseconds';
};

export declare interface ErrorObject extends ObjectValue {
    ErrorData: never;
    /** Show a clickable stack in the devtools */
    HostDefinedStack: readonly (CallSite | CallFrame)[] | undefined;
    /** Show an error message that allows ECMAScript values to be interleaved with host error messages in the devtools */
    HostDefinedMessage: readonly (string | Value)[] | undefined;
    HostDefinedFormattedStack: string | undefined;
    HostDefinedMessageString: string | undefined;
}

/** https://tc39.es/ecma262/#sec-escaperegexppattern */
export declare function EscapeRegExpPattern(P: string, _F: string | Value): string;

/** https://tc39.es/ecma262/#sec-evaldeclarationinstantiation */
export declare function EvalDeclarationInstantiation(body: ParseNode.ScriptBody, varEnv: EnvironmentRecord, lexEnv: DeclarativeEnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null, strict: boolean): PlainEvaluator;

/**
 * This is a util for code that cannot use Q() macro to emulate this behaviour.
 *
 * @example
 * import { evalQ } from '...'
 * evalQ((Q) => {
 *     let val = Q(operation);
 * });
 */
export declare function evalQ<T>(callback: (q: <const V>(completion: V) => Q<V>) => Promise<T>): Promise<NormalCompletion<T> | ThrowCompletion>;

export declare function evalQ<T>(callback: (q: <const V>(completion: V) => Q<V>) => T): NormalCompletion<T> | ThrowCompletion;

export declare function Evaluate(node: ExpressionThatEvaluatedToReferenceRecord): ReferenceEvaluator;

export declare function Evaluate(node: ParseNode.Module | ParseNode.ScriptBody): ValueEvaluator;

export declare function Evaluate(node: ParseNode.Expression): ExpressionEvaluator;

export declare function Evaluate(node: ParseNode): StatementEvaluator;

export declare function Evaluate_AdditiveExpression(AdditiveExpression: ParseNode.AdditiveExpression): Generator<EvaluatorYieldType, ValueCompletion<Value>, EvaluatorNextType>;

export declare function Evaluate_AnyFunctionBody({ FunctionStatementList }: ParseNode.FunctionBody | ParseNode.AsyncBody | ParseNode.GeneratorBody | ParseNode.AsyncGeneratorBody): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-array-initializer-runtime-semantics-evaluation */
export declare function Evaluate_ArrayLiteral({ ElementList }: ParseNode.ArrayLiteral): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_ArrowFunction(ArrowFunction: ParseNode.ArrowFunction): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation */
export declare function Evaluate_AssignmentExpression({ LeftHandSideExpression, AssignmentOperator, AssignmentExpression }: ParseNode.AssignmentExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-async-arrow-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_AsyncArrowFunction(AsyncArrowFunction: ParseNode.AsyncArrowFunction): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_AsyncFunctionExpression(AsyncFunctionExpression: ParseNode.AsyncFunctionExpression): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-asyncgenerator-definitions-evaluation */
export declare function Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression: ParseNode.AsyncGeneratorExpression): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_AwaitExpression({ UnaryExpression }: ParseNode.AwaitExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-binary-bitwise-operators-runtime-semantics-evaluation */
export declare function Evaluate_BinaryBitwiseExpression({ A, operator, B }: ParseNode.BitwiseANDExpression | ParseNode.BitwiseXORExpression | ParseNode.BitwiseORExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation */
export declare function Evaluate_Block({ StatementList }: ParseNode.Block): Generator<EvaluatorYieldType, Completion<void | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation */
export declare function Evaluate_BreakableStatement(BreakableStatement: ParseNode.BreakableStatement): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-break-statement-runtime-semantics-evaluation */
export declare function Evaluate_BreakStatement({ LabelIdentifier }: ParseNode.BreakStatement): BreakCompletion;

/** https://tc39.es/ecma262/#sec-function-calls-runtime-semantics-evaluation */
export declare function Evaluate_CallExpression(CallExpression: ParseNode.CallExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-switch-statement-runtime-semantics-evaluation */
export declare function Evaluate_CaseClause({ StatementList }: ParseNode.CaseClause | ParseNode.DefaultClause): Generator<EvaluatorYieldType, Completion<void | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation */
export declare function Evaluate_ClassDeclaration(ClassDeclaration: ParseNode.ClassDeclaration): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation */
export declare function Evaluate_ClassExpression(ClassExpression: ParseNode.ClassExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
export declare function Evaluate_CoalesceExpression({ CoalesceExpressionHead, BitwiseORExpression }: ParseNode.CoalesceExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-comma-operator-runtime-semantics-evaluation */
export declare function Evaluate_CommaOperator({ ExpressionList }: ParseNode.CommaOperator): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-conditional-operator-runtime-semantics-evaluation */
export declare function Evaluate_ConditionalExpression({ ShortCircuitExpression, AssignmentExpression_a, AssignmentExpression_b }: ParseNode.ConditionalExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-continue-statement-runtime-semantics-evaluation */
export declare function Evaluate_ContinueStatement({ LabelIdentifier }: ParseNode.ContinueStatement): ContinueCompletion;

/** https://tc39.es/ecma262/#sec-debugger-statement-runtime-semantics-evaluation */
export declare function Evaluate_DebuggerStatement(_node: ParseNode.DebuggerStatement): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-empty-statement-runtime-semantics-evaluation */
export declare function Evaluate_EmptyStatement(_EmptyStatement: ParseNode.EmptyStatement): NormalCompletion<undefined>;

/** https://tc39.es/ecma262/#sec-equality-operators-runtime-semantics-evaluation */
export declare function Evaluate_EqualityExpression({ EqualityExpression, operator, RelationalExpression }: ParseNode.EqualityExpression): ValueEvaluator<BooleanValue>;

/** https://tc39.es/ecma262/#sec-exp-operator-runtime-semantics-evaluation */
export declare function Evaluate_ExponentiationExpression({ UpdateExpression, ExponentiationExpression }: ParseNode.ExponentiationExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-exports-runtime-semantics-evaluation */
export declare function Evaluate_ExportDeclaration(ExportDeclaration: ParseNode.ExportDeclaration): Generator<EvaluatorYieldType, void | BigIntValue | BooleanValue<boolean> | BreakCompletion | ContinueCompletion | JSStringValue | NormalCompletion<void | Value> | NullValue | NumberValue | ObjectValue | ReturnCompletion_ | SymbolValue | ThrowCompletion<Value> | UndefinedValue, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_ExpressionBody({ AssignmentExpression }: ParseNode.ExpressionBody): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-expression-statement-runtime-semantics-evaluation */
export declare function Evaluate_ExpressionStatement({ Expression }: ParseNode.ExpressionStatement): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-for-in-and-for-of-statements-runtime-semantics-evaluation */
export declare function Evaluate_ForBinding({ BindingIdentifier, strict }: ParseNode.ForBinding): PlainEvaluator<ReferenceRecord>;

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_FunctionDeclaration(_FunctionDeclaration: ParseNode.FunctionDeclaration): NormalCompletion<undefined>;

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_FunctionExpression(FunctionExpression: ParseNode.FunctionExpression): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_FunctionStatementList(FunctionStatementList: ParseNode.FunctionStatementList): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_GeneratorExpression(GeneratorExpression: ParseNode.GeneratorExpression): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation */
export declare function Evaluate_HoistableDeclaration(_HoistableDeclaration: ParseNode.HoistableDeclaration): NormalCompletion<undefined>;

/** https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation */
export declare function Evaluate_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference): PlainEvaluator<ReferenceRecord>;

/** https://tc39.es/ecma262/#sec-if-statement-runtime-semantics-evaluation */
export declare function Evaluate_IfStatement({ Expression, Statement_a, Statement_b }: ParseNode.IfStatement): Generator<EvaluatorYieldType, BreakCompletion | ContinueCompletion | NormalCompletion<void | Value> | ReturnCompletion_ | ThrowCompletion<Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-import-calls */
export declare function Evaluate_ImportCall(ImportCall: ParseNode.ImportCall): ValueEvaluator<PromiseObject>;

/** https://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation */
export declare function Evaluate_ImportDeclaration(_ImportDeclaration: ParseNode.ImportDeclaration): NormalCompletion<undefined>;

/** https://tc39.es/ecma262/#sec-meta-properties */
export declare function Evaluate_ImportMeta(_ImportMeta: ParseNode.ImportMeta): ObjectValue;

/** https://tc39.es/ecma262/#sec-labelled-statements-runtime-semantics-evaluation */
export declare function Evaluate_LabelledStatement(LabelledStatement: ParseNode.LabelledStatement): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
export declare function Evaluate_LexicalDeclaration(declaration: ParseNode.LexicalDeclaration | ParseNode.UsingDeclaration | ParseNode.AwaitUsingDeclaration): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-literals-runtime-semantics-evaluation */
export declare function Evaluate_Literal(Literal: ParseNode.Literal): NormalCompletion<Value>;

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
export declare function Evaluate_LogicalANDExpression({ LogicalANDExpression, BitwiseORExpression }: ParseNode.LogicalANDExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
export declare function Evaluate_LogicalORExpression({ LogicalORExpression, LogicalANDExpression }: ParseNode.LogicalORExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation */
export declare function Evaluate_MemberExpression(MemberExpression: ParseNode.MemberExpression): PlainEvaluator<ReferenceRecord>;

/** https://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation */
export declare function Evaluate_Module({ ModuleBody }: ParseNode.Module): Generator<EvaluatorYieldType, void | BigIntValue | BooleanValue<boolean> | BreakCompletion | ContinueCompletion | JSStringValue | NormalCompletion<void | Value> | NullValue | NumberValue | ObjectValue | ReturnCompletion_ | SymbolValue | ThrowCompletion<Value> | UndefinedValue, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation */
export declare function Evaluate_ModuleBody({ ModuleItemList }: ParseNode.ModuleBody): Generator<EvaluatorYieldType, Completion<void | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-multiplicative-operators-runtime-semantics-evaluation */
export declare function Evaluate_MultiplicativeExpression({ MultiplicativeExpression, MultiplicativeOperator, ExponentiationExpression }: ParseNode.MultiplicativeExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-new-operator-runtime-semantics-evaluation */
export declare function Evaluate_NewExpression({ MemberExpression, Arguments }: ParseNode.NewExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-meta-properties-runtime-semantics-evaluation */
export declare function Evaluate_NewTarget(): ObjectValue | UndefinedValue;

/** https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-evaluation */
export declare function Evaluate_ObjectLiteral({ PropertyDefinitionList }: ParseNode.ObjectLiteral): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-optional-chaining-evaluation */
export declare function Evaluate_OptionalExpression(node: ParseNode.OptionalExpression): Generator<EvaluatorYieldType, PlainCompletion<ReferenceRecord | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-grouping-operator-runtime-semantics-evaluation */
export declare function Evaluate_ParenthesizedExpression({ Expression }: ParseNode.ParenthesizedExpression): Generator<EvaluatorYieldType, PlainCompletion<ReferenceRecord | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-evaluation */
export declare function Evaluate_PropertyName(PropertyName: ParseNode.PropertyNameLike | ParseNode.PrivateIdentifier): PlainEvaluator<PropertyKeyValue | PrivateName>;

/** https://tc39.es/ecma262/#sec-regular-expression-literals-runtime-semantics-evaluation */
export declare function Evaluate_RegularExpressionLiteral(RegularExpressionLiteral: ParseNode.RegularExpressionLiteral): Generator<EvaluatorYieldType, ValueCompletion<RegExpObject>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-relational-operators-runtime-semantics-evaluation */
export declare function Evaluate_RelationalExpression(expr: ParseNode.RelationalExpression): ValueEvaluator<BooleanValue | UndefinedValue>;

export declare function Evaluate_RelationalExpression_PrivateIdentifier({ PrivateIdentifier, ShiftExpression }: ParseNode.RelationalExpression): Generator<EvaluatorYieldType, BooleanValue<false> | BooleanValue<true> | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-return-statement-runtime-semantics-evaluation */
export declare function Evaluate_ReturnStatement({ Expression }: ParseNode.ReturnStatement): Evaluator<ReturnCompletion | ThrowCompletion>;

/** https://tc39.es/ecma262/#sec-script-semantics-runtime-semantics-evaluation */
export declare function Evaluate_Script({ ScriptBody }: ParseNode.Script): Generator<EvaluatorYieldType, ValueCompletion<Value>, EvaluatorNextType>;

export declare function Evaluate_ScriptBody(ScriptBody: ParseNode.ScriptBody): Generator<EvaluatorYieldType, Completion<void | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-left-shift-operator-runtime-semantics-evaluation */
/** https://tc39.es/ecma262/#sec-signed-right-shift-operator-runtime-semantics-evaluation */
/** https://tc39.es/ecma262/#sec-unsigned-right-shift-operator-runtime-semantics-evaluation */
export declare function Evaluate_ShiftExpression({ ShiftExpression, operator, AdditiveExpression }: ParseNode.ShiftExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation */
export declare function Evaluate_StatementList(StatementList: ParseNode.StatementList): Generator<EvaluatorYieldType, Completion<void | Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation */
export declare function Evaluate_SuperCall({ Arguments }: ParseNode.SuperCall): Generator<EvaluatorYieldType, ObjectValue | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation */
export declare function Evaluate_SuperProperty({ Expression, IdentifierName, strict }: ParseNode.SuperProperty): ExpressionEvaluator;

/** https://tc39.es/ecma262/#sec-switch-statement-runtime-semantics-evaluation */
export declare function Evaluate_SwitchStatement({ Expression, CaseBlock }: ParseNode.SwitchStatement): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-tagged-templates-runtime-semantics-evaluation */
export declare function Evaluate_TaggedTemplateExpression(node: ParseNode.TaggedTemplateExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-template-literals-runtime-semantics-evaluation */
export declare function Evaluate_TemplateLiteral({ TemplateSpanList, ExpressionList }: ParseNode.TemplateLiteral): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-this-keyword-runtime-semantics-evaluation */
export declare function Evaluate_This(_PrimaryExpression: ParseNode.ThisExpression): ValueCompletion;

/** https://tc39.es/ecma262/#sec-throw-statement-runtime-semantics-evaluation */
export declare function Evaluate_ThrowStatement({ Expression }: ParseNode.ThrowStatement): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-try-statement-runtime-semantics-evaluation */
export declare function Evaluate_TryStatement(TryStatement: ParseNode.TryStatement): Generator<EvaluatorYieldType, BreakCompletion | ContinueCompletion | NormalCompletion<void | Value> | ReturnCompletion_ | ThrowCompletion<Value>, EvaluatorNextType>;

export declare function Evaluate_UnaryExpression(UnaryExpression: ParseNode.UnaryExpression): ValueEvaluator;

export declare function Evaluate_UpdateExpression({ LeftHandSideExpression, operator, UnaryExpression }: ParseNode.UpdateExpression): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation */
export declare function Evaluate_VariableDeclarationList(VariableDeclarationList: ParseNode.VariableDeclarationList): Generator<EvaluatorYieldType, PlainCompletion<void>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation */
export declare function Evaluate_VariableStatement({ VariableDeclarationList }: ParseNode.VariableStatement): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-with-statement-runtime-semantics-evaluation */
export declare function Evaluate_WithStatement({ Expression, Statement }: ParseNode.WithStatement): Generator<EvaluatorYieldType, BreakCompletion | ContinueCompletion | NormalCompletion<never> | NormalCompletion<void | Value> | ReturnCompletion_ | ThrowCompletion<Value>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation */
export declare function Evaluate_YieldExpression({ hasStar, AssignmentExpression }: ParseNode.YieldExpression): YieldEvaluator;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluateasyncfunctionbody */
export declare function EvaluateAsyncFunctionBody(FunctionBody: ParseNode.AsyncBody, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): Generator<EvaluatorYieldType, ReturnCompletion_, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluateasyncgeneratorbody */
export declare function EvaluateAsyncGeneratorBody(FunctionBody: ParseNode.AsyncGeneratorBody, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): StatementEvaluator;

export declare function EvaluateBody(Body: Body_2, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): Generator<EvaluatorYieldType, void | BigIntValue | BooleanValue<boolean> | BreakCompletion | ContinueCompletion | JSStringValue | NormalCompletion<void | Value> | NullValue | NumberValue | ObjectValue | ReturnCompletion_ | SymbolValue | ThrowCompletion<Value> | UndefinedValue, EvaluatorNextType>;

export declare function EvaluateBody_AssignmentExpression(AssignmentExpression: ParseNode.Initializer, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-evaluatecall */
export declare function EvaluateCall(func: Value, ref: ReferenceRecord | Value, args: ParseNode.TemplateLiteral | ParseNode.Arguments, tailPosition: boolean, callExpression?: ParseNode.CallExpression | ParseNode.OptionalExpression): Generator<EvaluatorYieldType, BigIntValue | BooleanValue<boolean> | JSStringValue | NormalCompletion<Value> | NullValue | NumberValue | ObjectValue | SymbolValue | ThrowCompletion | UndefinedValue, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluateclassstaticblockbody */
export declare function EvaluateClassStaticBlockBody({ ClassStaticBlockStatementList }: ParseNode.ClassStaticBlockBody, funcObject: ECMAScriptFunctionObject): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluateconcisebody */
export declare function EvaluateConciseBody({ ExpressionBody }: ParseNode.ConciseBody, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): Generator<EvaluatorYieldType, void | BigIntValue | BooleanValue<boolean> | BreakCompletion | ContinueCompletion | JSStringValue | NormalCompletion<void | Value> | NullValue | NumberValue | ObjectValue | ReturnCompletion_ | SymbolValue | ThrowCompletion<Value> | UndefinedValue, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluatefunctionbody */
export declare function EvaluateFunctionBody({ FunctionStatementList }: ParseNode.FunctionBody, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluategeneratorbody */
export declare function EvaluateGeneratorBody(GeneratorBody: ParseNode.GeneratorBody, functionObject: ECMAScriptFunctionObject, argumentsList: Arguments): StatementEvaluator;

/** https://tc39.es/ecma262/#sec-EvaluateModuleSync */
export declare function EvaluateModuleSync(module: AbstractModuleRecord, importedNames?: ImportedNamesValue): PlainEvaluator<undefined>;

/** https://tc39.es/ecma262/#sec-evaluate-expression-key-property-access */
export declare function EvaluatePropertyAccessWithExpressionKey(baseValue: Value, expression: ParseNode.Expression, strict: boolean): ReferenceEvaluator;

/** https://tc39.es/ecma262/#sec-evaluate-identifier-key-property-access */
export declare function EvaluatePropertyAccessWithIdentifierKey(baseValue: Value, identifierName: ParseNode.IdentifierName, strict: boolean): PlainCompletion<ReferenceRecord>;

/** https://tc39.es/ecma262/#sec-evaluatestringornumericbinaryexpression */
export declare function EvaluateStringOrNumericBinaryExpression(leftOperand: ParseNode.Expression, opText: BinaryOperator, rightOperand: ParseNode.Expression): ValueEvaluator;

export declare type Evaluator<Result> = Generator<EvaluatorYieldType, Result, EvaluatorNextType>;

export declare type EvaluatorNextType = EvaluatorNextType_Debugger | EvaluatorNextType_Await | EvaluatorNextType_Yield | EvaluatorNextType_AsyncYield;

export declare type EvaluatorNextType_AsyncYield = {
    resume: 'async-yield';
    value: void | YieldCompletion;
};

export declare type EvaluatorNextType_Await = {
    resume: 'await';
    value: ValueCompletion;
};

export declare type EvaluatorNextType_Debugger = {
    resume: 'debugger';
    value: ValueCompletion | void;
};

export declare type EvaluatorNextType_Yield = {
    resume: 'yield';
    value: NormalCompletion<Value> | Value | void | ReturnCompletion | ThrowCompletion;
};

export declare type EvaluatorYieldType = EvaluatorYieldType_Debugger | EvaluatorYieldType_Await | EvaluatorYieldType_Yield | EvaluatorYieldType_AsyncYield;

export declare type EvaluatorYieldType_AsyncYield = {
    suspend: 'async-yield';
};

export declare type EvaluatorYieldType_Await = {
    suspend: 'await';
};

export declare type EvaluatorYieldType_Debugger = {
    suspend: 'debugger';
} | {
    suspend: 'potential-debugger';
};

export declare type EvaluatorYieldType_Yield = {
    suspend: 'yield';
    value: ObjectValue | ThrowCompletion;
};

export declare interface EventLoop extends Markable {
    /**
     * Enqueue a host job (macrotask) now.
     */
    enqueue(type: NodeJSJobType | string, job: Job): void;
    /**
     * Enqueue a host job (macrotask) in the future.
     * It will keep `hasPendingJobs` to be `true` until `enqueue` is called.
     *
     * @example
     * ```
     * eventLoop.enqueueAsync('timers', job, (enqueue, cancel) => {
     *   setTimeout(() => {
     *     enqueue();
     *   }, timeout);
     * });
     * ```
     */
    enqueueAsync(type: NodeJSJobType | string, job: Job, executor: (enqueue: () => void, cancel: () => void) => void): void;
    /** Change the automatic run type of the event loop and run it */
    run(type: EventLoopRunType): void;
    runOnce(): void;
    readonly hasPendingJobs: boolean;
    /**
     * Register a callback to be called when there are no async queued jobs.
     *
     * This can be used to implement a mechanism to exit the program when all code has finished executing.
     */
    onNoPendingJob: Set<() => void>;
}

export declare type EventLoopRunType = 'manual' | 'automatic';

/** https://tc39.es/proposal-deferred-reexports/#sec-ExcludeImportedNames */
export declare function ExcludeImportedNames(a: ImportedNamesValue, b: ImportedNamesValue): ImportedNamesValue;

/** https://tc39.es/ecma262/#sec-execution-contexts */
export declare class ExecutionContext {
    CodeEvaluationState?: YieldOrAwaitEvaluator;
    Function: NullValue | FunctionObject;
    ScriptOrModule: AbstractModuleRecord | ScriptRecord | null;
    Realm: Realm;
    LexicalEnvironment: EnvironmentRecord;
    VariableEnvironment: EnvironmentRecord;
    PrivateEnvironment: PrivateEnvironmentRecord | null;
    Generator?: GeneratorObject | AsyncGeneratorObject;
    HostDefined?: ExecutionContextHostDefined;
    callSite: CallSite;
    promiseCapability?: PromiseCapabilityRecord;
    poppedForTailCall: boolean;
    copy(): ExecutionContext;
    mark(m: GCMarker): void;
}

export declare interface ExecutionContextHostDefined {
    readonly [kInternal]?: ParseScriptHostDefined[typeof kInternal];
    scriptId?: string;
}

export declare class ExecutionContextStack extends Array<ExecutionContext> {
    constructor(length?: number);
    pop(ctx?: ExecutionContext): undefined;
}

export declare type ExoticObject = ObjectValue;

export declare function ExpectedArgumentCount(FormalParameterList: ParseNode.FormalParameters): number;

export declare function ExportEntries(node: ParseNode | readonly ParseNode[]): ExportEntry[];

export declare function ExportEntriesForModule(node: ParseNode | readonly ParseNode[], module: ModuleRequestRecord | null): ExportEntry[];

export declare interface ExportEntry {
    readonly ModuleRequest: ModuleRequestRecord | null;
    readonly ImportName: JSStringValue | null | 'namespace' | 'filtered-namespace' | 'source' | 'all-but-default';
    readonly LocalName: string | null;
    readonly ExportName: string | null;
    readonly NamespaceNamesFilter?: readonly string[];
}

/** https://tc39.es/proposal-deferred-reexports/#sec-ExportFromDeclarationModuleRequest */
export declare function ExportFromDeclarationModuleRequest(node: ParseNode.ExportDeclaration_NamedFrom): ModuleRequestRecord;

export declare type ExpressionEvaluator = Evaluator<PlainCompletion<ReferenceRecord | Value>>;

export declare abstract class ExpressionParser extends FunctionParser {
    protected abstract readonly state: {
        hasTopLevelAwait: boolean;
        strict: boolean;
        json: boolean;
    };
    abstract parseBindingPattern(): ParseNode.BindingPattern;
    abstract markNodeStart(node: ParseNode.BaseParseNode | ParseNode.Unfinished): void;
    abstract parseInitializerOpt(): ParseNode.Initializer | null;
    abstract semicolon(): void;
    abstract feature(name: Feature): boolean;
    protected getLocation(inheritStart?: ParseNode.BaseParseNode): Location_2;
    protected markLocationEnd(node: Pick<ParseNode.Unfinished, 'location'>): Pick<ParseNode.Unfinished<ParseNode>, "location">;
    private isParsingArrowParameterCandidate;
    parseExpression(): ParseNode.Expression;
    parseAssignmentExpression(): ParseNode.AssignmentExpressionOrHigher;
    validateAssignmentTarget(node: ParseNode): void;
    parseYieldExpression(): ParseNode.YieldExpression;
    parseConditionalExpression(): ParseNode.ConditionalExpressionOrHigher;
    parseShortCircuitExpression(): ParseNode.ShortCircuitExpressionOrHigher;
    parseLogicalORExpression(): ParseNode.LogicalORExpressionOrHigher;
    parseLogicalANDExpression(): ParseNode.LogicalANDExpressionOrHigher;
    parseBitwiseORExpression(): ParseNode.BitwiseORExpressionOrHigher;
    parseBitwiseXORExpression(): ParseNode.BitwiseXORExpressionOrHigher;
    parseBitwiseANDExpression(): ParseNode.BitwiseANDExpressionOrHigher;
    parseEqualityExpression(): ParseNode.EqualityExpressionOrHigher;
    parseRelationalExpression(): ParseNode.RelationalExpressionOrHigher;
    parseShiftExpression(): ParseNode.ShiftExpressionOrHigher;
    parseAdditiveExpression(): ParseNode.AdditiveExpressionOrHigher;
    parseMultiplicativeExpression(): ParseNode.MultiplicativeExpressionOrHigher;
    parseExponentiationExpression(): ParseNode.ExponentiationExpressionOrHigher;
    parseUnaryExpression(): ParseNode.UnaryExpressionOrHigher;
    parseAwaitExpression(): ParseNode.AwaitExpression;
    parseUpdateExpression(): ParseNode.UpdateExpressionOrHigher;
    parseLeftHandSideExpression(allowCalls?: boolean): ParseNode.LeftHandSideExpression;
    parseOptionalChain(): ParseNode.OptionalChain;
    parseNewExpression(): ParseNode.NewExpressionOrHigher;
    parsePrimaryExpression(): ParseNode.PrimaryExpression;
    parseNumericLiteral(): ParseNode.NumericLiteral;
    parseStringLiteral(): ParseNode.StringLiteral;
    parseBooleanLiteral(): ParseNode.BooleanLiteral;
    parseArrayLiteral(): ParseNode.ArrayLiteral;
    parseObjectLiteral(): ParseNode.ObjectLiteral;
    parsePropertyDefinition(): ParseNode.PropertyDefinitionLike;
    parseFunctionExpression(kind: FunctionKind): ParseNode.FunctionExpressionLike;
    parseArguments(): {
        Arguments: ParseNode.Arguments;
        trailingComma: boolean;
    };
    /** https://tc39.es/ecma262/#sec-class-definitions */
    parseClass(decoratorsAttachedToClassDeclaration: null | readonly ParseNode.Decorator[], isExpression: boolean): ParseNode.ClassLike;
    parseClassTail(): ParseNode.ClassTail;
    parseClassElement(): ParseNode.ClassElement;
    parseClassExpression(): ParseNode.ClassExpression;
    parseTemplateLiteral(tagged?: boolean): ParseNode.TemplateLiteral;
    parseRegularExpressionLiteral(): ParseNode.RegularExpressionLiteral;
    parseCoverParenthesizedExpressionAndArrowParameterList(): ParseNode.CoverParenthesizedExpressionAndArrowParameterList | ParseNode.ParenthesizedExpression;
    parsePropertyName(): ParseNode.PropertyNameLike;
    private tokenIsPropertyName;
    parseClassElementName(): ParseNode.ClassElementName;
    parseBracketedDefinition(type: 'class element'): ParseNode.ClassElement;
    parseBracketedDefinition(type: 'property'): ParseNode.PropertyDefinitionLike;
    parseBracketedDefinition(type: 'property' | 'class element'): ParseNode.PropertyDefinitionLike | ParseNode.ClassElement;
    parseDecorators(): ParseNode.Decorator[] | null;
    parseDecorator(): ParseNode.Decorator | undefined;
}

export declare type ExpressionThatEvaluatedToReferenceRecord = ParseNode.IdentifierReference;

/** https://tc39.es/ecma262/#extended-mathematical-value */
export declare type ExtendedMathematicalValue = MathematicalValue | 'Inf' | '-Inf';

export declare function F(x: number): NumberValue;

export declare type F = Num;

export declare type Feature = (typeof FEATURES)[number]['flag'];

export declare const FEATURES: [{
    readonly name: 'Decorators';
    readonly flag: 'decorators';
    readonly url: 'https://github.com/tc39/proposal-decorators';
    readonly enableInPlayground: true;
}, {
    readonly name: 'Skip bugfix for field initializers in decorator';
    readonly flag: 'decorators.no-bugfix.1';
    readonly url: '';
}, {
    readonly name: 'FinalizationRegistry#cleanupSome';
    readonly flag: 'cleanup-some';
    readonly url: 'https://github.com/tc39/proposal-cleanup-some';
    readonly enableInPlayground: true;
}, {
    readonly name: 'RegExp Buffer Boundaries';
    readonly flag: 'regexp-buffer-boundaries';
    readonly url: 'https://github.com/tc39/proposal-regexp-buffer-boundaries';
    readonly enableInPlayground: true;
}, {
    readonly name: 'Deferred Re-exports';
    readonly flag: 'export-defer';
    readonly url: 'https://github.com/tc39/proposal-deferred-reexports';
    readonly enableInPlayground: true;
}];

export declare interface FinalizationRegistryCell {
    WeakRefTarget: Value | undefined;
    readonly HeldValue: Value;
    readonly UnregisterToken: Value | undefined;
}

export declare interface FinalizationRegistryObject extends OrdinaryObject {
    readonly Realm: Realm;
    readonly CleanupCallback: JobCallbackRecord;
    Cells: FinalizationRegistryCell[];
}

/** https://tc39.es/ecma262/#sec-FinishLoadingImportedModule */
export declare function FinishLoadingImportedModule(referrer: ScriptRecord | CyclicModuleRecord | Realm, moduleRequest: ModuleRequestRecord, payload: HostLoadImportedModulePayloadOpaque, result: PlainCompletion<AbstractModuleRecord>): void;

/** https://tc39.es/ecma262/pr/3759/#sec-time-values-and-time-range */
export declare type FiniteTimeValue = IntegralNumber;

export declare enum Flag {
    return = 1,
    await = 2,
    yield = 4,
    parameters = 8,
    newTarget = 16,
    importMeta = 32,
    superCall = 64,
    superProperty = 128,
    in = 256,
    default = 512,
    module = 1024,
    classStaticBlock = 2048
}

/** https://tc39.es/ecma262/#sec-static-semantics-flagtext */
export declare function FlagText(RegularExpressionLiteral: ParseNode.RegularExpressionLiteral): string;

export declare type Float64RepresentableInteger = IntegralNumber;

/** https://tc39.es/ecma262/#sec-runtime-semantics-fordeclarationbindinginitialization */
export declare function ForDeclarationBindingInitialization(declaration: ParseNode.ForDeclaration, value: Value, envRecord: EnvironmentRecord): PlainEvaluator;

/** https://tc39.es/proposal-temporal/#sec-temporal-formatcalendarannotation */
export declare function FormatCalendarAnnotation(id: KnownCalendarType, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

export declare function FormatDateTimeUTCOffsetRounded(offsetNanoseconds: Integer): string;

/** https://tc39.es/proposal-temporal/#sec-formatfractionalseconds */
export declare function FormatFractionalSeconds(subSecondNanoseconds: Integer, precision: Integer | 'auto'): string;

/** https://tc39.es/proposal-temporal/#sec-formatisodatetime */
export declare function FormatISODateTime(isoDateTime: ISODateTimeRecord, calendar: KnownCalendarType, precision: Integer | 'minute' | 'auto', showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

export declare function FormatOffsetTimeZoneIdentifier(offsetMinutes: Integer, style?: 'separated' | 'unseparated'): TimeZoneIdentifier;

export declare type Formattable = string | number | bigint | Value | PrivateName | readonly Formattable[];

/** https://tc39.es/proposal-temporal/#sec-formattimestring */
export declare function FormatTimeString(hour: Integer, minute: Integer, second: Integer, subSecondNanoseconds: Integer, precision: Integer | 'minute' | 'auto', style?: 'separated' | 'unseparated'): string;

export declare function FormatUTCOffsetNanoseconds(offsetNanoseconds: Integer): string;

/** https://tc39.es/ecma262/#sec-frompropertydescriptor */
export declare function FromPropertyDescriptor(propertyDesc: Descriptor | undefined): OrdinaryObject | UndefinedValue;

export declare interface FullyPopulatedAccessorDescriptor extends AccessorDescriptor {
    readonly Configurable: boolean;
    readonly Enumerable: boolean;
}

export declare interface FullyPopulatedDataDescriptor extends DataDescriptor {
    readonly Configurable: boolean;
    readonly Enumerable: boolean;
    readonly Writable: boolean;
}

/** https://tc39.es/ecma262/#sec-property-descriptor-specification-type */
export declare type FullyPopulatedDescriptor = FullyPopulatedDataDescriptor | FullyPopulatedAccessorDescriptor;

export declare interface FunctionCallContext {
    readonly thisValue: Value;
    readonly NewTarget: FunctionObject | UndefinedValue;
}

export declare type FunctionDeclaration = ParseNode.FunctionExpression | ParseNode.GeneratorExpression | ParseNode.AsyncFunctionExpression | ParseNode.AsyncGeneratorExpression | ParseNode.ClassExpression | ParseNode.ArrowFunction | ParseNode.AsyncArrowFunction | (ParseNode.ParenthesizedExpression & {
    readonly Expression: FunctionDeclaration;
});

/** https://tc39.es/ecma262/#sec-functiondeclarationinstantiation */
export declare function FunctionDeclarationInstantiation(func: ECMAScriptFunctionObject, argumentsList: Arguments): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-function-environment-records */
export declare class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
    /** https://tc39.es/ecma262/#sec-newfunctionenvironment */
    constructor(F: ECMAScriptFunctionObject, newTarget: UndefinedValue | ObjectValue);
    protected ThisValue: Value;
    ThisBindingStatus: 'lexical' | 'uninitialized' | 'initialized';
    readonly FunctionObject: ECMAScriptFunctionObject;
    readonly NewTarget: UndefinedValue | ObjectValue;
    /** https://tc39.es/ecma262/#sec-bindthisvalue */
    BindThisValue(V: Value): ThrowCompletion | Value;
    /** https://tc39.es/ecma262/#sec-function-environment-records-hasthisbinding */
    HasThisBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-function-environment-records-hassuperbinding */
    HasSuperBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-function-environment-records-getthisbinding */
    GetThisBinding(): ThrowCompletion | Value;
    /** https://tc39.es/ecma262/#sec-getsuperbase */
    GetSuperBase(): NullValue | ObjectValue | UndefinedValue;
    mark(m: GCMarker): void;
}

export declare enum FunctionKind {
    NORMAL = 0,
    ASYNC = 1
}

export declare type FunctionObject = ECMAScriptFunctionObject | BuiltinFunctionObject | BoundFunctionObject;

export declare abstract class FunctionParser extends IdentifierParser {
    abstract parseStatementList(token: string | Token, directives?: readonly string[]): ParseNode.StatementList;
    abstract parseAssignmentExpression(): ParseNode.AssignmentExpressionOrHigher;
    abstract parseBindingElement(): ParseNode.BindingElementLike;
    abstract parseBindingRestElement(): ParseNode.BindingRestElement;
    parseFunction(isExpression: boolean, kind: FunctionKind): ParseNode.AsyncFunctionDeclaration | ParseNode.AsyncFunctionExpression | ParseNode.AsyncGeneratorDeclaration | ParseNode.AsyncGeneratorExpression | ParseNode.FunctionDeclaration | ParseNode.FunctionExpression | ParseNode.GeneratorDeclaration | ParseNode.GeneratorExpression;
    private setFunctionBodyGeneric;
    validateFormalParameters(parameters: ParseNode.FormalParameters, body: ParseNode.FunctionBodyLike | ParseNode.ConciseBody | ParseNode.AsyncConciseBody, wantsUnique?: boolean): void;
    convertArrowParameter<T extends ParseNode>(node: T): ConvertArrowParameterResult<T['type']>;
    parseArrowFunction(node: ParseNode.Unfinished<ParseNode.ArrowFunction | ParseNode.AsyncArrowFunction>, { arrowInfo, Arguments }: {
        arrowInfo?: ArrowInfo;
        Arguments: ParseNode.CoverParenthesizedExpressionAndArrowParameterList['Arguments'];
    }, kind: FunctionKind): ParseNode.ArrowFunction | ParseNode.AsyncArrowFunction;
    private setConciseBodyGeneric;
    parseConciseBody(isAsync: boolean): ParseNode.ConciseBody | ParseNode.FunctionBody | ParseNode.AsyncConciseBody | ParseNode.AsyncBody;
    parseFormalParameter(): ParseNode.FormalParameter;
    parseFormalParameters(): ParseNode.FormalParameters;
    parseUniqueFormalParameters(): ParseNode.UniqueFormalParameters;
    parseFunctionBody(isAsync: boolean, isGenerator: boolean, isArrow: boolean): ParseNode.FunctionBodyLike;
}

/** https://tc39.es/proposal-defer-import-eval/#sec-GatherAsynchronousTransitiveDependencies  */
export declare function GatherAsynchronousTransitiveDependencies(module: AbstractModuleRecord, seen?: Set<AbstractModuleRecord>): AbstractModuleRecord[];

/** https://tc39.es/proposal-deferred-reexports/#sec-GatherAsynchronousTransitiveDependenciesForRequests */
export declare function GatherAsynchronousTransitiveDependenciesForRequests(referrer: CyclicModuleRecord, requests: readonly ModuleRequestRecord[], seen?: Set<AbstractModuleRecord>): AbstractModuleRecord[];

/** https://tc39.es/ecma262/#sec-weakref-execution */
declare function gc_2(): void;
export { gc_2 as gc }

export declare type GCMarker = (value: unknown) => void;

export declare function generatorBrandToErrorMessageType(generatorBrand: string | undefined): string | undefined;

/** https://tc39.es/ecma262/#sec-generator-objects */
export declare interface GeneratorObject extends OrdinaryObject {
    GeneratorState: 'suspendedStart' | 'suspendedYield' | 'executing' | 'completed' | undefined;
    GeneratorContext: ExecutionContext | null;
    readonly GeneratorBrand: string | undefined;
    UnderlyingIterators?: IteratorRecord[];
    HostCapturedValues?: readonly Value[];
}

/** https://tc39.es/ecma262/#sec-generatorresume */
export declare function GeneratorResume(generator: Value, value: Value | undefined, generatorBrand: string | undefined): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-generatorresumeabrupt */
export declare function GeneratorResumeAbrupt(generator: Value, abruptCompletion: ThrowCompletion | ReturnCompletion, generatorBrand: string | undefined): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-generatorstart */
export declare function GeneratorStart(generator: GeneratorObject, generatorBody: ParseNode.GeneratorBody | (() => YieldEvaluator)): undefined;

/** https://tc39.es/ecma262/#sec-generatorvalidate */
export declare function GeneratorValidate(generator: Value, generatorBrand: string | undefined): "completed" | "suspendedStart" | "suspendedYield" | ThrowCompletion | undefined;

/** https://tc39.es/ecma262/#sec-generatoryield */
export declare function GeneratorYield(iteratorResult: ObjectValue): YieldEvaluator;

export declare interface GenericDescriptor extends Descriptor {
    readonly Get?: never;
    readonly Set?: never;
    readonly Value?: never;
    readonly Writable?: never;
}

export declare interface GenericDescriptorInit {
    readonly Configurable?: boolean;
    readonly Enumerable?: boolean;
    readonly Value?: never;
    readonly Writable?: never;
    readonly Get?: never;
    readonly Set?: never;
}

/** https://tc39.es/ecma262/#sec-get-o-p */
export declare function Get(O: ObjectValue, P: PropertyKeyValue | string): ValueEvaluator;

/** Used in the inspector infrastructure to track the real source (or compiled) */
export declare function getActiveScriptId(): string | undefined;

/** https://tc39.es/ecma262/#sec-getactivescriptormodule */
export declare function GetActiveScriptOrModule(): AbstractModuleRecord | ScriptRecord | null;

/** https://tc39.es/ecma262/#sec-getarraybuffermaxbytelengthoption */
export declare function GetArrayBufferMaxByteLengthOption(options: Value): PlainEvaluator<number | undefined>;

export declare function GetAvailableNamedTimeZoneIdentifier(timeZoneIdentifier: TimeZoneIdentifier): TimeZoneIdentifierRecord | undefined;

export declare function getBreakpointCandidateNodes(from: BreakpointLocation, to?: BreakpointLocation, _restrictToFunction?: boolean): Generator<ParseNode>;

export declare function getCurrentStack(excludeGlobalStack?: boolean): CallSite[];

/** https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings */
export declare function GetDifferenceSettings(operation: 'since' | 'until', options: ObjectValue, unitGroup: 'date' | 'time' | 'datetime', disallowedUnits: readonly TemporalUnit[], fallbackSmallestUnit: TemporalUnit, smallestLargestDefaultUnit: TemporalUnit): PlainEvaluator<{
    SmallestUnit: TemporalUnit;
    LargestUnit: TemporalUnit;
    RoundingMode: RoundingMode;
    RoundingIncrement: bigint;
}>;

/** https://tc39.es/proposal-temporal/#sec-getdirectionoption */
export declare function GetDirectionOption(options: ObjectValue): PlainEvaluator<DirectionOption>;

/** https://tc39.es/ecma262/#sec-getdisposemethod */
export declare function GetDisposeMethod(value: Value, kind: DisposableResourceKind): ValueEvaluator<FunctionObject | UndefinedValue>;

export declare function GetEpochNanosecondsFor(timeZone: TimeZoneIdentifier, isoDateTime: ISODateTimeRecord, disambiguation: 'compatible' | 'earlier' | 'later' | 'reject'): PlainCompletion<EpochNanoseconds>;

/** https://tc39.es/ecma262/#sec-getfunctionrealm */
export declare function GetFunctionRealm(obj: FunctionObject): PlainCompletion<Realm>;

/** https://tc39.es/ecma262/#sec-getgeneratorkind */
export declare function GetGeneratorKind(): 'async' | 'sync' | 'non-generator';

/** https://tc39.es/ecma262/#sec-getglobalobject */
export declare function GetGlobalObject(): ObjectValue;

export declare function getHostDefinedErrorDetails(O: Value): {
    callStack: readonly (CallFrame | CallSite)[] | undefined;
    message: readonly (string | Value)[] | undefined;
    stack: string | undefined;
    stackGetterValue: string | undefined;
};

/** https://tc39.es/ecma262/#sec-getidentifierreference */
export declare function GetIdentifierReference(env: EnvironmentRecord | null, name: string, strict: boolean): PlainEvaluator<ReferenceRecord>;

/** https://tc39.es/ecma262/#sec-GetImportedModule */
export declare function GetImportedModule(referrer: CyclicModuleRecord, request: ModuleRequestRecord): AbstractModuleRecord;

export declare function GetISODateTimeFor(timeZone: TimeZoneIdentifier, epochNanoseconds: EpochNanoseconds): ISODateTimeRecord;

/** https://tc39.es/ecma262/#sec-getiterator */
export declare function GetIterator(obj: Value, kind: 'sync' | 'async'): PlainEvaluator<IteratorRecord>;

/** https://tc39.es/ecma262/#sec-getiteratordirect */
export declare function GetIteratorDirect(obj: ObjectValue): PlainEvaluator<IteratorRecord>;

export declare function GetIteratorFlattenable(obj: Value, primitiveHandling: PrimitiveHanding): PlainEvaluator<IteratorRecord>;

/** https://tc39.es/ecma262/#sec-getiteratorfrommethod */
export declare function GetIteratorFromMethod(obj: Value, method: FunctionObject): PlainEvaluator<IteratorRecord>;

/** https://tc39.es/ecma262/#sec-getmatchindexpair */
export declare function GetMatchIndexPair(S: string, match: MatchRecord): OrdinaryObject;

/** https://tc39.es/ecma262/#sec-getmatchstring */
export declare function GetMatchString(S: string, match: MatchRecord): string;

/** https://tc39.es/ecma262/#sec-getmethod */
export declare function GetMethod(V: Value, P: PropertyKeyValue | string): ValueEvaluator<UndefinedValue | FunctionObject>;

/** https://tc39.es/ecma262/#sec-getmodulenamespace */
export declare function GetModuleNamespace(module: AbstractModuleRecord, phase: 'defer' | 'evaluation', importedNames?: 'all' | readonly string[]): ObjectValue;

/** https://tc39.es/proposal-temporal/#sec-getnamedtimezoneepochnanoseconds */
export declare function GetNamedTimeZoneEpochNanoseconds(timeZoneIdentifier: TimeZoneIdentifier, isoDateTime: ISODateTimeRecord): EpochNanoseconds[];

export declare function GetNamedTimeZoneNextTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: EpochNanoseconds): bigint | null;

/** https://tc39.es/ecma262/#sec-getnamedtimezoneoffsetnanoseconds */
export declare function GetNamedTimeZoneOffsetNanoseconds(timeZoneIdentifier: string, _epochNanoseconds: EpochNanoseconds): Integer;

export declare function GetNamedTimeZonePreviousTransition(timeZoneIdentifier: TimeZoneIdentifier, _epochNanoseconds: EpochNanoseconds): bigint | null;

/** https://tc39.es/proposal-deferred-reexports/#sec-GetNewOptionalIndirectExportsModuleRequests */
export declare function GetNewOptionalIndirectExportsModuleRequests(module: AbstractModuleRecord, importedNames: ImportedNamesValue, previouslyImportedNames: PreviouslyImportedNamesEntry[]): readonly ModuleRequestRecord[];

/** https://tc39.es/ecma262/#sec-getnewtarget */
export declare function GetNewTarget(): ObjectValue | UndefinedValue;

export declare function GetOffsetNanosecondsFor(timeZone: TimeZoneIdentifier, epochNanoseconds: EpochNanoseconds): Integer;

/** https://tc39.es/proposal-temporal/#sec-getoptionsobject */
export declare function GetOptionsObject(options: Value): ObjectValue | ThrowCompletion;

export declare function GetPossibleEpochNanoseconds(timeZone: TimeZoneIdentifier, isoDateTime: ISODateTimeRecord): PlainCompletion<EpochNanoseconds[]>;

export declare function GetPrototypeFromConstructor(constructor: FunctionObject, intrinsicDefaultProto: keyof Intrinsics): ValueEvaluator<ObjectValue>;

/** https://tc39.es/proposal-temporal/#sec-getroundingincrementoption */
export declare function GetRoundingIncrementOption(options: ObjectValue): PlainEvaluator<Integer>;

/** https://tc39.es/proposal-temporal/#sec-getroundingmodeoption */
export declare function GetRoundingModeOption(options: ObjectValue, fallback: RoundingMode): PlainEvaluator<RoundingMode>;

/** https://tc39.es/proposal-shadowrealm/#sec-getshadowrealmcontext */
export declare function GetShadowRealmContext(shadowRealmRecord: Realm, strictEval: boolean): ExecutionContext;

/** https://tc39.es/proposal-temporal/#sec-temporal-getstartofday */
export declare function GetStartOfDay(timeZone: TimeZoneIdentifier, isoDate: ISODateRecord): PlainCompletion<EpochNanoseconds>;

/** https://tc39.es/ecma262/#sec-getstringindex */
export declare function GetStringIndex(S: string, Input: readonly string[], e: number): number;

/** https://tc39.es/ecma262/#sec-getsubstitution */
export declare function GetSubstitution(matched: string, str: string, position: number, captures: readonly (string | undefined)[], namedCaptures: undefined | UndefinedValue | ObjectValue, replacementTemplate: string): PlainEvaluator<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-gettemporalcalendaridentifierwithisodefault */
export declare function GetTemporalCalendarIdentifierWithISODefault(temporalObjectLike: ObjectValue): PlainEvaluator<KnownCalendarType>;

/** https://tc39.es/proposal-temporal/#sec-gettemporaldisambiguationoption */
export declare function GetTemporalDisambiguationOption(options: ObjectValue): PlainEvaluator<'compatible' | 'earlier' | 'later' | 'reject'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalfractionalseconddigitsoption */
export declare function GetTemporalFractionalSecondDigitsOption(options: ObjectValue): PlainEvaluator<'auto' | Integer>;

/** https://tc39.es/proposal-temporal/#sec-gettemporaloffsetoption */
export declare function GetTemporalOffsetOption(options: ObjectValue, fallback: TemporalOffsetOption): PlainEvaluator<TemporalOffsetOption>;

/** https://tc39.es/proposal-temporal/#sec-gettemporaloverflowoption */
export declare function GetTemporalOverflowOption(options: ObjectValue): PlainEvaluator<'constrain' | 'reject'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalrelativetooption */
export declare function GetTemporalRelativeToOption(options: ObjectValue): PlainEvaluator<{
    PlainRelativeTo?: TemporalPlainDateObject;
    ZonedRelativeTo?: TemporalZonedDateTimeObject;
}>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowcalendarnameoption */
export declare function GetTemporalShowCalendarNameOption(options: ObjectValue): PlainEvaluator<ShowCalendarNameOption>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowoffsetoption */
export declare function GetTemporalShowOffsetOption(options: ObjectValue): PlainEvaluator<'auto' | 'never'>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalshowtimezonenameoption */
export declare function GetTemporalShowTimeZoneNameOption(options: ObjectValue): PlainEvaluator<ShowTimeZoneNameOption>;

/** https://tc39.es/proposal-temporal/#sec-gettemporalunitvaluedoption */
export declare function GetTemporalUnitValuedOption(options: ObjectValue, key: PropertyKeyValue | string, defaultV: 'required' | 'optional'): PlainEvaluator<TemporalUnit | 'no-unit' | 'auto'>;

/** https://tc39.es/ecma262/#sec-getthisenvironment */
export declare function GetThisEnvironment(): EnvironmentRecordWithThisBinding;

/** https://tc39.es/ecma262/#sec-getthisvalue */
export declare function GetThisValue(V: ReferenceRecord): Value;

/** https://tc39.es/proposal-temporal/#sec-getunsignedroundingmode */
export declare function GetUnsignedRoundingMode(roundingMode: RoundingMode, sign: 'negative' | 'positive'): UnsignedRoundingMode;

/** https://tc39.es/ecma262/#sec-getutcepochnanoseconds */
export declare function GetUTCEpochNanoseconds(isoDateTime: ISODateTimeRecord): EpochNanoseconds;

/** https://tc39.es/ecma262/#sec-getv */
export declare function GetV(V: Value, P: PropertyKeyValue | string): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-getvalue */
export declare function GetValue(V: ReferenceRecord | Value): PlainEvaluator<Value>;

/** https://tc39.es/ecma262/#sec-getvaluefrombuffer */
export declare function GetValueFromBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayTypes, _isTypedArray: boolean, _order: 'unordered', isLittleEndian?: boolean): BigIntValue | NumberValue;

/** https://tc39.es/ecma262/#sec-getviewbytelength */
export declare function GetViewByteLength(viewRecord: DataViewWithBufferWitnessRecord): number;

/** https://tc39.es/ecma262/#sec-getviewvalue */
export declare function GetViewValue(view: Value, requestIndex: Value, isLittleEndian: boolean | Value, type: TypedArrayTypes): Generator<EvaluatorYieldType, BigIntValue | NumberValue | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/proposal-shadowrealm/#sec-getwrappedvalue */
export declare function GetWrappedValue(callerRealm: Realm, value: Value): ValueEvaluator;

export declare function GlobalDeclarationInstantiation(script: ParseNode.Script, env: GlobalEnvironmentRecord): Generator<EvaluatorYieldType, NormalCompletion<undefined> | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-global-environment-records */
export declare class GlobalEnvironmentRecord extends EnvironmentRecord {
    readonly ObjectRecord: ObjectEnvironmentRecord;
    readonly GlobalThisValue: ObjectValue;
    readonly DeclarativeRecord: DeclarativeEnvironmentRecord;
    /** https://tc39.es/ecma262/#sec-newglobalenvironment */
    constructor(G: ObjectValue, thisValue: ObjectValue);
    /** https://tc39.es/ecma262/#sec-global-environment-records-hasbinding-n */
    HasBinding(name: string): Generator<EvaluatorYieldType, PlainCompletion<boolean>, EvaluatorNextType>;
    /** https://tc39.es/ecma262/#sec-global-environment-records-createmutablebinding-n-d */
    CreateMutableBinding(name: string, strict: boolean): Generator<never, NormalCompletion<undefined> | ThrowCompletion, unknown>;
    /** https://tc39.es/ecma262/#sec-global-environment-records-createimmutablebinding-n-s */
    CreateImmutableBinding(name: string, strict: boolean): NormalCompletion<undefined> | ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-global-environment-records-initializebinding-n-v */
    InitializeBinding(name: string, value: Value): Generator<EvaluatorYieldType, PlainCompletion<void>, EvaluatorNextType>;
    /** https://tc39.es/ecma262/#sec-global-environment-records-setmutablebinding-n-v-s */
    SetMutableBinding(name: string, value: Value, strict: boolean): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-global-environment-records-getbindingvalue-n-s */
    GetBindingValue(name: string, strict: boolean): ValueEvaluator;
    /** https://tc39.es/ecma262/#sec-global-environment-records-deletebinding-n */
    DeleteBinding(name: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-global-environment-records-hasthisbinding */
    HasThisBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-global-environment-records-hassuperbinding */
    HasSuperBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-global-environment-records-withbaseobject */
    WithBaseObject(): UndefinedValue;
    /** https://tc39.es/ecma262/#sec-global-environment-records-getthisbinding */
    GetThisBinding(): ObjectValue;
    /** https://tc39.es/ecma262/#sec-haslexicaldeclaration */
    HasLexicalDeclaration(name: string): Generator<never, boolean, unknown>;
    /** https://tc39.es/ecma262/#sec-hasrestrictedglobalproperty */
    HasRestrictedGlobalProperty(name: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-candeclareglobalvar */
    CanDeclareGlobalVar(N: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-candeclareglobalfunction */
    CanDeclareGlobalFunction(N: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-createglobalvarbinding */
    CreateGlobalVarBinding(name: string, deletable: boolean): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-createglobalfunctionbinding */
    CreateGlobalFunctionBinding(name: string, value: FunctionObject, deletable: boolean): PlainEvaluator;
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-globalsymbolregistry-records */
export declare interface GlobalSymbolRegistryRecord {
    readonly Key: string;
    readonly Symbol: SymbolValue;
}

export declare class GraphLoadingState {
    readonly PromiseCapability: PromiseCapabilityRecord;
    readonly HostDefined?: ModuleRecordHostDefined;
    IsLoading: boolean;
    readonly Visited: Set<CyclicModuleRecord>;
    PendingModules: number;
    readonly PreviouslyImportedNames: PreviouslyImportedNamesEntry[];
    constructor({ PromiseCapability, HostDefined, PreviouslyImportedNames }: Pick<GraphLoadingState, 'PromiseCapability' | 'HostDefined'> & {
        PreviouslyImportedNames?: PreviouslyImportedNamesEntry[];
    });
}

/** https://tc39.es/ecma262/#sec-groupby */
export declare function GroupBy(items: Value, callback: Value, keyCoercion: 'property' | 'collection'): PlainEvaluator<KeyedGroupRecord[]>;

export declare function HasInitializer(node: ParseNode): node is ParseNode & {
    readonly Initializer: ParseNode.Initializer;
};

export declare function HasName(node: ParseNode): boolean;

/** https://tc39.es/ecma262/#sec-hasownproperty */
export declare function HasOwnProperty(O: ObjectValue, P: PropertyKeyValue | string): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-hasproperty */
export declare function HasProperty(O: ObjectValue, P: PropertyKeyValue | string): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-ecmascript-function-objects */
/** https://tc39.es/ecma262/#sec-built-in-function-objects */
/** https://tc39.es/ecma262/#sec-tail-position-calls */
export declare function hasSourceTextInternalSlot(O: undefined | null | Value): O is FunctionObject & {
    readonly SourceText: string;
};

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export declare function HostCallJobCallback(jobCallback: JobCallbackRecord, V: Value, argumentsList: Arguments): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
export declare function HostEnqueueFinalizationRegistryCleanupJob(finalizationRegistry: FinalizationRegistryObject): void;

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export declare function HostEnqueuePromiseJob(job: () => PlainEvaluator, realm: Realm | null): void;

export declare function HostEnsureCanCompileStrings(calleeRealm: Realm, parameterStrings: readonly string[], bodyString: string, direct: boolean): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-hostfinalizeimportmeta */
export declare function HostFinalizeImportMeta(importMeta: ObjectValue, moduleRecord: AbstractModuleRecord): void;

/** https://tc39.es/ecma262/#sec-hostgetimportmetaproperties */
export declare function HostGetImportMetaProperties(moduleRecord: AbstractModuleRecord): readonly {
    readonly Key: PropertyKeyValue;
    readonly Value: Value;
}[];

/** https://tc39.es/ecma262/#sec-hostgetmodulesourcemodulerecord */
export declare function HostGetModuleSourceModuleRecord(specifier: ObjectValue): AbstractModuleRecord | 'not-a-source';

export declare function HostGetSupportedImportAttributes(): readonly string[];

export declare function HostHasSourceTextAvailable(func: FunctionObject): boolean;

export declare interface HostHooks {
    /** https://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
    HostEnqueueFinalizationRegistryCleanupJob?(finalizationRegistry: FinalizationRegistryObject): void;
    /** https://tc39.es/ecma262/#sec-hostensurecancompilestrings */
    HostEnsureCanCompileStrings?(calleeRealm: Realm, parameterStrings: readonly string[], bodyString: string, direct: boolean): PlainEvaluator | PlainCompletion<void>;
    /** https://tc39.es/ecma262/#sec-hosthassourcetextavailable */
    HostHasSourceTextAvailable?(func: FunctionObject): boolean;
    /** https://tc39.es/proposal-shadowrealm/#sec-hostinitializeshadowrealm */
    HostInitializeShadowRealm?(realmRec: Realm, innerContext: ExecutionContext, O: ShadowRealmObject): PlainEvaluator | PlainCompletion<void>;
    /** https://tc39.es/ecma262/#sec-hostgetmodulesourcemodulerecord */
    HostGetModuleSourceModuleRecord?(specifier: ObjectValue): AbstractModuleRecord | 'not-a-source';
    /** https://tc39.es/ecma262/#sec-#sec-HostLoadImportedModule */
    HostLoadImportedModule?(referrer: CyclicModuleRecord | ScriptRecord | Realm, moduleRequest: ModuleRequestRecord, hostDefined: ModuleRecordHostDefined | undefined, payload: HostLoadImportedModulePayloadOpaque): void;
    /** https://tc39.es/ecma262/#sec-host-promise-rejection-tracker */
    HostPromiseRejectionTrackers?: Set<HostPromiseRejectionTracker>;
    /** https://tc39.es/ecma262/#sec-hostresizearraybuffer */
    HostResizeArrayBuffer?(buffer: ArrayBufferObject, newByteLength: number): 'handled' | 'unhandled';
    /** https://tc39.es/proposal-temporal/#sec-hostsystemutcepochnanoseconds */
    HostSystemUTCEpochNanoseconds?(global: ObjectValue): EpochNanoseconds;
}

export declare function HostLoadImportedModule(referrer: CyclicModuleRecord | ScriptRecord | Realm, moduleRequest: ModuleRequestRecord, hostDefined: ModuleRecordHostDefined | undefined, payload: HostLoadImportedModulePayloadOpaque): void;

export declare type HostLoadImportedModulePayloadOpaque = {
    HostLoadImportedModulePayloadOpaque?: never;
};

/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export declare function HostMakeJobCallback(callback: FunctionObject): JobCallbackRecord;

export declare function HostPromiseRejectionTracker(promise: PromiseObject, operation: 'reject' | 'handle'): void;

/** https://tc39.es/ecma262/#sec-host-promise-rejection-tracker */
export declare type HostPromiseRejectionTracker = (promise: PromiseObject, operation: 'reject' | 'handle') => void;

/** https://tc39.es/ecma262/#sec-hostresizearraybuffer */
export declare function HostResizeArrayBuffer(buffer: ArrayBufferObject, newByteLength: number): 'handled' | 'unhandled';

/** https://tc39.es/ecma262/#sec-hostsystemutcepochnanoseconds */
export declare function HostSystemUTCEpochNanoseconds(global: ObjectValue): EpochNanoseconds;

/** https://tc39.es/ecma262/#sec-hours-minutes-second-and-milliseconds */
export declare function HourFromTime(t: FiniteTimeValue): Integer;

/** https://tc39.es/ecma262/pr/3759/#sec-time-related-constants */
export declare const HoursPerDay = 24n;

export declare abstract class IdentifierParser extends BaseParser {
    parseIdentifierName(): ParseNode.IdentifierName;
    parseBindingIdentifier(): ParseNode.BindingIdentifier;
    parseIdentifierReference(): ParseNode.IdentifierReference;
    validateIdentifierReference(name: string, token: Locatable): void;
    parseLabelIdentifier(): ParseNode.LabelIdentifier;
    parsePrivateIdentifier(): ParseNode.PrivateIdentifier;
}

export declare type ImmutablePrototypeObject = ExoticObject;

export declare interface ImportAttributeRecord {
    readonly Key: string;
    readonly Value: string;
}

export declare function importBundledTest262Harness(realm: ManagedRealm, nameMapper?: (str: string) => string): void;

/** https://tc39.es/ecma262/#sec-importedlocalnames */
export declare function ImportedLocalNames(importEntries: readonly ImportEntry[]): string[];

/** https://tc39.es/proposal-deferred-reexports/#sec-ImportedNames */
export declare function ImportedNames(node: ParseNode.NamedImports | ParseNode.NamedExports): readonly string[];

export declare function ImportedNames(node: ParseNode | readonly ParseNode[]): ImportedNamesValue;

export declare type ImportedNamesValue = 'all' | 'all-but-default' | readonly string[];

export declare function ImportEntries(node: ParseNode): ImportEntry[];

export declare function ImportEntriesForModule(node: ParseNode, module: ModuleRequestRecord): ImportEntry[];

export declare interface ImportEntry {
    readonly ModuleRequest: ModuleRequestRecord;
    readonly ImportName: JSStringValue | 'namespace' | 'filtered-namespace-object' | 'source';
    readonly LocalName: string;
    readonly NamespaceNamesFilter?: readonly string[];
}

export declare function IncrementModuleAsyncEvaluationCount(): number;

/** https://tc39.es/ecma262/#sec-initializeboundname */
export declare function InitializeBoundName(name: string, value: Value, environment: EnvironmentRecord | undefined): PlainEvaluator;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-initializefieldoraccessor */
export declare function InitializeFieldOrAccessor(receiver: ObjectValue, elementRecord: ClassElementDefinitionRecord): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-initializeinstanceelements */
/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-initializeinstanceelements */
export declare function InitializeInstanceElements(O: ObjectValue, constructor: ECMAScriptFunctionObject | DefaultConstructorBuiltinFunction): PlainEvaluator;

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-initializeprivatemethods */
export declare function InitializePrivateMethods(O: ObjectValue, elementDefinitions: readonly ClassElementDefinitionRecord[]): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-initializereferencedbinding */
export declare function InitializeReferencedBinding(V: PlainCompletion<ReferenceRecord>, W: Value): PlainEvaluator;

export declare function InLeapYear(t: FiniteTimeValue): 0n | 1n;

/** https://tc39.es/ecma262/#sec-innermoduleevaluation */
export declare function InnerModuleEvaluation(module: AbstractModuleRecord, stack: CyclicModuleRecord[], index: number): PlainEvaluator<number>;

/** https://tc39.es/ecma262/#sec-InnerModuleLinking */
export declare function InnerModuleLinking(module: AbstractModuleRecord, stack: CyclicModuleRecord[], index: number): PlainCompletion<number>;

/** https://tc39.es/ecma262/#sec-InnerModuleLoading */
export declare function InnerModuleLoading(state: GraphLoadingState, module: AbstractModuleRecord, importedNames: ImportedNamesValue | undefined, loadType: 'single' | 'recursive-load'): void;

export declare function inspect(value: Value | ValueCompletion): string;

/** https://tc39.es/ecma262/#sec-errorobjects-install-error-cause */
export declare function InstallErrorCause(O: ObjectValue, options: Value): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-instanceofoperator */
export declare function InstanceofOperator(V: Value, target: Value): Generator<EvaluatorYieldType, boolean | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiatearrowfunctionexpression */
export declare function InstantiateArrowFunctionExpression(ArrowFunction: ParseNode.ArrowFunction, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiateasyncarrowfunctionexpression */
export declare function InstantiateAsyncArrowFunctionExpression(AsyncArrowFunction: ParseNode.AsyncArrowFunction, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiateasyncfunctionexpression */
export declare function InstantiateAsyncFunctionExpression(AsyncFunctionExpression: ParseNode.AsyncFunctionExpression, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiateasyncgeneratorfunctionexpression */
export declare function InstantiateAsyncGeneratorFunctionExpression(AsyncGeneratorExpression: ParseNode.AsyncGeneratorExpression, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

export declare function InstantiateFunctionObject(AnyFunctionDeclaration: ParseNode.FunctionDeclaration | ParseNode.GeneratorDeclaration | ParseNode.AsyncFunctionDeclaration | ParseNode.AsyncGeneratorDeclaration, env: EnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-async-function-definitions-InstantiateFunctionObject */
export declare function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration: ParseNode.AsyncFunctionDeclaration, env: EnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-asyncgenerator-definitions-evaluatebody */
export declare function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration: ParseNode.AsyncGeneratorDeclaration, env: EnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-instantiatefunctionobject */
export declare function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration: ParseNode.FunctionDeclaration, env: EnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject */
export declare function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration: ParseNode.GeneratorDeclaration, env: EnvironmentRecord, privateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiategeneratorfunctionexpression */
export declare function InstantiateGeneratorFunctionExpression(GeneratorExpression: ParseNode.GeneratorExpression, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionexpression */
export declare function InstantiateOrdinaryFunctionExpression(FunctionExpression: ParseNode.FunctionExpression, name?: string | PropertyKeyValue | PrivateName): Mutable<ECMAScriptFunctionObject>;

/** https://tc39.es/ecma262/#integer */
export declare type Integer = bigint & {
    type?: 'integer';
};

/** https://tc39.es/ecma262/#integral-number */
export declare type IntegralNumber = Num & {
    integral?: true; /** @internal */
    finite?: true;
};

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export declare interface InternalDurationRecord {
    readonly Date: DateDurationRecord;
    readonly Time: TimeDuration;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-internaldurationsign */
export declare function InternalDurationSign(internalDuration: InternalDurationRecord): -1n | 0n | 1n;

/** https://tc39.es/proposal-temporal/#sec-temporal-interpretisodatetimeoffset */
export declare function InterpretISODateTimeOffset(isoDate: ISODateRecord, time: TimeRecord | 'start-of-day', offsetBehaviour: ISODateTimeOffsetBehaviour, offsetNanoseconds: Integer, timeZone: TimeZoneIdentifier, disambiguation: 'earlier' | 'later' | 'compatible' | 'reject', offsetOption: 'ignore' | 'use' | 'prefer' | 'reject', matchBehaviour: ISODateTimeMatchBehaviour): PlainCompletion<EpochNanoseconds>;

/** https://tc39.es/proposal-temporal/#sec-temporal-interprettemporaldatetimefields */
export declare function InterpretTemporalDateTimeFields(calendar: KnownCalendarType, fields: CalendarFieldsRecord, overflow: 'constrain' | 'reject'): PlainEvaluator<ISODateTimeRecord>;

export declare interface Intrinsics extends Intrinsics_Table6 {
    '%AbstractModuleSource.prototype%': ObjectValue;
    '%AggregateError.prototype%': ObjectValue;
    '%Array.prototype.values%': FunctionObject;
    '%Array.prototype%': ObjectValue;
    '%ArrayBuffer.prototype%': ObjectValue;
    '%AsyncDisposableStack.prototype%': ObjectValue;
    '%AsyncFunction.prototype%': ObjectValue;
    '%AsyncGeneratorFunction.prototype.prototype%': ObjectValue;
    '%AsyncGeneratorFunction.prototype%': ObjectValue;
    '%BigInt.prototype%': ObjectValue;
    '%BigInt64Array.prototype%': ObjectValue;
    '%BigInt64Array%': FunctionObject;
    '%BigUint64Array.prototype%': ObjectValue;
    '%BigUint64Array%': FunctionObject;
    '%Boolean.prototype%': ObjectValue;
    '%DataView.prototype%': ObjectValue;
    '%Date.prototype%': ObjectValue;
    '%DisposableStack.prototype%': ObjectValue;
    '%Error.prototype%': ObjectValue;
    '%Error.prototype.toString%': BuiltinFunctionObject;
    '%EvalError.prototype%': ObjectValue;
    '%EvalError%': FunctionObject;
    '%FinalizationRegistry.prototype%': ObjectValue;
    '%Float16Array.prototype%': ObjectValue;
    '%Float32Array.prototype%': ObjectValue;
    '%Float32Array%': FunctionObject;
    '%Float64Array.prototype%': ObjectValue;
    '%Float64Array%': FunctionObject;
    '%Function.prototype%': FunctionObject;
    '%GeneratorFunction.prototype.prototype.next%': FunctionObject;
    '%GeneratorFunction.prototype.prototype%': ObjectValue;
    '%GeneratorFunction.prototype%': ObjectValue;
    '%Int16Array.prototype%': ObjectValue;
    '%Int16Array%': FunctionObject;
    '%Int32Array.prototype%': ObjectValue;
    '%Int32Array%': FunctionObject;
    '%Int8Array.prototype%': ObjectValue;
    '%Int8Array%': FunctionObject;
    '%Iterator.prototype%': ObjectValue;
    '%JSON.parse%': FunctionObject;
    '%JSON.stringify%': FunctionObject;
    '%Map.prototype%': ObjectValue;
    '%Number.prototype%': ObjectValue;
    '%Object.prototype.toString%': BuiltinFunctionObject;
    '%Object.prototype.valueOf%': FunctionObject;
    '%Object.prototype%': ObjectValue;
    '%Promise.prototype.then%': FunctionObject;
    '%Promise.prototype%': ObjectValue;
    '%Promise.resolve%': FunctionObject;
    '%RangeError.prototype%': ObjectValue;
    '%RangeError%': FunctionObject;
    '%ReferenceError.prototype%': ObjectValue;
    '%ReferenceError%': FunctionObject;
    '%RegExp.prototype%': ObjectValue;
    '%Set.prototype%': ObjectValue;
    '%ShadowRealm%': FunctionObject;
    '%ShadowRealm.prototype%': ObjectValue;
    '%String.prototype%': ObjectValue;
    '%Symbol.prototype%': ObjectValue;
    '%SuppressedError.prototype%': ObjectValue;
    '%SyntaxError.prototype%': ObjectValue;
    '%SyntaxError%': FunctionObject;
    '%Temporal%': ObjectValue;
    '%Temporal.Duration%': FunctionObject;
    '%Temporal.Duration.prototype%': ObjectValue;
    '%Temporal.Instant%': FunctionObject;
    '%Temporal.Instant.prototype%': ObjectValue;
    '%Temporal.PlainDate%': FunctionObject;
    '%Temporal.PlainDate.prototype%': ObjectValue;
    '%Temporal.PlainDateTime%': FunctionObject;
    '%Temporal.PlainDateTime.prototype%': ObjectValue;
    '%Temporal.PlainMonthDay%': FunctionObject;
    '%Temporal.PlainMonthDay.prototype%': ObjectValue;
    '%Temporal.PlainYearMonth%': FunctionObject;
    '%Temporal.PlainYearMonth.prototype%': ObjectValue;
    '%Temporal.PlainTime%': FunctionObject;
    '%Temporal.PlainTime.prototype%': ObjectValue;
    '%Temporal.ZonedDateTime%': FunctionObject;
    '%Temporal.ZonedDateTime.prototype%': ObjectValue;
    '%TypedArray.prototype%': ObjectValue;
    '%TypeError.prototype%': ObjectValue;
    '%TypeError%': FunctionObject;
    '%Uint16Array.prototype%': ObjectValue;
    '%Uint16Array%': FunctionObject;
    '%Uint32Array.prototype%': ObjectValue;
    '%Uint32Array%': FunctionObject;
    '%Uint8Array.prototype%': ObjectValue;
    '%Uint8Array%': FunctionObject;
    '%Uint8ClampedArray.prototype%': ObjectValue;
    '%Uint8ClampedArray%': FunctionObject;
    '%URIError.prototype%': ObjectValue;
    '%URIError%': FunctionObject;
    '%WeakMap.prototype%': ObjectValue;
    '%WeakRef.prototype%': ObjectValue;
    '%WeakSet.prototype%': ObjectValue;
}

/** https://tc39.es/ecma262/#sec-well-known-intrinsic-objects */
export declare function intrinsics(): Intrinsics;

/** https://tc39.es/ecma262/#table-well-known-intrinsic-objects */
export declare interface Intrinsics_Table6 {
    '%AbstractModuleSource%': FunctionObject;
    '%AggregateError%': FunctionObject;
    '%AsyncDisposableStack%': FunctionObject;
    '%Array%': FunctionObject;
    '%ArrayBuffer%': FunctionObject;
    '%ArrayIteratorPrototype%': ObjectValue;
    '%AsyncFromSyncIteratorPrototype%': ObjectValue;
    '%AsyncFunction%': FunctionObject;
    '%AsyncGeneratorFunction%': FunctionObject;
    '%AsyncGeneratorPrototype%': ObjectValue;
    '%AsyncIteratorPrototype%': ObjectValue;
    '%Atomics%': ObjectValue;
    '%BigInt%': FunctionObject;
    '%BigInt64Array%': FunctionObject;
    '%BigUint64Array%': FunctionObject;
    '%Boolean%': FunctionObject;
    '%DataView%': FunctionObject;
    '%Date%': FunctionObject;
    '%DisposableStack%': FunctionObject;
    '%decodeURI%': FunctionObject;
    '%decodeURIComponent%': FunctionObject;
    '%encodeURI%': FunctionObject;
    '%encodeURIComponent%': FunctionObject;
    '%Error%': FunctionObject;
    '%eval%': FunctionObject;
    '%EvalError%': FunctionObject;
    '%FinalizationRegistry%': FunctionObject;
    '%Float16Array%': FunctionObject;
    '%Float32Array%': FunctionObject;
    '%Float64Array%': FunctionObject;
    '%ForInIteratorPrototype%': ObjectValue;
    '%Function%': FunctionObject;
    '%GeneratorFunction%': FunctionObject;
    '%GeneratorPrototype%': ObjectValue;
    '%Int8Array%': FunctionObject;
    '%Int16Array%': FunctionObject;
    '%Int32Array%': FunctionObject;
    '%isFinite%': FunctionObject;
    '%isNaN%': FunctionObject;
    '%Iterator%': FunctionObject;
    '%IteratorHelperPrototype%': ObjectValue;
    '%JSON%': ObjectValue;
    '%Map%': FunctionObject;
    '%MapIteratorPrototype%': ObjectValue;
    '%Math%': ObjectValue;
    '%Number%': FunctionObject;
    '%Object%': FunctionObject;
    '%parseFloat%': FunctionObject;
    '%parseInt%': FunctionObject;
    '%Promise%': FunctionObject;
    '%Proxy%': FunctionObject;
    '%RangeError%': FunctionObject;
    '%ReferenceError%': FunctionObject;
    '%Reflect%': ObjectValue;
    '%RegExp%': FunctionObject;
    '%RegExpStringIteratorPrototype%': ObjectValue;
    '%Set%': FunctionObject;
    '%SetIteratorPrototype%': ObjectValue;
    '%SharedArrayBuffer%': FunctionObject;
    '%String%': FunctionObject;
    '%StringIteratorPrototype%': ObjectValue;
    '%Symbol%': FunctionObject;
    '%SuppressedError%': FunctionObject;
    '%SyntaxError%': FunctionObject;
    '%ThrowTypeError%': FunctionObject;
    '%TypedArray%': FunctionObject;
    '%TypeError%': FunctionObject;
    '%Uint8Array%': FunctionObject;
    '%Uint8ClampedArray%': FunctionObject;
    '%Uint16Array%': FunctionObject;
    '%Uint32Array%': FunctionObject;
    '%URIError%': FunctionObject;
    '%WeakMap%': FunctionObject;
    '%WeakRef%': FunctionObject;
    '%WeakSet%': FunctionObject;
    '%WrapForValidIteratorPrototype%': ObjectValue;
}

/** NON-SPEC */
export declare function IntrinsicsFunctionToString(F: FunctionObject): string;

/** https://tc39.es/ecma262/#sec-invoke */
export declare function Invoke(V: Value, P: PropertyKeyValue | string, argumentsList?: Arguments): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-isaccessordescriptor */
export declare function IsAccessorDescriptor(propertyDesc: Descriptor): propertyDesc is AccessorDescriptor;

/** https://tc39.es/ecma262/#sec-isanonymousfunctiondefinition */
export declare function IsAnonymousFunctionDefinition(expr: ParseNode): boolean;

export declare function isArgumentExoticObject(value: Value): value is MappedArgumentsObject | UnmappedArgumentsObject;

/** https://tc39.es/ecma262/#sec-isarray */
export declare function IsArray(argument: Value): boolean | ThrowCompletion;

export declare function isArrayBufferObject(o: Value): o is ArrayBufferObject;

/** https://tc39.es/ecma262/#sec-isarraybufferviewoutofbounds */
export declare function IsArrayBufferViewOutOfBounds(O: DataViewObject | TypedArrayObject): boolean;

export declare function isArrayExoticObject(O: Value): boolean;

export declare function isArrayIndex(V: string | Value): boolean;

export declare function IsAwaitUsingDeclaration(node: ParseNode): boolean;

/** https://tc39.es/ecma262/#sec-isbigintelementtype */
export declare function IsBigIntElementType(type: TypedArrayTypes): boolean;

export declare function isBoundFunctionObject(object: object): object is BoundFunctionObject;

export declare function isBuiltinFunctionObject(O: undefined | null | Value): O is BuiltinFunctionObject;

export declare function isCalendarUnit(unit: TemporalUnit): unit is 'year' | 'month' | 'week';

/** https://tc39.es/ecma262/#sec-iscallable */
export declare function IsCallable(argument: Value): argument is FunctionObject;

export declare function IsCharacterClass(node: ParseNode.RegExp.ClassAtom): boolean;

/** https://tc39.es/ecma262/#sec-iscompatiblepropertydescriptor */
export declare function IsCompatiblePropertyDescriptor(extensible: boolean, propertyDesc: Descriptor, current: undefined | FullyPopulatedDescriptor): boolean;

export declare function IsComputedPropertyKey(node: ParseNode.PropertyNameLike): node is ParseNode.PropertyName;

/** https://tc39.es/ecma262/#sec-isconcatspreadable */
export declare function IsConcatSpreadable(O: Value): PlainEvaluator<boolean>;

export declare function IsConstantDeclaration(node: ParseNode | ParseNode.LetOrConst): boolean;

/** https://tc39.es/ecma262/#sec-isconstructor */
export declare function IsConstructor(argument: Value): argument is FunctionObject;

/** https://tc39.es/ecma262/#sec-isdatadescriptor */
export declare function IsDataDescriptor(propertyDesc: Descriptor): propertyDesc is DataDescriptor;

export declare function isDataViewObject(V: Value): V is DataViewObject;

export declare function isDateObject(value: Value): value is DateObject;

export declare function isDateUnit(unit: TemporalUnit | 'auto'): unit is DateUnit;

export declare function IsDestructuring(node: ParseNode): boolean;

/** https://tc39.es/ecma262/#sec-isdetachedbuffer */
export declare function IsDetachedBuffer(arrayBuffer: ArrayBufferObject): boolean;

export declare function isECMAScriptFunctionObject(O: undefined | null | Value): O is ECMAScriptFunctionObject;

/** https://tc39.es/proposal-is-error/#sec-iserror */
declare function IsError(argument: Value): argument is ErrorObject;
export { IsError }
export { IsError as isErrorObject }

export declare function isEvaluator(value: unknown): value is Evaluator<unknown>;

/** https://tc39.es/ecma262/#sec-isextensible-o */
export declare function IsExtensible(O: ObjectValue): Generator<EvaluatorYieldType, PlainCompletion<boolean>, EvaluatorNextType>;

export declare function isFinalizationRegistryObject(object: object): object is FinalizationRegistryObject;

/** https://tc39.es/ecma262/#sec-isfixedlengtharraybuffer */
export declare function IsFixedLengthArrayBuffer(arrayBuffer: ArrayBufferObject): boolean;

export declare function IsFunctionDefinition(node: ParseNode): node is FunctionDeclaration;

export declare function isFunctionObject(O: Value): O is FunctionObject;

/** https://tc39.es/ecma262/#sec-isgenericdescriptor */
export declare function IsGenericDescriptor(propertyDesc: Descriptor): propertyDesc is GenericDescriptor;

export declare function IsIdentifierRef(node: ParseNode): node is ParseNode.IdentifierReference;

export declare function IsInTailPosition(_node: ParseNode): boolean;

/** https://tc39.es/ecma262/#sec-ecmascript-data-types-and-values */
export declare function isIntegerIndex(V: string | Value): boolean;

/** https://tc39.es/ecma262/#sec-isinteger */
export declare function IsIntegralNumber(argument: Value): boolean;

export declare const isLeadingSurrogate: (cp: number) => boolean;

/** https://tc39.es/ecma262/#sec-islessthan */
export declare function IsLessThan(x: Value, y: Value, LeftFirst?: boolean): PlainEvaluator<boolean | undefined>;

/** https://tc39.es/ecma262/#sec-islooselyequal */
export declare function IsLooselyEqual(x: Value, y: Value): PlainEvaluator<boolean>;

export declare function isMapObject(value: Value): value is MapObject;

export declare function isModuleNamespaceObject(V: Value): V is ModuleNamespaceObject;

/** https://tc39.es/proposal-defer-import-eval/#sec-ismodulesccevaluated */
export declare function IsModuleSCCEvaluated(module: CyclicModuleRecord): boolean;

export declare function isNonNegativeInteger(argument: number): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-records */
export declare interface ISODateRecord {
    readonly Year: Integer;
    readonly Month: Integer;
    readonly Day: Integer;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatesurpasses */
export declare function ISODateSurpasses(sign: 1n | -1n, baseDate: ISODateRecord, years: Integer, month: Integer, weeks: Integer, days: Integer, isoDateTo: ISODateRecord): boolean;

export declare type ISODateTimeMatchBehaviour = 'match-exactly' | 'match-minutes';

export declare type ISODateTimeOffsetBehaviour = 'option' | 'exact' | 'wall';

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-date-time-records */
export declare interface ISODateTimeRecord {
    readonly ISODate: ISODateRecord;
    readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetimewithinlimits */
export declare function ISODateTimeWithinLimits(isoDateTime: ISODateTimeRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-isodatetoepochdays */
export declare function ISODateToEpochDays(year: Integer, month: Integer, date: Integer): Integer;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatetofields */
export declare function ISODateToFields(calendar: KnownCalendarType, isoDate: ISODateRecord, type: 'date' | 'year-month' | 'month-day'): CalendarFieldsRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodatewithinlimits */
export declare function ISODateWithinLimits(isoDate: ISODateRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofweek */
export declare function ISODayOfWeek(isoDate: ISODateRecord): Integer;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodayofyear */
export declare function ISODayOfYear(isoDate: ISODateRecord): Integer;

/** https://tc39.es/proposal-temporal/#sec-temporal-isodaysinmonth */
export declare function ISODaysInMonth(year: Integer, month: Integer): Integer;

/** https://tc39.es/ecma262/#sec-isoffsettimezoneidentifier */
export declare function IsOffsetTimeZoneIdentifier(offsetString: string): boolean;

export declare function isOrdinaryObject(value: Value): value is OrdinaryObject;

/** https://tc39.es/proposal-temporal/#sec-temporal-isoweekofyear */
export declare function ISOWeekOfYear(isoDate: ISODateRecord): YearWeekRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-iso-year-month-records */
export declare interface ISOYearMonthRecord {
    readonly Year: bigint;
    readonly Month: bigint;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-isoyearmonthwithinlimits */
export declare function ISOYearMonthWithinLimits(isoDate: ISODateRecord): boolean;

/** https://tc39.es/proposal-temporal/#sec-ispartialtemporalobject */
export declare function IsPartialTemporalObject(value: Value): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-isprivatereference */
export declare function IsPrivateReference(V: ReferenceRecord): V is ReferenceRecord & {
    readonly ReferencedName: PrivateName;
};

/** https://tc39.es/ecma262/#sec-ispromise */
export declare function IsPromise(x: Value): boolean;

export declare function isPromiseObject(value: Value): value is PromiseObject;

/** https://tc39.es/ecma262/#sec-ispropertykey */
export declare function IsPropertyKey(argument: unknown): argument is PropertyKeyValue;

/** https://tc39.es/ecma262/#sec-ispropertyreference */
export declare function IsPropertyReference(V: ReferenceRecord): boolean;

export declare function isProxyExoticObject(O: Value): O is ProxyObject;

/** https://tc39.es/ecma262/#sec-isregexp */
export declare function IsRegExp(argument: Value): PlainEvaluator<boolean>;

export declare function isRegExpObject(o: Value): o is RegExpObject;

export declare function isSetObject(value: Value): value is SetObject;

export declare function isShadowRealmObject(value: Value): value is ShadowRealmObject;

/** https://tc39.es/ecma262/#sec-issharedarraybuffer */
export declare function IsSharedArrayBuffer(_obj: Value): boolean;

export declare function IsSimpleParameterList(node: ParseNode | readonly ParseNode[]): boolean;

/** https://tc39.es/ecma262/#sec-static-semantics-isstatic */
export declare function IsStatic(ClassElement: ParseNode.ClassElement): boolean | undefined;

/** https://tc39.es/ecma262/#sec-static-semantics-isstrict */
export declare function IsStrict({ ScriptBody }: ParseNode.Script): boolean;

/** https://tc39.es/ecma262/#sec-isstrictlyequal */
export declare function IsStrictlyEqual(x: Value, y: Value): boolean;

export declare function isStrictModeCode(node: ParseNode): boolean;

/** https://tc39.es/ecma262/#sec-isstringprefix */
export declare function IsStringPrefix(p: string, q: string): boolean;

export declare function IsStringWellFormedUnicode(string: string): boolean;

/** https://tc39.es/ecma262/#sec-issuperreference */
export declare function IsSuperReference(V: ReferenceRecord): boolean;

export declare function isTemporalDurationObject(item: Value): item is TemporalDurationObject;

export declare function isTemporalInstantObject(o: Value): o is TemporalInstantObject;

export declare function isTemporalPlainDateObject(o: Value): o is TemporalPlainDateObject;

export declare function isTemporalPlainDateTimeObject(o: Value): o is TemporalPlainDateTimeObject;

export declare function isTemporalPlainMonthDayObject(o: Value): o is TemporalPlainMonthDayObject;

export declare function isTemporalPlainTimeObject(value: Value): value is TemporalPlainTimeObject;

export declare function isTemporalPlainYearMonthObject(o: Value): o is TemporalPlainYearMonthObject;

export declare function isTemporalZonedDateTimeObject(o: Value): o is TemporalZonedDateTimeObject;

export declare function isTimeUnit(unit: TemporalUnit | 'auto'): unit is TimeUnit;

export declare const isTrailingSurrogate: (cp: number) => boolean;

/** https://tc39.es/ecma262/#sec-istypedarrayfixedlength */
export declare function IsTypedArrayFixedLength(O: TypedArrayObject): boolean;

export declare function isTypedArrayObject(value: Value): value is TypedArrayObject;

/** https://tc39.es/ecma262/#sec-istypedarrayoutofbounds */
export declare function IsTypedArrayOutOfBounds(taRecord: TypedArrayWithBufferWitnessRecord): boolean;

/** https://tc39.es/ecma262/#sec-isunresolvablereference */
export declare function IsUnresolvableReference(V: ReferenceRecord): boolean;

/** https://tc39.es/ecma262/#sec-isunsignedelementtype */
export declare function IsUnsignedElementType(type: TypedArrayTypes): boolean;

export declare function IsUsingDeclaration(node: ParseNode): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidduration */
export declare function IsValidDuration(years: Integer, months: Integer, weeks: Integer, days: Integer, hours: Integer, minutes: Integer, seconds: Integer, milliseconds: Integer, microseconds: Integer, nanoseconds: Integer): boolean;

/** https://tc39.es/ecma262/#sec-isvalidintegerindex */
export declare function IsValidIntegerIndex(O: TypedArrayObject, index: NumberValue): boolean;

/** https://tc39.es/proposal-temporal/#sec-temporal-isvalidisodate */
export declare function IsValidISODate(year: Integer, month: Integer, day: Integer): boolean;

/** https://tc39.es/proposal-temporal/#sec-isvalidtime */
export declare function IsValidTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer): boolean;

/** https://tc39.es/ecma262/#sec-isviewoutofbounds */
export declare function IsViewOutOfBounds(viewRecord: DataViewWithBufferWitnessRecord): boolean;

export declare function isWeakMapObject(object: object): object is WeakMapObject;

export declare function isWeakRef(object: object): object is WeakRefObject;

export declare function isWeakSetObject(object: object): object is WeakSetObject;

/** https://tc39.es/proposal-temporal/#sec-iswithinepochnanosecondsinterval */
export declare function IsWithinEpochNanosecondsInterval(epochNanoseconds: Integer): boolean;

export declare function isWrappedFunctionExoticObject(value: Value): value is WrappedFunctionExoticObject;

export declare function IteratorBindingInitialization_ArrayBindingPattern({ BindingElementList, BindingRestElement }: ParseNode.ArrayBindingPattern, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | undefined): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-iteratorbindinginitialization */
export declare function IteratorBindingInitialization_FormalParameters(FormalParameters: ParseNode.FormalParameters, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | undefined): Generator<EvaluatorYieldType, PlainCompletion<void>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-iteratorclose */
export declare function IteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C): Evaluator<C | ThrowCompletion>;

/** https://tc39.es/ecma262/#sec-iteratorcloseall */
export declare function IteratorCloseAll<C>(iters: Iterable<IteratorRecord>, completion: Completion<C>): Evaluator<Completion<C>>;

/** https://tc39.es/ecma262/#sec-iteratorcomplete */
export declare function IteratorComplete(iteratorResult: ObjectValue): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-iteratornext */
export declare function IteratorNext(iteratorRecord: IteratorRecord, value?: Value): ValueEvaluator<ObjectValue>;

declare interface IteratorObject_2 extends OrdinaryObject {
    Iterated: IteratorRecord;
}
export { IteratorObject_2 as IteratorObject }

/** https://tc39.es/ecma262/#sec-operations-on-iterator-objects */
/** https://tc39.es/ecma262/#sec-iteration */
export declare interface IteratorRecord {
    readonly Iterator: ObjectValue;
    readonly NextMethod: Value;
    Done: boolean;
}

/** https://tc39.es/ecma262/#sec-iteratorstep */
export declare function IteratorStep(iteratorRecord: IteratorRecord): PlainEvaluator<ObjectValue | 'done'>;

/** https://tc39.es/ecma262/#sec-iteratorstepvalue */
export declare function IteratorStepValue(iteratorRecord: IteratorRecord): PlainEvaluator<Value | 'done'>;

/** https://tc39.es/ecma262/#sec-iteratortolist */
export declare function IteratorToList(iteratorRecord: IteratorRecord): PlainEvaluator<Value[]>;

/** https://tc39.es/ecma262/#sec-iteratorvalue */
export declare function IteratorValue(iterResult: ObjectValue): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-IteratorZip */
export declare function IteratorZip(_iters: readonly IteratorRecord[], mode: IteratorZipMode, padding: readonly Value[], finishResults: (results: readonly Value[]) => Value): GeneratorObject;

export declare type IteratorZipMode = 'shortest' | 'longest' | 'strict';

/** https://tc39.es/ecma262/#job */
export declare interface Job {
    readonly queueName: string;
    readonly job: () => PlainEvaluator<unknown>;
    readonly callerRealm: Realm | undefined;
    readonly callerScriptOrModule: AbstractModuleRecord | ScriptRecord | null;
}

/** https://tc39.es/ecma262/#sec-jobcallback-records */
export declare interface JobCallbackRecord {
    Callback: FunctionObject & {
        [kAsyncContext]?: ExecutionContext;
    };
    HostDefined: undefined;
}

export declare interface JobQueue extends Markable {
    enqueueFinalizationRegistryCleanupJob(job: Job): void;
    enqueuePromiseJob(job: Job): void;
    enqueueTimeoutJob(job: Job): void;
    enqueueGenericJob(job: Job): void;
    onNewJob: Set<(job: Job) => void>;
    shift(): Job | undefined;
    shiftFinalizationRegistryCleanupJob?(): Job | undefined;
    shiftPromiseJob?(): Job | undefined;
    shiftTimeoutJob?(): Job | undefined;
    shiftGenericJob?(): Job | undefined;
    get length(): number;
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type */
export declare class JSStringValue extends PrimitiveValue {
    readonly type: 'String';
    readonly value: string;
    private constructor();
    stringValue(): string;
    static [Symbol.hasInstance]: (value: unknown) => value is JSStringValue;
}

declare const kAsyncContext: unique symbol;

/** https://tc39.es/ecma262/#sec-runtime-semantics-keyedbindinginitialization */
export declare function KeyedBindingInitialization(node: ParseNode.BindingElement | ParseNode.SingleNameBinding, value: Value, environment: EnvironmentRecord | undefined, propertyName: string | PropertyKeyValue): Generator<EvaluatorYieldType, PlainCompletion<void>, EvaluatorNextType>;

export declare type KeyedGroupRecord = {
    Key: PropertyKeyValue;
    Elements: Value[];
};

/** https://tc39.es/ecma262/#sec-keyforsymbol */
export declare function KeyForSymbol(sym: SymbolValue): string | undefined;

export declare const kInternal: unique symbol;

/** https://tc39.es/proposal-temporal/#sec-known-calendar-types */
export declare type KnownCalendarType = 'iso8601';

export declare interface Label {
    type: LabelType | null;
    readonly name?: string;
    readonly nextToken?: TokenData | null;
}

export declare function LabelledEvaluation(node: ParseNode.LabelledStatement | ParseNode.BreakableStatement, labelSet: Set<string>): StatementEvaluator;

export declare type LabelType = 'switch' | 'loop';

export declare abstract class LanguageParser extends ModuleParser {
    parseScript(): ParseNode.Script;
    parseScriptBody(): ParseNode.ScriptBody;
    parseModule(): ParseNode.Module;
    parseModuleBody(): ParseNode.ModuleBody;
    parseModuleItemList(): ParseNode.ModuleItemList;
}

/** https://tc39.es/proposal-temporal/#sec-largeroftwotemporalunits */
export declare function LargerOfTwoTemporalUnits(xUnit: TemporalUnit, yUnit: TemporalUnit): TemporalUnit;

/** https://tc39.es/ecma262/#sec-lengthofarraylike */
export declare function LengthOfArrayLike(obj: ObjectValue): PlainEvaluator<number>;

export declare abstract class Lexer {
    protected abstract readonly source: string;
    protected abstract readonly decoratingSource?: string;
    protected currentToken: TokenData;
    protected peekToken: TokenData;
    protected peekAheadTokens: TokenData[];
    protected position: number;
    protected get debug(): string;
    protected line: number;
    protected columnOffset: number;
    protected scannedValue: string | number | Token | bigint | boolean;
    protected lineTerminatorBeforeNextToken: boolean;
    protected positionForNextToken: number;
    protected lineForNextToken: number;
    protected columnForNextToken: number;
    protected escapeIndex: number;
    protected abstract readonly specifier?: string;
    earlyErrors: Set<ErrorObject>;
    decorateSyntaxError(error: Pick<ErrorObject, 'HostDefinedMessageString' | 'HostDefinedStack'>, location: number | Locatable): void;
    static decorateSyntaxErrorWithScriptId(error: ObjectValue, scriptId: string | undefined): void;
    addEarlyError({ Value: error }: ThrowCompletion, location?: Locatable): ErrorObject;
    abstract isStrictMode(): boolean;
    raise(error: ThrowCompletion, context?: number | Locatable): never;
    unexpected(location?: number | Locatable): never;
    advance(): TokenData;
    next(): TokenData;
    peek(): TokenData;
    peekAhead(distance?: number): TokenData;
    matches(token: string | Token, peek: TokenData): boolean;
    test(token: string | Token): boolean;
    testAhead(token: string | Token): boolean;
    eat(token: string | Token): boolean;
    expect(token: string | Token): TokenData;
    skipSpace(): void;
    skipHashbangComment(): void;
    skipLineComment(): void;
    skipBlockComment(): void;
    nextToken(): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100 | 101 | 102 | 103;
    scanNumber(): 88 | 90;
    scanString(char: string): 89;
    scanEscapeSequence(): string;
    scanCodePoint(): number;
    scanHex(length: number): number;
    scanIdentifierOrKeyword(isPrivate?: boolean): 49 | 50 | 51 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100 | 102 | 103;
    scanRegularExpressionBody(): void;
    scanRegularExpressionFlags(): void;
}

export declare function LexicallyDeclaredNames(node: ParseNode): string[];

export declare type LexicallyScopedDeclaration = ParseNode.ClassDeclaration | ParseNode.LexicalDeclaration | ParseNode.UsingDeclaration | ParseNode.AwaitUsingDeclaration;

export declare function LexicallyScopedDeclarations(node: ParseNode | readonly ParseNode[]): (ParseNode.Declaration | ParseNode.ExportDeclaration)[];

/** https://tc39.es/proposal-deferred-reexports/#sec-ListAppendUnique */
export declare function ListAppendUnique<T>(target: T[], items: Iterable<T>): void;

export declare type ListOfCharacter = string & {
    __brand__: 'ListOfCharacter';
};

export declare interface LoadedModuleRequestRecord {
    readonly Specifier: string;
    readonly Attributes: readonly ImportAttributeRecord[];
    readonly Module: AbstractModuleRecord;
}

/** https://tc39.es/ecma262/#sec-localtime */
export declare function LocalTime(tv: FiniteTimeValue): IntegralNumber;

export declare type Locatable = TokenData | Position | Location_2 | {
    readonly location: Location_2;
};

declare interface Location_2 {
    readonly startIndex: number;
    readonly endIndex: number;
    readonly start: Position;
    readonly end: Position;
}
export { Location_2 as Location }

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-makeautoaccessorgetter */
export declare function MakeAutoAccessorGetter(_homeObject: ObjectValue, _name: PropertyKeyValue | PrivateName, privateStateName: PrivateName): BuiltinFunctionObject;

export declare function MakeAutoAccessorSetter(_homeObject: ObjectValue, _name: PropertyKeyValue | PrivateName, privateStateName: PrivateName): BuiltinFunctionObject;

/** https://tc39.es/ecma262/#sec-operations-on-objects */
/** https://tc39.es/ecma262/#sec-makebasicobject */
export declare function MakeBasicObject<const T extends string>(internalSlotsList: readonly T[]): ObjectValue & Record<T, unknown>;

/** https://tc39.es/ecma262/#sec-makeclassconstructor */
export declare function MakeClassConstructor(F: Mutable<FunctionObject>): void;

/** https://tc39.es/ecma262/#sec-makeconstructor */
export declare function MakeConstructor(F: Mutable<ECMAScriptFunctionObject> | BuiltinFunctionObject, writablePrototype?: boolean, prototype?: ObjectValue): void;

/** https://tc39.es/ecma262/#sec-makedataviewwithbufferwitnessrecord */
export declare function MakeDataViewWithBufferWitnessRecord(obj: DataViewObject, order: 'seq-cst' | 'unordered'): DataViewWithBufferWitnessRecord;

/** https://tc39.es/ecma262/#sec-makedate */
export declare function MakeDate(day: Num, time: Num): Num | NaN_2;

/** https://tc39.es/ecma262/#sec-makeday */
export declare function MakeDay(year: Num, month: Num, day: Num): Num | NaN_2;

/** https://tc39.es/ecma262/#sec-makefullyear */
export declare function MakeFullYear(year: NumberValue): IntegralNumber | NaN_2;

/** https://tc39.es/ecma262/#sec-makematchindicesindexpairarray */
export declare function MakeMatchIndicesIndexPairArray(S: string, indices: readonly (MatchRecord | undefined)[], groupNames: readonly (string | undefined)[], hasGroups: boolean): OrdinaryObject;

/** https://tc39.es/ecma262/#sec-makemethod */
export declare function MakeMethod(F: Mutable<ECMAScriptFunctionObject>, homeObject: ObjectValue): void;

/** https://tc39.es/ecma262/#sec-makeprivatereference */
export declare function MakePrivateReference(baseValue: Value, privateIdentifier: string): ReferenceRecord;

/** https://tc39.es/ecma262/pr/3728/#sec-makerealm */
export declare function MakeRealm(...args: ConstructorParameters<typeof ManagedRealm>): ExecutionContext;

/** https://tc39.es/ecma262/#sec-maketime */
export declare function MakeTime(hour: Num, minute: Num, second: Num, millisecond: Num): Num;

/** https://tc39.es/ecma262/#sec-maketypedarraywithbufferwitnessrecord */
export declare function MakeTypedArrayWithBufferWitnessRecord(obj: TypedArrayObject, order: 'seq-cst' | 'unordered'): {
    Object: TypedArrayObject;
    CachedBufferByteLength: number | "detached";
};

export declare class ManagedRealm extends Realm {
    TemplateMap: {
        Site: ParseNode.TemplateLiteral;
        Array: ObjectValue;
    }[];
    AgentSignifier: unknown;
    Intrinsics: Intrinsics;
    randomState: BigUint64Array<ArrayBufferLike> | undefined;
    GlobalObject: ObjectValue;
    GlobalEnv: GlobalEnvironmentRecord;
    HostDefined: ManagedRealmHostDefined;
    topContext: ExecutionContext;
    /**
     * Push this realm's top context (if it is not currently) as the running execution context.
     *
     * Callers must ensure to call the return value after the work is done.
     */
    pushTopContext(): (() => void) | undefined;
    /** https://tc39.es/ecma262/#sec-initializehostdefinedrealm */
    constructor(HostDefined?: ManagedRealmHostDefined, customizations?: (record: Realm) => [global: ObjectValue | undefined, thisValue: ObjectValue | undefined]);
    compileScript(sourceText: string, hostDefined?: ParseScriptHostDefined): PlainCompletion<ScriptRecord>;
    compileModule(sourceText: string, hostDefined?: ModuleRecordHostDefined): NormalCompletion<SourceTextModuleRecord> | ThrowCompletion<ObjectValue>;
    /**
     * Evaluate a script.
     * @param callback will be called after the evaluation is finished. callback may be called synchronously.
     * When the callback is called, any execution context pushed for the evaluation will have been popped. (safe to run `runJobQueue`).
     */
    evaluateScript(sourceText: string | ScriptRecord, scriptOptions: ParseScriptHostDefined | undefined, callback: (completion: NormalCompletion<Value> | ThrowCompletion) => void, evaluationOptions?: ResumeEvaluateOptions | false): void;
    /**
     * Evaluate a script (skip the debugger).
     */
    evaluateScriptSkipDebugger(sourceText: string | ScriptRecord, scriptOptions?: ParseScriptHostDefined): ValueCompletion;
    /**
     * Evaluate a module.
     * @param callback will be called after the evaluation is finished. callback may be called synchronously.
     * callback will be called **with or without an execution context**.
     */
    evaluateModule<T extends CyclicModuleRecord>(sourceText: string | T, specifier: string | undefined, finish: (completion: ValueCompletion<PromiseObject>) => void): void;
    createJSONModule(sourceText: string): PlainCompletion<SyntheticModuleRecord>;
    createTextModule(sourceText: string): PlainCompletion<SyntheticModuleRecord>;
    createBytesModule(content: Uint8Array): PlainCompletion<SyntheticModuleRecord>;
}

export declare interface ManagedRealmHostDefined {
    getImportMetaProperties?(module: ModuleRecordHostDefinedPublic): readonly {
        readonly Key: PropertyKeyValue;
        readonly Value: Value;
    }[];
    finalizeImportMeta?(meta: ObjectValue, module: ModuleRecordHostDefinedPublic): PlainCompletion<void>;
    resolverCache?: ModuleCache;
    randomSeed?(): string;
    attachingInspector?: unknown;
    attachingInspectorReportError?(realm: Realm, error: Value): void;
    /**
     * See https://tc39.es/ecma262/#sec-HostLoadImportedModule
     * In case of
     *  <button type="button" onclick="import('./foo.mjs')">Click me</button>
     * and
     *  new ShadowRealm().importValue('./foo.mjs', 'default')
     * a Realm instead of a ModuleRecord or ScriptRecord is passed as the referrer.
     */
    specifier?: string | undefined;
    /** The name displayed in the inspector. */
    name?: string | undefined;
}

export declare interface MapObject extends OrdinaryObject {
    readonly MapData: {
        Key: Value | undefined;
        Value: Value | undefined;
    }[];
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects */
export declare interface MappedArgumentsObject extends OrdinaryObject {
    readonly ParameterMap: ObjectValue;
}

export declare interface Markable {
    mark(marker: GCMarker): void;
}

export declare function markBuiltinFunctionAsConstructor(steps: NativeSteps): NativeSteps;

export declare type MatcherResult = RegExpState | 'failure';

export declare interface MatchRecord {
    readonly StartIndex: number;
    readonly EndIndex: number;
}

/** https://tc39.es/ecma262/#mathematical-value */
export declare type MathematicalValue = Decimal;

export declare const MaxEpochNanoseconds: bigint;

/** https://tc39.es/proposal-temporal/#sec-maximumtemporaldurationroundingincrement */
export declare function MaximumTemporalDurationRoundingIncrement(unit: TemporalUnit): 24n | 60n | 1000n | 'no-maximum';

/** https://tc39.es/proposal-temporal/#eqn-maxTimeDuration */
export declare const maxTimeDuration = 9007199254740991999999999n;

/** https://tc39.es/proposal-deferred-reexports/#sec-MergeImportedNames */
export declare function MergeImportedNames(a: ImportedNamesValue, b: ImportedNamesValue): ImportedNamesValue;

export declare function MethodDefinitionEvaluation(node: ParseNode.MethodDefinitionLike, object: ObjectValue, enumerable: boolean): PlainEvaluator<PrivateElementRecord | void>;

export declare function MethodDefinitionEvaluation(node: ParseNode.MethodDefinitionLike, object: ObjectValue): PlainEvaluator<ClassElementDefinitionRecord>;

export declare class MicroTaskEventLoop extends AbstractEventLoop {
    enqueue(_type: string, job: Job): void;
    protected shiftNextJob(): Job | undefined;
    protected get hasQueuedJobs(): boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-midnighttimerecord */
export declare function MidnightTimeRecord(): TimeRecord;

export declare function MillisecondFromTime(t: FiniteTimeValue): Integer;

export declare const MillisecondsPerDay: bigint;

export declare const MillisecondsPerHour: bigint;

export declare const MillisecondsPerMinute: bigint;

export declare const MillisecondsPerSecond = 1000n;

export declare const MinEpochNanoseconds: bigint;

export declare function MinuteFromTime(t: FiniteTimeValue): Integer;

export declare const MinutesPerHour = 60n;

export declare class ModuleCache {
    #private;
    static fromReferer(referrer: CyclicModuleRecord | ScriptRecord | Realm): ModuleCache;
    static toCacheKey(moduleRequest: ModuleCacheKeyObject): ModuleCacheKey;
    toCacheKey(moduleRequest: ModuleCacheKeyObject): ModuleCacheKey;
    set(key: ModuleCacheKey, result: PlainCompletion<AbstractModuleRecord>): void;
    load(key: ModuleCacheKey, loader: ModuleCacheLoader, callback: (result: PlainCompletion<AbstractModuleRecord>) => void): void;
}

export declare type ModuleCacheKey = string & {
    __ModuleCacheKey: never;
};

export declare type ModuleCacheKeyObject = Pick<ModuleRequestRecord, 'Specifier' | 'Attributes'>;

export declare type ModuleCacheLoader = (setCache: (value: PlainCompletion<AbstractModuleRecord>, cacheKey?: ModuleCacheKey) => void) => void;

export declare interface ModuleEnvironmentBinding extends DeclarativeEnvironmentBinding {
    readonly target?: [AbstractModuleRecord, string];
}

/** https://tc39.es/ecma262/#sec-module-environment-records */
export declare class ModuleEnvironmentRecord extends DeclarativeEnvironmentRecord {
    readonly bindings: Map<string, ModuleEnvironmentBinding>;
    /** https://tc39.es/ecma262/#sec-module-environment-records-getbindingvalue-n-s */
    GetBindingValue(name: string, strict: boolean): ValueEvaluator;
    /** https://tc39.es/ecma262/#sec-module-environment-records-deletebinding-n */
    DeleteBinding(): never;
    /** https://tc39.es/ecma262/#sec-module-environment-records-hasthisbinding */
    HasThisBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-module-environment-records-getthisbinding */
    GetThisBinding(): UndefinedValue;
    /** https://tc39.es/ecma262/#sec-createimportbinding */
    CreateImportBinding(name: string, targetModule: AbstractModuleRecord, targetName: string): NormalCompletion<undefined>;
    /** https://tc39.es/proposal-deferred-reexports/#sec-createdeferredinitializationbinding */
    CreateDeferredInitializationBinding(name: string, initializationSteps: () => Value): void;
}

/**
 * If finish is called with `undefined`, it will pass the module request to the next loader in the chain.
 */
export declare type ModuleLoader = (referrer: CyclicModuleRecord | ScriptRecord | Realm, moduleRequest: ModuleRequestRecord, hostDefined: ModuleRecordHostDefined | undefined, finish: (result: AbstractModuleRecord | NormalCompletion<AbstractModuleRecord> | ThrowCompletion | undefined) => void, suggestError: (error: string) => void) => void;

export declare interface ModuleLoaderResultWithCacheKey {
    cacheKey: ModuleCacheKey;
    completion: AbstractModuleRecord | NormalCompletion<AbstractModuleRecord> | ThrowCompletion;
}

export declare interface ModuleLoaderResultWithoutCacheKey {
    cacheKey: ModuleCacheKey | undefined;
    completion: ThrowCompletion;
}

/** https://tc39.es/ecma262/#sec-modulenamespacecreate */
export declare function ModuleNamespaceCreate(module: AbstractModuleRecord, exports: readonly string[], phase: 'defer' | 'evaluation'): ModuleNamespaceObject;

export declare interface ModuleNamespaceObject extends ExoticObject {
    readonly Module: AbstractModuleRecord;
    readonly Exports: Set<string>;
    readonly Deferred: boolean;
}

export declare abstract class ModuleParser extends StatementParser {
    parseImportDeclaration(): ParseNode.ImportDeclaration | ParseNode.ExpressionStatement | ParseNode.LabelledStatement;
    parseImportClause(node?: ParseNode.Unfinished<ParseNode.ImportClause>): ParseNode.ImportClause;
    parseImportedDefaultBinding(): ParseNode.ImportedDefaultBinding;
    parseNameSpaceImport(): ParseNode.NameSpaceImport;
    parseFilteredNameSpaceImport(namedImports: ParseNode.NamedImports): ParseNode.NameSpaceImport;
    parseNamedImports(): ParseNode.NamedImports;
    parseImportSpecifier(): ParseNode.ImportSpecifier;
    parseExportDeclaration(decoratorsBeforeExportKeyword: null | readonly ParseNode.Decorator[]): ParseNode.ExportDeclaration;
    parseNamedExports(): ParseNode.NamedExports;
    parseExportSpecifier(): ParseNode.ExportSpecifier;
    parseModuleExportName(): ParseNode.ModuleExportName;
    parseFromClause(): ParseNode.FromClause;
    parseWithClause(): ParseNode.WithClause;
    parseWithEntry(): ParseNode.WithEntry;
}

export declare type ModuleRecordHostDefined = {
    public?: ModuleRecordHostDefinedPublic;
    specifier?: string | undefined;
    readonly SourceTextModuleRecord?: typeof SourceTextModuleRecord;
    scriptId?: string;
    readonly doNotTrackScriptId?: boolean;
};

export declare type ModuleRecordHostDefinedPublic = unknown;

export declare interface ModuleRequestRecord {
    readonly Specifier: string;
    readonly Attributes: readonly ImportAttributeRecord[];
    readonly Phase: 'source' | 'defer' | 'evaluation';
    readonly ImportedNames: ImportedNamesValue;
}

export declare function ModuleRequests(node: ParseNode): ModuleRequestRecord[];

/** https://tc39.es/proposal-defer-import-eval/#sec-ModuleRequestsKeyEqual */
export declare function ModuleRequestsKeyEqual(left: ModuleRequestRecord | LoadedModuleRequestRecord, right: ModuleRequestRecord | LoadedModuleRequestRecord): boolean;

export declare type ModuleSourceObject = ObjectValue;

export declare type MonthCode = string & {
    __brand: 'MonthCode';
};

/** https://tc39.es/ecma262/#sec-month-number */
export declare function MonthFromTime(t: FiniteTimeValue): Integer;

export declare type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

/** https://tc39.es/ecma262/#sec-runtime-semantics-mv-s */
export declare function MV_StringNumericLiteral(StringNumericLiteral: string): NumberValue;

export declare function NamedEvaluation(F: FunctionDeclaration, name: string | PropertyKeyValue | PrivateName): ValueEvaluator<FunctionObject>;

declare type NaN_2 = Num & {
    integral?: false; /** @internal */
    finite?: false; /** @internal */
    value: 'NaN';
};
export { NaN_2 as NaN }

export declare const NanosecondsPerDay: bigint;

export declare const NanosecondsPerHour: bigint;

export declare const NanosecondsPerMicrosecond: bigint;

export declare const NanosecondsPerMillisecond: bigint;

export declare const NanosecondsPerMinute: bigint;

export declare const NanosecondsPerSecond: bigint;

export declare interface NativeSteps {
    (this: BuiltinFunctionObject, args: Arguments, context: FunctionCallContext): PlainEvaluator<Value | void> | PlainCompletion<Value | void>;
    section?: string;
    isConstructor?: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-negateroundingmode */
export declare function NegateRoundingMode(roundingMode: RoundingMode): RoundingMode;

/** https://tc39.es/ecma262/#sec-newpromisecapability */
export declare function NewPromiseCapability(constructor: Value): PlainEvaluator<PromiseCapabilityRecord>;

/** https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick */
export declare type NodeJSJobType = 'timers' | 'pending callbacks' | 'idle-prepare' | 'poll' | 'check' | 'close callbacks';

/** https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick */
export declare class NodeJSLikeEventLoop extends AbstractEventLoop {
    #private;
    fallbackType: NodeJSJobType;
    protected jobsByType: Record<NodeJSJobType, Set<Job>>;
    protected queuedJobs: Set<Job>;
    enqueue(type: NodeJSJobType | string, job: Job): void;
    protected shiftNextJob(): Job | undefined;
    protected get hasQueuedJobs(): boolean;
    mark(marker: GCMarker): void;
}

export declare type NonCalendarFields = 'time-fields' | 'time-fields-with-offset' | 'time-fields-with-time-zone-and-offset' | 'no-non-calendar-fields';

/** https://tc39.es/ecma262/#sec-static-semantics-nonconstructorelements */
export declare function NonConstructorElements(ClassElementList: ParseNode.ClassElementList): ParseNode.ClassElement[];

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisocalendardatetoiso */
export declare function NonISOCalendarDateToISO(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _fields: CalendarFieldsRecord, _overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisocalendarisotodate */
export declare function NonISOCalendarISOToDate(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _isoDate: ISODateRecord): CalendarDateRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisodateadd */
export declare function NonISODateAdd(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _isoDate: ISODateRecord, _duration: DateDurationRecord, _overflow: 'constrain' | 'reject'): never;

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisodateuntil */
export declare function NonISODateUntil(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _isoDateFrom: ISODateRecord, _isoDateTo: ISODateRecord, _largestUnit: DateUnit): never;

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisofieldkeystoignore */
export declare function NonISOFieldKeysToIgnore(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _fields: CalendarFieldsRecord): CalendarPropertyKey[];

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisomonthdaytoisoreferencedate */
export declare function NonISOMonthDayToISOReferenceDate(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _fields: CalendarFieldsRecord, _overflow: 'constrain' | 'reject'): never;

/** https://tc39.es/proposal-temporal/#sec-temporal-nonisoresolvefields */
export declare function NonISOResolveFields(_calendar: Exclude<KnownCalendarType, 'iso8601'>, _fields: CalendarFieldsRecord, _type: 'date' | 'year-month' | 'month-day'): CalendarFieldsRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-noontimerecord */
export declare function NoonTimeRecord(): TimeRecord;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare type NormalCompletion<T> = NormalCompletionImpl<T>;

/** https://tc39.es/ecma262/#sec-normalcompletion */
export declare const NormalCompletion: typeof NormalCompletionImpl & {
    /** https://tc39.es/ecma262/#sec-normalcompletion */
    <const T>(value: T): NormalCompletion<T>;
};

export declare class NormalCompletionImpl<const T> extends CompletionImpl<T> {
    readonly Type: 'normal';
    readonly Value: T;
    readonly Target: undefined;
    private constructor();
}

export declare type NormalCompletionInit<T> = Pick<NormalCompletion<T>, 'Type' | 'Value' | 'Target'>;

export declare const NoTimeZone: undefined;

export declare type NoTimeZone = undefined;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit */
export declare function NudgeToCalendarUnit(sign: -1n | 1n, duration: InternalDurationRecord, originEpochNanoseconds: EpochNanoseconds, destEpochNanoseconds: EpochNanoseconds, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier | undefined, calendar: KnownCalendarType, increment: Integer, unit: DateUnit, roundingMode: RoundingMode): PlainCompletion<{
    NudgeResult: DurationNudgeResultRecord;
    Total: MathematicalValue;
}>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetodayortime */
export declare function NudgeToDayOrTime(duration: InternalDurationRecord, destEpochNanoseconds: EpochNanoseconds, largestUnit: TemporalUnit, increment: Integer, smallestUnit: TimeUnit | 'day', roundingMode: RoundingMode): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-nudgetozonedtime */
export declare function NudgeToZonedTime(sign: -1n | 1n, duration: InternalDurationRecord, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier, calendar: KnownCalendarType, increment: Integer, unit: TimeUnit, roundingMode: RoundingMode): PlainCompletion<DurationNudgeResultRecord>;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type */
export declare class NullValue extends PrimitiveValue {
    readonly type: 'Null';
    readonly value: null;
    private constructor();
    static [Symbol.hasInstance]: (value: unknown) => value is NullValue;
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type */
export declare type Num = number;

/** https://tc39.es/ecma262/#sec-numbertobigint */
export declare function NumberToBigInt(number: NumberValue): BigIntValue | ThrowCompletion;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type */
export declare class NumberValue extends PrimitiveValue {
    readonly type: 'Number';
    readonly value: number;
    private constructor();
    numberValue(): number;
    isNaN(): boolean;
    isInfinity(): boolean;
    isFinite(): boolean;
    isIntegralNumber(): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-unaryMinus */
    static unaryMinus(x: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseNOT */
    static bitwiseNOT(x: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate */
    static exponentiate(base: NumberValue, exponent: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-multiply */
    static multiply(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-divide */
    static divide(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-remainder */
    static remainder(n: NumberValue, d: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-add */
    static add(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-subtract */
    static subtract(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-leftShift */
    static leftShift(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-signedRightShift */
    static signedRightShift(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-unsignedRightShift */
    static unsignedRightShift(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-lessThan */
    static lessThan(x: NumberValue, y: NumberValue): boolean | undefined;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-equal */
    static equal(x: NumberValue, y: NumberValue): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-sameValue */
    static sameValue(x: NumberValue, y: NumberValue): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-sameValueZero */
    static sameValueZero(x: NumberValue, y: NumberValue): boolean;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseAND */
    static bitwiseAND(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseXOR */
    static bitwiseXOR(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseOR */
    static bitwiseOR(x: NumberValue, y: NumberValue): NumberValue;
    /** https://tc39.es/ecma262/#sec-numeric-types-number-tostring */
    static toString(x: NumberValue, radix: Integer): string;
    static readonly unit: NumberValue;
    static [Symbol.hasInstance]: (value: unknown) => value is NumberValue;
}

/** https://tc39.es/ecma262/#sec-numerictorawbytes */
export declare function NumericToRawBytes(type: TypedArrayTypes, value: NumberValue | BigIntValue, isLittleEndian: boolean): number[];

export declare function NumericValue(node: ParseNode.NumericLiteral): bigint | number;

/** https://tc39.es/ecma262/#sec-object-environment-records */
export declare class ObjectEnvironmentRecord extends EnvironmentRecord {
    BindingObject: ObjectValue;
    IsWithEnvironment: boolean;
    /** https://tc39.es/ecma262/#sec-newobjectenvironment */
    constructor(object: ObjectValue, IsWithEnvironment: boolean, Environment: EnvironmentRecord | null);
    /** https://tc39.es/ecma262/#sec-object-environment-records-hasbinding-n */
    HasBinding(name: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-object-environment-records-createmutablebinding-n-d */
    CreateMutableBinding(name: string, deletable: boolean): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-object-environment-records-createimmutablebinding-n-s */
    CreateImmutableBinding(_name: string, _strict: boolean): void;
    /** https://tc39.es/ecma262/#sec-object-environment-records-initializebinding-n-v */
    InitializeBinding(name: string, value: Value): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-object-environment-records-setmutablebinding-n-v-s */
    SetMutableBinding(name: string, value: Value, strict: boolean): PlainEvaluator;
    /** https://tc39.es/ecma262/#sec-object-environment-records-getbindingvalue-n-s */
    GetBindingValue(name: string, strict: boolean): ValueEvaluator;
    /** https://tc39.es/ecma262/#sec-object-environment-records-deletebinding-n */
    DeleteBinding(name: string): PlainEvaluator<boolean>;
    /** https://tc39.es/ecma262/#sec-object-environment-records-hasthisbinding */
    HasThisBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-object-environment-records-hassuperbinding */
    HasSuperBinding(): boolean;
    /** https://tc39.es/ecma262/#sec-object-environment-records-withbaseobject */
    WithBaseObject(): ObjectValue | UndefinedValue;
    mark(m: GCMarker): void;
}

export declare interface ObjectInternalMethods<Self> {
    GetPrototypeOf(this: Self): ValueEvaluator<ObjectValue | NullValue>;
    SetPrototypeOf(this: Self, V: ObjectValue | NullValue): PlainEvaluator<boolean>;
    IsExtensible(this: Self): PlainEvaluator<boolean>;
    PreventExtensions(this: Self): PlainEvaluator<boolean>;
    GetOwnProperty(this: Self, P: PropertyKeyValue | string): PlainEvaluator<FullyPopulatedDescriptor | undefined>;
    DefineOwnProperty(this: Self, P: PropertyKeyValue | string, Desc: Descriptor): PlainEvaluator<boolean>;
    HasProperty(this: Self, P: PropertyKeyValue | string): PlainEvaluator<boolean>;
    Get(this: Self, P: PropertyKeyValue | string, Receiver: Value): ValueEvaluator;
    Set(this: Self, P: PropertyKeyValue | string, V: Value, Receiver: Value): PlainEvaluator<boolean>;
    Delete(this: Self, P: PropertyKeyValue | string): PlainEvaluator<boolean>;
    OwnPropertyKeys(this: Self): PlainEvaluator<PropertyKeyValue[]>;
    Call?(this: Self, thisArg: Value, args: Arguments): ValueEvaluator;
    Construct?(this: Self, args: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;
}

export declare type ObjectSlotReturn = {
    [key in keyof ObjectInternalMethods<ObjectValue>]: ReturnType<NonNullable<ObjectInternalMethods<ObjectValue>[key]>>;
};

/** https://tc39.es/ecma262/#sec-object-type */
export declare class ObjectValue extends Value implements ObjectInternalMethods<ObjectValue> {
    readonly type: 'Object';
    readonly properties: PropertyKeyMap<FullyPopulatedDescriptor>;
    readonly internalSlotsList: readonly string[];
    readonly PrivateElements: PrivateElementRecord[];
    readonly ConstructedBy: (ECMAScriptFunctionObject | DefaultConstructorBuiltinFunction)[];
    constructor(internalSlotsList: readonly string[]);
    GetPrototypeOf(): ObjectSlotReturn['GetPrototypeOf'];
    SetPrototypeOf(V: ObjectValue | NullValue): ObjectSlotReturn['SetPrototypeOf'];
    IsExtensible(): ObjectSlotReturn['IsExtensible'];
    PreventExtensions(): ObjectSlotReturn['PreventExtensions'];
    GetOwnProperty(P: PropertyKeyValue | string): ObjectSlotReturn['GetOwnProperty'];
    DefineOwnProperty(P: PropertyKeyValue | string, Desc: Descriptor): ObjectSlotReturn['DefineOwnProperty'];
    HasProperty(P: PropertyKeyValue | string): ObjectSlotReturn['HasProperty'];
    Get(P: PropertyKeyValue | string, Receiver: Value): ObjectSlotReturn['Get'];
    Set(P: PropertyKeyValue | string, V: Value, Receiver: Value): ObjectSlotReturn['Set'];
    Delete(P: PropertyKeyValue | string): ObjectSlotReturn['Delete'];
    OwnPropertyKeys(): ObjectSlotReturn['OwnPropertyKeys'];
    mark(m: GCMarker): void;
    static [Symbol.hasInstance]: (value: unknown) => value is ObjectValue;
}

/** https://tc39.es/proposal-deferred-reexports/#sec-static-semantics-optionalindirectexportentries */
export declare function OptionalIndirectExportEntries(node: ParseNode | readonly ParseNode[]): ExportEntry[];

/** https://tc39.es/ecma262/#sec-ordinarycallbindthis */
export declare function OrdinaryCallBindThis(F: ECMAScriptFunctionObject, calleeContext: ExecutionContext, thisArgument: Value): PlainCompletion<void>;

/** https://tc39.es/ecma262/#sec-ordinarycallevaluatebody */
export declare function OrdinaryCallEvaluateBody(F: ECMAScriptFunctionObject, argumentsList: Arguments): Generator<EvaluatorYieldType, BreakCompletion | ContinueCompletion | NormalCompletion<never> | NormalCompletion<void | Value> | ReturnCompletion_ | ThrowCompletion<Value>, EvaluatorNextType>;

export declare function OrdinaryCreateFromConstructor<const T extends string>(constructor: FunctionObject, intrinsicDefaultProto: keyof Intrinsics, internalSlotsList?: readonly T[]): ValueEvaluator<ObjectValue>;

/** https://tc39.es/ecma262/#sec-ordinarydefineownproperty */
export declare function OrdinaryDefineOwnProperty(obj: ObjectValue, propertyKey: PropertyKeyValue | string, propertyDesc: Descriptor): PlainEvaluator<boolean>;

export declare function OrdinaryDelete(O: ObjectValue, P: PropertyKeyValue | string): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-functionallocate */
export declare function OrdinaryFunctionCreate(functionPrototype: ObjectValue, sourceText: string, ParameterList: ParseNode.FormalParameters, Body: Body_2, thisMode: 'lexical-this' | 'non-lexical-this', Scope: EnvironmentRecord, PrivateEnv: PrivateEnvironmentRecord | null): Mutable<ECMAScriptFunctionObject>;

export declare function OrdinaryGet(O: ObjectValue, P: PropertyKeyValue | string, Receiver: Value): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-ordinarygetownproperty */
export declare function OrdinaryGetOwnProperty(obj: ObjectValue, propertyKey: PropertyKeyValue | string): FullyPopulatedDescriptor | undefined;

/** https://tc39.es/ecma262/#sec-ordinarygetprototypeof */
export declare function OrdinaryGetPrototypeOf(obj: OrdinaryObject): NullValue | ObjectValue;

/** https://tc39.es/ecma262/#sec-ordinaryhasinstance */
export declare function OrdinaryHasInstance(constructor: Value, O: Value): PlainEvaluator<boolean>;

export declare function OrdinaryHasProperty(O: ObjectValue, P: PropertyKeyValue | string): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-ordinaryisextensible */
export declare function OrdinaryIsExtensible(obj: OrdinaryObject): boolean;

export declare interface OrdinaryObject extends ObjectValue {
    Prototype: ObjectValue | NullValue;
    Extensible: boolean;
}

/** https://tc39.es/ecma262/#sec-ordinaryobjectcreate */
export declare function OrdinaryObjectCreate<const T extends string>(proto: ObjectValue | NullValue, additionalInternalSlotsList?: readonly T[]): OrdinaryObject;

export declare namespace OrdinaryObjectCreate {
    var from: (object: Record<string, Value | CanBeNativeSteps>, proto?: ObjectValue | NullValue) => OrdinaryObject;
}

export declare function OrdinaryOwnPropertyKeys(O: ObjectValue): PropertyKeyValue[];

/** https://tc39.es/ecma262/#sec-ordinarypreventextensions */
export declare function OrdinaryPreventExtensions(obj: OrdinaryObject): boolean;

export declare function OrdinarySet(O: ObjectValue, P: PropertyKeyValue | string, V: Value, Receiver: Value): Generator<EvaluatorYieldType, PlainCompletion<boolean>, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-ordinarysetprototypeof */
export declare function OrdinarySetPrototypeOf(obj: OrdinaryObject, proto: ObjectValue | NullValue): boolean;

export declare function OrdinarySetWithOwnDescriptor(O: ObjectValue, P: PropertyKeyValue | string, V: Value, Receiver: Value, ownDesc: Descriptor | undefined): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-ordinarytoprimitive */
export declare function OrdinaryToPrimitive(O: ObjectValue, hint: 'string' | 'number'): ValueEvaluator<PrimitiveValue>;

/** https://tc39.es/proposal-shadowrealm/#sec-ordinary-wrapped-function-call */
export declare function OrdinaryWrappedFunctionCall(F: WrappedFunctionExoticObject, thisArgument: Value, argumentList: Arguments): ValueEvaluator;

export declare class OutOfRange extends RangeError {
    value: never;
    private constructor();
    static exhaustive(value: never): OutOfRange;
    static nonExhaustive(value: unknown): OutOfRange;
}

/** https://tc39.es/proposal-temporal/#sec-padisoyear */
export declare function PadISOYear(isoYear: Integer): string;

export declare type ParametersMap = {
    '1': Formattable;
    '2': Formattable;
    '3': Formattable;
    '4': Formattable;
    '5': Formattable;
};

/** https://tc39.es/ecma262/#sec-parsedatetimeutcoffset */
export declare function ParseDateTimeUTCOffset(offsetString: string): PlainCompletion<bigint>;

/** https://tc39.es/ecma262/#sec-parsejsonmodule */
export declare function ParseJSONModule(source: string): PlainCompletion<SyntheticModuleRecord>;

export declare function ParseModule(sourceText: string, realm: Realm, hostDefined?: ModuleRecordHostDefined): ObjectValue[] | SourceTextModuleRecord;

export declare namespace ParseNode {
    export interface BaseParseNode {
        readonly type: ParseNode['type'];
        readonly location: Location_2;
        readonly strict: boolean;
        readonly sourceText: string;
        readonly parent: ParseNode | undefined;
    }
    export interface PrivateIdentifier extends BaseParseNode {
        readonly type: 'PrivateIdentifier';
        readonly name: string;
    }
    export interface IdentifierName extends BaseParseNode {
        readonly type: 'IdentifierName';
        readonly name: string;
    }
    export interface NullLiteral extends BaseParseNode {
        readonly type: 'NullLiteral';
    }
    export interface BooleanLiteral extends BaseParseNode {
        readonly type: 'BooleanLiteral';
        readonly value: boolean;
    }
    export interface NumericLiteral extends BaseParseNode {
        readonly type: 'NumericLiteral';
        readonly value: number | bigint;
    }
    export interface StringLiteral extends BaseParseNode {
        readonly type: 'StringLiteral';
        readonly value: string;
    }
    export interface RegularExpressionLiteral extends BaseParseNode {
        readonly type: 'RegularExpressionLiteral';
        readonly RegularExpressionBody: string;
        readonly RegularExpressionFlags: string;
    }
    export interface IdentifierReference extends BaseParseNode {
        readonly type: 'IdentifierReference';
        readonly escaped: boolean;
        readonly name: string;
    }
    export interface BindingIdentifier extends BaseParseNode {
        readonly type: 'BindingIdentifier';
        readonly name: string;
    }
    export interface LabelIdentifier extends BaseParseNode {
        readonly type: 'LabelIdentifier';
        readonly name: string;
    }
    export type PrimaryExpression = ThisExpression | IdentifierReference | Literal | ArrayLiteral | ObjectLiteral | FunctionExpression | ClassExpression | GeneratorExpression | AsyncFunctionExpression | AsyncGeneratorExpression | RegularExpressionLiteral | TemplateLiteral | CoverParenthesizedExpressionAndArrowParameterList | ParenthesizedExpression;
    export interface ThisExpression extends BaseParseNode {
        readonly type: 'ThisExpression';
    }
    export interface CoverParenthesizedExpressionAndArrowParameterList extends BaseParseNode {
        readonly type: 'CoverParenthesizedExpressionAndArrowParameterList';
        readonly Arguments: readonly (ArgumentListElement | BindingRestElement)[];
        readonly arrowInfo?: ArrowInfo;
    }
    export interface ParenthesizedExpression extends BaseParseNode {
        readonly type: 'ParenthesizedExpression';
        readonly Expression: Expression;
    }
    export type Literal = NullLiteral | BooleanLiteral | NumericLiteral | StringLiteral;
    export interface ArrayLiteral extends BaseParseNode {
        readonly type: 'ArrayLiteral';
        readonly ElementList: ElementList;
        readonly hasTrailingComma: boolean;
    }
    export type ElementList = readonly ElementListElement[];
    export type ElementListElement = AssignmentExpressionOrHigher | SpreadElement | Elision;
    export interface Elision extends BaseParseNode {
        readonly type: 'Elision';
    }
    export interface SpreadElement extends BaseParseNode {
        readonly type: 'SpreadElement';
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
    }
    export interface ObjectLiteral extends BaseParseNode {
        readonly type: 'ObjectLiteral';
        readonly PropertyDefinitionList: PropertyDefinitionList;
        readonly hasTrailingComma: boolean;
    }
    export type PropertyDefinitionList = readonly PropertyDefinitionLike[];
    export type PropertyDefinitionLike = IdentifierReference | CoverInitializedName | PropertyDefinition | MethodDefinitionLike;
    export interface PropertyDefinition extends BaseParseNode {
        readonly type: 'PropertyDefinition';
        readonly PropertyName: PropertyNameLike | null;
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
    }
    export type PropertyNameLike = PropertyName | StringLiteral | NumericLiteral | IdentifierName;
    export interface PropertyName extends BaseParseNode {
        readonly type: 'PropertyName';
        readonly ComputedPropertyName: AssignmentExpressionOrHigher;
    }
    export interface CoverInitializedName extends BaseParseNode {
        readonly type: 'CoverInitializedName';
        readonly IdentifierReference: IdentifierReference;
        readonly Initializer: Initializer | null;
    }
    export type Initializer = AssignmentExpressionOrHigher;
    export interface TemplateLiteral extends BaseParseNode {
        readonly type: 'TemplateLiteral';
        readonly TemplateSpanList: readonly string[];
        readonly ExpressionList: readonly Expression[];
    }
    export type MemberExpressionOrHigher = PrimaryExpression | MemberExpression | SuperProperty | MetaProperty | NewExpression;
    export interface MemberExpression extends BaseParseNode {
        readonly type: 'MemberExpression';
        readonly MemberExpression: LeftHandSideExpression;
        readonly Expression: Expression | null;
        readonly IdentifierName: IdentifierName | null;
        readonly PrivateIdentifier: PrivateIdentifier | null;
    }
    export interface SuperProperty extends BaseParseNode {
        readonly type: 'SuperProperty';
        readonly Expression: Expression | null;
        readonly IdentifierName: IdentifierName | null;
    }
    export type MetaProperty = NewTarget | ImportMeta;
    export interface NewTarget extends BaseParseNode {
        readonly type: 'NewTarget';
    }
    export interface ImportMeta extends BaseParseNode {
        readonly type: 'ImportMeta';
    }
    export type NewExpressionOrHigher = MemberExpressionOrHigher | NewExpression;
    export interface NewExpression extends BaseParseNode {
        readonly type: 'NewExpression';
        readonly MemberExpression: LeftHandSideExpression;
        readonly Arguments: Arguments | null;
    }
    export type CallExpressionOrHigher = SuperCall | ImportCall | CallExpression | MemberExpression | TaggedTemplateExpression;
    export interface CallExpression extends BaseParseNode {
        readonly type: 'CallExpression';
        readonly CallExpression: CallExpressionOrHigher | MemberExpressionOrHigher;
        readonly Arguments: Arguments;
        readonly arrowInfo?: ArrowInfo;
    }
    export interface TaggedTemplateExpression extends BaseParseNode {
        readonly type: 'TaggedTemplateExpression';
        readonly MemberExpression: CallExpressionOrHigher | MemberExpressionOrHigher;
        readonly TemplateLiteral: TemplateLiteral;
        readonly arrowInfo?: ArrowInfo;
    }
    export interface SuperCall extends BaseParseNode {
        readonly type: 'SuperCall';
        readonly Arguments: Arguments;
    }
    export interface ImportCall extends BaseParseNode {
        readonly type: 'ImportCall';
        readonly Phase: 'source' | 'defer' | 'evaluation';
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
        readonly OptionsExpression?: AssignmentExpressionOrHigher;
    }
    export type Arguments = readonly ArgumentListElement[] & {
        readonly location: Location_2;
    };
    export type ArgumentListElement = AssignmentExpressionOrHigher | AssignmentRestElement;
    export interface OptionalExpression extends BaseParseNode {
        readonly type: 'OptionalExpression';
        readonly MemberExpression: MemberExpressionOrHigher | CallExpressionOrHigher | OptionalExpression;
        readonly OptionalChain: OptionalChain;
    }
    export interface OptionalChain extends BaseParseNode {
        readonly type: 'OptionalChain';
        readonly OptionalChain: OptionalChain | null;
        readonly Arguments?: Arguments;
        readonly Expression?: Expression;
        readonly IdentifierName?: IdentifierName;
        readonly PrivateIdentifier?: PrivateIdentifier;
    }
    export type LeftHandSideExpression = NewExpressionOrHigher | CallExpressionOrHigher | OptionalExpression;
    export type UpdateExpressionOrHigher = LeftHandSideExpression | UpdateExpression;
    export interface UpdateExpression extends BaseParseNode {
        readonly type: 'UpdateExpression';
        readonly operator: '++' | '--';
        readonly LeftHandSideExpression: LeftHandSideExpression | null;
        readonly UnaryExpression: UnaryExpressionOrHigher | null;
    }
    export type UnaryExpressionOrHigher = UpdateExpressionOrHigher | UnaryExpression | AwaitExpression;
    export interface UnaryExpression extends BaseParseNode {
        readonly type: 'UnaryExpression';
        readonly operator: 'delete' | 'void' | 'typeof' | '+' | '-' | '~' | '!';
        readonly UnaryExpression: UnaryExpressionOrHigher;
    }
    export type ExponentiationExpressionOrHigher = UnaryExpressionOrHigher | ExponentiationExpression;
    export interface ExponentiationExpression extends BaseParseNode {
        readonly type: 'ExponentiationExpression';
        readonly UpdateExpression: UpdateExpressionOrHigher;
        readonly ExponentiationExpression: ExponentiationExpressionOrHigher;
    }
    export type MultiplicativeExpressionOrHigher = ExponentiationExpressionOrHigher | MultiplicativeExpression;
    export interface MultiplicativeExpression extends BaseParseNode {
        readonly type: 'MultiplicativeExpression';
        readonly MultiplicativeExpression: MultiplicativeExpressionOrHigher;
        readonly MultiplicativeOperator: MultiplicativeOperator;
        readonly ExponentiationExpression: ExponentiationExpressionOrHigher;
    }
    export type MultiplicativeOperator = '*' | '/' | '%';
    export type AdditiveExpressionOrHigher = MultiplicativeExpressionOrHigher | AdditiveExpression;
    export interface AdditiveExpression extends BaseParseNode {
        readonly type: 'AdditiveExpression';
        readonly operator: '+' | '-';
        readonly AdditiveExpression: AdditiveExpressionOrHigher;
        readonly MultiplicativeExpression: MultiplicativeExpressionOrHigher;
    }
    export type ShiftExpressionOrHigher = AdditiveExpressionOrHigher | ShiftExpression;
    export interface ShiftExpression extends BaseParseNode {
        readonly type: 'ShiftExpression';
        readonly operator: '<<' | '>>' | '>>>';
        readonly ShiftExpression: ShiftExpressionOrHigher;
        readonly AdditiveExpression: AdditiveExpressionOrHigher;
    }
    export type RelationalExpressionOrHigher = ShiftExpressionOrHigher | RelationalExpression;
    export interface RelationalExpression extends BaseParseNode {
        readonly type: 'RelationalExpression';
        readonly operator: '<' | '>' | '<=' | '>=' | 'instanceof' | 'in';
        readonly PrivateIdentifier?: PrivateIdentifier;
        readonly RelationalExpression?: RelationalExpressionOrHigher;
        readonly ShiftExpression: ShiftExpressionOrHigher;
    }
    export type EqualityExpressionOrHigher = RelationalExpressionOrHigher | EqualityExpression;
    export interface EqualityExpression extends BaseParseNode {
        readonly type: 'EqualityExpression';
        readonly operator: '==' | '!=' | '===' | '!==';
        readonly EqualityExpression: EqualityExpressionOrHigher;
        readonly RelationalExpression: RelationalExpressionOrHigher;
    }
    export type BitwiseANDExpressionOrHigher = EqualityExpressionOrHigher | BitwiseANDExpression;
    export interface BitwiseANDExpression extends BaseParseNode {
        readonly type: 'BitwiseANDExpression';
        readonly operator: '&';
        readonly A: BitwiseANDExpressionOrHigher;
        readonly B: EqualityExpressionOrHigher;
    }
    export type BitwiseXORExpressionOrHigher = BitwiseANDExpressionOrHigher | BitwiseXORExpression;
    export interface BitwiseXORExpression extends BaseParseNode {
        readonly type: 'BitwiseXORExpression';
        readonly operator: '^';
        readonly A: BitwiseXORExpressionOrHigher;
        readonly B: BitwiseANDExpressionOrHigher;
    }
    export type BitwiseORExpressionOrHigher = BitwiseXORExpressionOrHigher | BitwiseORExpression;
    export interface BitwiseORExpression extends BaseParseNode {
        readonly type: 'BitwiseORExpression';
        readonly operator: '|';
        readonly A: BitwiseORExpressionOrHigher;
        readonly B: BitwiseXORExpressionOrHigher;
    }
    export type LogicalANDExpressionOrHigher = BitwiseORExpressionOrHigher | LogicalANDExpression;
    export interface LogicalANDExpression extends BaseParseNode {
        readonly type: 'LogicalANDExpression';
        readonly LogicalANDExpression: LogicalANDExpressionOrHigher;
        readonly BitwiseORExpression: BitwiseORExpressionOrHigher;
    }
    export type LogicalORExpressionOrHigher = LogicalANDExpressionOrHigher | LogicalORExpression;
    export interface LogicalORExpression extends BaseParseNode {
        readonly type: 'LogicalORExpression';
        readonly LogicalORExpression: LogicalORExpressionOrHigher;
        readonly LogicalANDExpression: LogicalANDExpressionOrHigher;
    }
    export interface CoalesceExpression extends BaseParseNode {
        readonly type: 'CoalesceExpression';
        readonly CoalesceExpressionHead: CoalesceExpressionHead;
        readonly BitwiseORExpression: BitwiseORExpressionOrHigher;
    }
    export type CoalesceExpressionHead = BitwiseORExpressionOrHigher | CoalesceExpression;
    export type ShortCircuitExpressionOrHigher = LogicalORExpressionOrHigher | CoalesceExpression;
    export type ConditionalExpressionOrHigher = ShortCircuitExpressionOrHigher | ConditionalExpression;
    export interface ConditionalExpression extends BaseParseNode {
        readonly type: 'ConditionalExpression';
        readonly ShortCircuitExpression: ShortCircuitExpressionOrHigher;
        readonly AssignmentExpression_a: AssignmentExpressionOrHigher;
        readonly AssignmentExpression_b: AssignmentExpressionOrHigher;
    }
    export type AssignmentExpressionOrHigher = ConditionalExpressionOrHigher | YieldExpression | ArrowFunction | AsyncArrowFunction | AssignmentExpression;
    export interface AssignmentExpression extends BaseParseNode {
        readonly type: 'AssignmentExpression';
        readonly LeftHandSideExpression: AssignmentExpressionOrHigher;
        readonly AssignmentOperator: '=' | AssignmentOperator | '&&=' | '||=' | '??=';
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
    }
    export type AssignmentOperator = '*=' | '/=' | '%=' | '+=' | '-=' | '<<=' | '>>=' | '>>>=' | '&=' | '^=' | '|=' | '**=';
    export interface AssignmentRestElement extends BaseParseNode {
        readonly type: 'AssignmentRestElement';
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
    }
    export type BinaryExpressionOrHigher = BinaryExpression | UnaryExpressionOrHigher;
    export type BinaryExpression = AssignmentExpression | LogicalORExpression | LogicalANDExpression | BitwiseORExpression | BitwiseXORExpression | BitwiseANDExpression | RelationalExpression | EqualityExpression | ShiftExpression | AdditiveExpression | MultiplicativeExpression | ExponentiationExpression;
    export type Expression = CommaOperator | AssignmentExpressionOrHigher;
    export interface CommaOperator extends BaseParseNode {
        readonly type: 'CommaOperator';
        readonly ExpressionList: readonly AssignmentExpressionOrHigher[];
    }
    export type Statement = BlockStatement | VariableStatement | EmptyStatement | ExpressionStatement | IfStatement | BreakableStatement | ContinueStatement | BreakStatement | ReturnStatement | WithStatement | LabelledStatement | ThrowStatement | TryStatement | DebuggerStatement;
    export type Declaration = HoistableDeclaration | ClassDeclaration | LexicalDeclarationLike;
    export type HoistableDeclaration = FunctionDeclaration | GeneratorDeclaration | AsyncFunctionDeclaration | AsyncGeneratorDeclaration;
    export type BreakableStatement = IterationStatement | SwitchStatement;
    export type BlockStatement = Block;
    export interface Block extends BaseParseNode {
        readonly type: 'Block';
        readonly StatementList: StatementList;
    }
    export type StatementList = readonly StatementListItem[];
    export type StatementListItem = Statement | Declaration;
    export type LexicalDeclarationLike = LexicalDeclaration | UsingDeclaration | AwaitUsingDeclaration;
    export interface LexicalDeclaration extends BaseParseNode {
        readonly type: 'LexicalDeclaration';
        readonly LetOrConst: LetOrConst;
        readonly BindingList: BindingList;
    }
    export interface UsingDeclaration extends BaseParseNode {
        readonly type: 'UsingDeclaration';
        readonly BindingList: BindingList;
    }
    export interface AwaitUsingDeclaration extends BaseParseNode {
        readonly type: 'AwaitUsingDeclaration';
        readonly BindingList: BindingList;
    }
    export type LetOrConst = 'let' | 'const';
    export type BindingList = readonly LexicalBinding[];
    export interface LexicalBinding extends BaseParseNode {
        readonly type: 'LexicalBinding';
        readonly BindingIdentifier?: BindingIdentifier;
        readonly BindingPattern?: BindingPattern;
        readonly Initializer: Initializer | null;
    }
    export interface VariableStatement extends BaseParseNode {
        readonly type: 'VariableStatement';
        readonly VariableDeclarationList: VariableDeclarationList;
    }
    export type VariableDeclarationList = readonly VariableDeclaration[];
    export interface VariableDeclaration extends BaseParseNode {
        readonly type: 'VariableDeclaration';
        readonly BindingPattern?: BindingPattern;
        readonly BindingIdentifier?: BindingIdentifier;
        readonly Initializer: Initializer | null;
    }
    export type BindingPattern = ObjectBindingPattern | ArrayBindingPattern;
    export interface ObjectBindingPattern extends BaseParseNode {
        readonly type: 'ObjectBindingPattern';
        readonly BindingPropertyList: BindingPropertyList;
        readonly BindingRestProperty?: BindingRestProperty;
    }
    export interface ArrayBindingPattern extends BaseParseNode {
        readonly type: 'ArrayBindingPattern';
        readonly BindingElementList: BindingElementList;
        readonly BindingRestElement: BindingRestElement;
    }
    export interface BindingRestProperty extends BaseParseNode {
        readonly type: 'BindingRestProperty';
        readonly BindingIdentifier: BindingIdentifier;
    }
    export type BindingPropertyList = readonly BindingPropertyLike[];
    export type BindingElementList = readonly BindingElisionElement[];
    export type BindingElisionElement = BindingElementLike | Elision;
    export type BindingPropertyLike = BindingProperty | SingleNameBinding;
    export interface BindingProperty extends BaseParseNode {
        readonly type: 'BindingProperty';
        readonly PropertyName: PropertyNameLike;
        readonly BindingElement: BindingElementLike;
    }
    export type BindingElementLike = BindingElement | SingleNameBinding;
    export interface BindingElement extends BaseParseNode {
        readonly type: 'BindingElement';
        readonly BindingPattern: BindingPattern;
        readonly Initializer: Initializer | null;
    }
    export interface SingleNameBinding extends BaseParseNode {
        readonly type: 'SingleNameBinding';
        readonly BindingIdentifier: BindingIdentifier;
        readonly Initializer: Initializer | null;
    }
    export interface BindingRestElement extends BaseParseNode {
        readonly type: 'BindingRestElement';
        readonly BindingIdentifier?: BindingIdentifier;
        readonly BindingPattern?: BindingPattern;
    }
    export interface EmptyStatement extends BaseParseNode {
        readonly type: 'EmptyStatement';
    }
    export interface ExpressionStatement extends BaseParseNode {
        readonly type: 'ExpressionStatement';
        readonly Expression: Expression;
    }
    export interface IfStatement extends BaseParseNode {
        readonly type: 'IfStatement';
        readonly Expression: Expression;
        readonly Statement_a: Statement;
        readonly Statement_b: Statement;
    }
    export type IterationStatement = DoWhileStatement | WhileStatement | ForStatement | ForInOfStatement;
    export interface DoWhileStatement extends BaseParseNode {
        readonly type: 'DoWhileStatement';
        readonly Statement: Statement;
        readonly Expression: Expression;
    }
    export interface WhileStatement extends BaseParseNode {
        readonly type: 'WhileStatement';
        readonly Expression: Expression;
        readonly Statement: Statement;
    }
    export interface ForStatement extends BaseParseNode {
        readonly type: 'ForStatement';
        readonly VariableDeclarationList: VariableDeclarationList;
        readonly LexicalDeclaration?: LexicalDeclarationLike;
        readonly Expression_a?: Expression;
        readonly Expression_b?: Expression;
        readonly Expression_c?: Expression;
        readonly Statement: Statement;
    }
    export type ForInOfStatement = ForInStatement | ForOfStatement | ForAwaitStatement;
    export interface ForInStatement extends BaseParseNode {
        readonly type: 'ForInStatement';
        readonly LeftHandSideExpression?: LeftHandSideExpression;
        readonly ForBinding?: ForBinding;
        readonly ForDeclaration?: ForDeclaration;
        readonly Expression: Expression;
        readonly Statement: Statement;
    }
    export interface ForOfStatement extends BaseParseNode {
        readonly type: 'ForOfStatement';
        readonly LeftHandSideExpression?: LeftHandSideExpression;
        readonly ForDeclaration?: ForDeclaration;
        readonly ForBinding?: ForBinding;
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
        readonly Statement: Statement;
    }
    export interface ForAwaitStatement extends BaseParseNode {
        readonly type: 'ForAwaitStatement';
        readonly LeftHandSideExpression?: LeftHandSideExpression;
        readonly ForDeclaration?: ForDeclaration;
        readonly ForBinding?: ForBinding;
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
        readonly Statement: Statement;
    }
    export type ForDeclaration = ForDeclaration_LetOrConst | ForDeclaration_Using | ForDeclaration_AwaitUsing;
    export interface ForDeclaration_LetOrConst extends BaseParseNode {
        readonly type: 'ForDeclaration';
        readonly production: 'LetOrConst';
        readonly LetOrConst: LetOrConst;
        readonly ForBinding: ForBinding;
    }
    export interface ForDeclaration_Using extends BaseParseNode {
        readonly type: 'ForDeclaration';
        readonly production: 'Using';
        readonly ForBinding: ForBinding;
    }
    export interface ForDeclaration_AwaitUsing extends BaseParseNode {
        readonly type: 'ForDeclaration';
        readonly production: 'AwaitUsing';
        readonly ForBinding: ForBinding;
    }
    export interface ForBinding extends BaseParseNode {
        readonly type: 'ForBinding';
        readonly BindingIdentifier?: BindingIdentifier;
        readonly BindingPattern?: BindingPattern;
    }
    export interface ContinueStatement extends BaseParseNode {
        readonly type: 'ContinueStatement';
        readonly LabelIdentifier: LabelIdentifier | null;
    }
    export interface BreakStatement extends BaseParseNode {
        readonly type: 'BreakStatement';
        readonly LabelIdentifier: LabelIdentifier | null;
    }
    export interface ReturnStatement extends BaseParseNode {
        readonly type: 'ReturnStatement';
        readonly Expression: Expression | null;
    }
    export interface WithStatement extends BaseParseNode {
        readonly type: 'WithStatement';
        readonly Expression: Expression;
        readonly Statement: Statement;
    }
    export interface SwitchStatement extends BaseParseNode {
        readonly type: 'SwitchStatement';
        readonly Expression: Expression;
        readonly CaseBlock: CaseBlock;
    }
    export interface CaseBlock extends BaseParseNode {
        readonly type: 'CaseBlock';
        readonly CaseClauses_a?: CaseClauses;
        readonly DefaultClause?: DefaultClause;
        readonly CaseClauses_b?: CaseClauses;
    }
    export type CaseClauses = readonly CaseClause[];
    export interface CaseClause extends BaseParseNode {
        readonly type: 'CaseClause';
        readonly Expression: Expression;
        readonly StatementList: StatementList;
    }
    export interface DefaultClause extends BaseParseNode {
        readonly type: 'DefaultClause';
        readonly StatementList: StatementList;
    }
    export interface LabelledStatement extends BaseParseNode {
        readonly type: 'LabelledStatement';
        readonly LabelIdentifier: LabelIdentifier;
        readonly LabelledItem: LabelledItem;
    }
    export type LabelledItem = Statement | FunctionDeclaration;
    export interface ThrowStatement extends BaseParseNode {
        readonly type: 'ThrowStatement';
        readonly Expression: Expression;
    }
    export interface TryStatement extends BaseParseNode {
        readonly type: 'TryStatement';
        readonly Block: Block;
        readonly Catch: Catch | null;
        readonly Finally: Finally | null;
    }
    export interface Catch extends BaseParseNode {
        readonly type: 'Catch';
        readonly CatchParameter: CatchParameter | null;
        readonly Block: Block;
    }
    export type Finally = Block;
    export type CatchParameter = BindingPattern | BindingIdentifier;
    export interface DebuggerStatement extends BaseParseNode {
        readonly type: 'DebuggerStatement';
    }
    export type UniqueFormalParameters = FormalParameters;
    export type FormalParameters = readonly FormalParametersElement[];
    export type FormalParametersElement = FormalParameterList[number] | FunctionRestParameter;
    export type FormalParameterList = readonly FormalParameter[];
    export type FunctionRestParameter = BindingRestElement;
    export type FormalParameter = BindingElementLike;
    export type FunctionLike = FunctionDeclarationLike | FunctionExpressionLike;
    export type FunctionDeclarationLike = FunctionDeclaration | GeneratorDeclaration | AsyncFunctionDeclaration | AsyncGeneratorDeclaration;
    export type FunctionExpressionLike = FunctionExpression | GeneratorExpression | AsyncFunctionExpression | AsyncGeneratorExpression;
    export type FunctionBodyLike = FunctionBody | GeneratorBody | AsyncBody | AsyncGeneratorBody;
    export interface FunctionDeclaration extends BaseParseNode {
        readonly type: 'FunctionDeclaration';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly FunctionBody: FunctionBody;
    }
    export interface FunctionExpression extends BaseParseNode {
        readonly type: 'FunctionExpression';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly FunctionBody: FunctionBody;
    }
    export interface FunctionBody extends BaseParseNode {
        readonly type: 'FunctionBody';
        readonly directives: string[];
        readonly strict: boolean;
        readonly FunctionStatementList: FunctionStatementList;
    }
    export type FunctionStatementList = StatementList;
    export interface ArrowFunction extends BaseParseNode {
        readonly type: 'ArrowFunction';
        readonly ArrowParameters: ArrowParameters;
        readonly ConciseBody: ConciseBodyLike;
    }
    export type ArrowParameters = ArrowFormalParameters;
    export type ConciseBodyLike = FunctionBody | ConciseBody;
    export interface ConciseBody extends BaseParseNode {
        readonly type: 'ConciseBody';
        readonly directives?: undefined;
        readonly ExpressionBody: ExpressionBody;
    }
    export interface ExpressionBody extends BaseParseNode {
        readonly type: 'ExpressionBody';
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
    }
    export type ArrowFormalParameters = UniqueFormalParameters;
    export interface AsyncArrowFunction extends BaseParseNode {
        readonly type: 'AsyncArrowFunction';
        readonly ArrowParameters: ArrowParameters;
        readonly AsyncConciseBody: AsyncConciseBodyLike;
    }
    export type AsyncConciseBodyLike = AsyncConciseBody | AsyncBody;
    export interface AsyncConciseBody extends BaseParseNode {
        readonly type: 'AsyncConciseBody';
        readonly directives?: undefined;
        readonly ExpressionBody: ExpressionBody;
    }
    export type MethodDefinitionLike = MethodDefinition | GeneratorMethod | AsyncMethod | AsyncGeneratorMethod;
    export interface MethodDefinition extends BaseParseNode {
        readonly type: 'MethodDefinition';
        readonly Decorators?: readonly Decorator[] | null;
        readonly static?: boolean;
        readonly ClassElementName: ClassElementName;
        readonly PropertySetParameterList: PropertySetParameterList | null;
        readonly UniqueFormalParameters: UniqueFormalParameters | null;
        readonly FunctionBody: FunctionBody;
    }
    export type PropertySetParameterList = [FormalParameter];
    export interface GeneratorDeclaration extends BaseParseNode {
        readonly type: 'GeneratorDeclaration';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly GeneratorBody: GeneratorBody;
    }
    export interface GeneratorExpression extends BaseParseNode {
        readonly type: 'GeneratorExpression';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly GeneratorBody: GeneratorBody;
    }
    export interface GeneratorMethod extends BaseParseNode {
        readonly type: 'GeneratorMethod';
        readonly Decorators?: readonly Decorator[] | null;
        readonly static?: boolean;
        readonly ClassElementName: ClassElementName;
        readonly PropertySetParameterList: null;
        readonly UniqueFormalParameters: UniqueFormalParameters;
        readonly GeneratorBody: GeneratorBody;
    }
    export interface GeneratorBody extends BaseParseNode {
        readonly type: 'GeneratorBody';
        readonly directives: string[];
        readonly strict: boolean;
        readonly FunctionStatementList: FunctionStatementList;
    }
    export interface YieldExpression extends BaseParseNode {
        readonly type: 'YieldExpression';
        readonly hasStar: boolean;
        readonly AssignmentExpression: AssignmentExpressionOrHigher | null;
    }
    export interface AsyncGeneratorDeclaration extends BaseParseNode {
        readonly type: 'AsyncGeneratorDeclaration';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly AsyncGeneratorBody: AsyncGeneratorBody;
    }
    export interface AsyncGeneratorExpression extends BaseParseNode {
        readonly type: 'AsyncGeneratorExpression';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly AsyncGeneratorBody: AsyncGeneratorBody;
    }
    export interface AsyncGeneratorMethod extends BaseParseNode {
        readonly type: 'AsyncGeneratorMethod';
        readonly Decorators?: readonly Decorator[] | null;
        readonly static?: boolean;
        readonly ClassElementName: ClassElementName;
        readonly PropertySetParameterList: null;
        readonly UniqueFormalParameters: UniqueFormalParameters;
        readonly AsyncGeneratorBody: AsyncGeneratorBody;
    }
    export interface AsyncGeneratorBody extends BaseParseNode {
        readonly type: 'AsyncGeneratorBody';
        readonly directives: string[];
        readonly strict: boolean;
        readonly FunctionStatementList: FunctionStatementList;
    }
    export interface AsyncFunctionDeclaration extends BaseParseNode {
        readonly type: 'AsyncFunctionDeclaration';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly AsyncBody: AsyncBody;
    }
    export interface AsyncFunctionExpression extends BaseParseNode {
        readonly type: 'AsyncFunctionExpression';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly FormalParameters: FormalParameters;
        readonly AsyncBody: AsyncBody;
    }
    export interface AsyncMethod extends BaseParseNode {
        readonly type: 'AsyncMethod';
        readonly Decorators?: readonly Decorator[] | null;
        readonly static?: boolean;
        readonly ClassElementName: ClassElementName;
        readonly PropertySetParameterList: null;
        readonly UniqueFormalParameters: UniqueFormalParameters;
        readonly AsyncBody: AsyncBody;
    }
    export interface AsyncBody extends BaseParseNode {
        readonly type: 'AsyncBody';
        readonly directives: string[];
        readonly strict: boolean;
        readonly FunctionStatementList: FunctionStatementList;
    }
    export interface AwaitExpression extends BaseParseNode {
        readonly type: 'AwaitExpression';
        readonly UnaryExpression: UnaryExpressionOrHigher;
    }
    export type ClassLike = ClassDeclaration | ClassExpression;
    export type Decorator = Decorator_MemberExpression | Decorator_ParenthesizedExpression | Decorator_CallExpression;
    export interface Decorator_MemberExpression extends BaseParseNode {
        readonly type: 'Decorator';
        readonly subtype: 'MemberExpression';
        readonly MemberExpression: MemberExpression | IdentifierReference;
        readonly ParenthesizedExpression?: undefined;
        readonly CallExpression?: undefined;
    }
    export interface Decorator_ParenthesizedExpression extends BaseParseNode {
        readonly type: 'Decorator';
        readonly subtype: 'ParenthesizedExpression';
        readonly ParenthesizedExpression: Expression;
        readonly MemberExpression?: undefined;
        readonly CallExpression?: undefined;
    }
    export interface Decorator_CallExpression extends BaseParseNode {
        readonly type: 'Decorator';
        readonly subtype: 'CallExpression';
        readonly CallExpression: CallExpression;
        readonly MemberExpression?: undefined;
        readonly ParenthesizedExpression?: undefined;
    }
    export interface ClassDeclaration extends BaseParseNode {
        readonly Decorators?: readonly Decorator[] | null;
        readonly type: 'ClassDeclaration';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly ClassTail: ClassTail;
    }
    export interface ClassExpression extends BaseParseNode {
        readonly Decorators?: readonly Decorator[] | null;
        readonly type: 'ClassExpression';
        readonly BindingIdentifier: BindingIdentifier | null;
        readonly ClassTail: ClassTail;
    }
    export interface ClassTail extends BaseParseNode {
        readonly type: 'ClassTail';
        readonly ClassHeritage: ClassHeritage | null;
        readonly ClassBody: ClassBody | null;
    }
    export type ClassHeritage = LeftHandSideExpression;
    export type ClassBody = ClassElementList;
    export type ClassElementList = readonly ClassElement[];
    export type ClassElement = MethodDefinitionLike | FieldDefinition | ClassStaticBlock;
    export interface FieldDefinition extends BaseParseNode {
        readonly Decorators?: readonly Decorator[] | null;
        readonly accessor?: boolean;
        readonly type: 'FieldDefinition';
        readonly static?: boolean;
        readonly ClassElementName: ClassElementName;
        readonly Initializer: Initializer | null;
    }
    export type ClassElementName = PropertyNameLike | PrivateIdentifier;
    export interface ClassStaticBlock extends BaseParseNode {
        readonly type: 'ClassStaticBlock';
        readonly static: true;
        readonly ClassStaticBlockBody: ClassStaticBlockBody;
    }
    export interface ClassStaticBlockBody extends BaseParseNode {
        readonly type: 'ClassStaticBlockBody';
        readonly ClassStaticBlockStatementList: ClassStaticBlockStatementList;
    }
    export type ClassStaticBlockStatementList = StatementList;
    export interface Script extends BaseParseNode {
        readonly type: 'Script';
        readonly ScriptBody: ScriptBody | null;
    }
    export interface ScriptBody extends BaseParseNode {
        readonly type: 'ScriptBody';
        readonly StatementList: StatementList;
    }
    export interface Module extends BaseParseNode {
        readonly type: 'Module';
        readonly ModuleBody: ModuleBody | null;
        readonly hasTopLevelAwait: boolean;
    }
    export interface ModuleBody extends BaseParseNode {
        readonly type: 'ModuleBody';
        readonly ModuleItemList: ModuleItemList;
    }
    export type ModuleItemList = readonly ModuleItem[];
    export type ModuleItem = ImportDeclaration | ExportDeclaration | StatementListItem;
    export type ModuleExportName = IdentifierName | StringLiteral;
    export interface ImportDeclaration extends BaseParseNode {
        readonly type: 'ImportDeclaration';
        readonly ModuleSpecifier?: PrimaryExpression;
        readonly Phase: 'source' | 'defer' | 'evaluation';
        readonly ImportClause?: ImportClause;
        readonly ImportedBinding?: ImportedBinding;
        readonly FromClause?: FromClause;
        readonly WithClause?: WithClause;
    }
    export interface ImportClause extends BaseParseNode {
        readonly type: 'ImportClause';
        readonly ImportedDefaultBinding?: ImportedDefaultBinding;
        readonly NameSpaceImport?: NameSpaceImport;
        readonly NamedImports?: NamedImports;
    }
    export interface ImportedDefaultBinding extends BaseParseNode {
        readonly type: 'ImportedDefaultBinding';
        readonly ImportedBinding: ImportedBinding;
    }
    export interface NameSpaceImport extends BaseParseNode {
        readonly type: 'NameSpaceImport';
        /** Present for `import { x, y } as ns from "mod"`. */
        readonly NamedImports?: NamedImports;
        readonly ImportedBinding: ImportedBinding;
    }
    export interface NamedImports extends BaseParseNode {
        readonly type: 'NamedImports';
        readonly ImportsList: ImportsList;
    }
    export type FromClause = ModuleSpecifier;
    export type ImportsList = readonly ImportSpecifier[];
    export interface ImportSpecifier extends BaseParseNode {
        readonly type: 'ImportSpecifier';
        readonly ModuleExportName?: ModuleExportName;
        readonly ImportedBinding: ImportedBinding;
    }
    export type ModuleSpecifier = StringLiteral;
    export type ImportedBinding = BindingIdentifier;
    export interface WithClause extends BaseParseNode {
        readonly type: 'WithClause';
        readonly WithEntries: WithEntries;
    }
    export type WithEntries = readonly WithEntry[];
    export interface WithEntry extends BaseParseNode {
        readonly type: 'WithEntry';
        readonly AttributeKey: AttributeKey;
        readonly AttributeValue: StringLiteral;
    }
    export type AttributeKey = IdentifierName | StringLiteral;
    export type ExportDeclaration = ExportDeclaration_Declaration | ExportDeclaration_DefaultClass | ExportDeclaration_DefaultDeclaration | ExportDeclaration_DefaultExpression | ExportDeclaration_NamedExports | ExportDeclaration_NamedFrom | ExportDeclaration_VariableStatement;
    export interface ExportDeclaration_NamedFrom extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly ExportFromClause: ExportFromClauseLike;
        readonly FromClause: FromClause;
        readonly WithClause: undefined | WithClause;
        readonly Phase: 'defer' | 'evaluation';
        readonly AssignmentExpression?: undefined;
        readonly ClassDeclaration?: undefined;
        readonly Declaration?: null;
        readonly Decorators?: null;
        readonly default?: boolean;
        readonly HoistableDeclaration?: undefined;
        readonly NamedExports?: undefined;
        readonly VariableStatement?: undefined;
    }
    export interface ExportDeclaration_NamedExports extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly NamedExports: NamedExports;
        readonly AssignmentExpression?: undefined;
        readonly ClassDeclaration?: undefined;
        readonly Declaration?: null;
        readonly Decorators?: null;
        readonly default?: boolean;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly HoistableDeclaration?: undefined;
        readonly VariableStatement?: undefined;
        readonly WithClause?: undefined;
    }
    export interface ExportDeclaration_VariableStatement extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly VariableStatement: VariableStatement;
        readonly AssignmentExpression?: undefined;
        readonly ClassDeclaration?: undefined;
        readonly Declaration?: null;
        readonly Decorators?: null;
        readonly default?: boolean;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly HoistableDeclaration?: undefined;
        readonly NamedExports?: undefined;
        readonly WithClause?: undefined;
    }
    export interface ExportDeclaration_Declaration extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly Decorators: readonly Decorator[] | null;
        readonly Declaration: Declaration;
        readonly AssignmentExpression?: undefined;
        readonly ClassDeclaration?: undefined;
        readonly default?: boolean;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly HoistableDeclaration?: undefined;
        readonly NamedExports?: undefined;
        readonly VariableStatement?: undefined;
        readonly WithClause?: undefined;
    }
    export interface ExportDeclaration_DefaultDeclaration extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly default: true;
        readonly HoistableDeclaration: HoistableDeclaration;
        readonly AssignmentExpression?: undefined;
        readonly ClassDeclaration?: undefined;
        readonly Declaration?: null;
        readonly Decorators?: null;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly NamedExports?: undefined;
        readonly VariableStatement?: undefined;
        readonly WithClause?: undefined;
    }
    export interface ExportDeclaration_DefaultClass extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly Decorators: readonly Decorator[] | null;
        readonly default: true;
        readonly ClassDeclaration: ClassDeclaration;
        readonly AssignmentExpression?: undefined;
        readonly Declaration?: null;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly HoistableDeclaration?: undefined;
        readonly NamedExports?: undefined;
        readonly VariableStatement?: undefined;
        readonly WithClause?: undefined;
    }
    export interface ExportDeclaration_DefaultExpression extends BaseParseNode {
        readonly type: 'ExportDeclaration';
        readonly default: true;
        readonly AssignmentExpression: AssignmentExpressionOrHigher;
        readonly ClassDeclaration?: undefined;
        readonly Declaration?: null;
        readonly Decorators?: null;
        readonly ExportFromClause?: undefined;
        readonly FromClause?: undefined;
        readonly HoistableDeclaration?: undefined;
        readonly NamedExports?: undefined;
        readonly VariableStatement?: undefined;
        readonly WithClause?: undefined;
    }
    export type ExportFromClauseLike = NamedExports | ExportFromClause;
    export interface ExportFromClause extends BaseParseNode {
        readonly type: 'ExportFromClause';
        readonly ModuleExportName?: ModuleExportName;
    }
    export interface NamedExports extends BaseParseNode {
        readonly type: 'NamedExports';
        readonly ExportsList: ExportsList;
        /** Present for `export { x, y } as ns from "mod"`. */
        readonly NamespaceExportName?: ModuleExportName;
    }
    export type ExportsList = readonly ExportSpecifier[];
    export interface ExportSpecifier extends BaseParseNode {
        readonly type: 'ExportSpecifier';
        readonly localName: ModuleExportName;
        readonly exportName: ModuleExportName;
    }
    export type AssignmentPattern = ObjectAssignmentPattern | ArrayAssignmentPattern | AssignmentProperty | AssignmentElement | ParseNode.Elision;
    export type ObjectAssignmentPattern = {
        type: 'ObjectAssignmentPattern';
        AssignmentPropertyList: (AssignmentProperty | AssignmentPattern)[];
        AssignmentRestProperty: AssignmentRestProperty | undefined;
    };
    export type AssignmentProperty = {
        type: 'AssignmentProperty';
        IdentifierReference: ParseNode.IdentifierReference;
        Initializer?: ParseNode.Initializer | null | undefined;
    } | {
        type: 'AssignmentProperty';
        PropertyName: ParseNode.PropertyNameLike | null;
        AssignmentElement: AssignmentElement;
    };
    export type AssignmentElement = {
        type: 'AssignmentElement';
        DestructuringAssignmentTarget: ParseNode.AssignmentExpressionOrHigher;
        Initializer: ParseNode.Initializer | undefined | null;
    };
    export type ArrayAssignmentPattern = {
        type: 'ArrayAssignmentPattern';
        AssignmentElementList: AssignmentElisionElement[];
        AssignmentRestElement: AssignmentRestElement | undefined;
    };
    export type AssignmentElisionElement = ParseNode.Elision | AssignmentElement | AssignmentPattern;
    export type AssignmentRestProperty = {
        type: 'AssignmentRestProperty';
        DestructuringAssignmentTarget: ParseNode.AssignmentExpressionOrHigher;
    };
    export type AllKeysOf<T> = T extends unknown ? keyof T : never;
    export type AllValuesOf<T, K extends AllKeysOf<T>> = T extends unknown ? K extends keyof T ? T[K] : never : never;
    /**
     * Used internally to describe a node that is still in the process of being parsed. Unfinished nodes may not yet be
     * fully defined.
     */
    export type Unfinished<T extends ParseNode = ParseNode> = ({
        type?: T['type'] & ParseNode['type'];
        location: {
            startIndex: number;
            endIndex: number;
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        };
        strict: boolean;
        sourceText: string;
    } & {
        -readonly [K in Exclude<AllKeysOf<T>, 'location' | 'strict' | 'sourceText'>]?: AllValuesOf<T, K>;
    });
    /**
     * Used internally to indicate a node that has finished parsing.
     */
    export type Finished<T extends BaseParseNode | Unfinished<ParseNode>, K extends T['type'] & ParseNode['type']> = T extends Unfinished<ParseNode> ? Extract<ParseNodesByType[K], T> : T;
    export {};
}

export declare namespace ParseNode {
    export type WithStatementListChild = ModuleBody | ScriptBody | Block | CaseClause | DefaultClause | ClassStaticBlockBody | FunctionBody | GeneratorBody | AsyncBody | AsyncGeneratorBody;
}

/** https://tc39.es/ecma262/multipage/text-processing.html#sec-patterns */
export declare namespace ParseNode.RegExp {
    export interface NodeWithPosition {
        readonly position: number;
    }
    export interface Pattern {
        readonly type: 'Pattern';
        readonly Disjunction: Disjunction;
        readonly capturingGroups: readonly {
            readonly GroupName: string | undefined;
            readonly position: number;
        }[];
    }
    export interface Disjunction {
        readonly type: 'Disjunction';
        readonly Alternative: Alternative;
        readonly Disjunction: Disjunction | undefined;
    }
    export interface Alternative {
        readonly type: 'Alternative';
        readonly Term: readonly Term[];
    }
    export type Term = Term_Assertion | Term_Atom;
    export interface Term_Assertion {
        readonly type: 'Term';
        readonly production: 'Assertion';
        readonly Assertion: Assertion;
    }
    export interface Term_Atom {
        readonly type: 'Term';
        readonly production: 'Atom';
        readonly Atom: Atom;
        readonly Quantifier: Quantifier | undefined;
        readonly leftCapturingParenthesesBefore: number;
        readonly capturingParenthesesWithin: number;
    }
    export type Assertion = Assertion_Plain | Assertion_LookaheadOrLookbehind;
    export interface Assertion_Plain {
        readonly type: 'Assertion';
        readonly production: '^' | '$' | 'b' | 'B' | 'A' | 'z';
    }
    export interface Assertion_LookaheadOrLookbehind {
        readonly type: 'Assertion';
        readonly production: '?=' | '?!' | '?<=' | '?<!';
        readonly Disjunction: Disjunction;
    }
    export interface Quantifier {
        readonly type: 'Quantifier';
        readonly QuantifierPrefix: QuantifierPrefix;
        readonly QuestionMark: boolean;
    }
    export type QuantifierPrefix = QuantifierPrefix_Plain | QuantifierPrefix_Count;
    export interface QuantifierPrefix_Plain {
        readonly type: 'QuantifierPrefix';
        readonly production: '*' | '+' | '?';
    }
    export interface QuantifierPrefix_Count {
        readonly type: 'QuantifierPrefix';
        readonly production: '{}';
        readonly DecimalDigits_a: number;
        readonly DecimalDigits_b: number | undefined;
    }
    export type Atom = Atom_PatternCharacter | Atom_Dot | Atom_AtomEscape | Atom_CharacterClass | Atom_Group | Atom_Modifier;
    export interface Atom_PatternCharacter {
        readonly type: 'Atom';
        readonly production: 'PatternCharacter';
        readonly PatternCharacter: Character;
    }
    export interface Atom_Dot {
        readonly type: 'Atom';
        readonly production: '.';
    }
    export interface Atom_AtomEscape {
        readonly type: 'Atom';
        readonly production: 'AtomEscape';
        readonly AtomEscape: AtomEscape;
    }
    export interface Atom_CharacterClass {
        readonly type: 'Atom';
        readonly production: 'CharacterClass';
        readonly CharacterClass: CharacterClass;
    }
    export interface Atom_Group {
        readonly type: 'Atom';
        readonly production: 'Group';
        readonly leftCapturingParenthesesBefore: number;
        readonly GroupSpecifier: string | undefined;
        readonly Disjunction: Disjunction;
    }
    export interface Atom_Modifier {
        readonly type: 'Atom';
        readonly production: 'Modifier';
        readonly leftCapturingParenthesesBefore: number;
        readonly Disjunction: Disjunction;
        readonly AddModifiers: RegularExpressionModifiers | undefined;
        readonly RemoveModifiers: RegularExpressionModifiers | undefined;
    }
    export type RegularExpressionModifier = 'i' | 'm' | 's';
    export type RegularExpressionModifiers = readonly RegularExpressionModifier[];
    export type AtomEscape = AtomEscape_DecimalEscape | AtomEscape_CharacterClassEscape | AtomEscape_CharacterEscape | AtomEscape_CaptureGroupName;
    export interface AtomEscape_DecimalEscape {
        readonly type: 'AtomEscape';
        readonly production: 'DecimalEscape';
        readonly DecimalEscape: DecimalEscape;
    }
    export interface AtomEscape_CharacterClassEscape {
        readonly type: 'AtomEscape';
        readonly production: 'CharacterClassEscape';
        readonly CharacterClassEscape: CharacterClassEscape;
    }
    export interface AtomEscape_CharacterEscape {
        readonly type: 'AtomEscape';
        readonly production: 'CharacterEscape';
        readonly CharacterEscape: CharacterEscape;
    }
    export interface AtomEscape_CaptureGroupName extends NodeWithPosition {
        readonly type: 'AtomEscape';
        readonly production: 'CaptureGroupName';
        readonly GroupName: string;
        readonly groupSpecifiersThatMatchSelf: readonly ParseNode.RegExp.Atom_Group[];
    }
    export type CharacterEscape = CharacterEscape_ControlEscape | CharacterEscape_AsciiLetter | CharacterEscape_0 | CharacterEscape_HexEscapeSequence | CharacterEscape_RegExpUnicodeEscapeSequence | CharacterEscape_IdentityEscape;
    export interface CharacterEscape_ControlEscape {
        readonly type: 'CharacterEscape';
        readonly production: 'ControlEscape';
        readonly ControlEscape: 'f' | 'n' | 'r' | 't' | 'v';
    }
    export interface CharacterEscape_AsciiLetter {
        readonly type: 'CharacterEscape';
        readonly production: 'AsciiLetter';
        readonly AsciiLetter: string;
    }
    export interface CharacterEscape_0 {
        readonly type: 'CharacterEscape';
        readonly production: '0';
    }
    export interface CharacterEscape_HexEscapeSequence {
        readonly type: 'CharacterEscape';
        readonly production: 'HexEscapeSequence';
        readonly HexEscapeSequence: HexEscapeSequence;
    }
    export interface CharacterEscape_RegExpUnicodeEscapeSequence {
        readonly type: 'CharacterEscape';
        readonly production: 'RegExpUnicodeEscapeSequence';
        readonly RegExpUnicodeEscapeSequence: RegExpUnicodeEscapeSequence;
    }
    export interface CharacterEscape_IdentityEscape {
        readonly type: 'CharacterEscape';
        readonly production: 'IdentityEscape';
        readonly IdentityEscape: Character;
    }
    export interface RegExpUnicodeEscapeSequence {
        readonly type: 'RegExpUnicodeEscapeSequence';
        readonly CodePoint?: number;
        readonly HexLeadSurrogate?: number | undefined;
        readonly HexTrailSurrogate?: number | undefined;
        readonly Hex4Digits?: number | undefined;
    }
    export interface DecimalEscape {
        readonly type: 'DecimalEscape';
        readonly position: number;
        readonly value: number;
    }
    export type CharacterClassEscape = CharacterClassEscape_Plain | CharacterClassEscape_UnicodePropertyValue;
    export interface CharacterClassEscape_Plain {
        readonly type: 'CharacterClassEscape';
        readonly production: 'd' | 'D' | 's' | 'S' | 'w' | 'W';
    }
    export interface CharacterClassEscape_UnicodePropertyValue {
        readonly type: 'CharacterClassEscape';
        readonly production: 'p' | 'P';
        readonly UnicodePropertyValueExpression: UnicodePropertyValueExpression;
    }
    export type UnicodePropertyValueExpression = UnicodePropertyValueExpression_Eq | UnicodePropertyValueExpression_Lone;
    export interface UnicodePropertyValueExpression_Eq {
        readonly type: 'UnicodePropertyValueExpression';
        readonly production: '=';
        readonly UnicodePropertyName: string;
        readonly UnicodePropertyValue: string;
    }
    export interface UnicodePropertyValueExpression_Lone {
        readonly type: 'UnicodePropertyValueExpression';
        readonly production: 'Lone';
        readonly LoneUnicodePropertyNameOrValue: string;
    }
    export interface CharacterClass {
        readonly type: 'CharacterClass';
        readonly invert: boolean;
        readonly ClassContents: ClassContents;
    }
    export type ClassContents = ClassContents_Empty | ClassContents_NonUnicodeSetMode | ClassContents_UnicodeSetMode;
    export interface ClassContents_Empty {
        readonly type: 'ClassContents';
        readonly production: 'Empty';
    }
    export interface ClassContents_UnicodeSetMode {
        readonly type: 'ClassContents';
        readonly production: 'ClassSetExpression';
        readonly ClassSetExpression: ClassSetExpression;
    }
    export interface ClassContents_NonUnicodeSetMode {
        readonly type: 'ClassContents';
        readonly production: 'NonEmptyClassRanges';
        readonly NonemptyClassRanges: NonEmptyClassRanges;
    }
    export type NonEmptyClassRanges = readonly ClassRange[];
    /** NON-SPEC */
    export type ClassRange = ClassAtom | readonly [start: ClassAtom, end: ClassAtom];
    export type ClassAtom = ClassAtom_Dash | ClassAtom_SourceCharacter | ClassAtom_ClassEscape;
    export interface ClassAtom_Dash {
        readonly type: 'ClassAtom';
        readonly production: '-';
    }
    export interface ClassAtom_SourceCharacter {
        readonly type: 'ClassAtom';
        readonly production: 'SourceCharacter';
        readonly SourceCharacter: string;
    }
    export interface ClassAtom_ClassEscape {
        readonly type: 'ClassAtom';
        readonly production: 'ClassEscape';
        readonly ClassEscape: ClassEscape;
    }
    export type ClassEscape = ClassEscape_Plain | ClassEscape_CharacterClassEscape | ClassEscape_CharacterEscape;
    export interface ClassEscape_Plain {
        readonly type: 'ClassEscape';
        readonly production: 'b' | '-';
    }
    export interface ClassEscape_CharacterClassEscape {
        readonly type: 'ClassEscape';
        readonly production: 'CharacterClassEscape';
        readonly CharacterClassEscape: CharacterClassEscape;
    }
    export interface ClassEscape_CharacterEscape {
        readonly type: 'ClassEscape';
        readonly production: 'CharacterEscape';
        readonly CharacterEscape: CharacterEscape;
    }
    export type ClassSetExpression = ClassUnion | ClassIntersection | ClassSubtraction;
    export interface ClassUnion {
        readonly type: 'ClassUnion';
        readonly union: readonly (ClassSetRange | ClassSetOperand)[];
    }
    export interface ClassIntersection {
        readonly type: 'ClassIntersection';
        readonly operands: readonly ClassSetOperand[];
    }
    export interface ClassSubtraction {
        readonly type: 'ClassSubtraction';
        readonly operands: readonly ClassSetOperand[];
    }
    export interface ClassSetRange {
        readonly type: 'ClassSetRange';
        readonly left: ClassSetCharacter;
        readonly right: ClassSetCharacter;
    }
    export type ClassSetOperand = ClassSetOperand_NestedClass | ClassSetOperand_ClassStringDisjunction | ClassSetOperand_ClassSetCharacter;
    export interface ClassSetOperand_NestedClass {
        readonly type: 'ClassSetOperand';
        readonly production: 'NestedClass';
        readonly NestedClass: NestedClass;
    }
    export interface ClassSetOperand_ClassStringDisjunction {
        readonly type: 'ClassSetOperand';
        readonly production: 'ClassStringDisjunction';
        readonly ClassStringDisjunction: ClassStringDisjunction;
    }
    export interface ClassSetOperand_ClassSetCharacter {
        readonly type: 'ClassSetOperand';
        readonly production: 'ClassSetCharacter';
        readonly ClassSetCharacter: ClassSetCharacter;
    }
    export type NestedClass = NestedClass_ClassContents | NestedClass_CharacterClassEscape;
    export interface NestedClass_ClassContents {
        readonly type: 'NestedClass';
        readonly production: 'ClassContents';
        readonly ClassContents: ClassContents;
        readonly invert: boolean;
    }
    export interface NestedClass_CharacterClassEscape {
        readonly type: 'NestedClass';
        readonly production: 'CharacterClassEscape';
        readonly CharacterClassEscape: CharacterClassEscape;
    }
    export interface ClassStringDisjunction {
        readonly type: 'ClassStringDisjunction';
        readonly ClassString: ClassSetCharacter[][];
    }
    export type ClassString = string;
    export type ClassSetCharacter = ClassSetCharacter_UnicodeCharacter | ClassSetCharacter_CharacterEscape;
    export interface ClassSetCharacter_UnicodeCharacter {
        readonly type: 'ClassSetCharacter';
        readonly production: 'UnicodeCharacter';
        readonly UnicodeCharacter: UnicodeCharacter;
    }
    export interface ClassSetCharacter_CharacterEscape {
        readonly type: 'ClassSetCharacter';
        readonly production: 'CharacterEscape';
        readonly CharacterEscape: CharacterEscape;
    }
    export interface HexEscapeSequence {
        readonly type: 'HexEscapeSequence';
        readonly HexDigit_a: string;
        readonly HexDigit_b: string;
    }
}

export declare type ParseNode = ParseNode.PrivateIdentifier | ParseNode.IdentifierName | ParseNode.IdentifierReference | ParseNode.BindingIdentifier | ParseNode.LabelIdentifier | ParseNode.PropertyName | ParseNode.ThisExpression | ParseNode.NullLiteral | ParseNode.BooleanLiteral | ParseNode.NumericLiteral | ParseNode.StringLiteral | ParseNode.Elision | ParseNode.ArrayLiteral | ParseNode.SpreadElement | ParseNode.ObjectLiteral | ParseNode.PropertyDefinition | ParseNode.CoverInitializedName | ParseNode.MethodDefinition | ParseNode.FunctionDeclaration | ParseNode.FunctionExpression | ParseNode.FunctionBody | ParseNode.ArrowFunction | ParseNode.ExpressionBody | ParseNode.ConciseBody | ParseNode.GeneratorDeclaration | ParseNode.GeneratorExpression | ParseNode.GeneratorMethod | ParseNode.GeneratorBody | ParseNode.YieldExpression | ParseNode.AsyncGeneratorDeclaration | ParseNode.AsyncGeneratorExpression | ParseNode.AsyncGeneratorMethod | ParseNode.AsyncGeneratorBody | ParseNode.Decorator | ParseNode.ClassDeclaration | ParseNode.ClassExpression | ParseNode.ClassTail | ParseNode.FieldDefinition | ParseNode.ClassStaticBlock | ParseNode.ClassStaticBlockBody | ParseNode.AsyncFunctionDeclaration | ParseNode.AsyncFunctionExpression | ParseNode.AsyncMethod | ParseNode.AsyncBody | ParseNode.AsyncArrowFunction | ParseNode.AsyncConciseBody | ParseNode.RegularExpressionLiteral | ParseNode.CoverParenthesizedExpressionAndArrowParameterList | ParseNode.ParenthesizedExpression | ParseNode.SuperProperty | ParseNode.SuperProperty | ParseNode.NewTarget | ParseNode.ImportMeta | ParseNode.MemberExpression | ParseNode.NewExpression | ParseNode.SuperCall | ParseNode.ImportCall | ParseNode.CallExpression | ParseNode.TemplateLiteral | ParseNode.TaggedTemplateExpression | ParseNode.OptionalExpression | ParseNode.OptionalChain | ParseNode.AssignmentRestElement | ParseNode.UpdateExpression | ParseNode.AwaitExpression | ParseNode.UnaryExpression | ParseNode.ExponentiationExpression | ParseNode.MultiplicativeExpression | ParseNode.AdditiveExpression | ParseNode.ShiftExpression | ParseNode.RelationalExpression | ParseNode.EqualityExpression | ParseNode.BitwiseANDExpression | ParseNode.BitwiseXORExpression | ParseNode.BitwiseORExpression | ParseNode.LogicalANDExpression | ParseNode.LogicalORExpression | ParseNode.CoalesceExpression | ParseNode.ConditionalExpression | ParseNode.AssignmentExpression | ParseNode.CommaOperator | ParseNode.LexicalDeclaration | ParseNode.UsingDeclaration | ParseNode.AwaitUsingDeclaration | ParseNode.LexicalBinding | ParseNode.ObjectBindingPattern | ParseNode.ArrayBindingPattern | ParseNode.BindingRestProperty | ParseNode.BindingProperty | ParseNode.BindingRestElement | ParseNode.BindingElement | ParseNode.SingleNameBinding | ParseNode.Block | ParseNode.VariableStatement | ParseNode.VariableDeclaration | ParseNode.EmptyStatement | ParseNode.ExpressionStatement | ParseNode.IfStatement | ParseNode.DoWhileStatement | ParseNode.WhileStatement | ParseNode.ForStatement | ParseNode.ForInStatement | ParseNode.ForOfStatement | ParseNode.ForDeclaration | ParseNode.ForBinding | ParseNode.ForAwaitStatement | ParseNode.SwitchStatement | ParseNode.CaseBlock | ParseNode.CaseClause | ParseNode.DefaultClause | ParseNode.ContinueStatement | ParseNode.BreakStatement | ParseNode.ReturnStatement | ParseNode.WithStatement | ParseNode.LabelledStatement | ParseNode.ThrowStatement | ParseNode.TryStatement | ParseNode.Catch | ParseNode.DebuggerStatement | ParseNode.ImportDeclaration | ParseNode.ImportClause | ParseNode.ImportedDefaultBinding | ParseNode.NameSpaceImport | ParseNode.NamedImports | ParseNode.ImportSpecifier | ParseNode.WithClause | ParseNode.WithEntry | ParseNode.ExportDeclaration | ParseNode.ExportFromClause | ParseNode.NamedExports | ParseNode.ExportSpecifier | ParseNode.Script | ParseNode.ScriptBody | ParseNode.Module | ParseNode.ModuleBody;

/**
 * A type that contains a mapping of {@link ParseNode} type names to their corresponding {@link ParseNode} type.
 *
 * You can use `ParseNodesByType[T]` instead of a conditional type like `Extract<ParseNode, { type: T }>` which is often
 * more expensive and can complicate assignability checks.
 */
export declare type ParseNodesByType = {
    [N in ParseNode as N['type']]: N;
};

export declare function parseNodeToBreakpointLocation(scriptId: string, node: ParseNode): BreakpointLocation;

/** https://tc39.es/ecma262/#sec-parsepattern */
export declare function ParsePattern(patternText: string, u: boolean, v: boolean): Value[] | ParseNode.RegExp.Pattern;

export declare type ParsePrintFormat<S extends string> = S extends `${string}$${infer T}${infer End}` ? T extends keyof ParametersMap ? [ParametersMap[T], ...ParsePrintFormat<End>] : ParsePrintFormat<End> : [];

export declare class Parser extends LanguageParser {
    protected readonly source: string;
    protected readonly specifier?: string;
    readonly state: {
        hasTopLevelAwait: boolean;
        strict: boolean;
        json: boolean;
        allowAllPrivateNames: boolean;
    };
    readonly scope: Scope;
    protected readonly decoratingSource?: string;
    constructor({ source, specifier, json, allowAllPrivateNames, decoratingSource }: ParserOptions);
    isStrictMode(): boolean;
    feature(name: Feature): boolean;
    startNode<T extends ParseNode>(inheritStart?: ParseNode.BaseParseNode): ParseNode.Unfinished<T>;
    markNodeStart(node: ParseNode.Unfinished): void;
    finishNode<T extends ParseNode.Unfinished, K extends T['type'] & ParseNode['type']>(node: T, type: K): ParseNodesByType[K];
}

export declare interface ParserOptions {
    readonly source: string;
    readonly decoratingSource?: string;
    readonly specifier?: string;
    readonly json?: boolean;
    readonly allowAllPrivateNames?: boolean;
}

/** Coerces a property key into a numeric index. */
export declare type ParserTokenIndex<T extends PropertyKey> = T extends number ? ParserTokenIndex<`${T}`> : T extends `${bigint}` ? T extends `${infer I extends number}` ? I : never : never;

export declare function ParseScript(sourceText: string, realm: Realm, hostDefined?: ParseScriptHostDefined): ScriptRecord | ObjectValue[];

export declare interface ParseScriptHostDefined {
    readonly specifier?: string | undefined;
    readonly [kInternal]?: {
        json?: boolean;
        /** only used in inspector.compileScript */ allowAllPrivateNames?: boolean;
        /** only used in inspector.compileScript */ allowAwait?: boolean;
    };
    scriptId?: string;
    readonly doNotTrackScriptId?: boolean;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-partial-duration-records */
export declare interface PartialDurationRecord {
    readonly Years: Float64RepresentableInteger | undefined;
    readonly Months: Float64RepresentableInteger | undefined;
    readonly Weeks: Float64RepresentableInteger | undefined;
    readonly Days: Float64RepresentableInteger | undefined;
    readonly Hours: Float64RepresentableInteger | undefined;
    readonly Minutes: Float64RepresentableInteger | undefined;
    readonly Seconds: Float64RepresentableInteger | undefined;
    readonly Milliseconds: Float64RepresentableInteger | undefined;
    readonly Microseconds: Float64RepresentableInteger | undefined;
    readonly Nanoseconds: Float64RepresentableInteger | undefined;
}

/** https://tc39.es/proposal-temporal/#table-temporal-temporaltimelike-record-fields */
export declare interface PartialTimeRecord {
    Hour: bigint | undefined;
    Minute: bigint | undefined;
    Second: bigint | undefined;
    Millisecond: bigint | undefined;
    Microsecond: bigint | undefined;
    Nanosecond: bigint | undefined;
}

export declare function performDevtoolsEval(source: string, evalRealm: ManagedRealm, strictCaller: boolean, doNotTrack: boolean): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-global-object */
/** https://tc39.es/ecma262/#sec-performeval */
export declare function PerformEval(x: Value, strictCaller: boolean, direct: boolean): ValueEvaluator;

/** https://tc39.es/ecma262/#sec-performpromisethen */
export declare function PerformPromiseThen(promise: PromiseObject, onFulfilled: Value, onRejected: Value, resultCapability: PromiseCapabilityRecord): PromiseObject;

export declare function PerformPromiseThen(promise: PromiseObject, onFulfilled: Value, onRejected: Value, resultCapability?: undefined): undefined;

export declare function PerformPromiseThen(promise: PromiseObject, onFulfilled: Value, onRejected: Value, resultCapability?: PromiseCapabilityRecord | undefined): PromiseObject | undefined;

/** https://tc39.es/proposal-shadowrealm/#sec-performshadowrealmeval */
export declare function PerformShadowRealmEval(sourceText: string, callerRealm: Realm, evalRealm: Realm): ValueEvaluator;

/**
 * A NON-SPEC shorthand to notate "returns either a normal completion containing ... or a throw completion".
 *
 * If the T is an ECMAScript language value, use ExpressionCompletion<T>.
 */
export declare type PlainCompletion<T> = T | NormalCompletion<T> | ThrowCompletion;

export declare type PlainEvaluator<V = void> = Evaluator<PlainCompletion<V>>;

export declare interface Position {
    /** 1-based */
    readonly line: number;
    readonly column: number;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-preparecalendarfields */
export declare function PrepareCalendarFields(calendar: KnownCalendarType, fields: ObjectValue, calendarFields: CalendarFields, nonCalendarFields: NonCalendarFields, requiredFields: RequiredCalendarFields): PlainEvaluator<CalendarFieldsRecord>;

/** https://tc39.es/ecma262/#sec-prepareforordinarycall */
export declare function PrepareForOrdinaryCall(F: ECMAScriptFunctionObject, newTarget: ObjectValue | UndefinedValue): ExecutionContext;

/** https://tc39.es/ecma262/#sec-preparefortailcall */
export declare function PrepareForTailCall(): void;

/** https://tc39.es/proposal-shadowrealm/#sec-prepare-for-wrapped-function-call */
export declare function PrepareForWrappedFunctionCall(F: WrappedFunctionExoticObject): ExecutionContext;

export declare interface PreviouslyImportedNamesEntry {
    readonly Module: AbstractModuleRecord;
    ImportedNames: ImportedNamesValue;
}

export declare type PrimitiveHanding = 'iterate-string-primitives' | 'reject-primitives';

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export declare type PrimitiveValue = UndefinedValue | NullValue | BooleanValue | JSStringValue | SymbolValue | NumberValue | BigIntValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export declare const PrimitiveValue: (abstract new () => {
    type: Value['type'];
}) & {
    [Symbol.hasInstance]: (value: unknown) => value is PrimitiveValue;
    readonly null: NullValue;
    readonly undefined: UndefinedValue;
    readonly true: BooleanValue<true>;
    readonly false: BooleanValue<false>;
};

/** https://tc39.es/ecma262/#sec-static-semantics-privateboundidentifiers */
export declare function PrivateBoundIdentifiers(node: ParseNode | readonly ParseNode[]): string[];

/** https://tc39.es/ecma262/#sec-privateelementfind */
export declare function PrivateElementFind(P: PrivateName, O: ObjectValue): PrivateElementRecord | undefined;

export declare type PrivateElementRecord = PrivateElementRecord_Value | PrivateElementRecord_Accessor;

export declare const PrivateElementRecord: {
    (value: PrivateElementRecord): PrivateElementRecord;
    [Symbol.hasInstance](instance: unknown): instance is PrivateElementRecord;
};

export declare interface PrivateElementRecord_Accessor {
    readonly Key: PrivateName;
    readonly Kind: 'accessor';
    Value?: Value;
    readonly Get?: FunctionObject | UndefinedValue;
    readonly Set?: FunctionObject | UndefinedValue;
}

/** https://tc39.es/ecma262/#sec-privateelement-specification-type */
export declare interface PrivateElementRecord_Value {
    readonly Key: PrivateName;
    readonly Kind: 'method' | 'field';
    Value?: Value;
    readonly Get?: undefined;
    readonly Set?: undefined;
}

/** https://tc39.es/ecma262/#sec-privateenvironment-records */
export declare class PrivateEnvironmentRecord {
    readonly OuterPrivateEnvironment: PrivateEnvironmentRecord | null;
    readonly Names: PrivateName[];
    /** https://tc39.es/ecma262/#sec-newprivateenvironment */
    constructor(outerEnv: PrivateEnvironmentRecord | null);
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-privatefieldadd */
export declare function PrivateFieldAdd(O: ObjectValue, P: PrivateName, value: Value): Generator<EvaluatorYieldType, ThrowCompletion | undefined, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-privateget */
export declare function PrivateGet(O: ObjectValue, P: PrivateName): Generator<EvaluatorYieldType, ThrowCompletion | Value, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-privatemethodoraccessoradd */
export declare function PrivateMethodOrAccessorAdd(O: ObjectValue, method: PrivateElementRecord): Generator<EvaluatorYieldType, ThrowCompletion | undefined, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-private-names */
export declare class PrivateName {
    private _;
    readonly Description: string;
    constructor(description: string);
}

export declare interface PrivateScopeInfo {
    readonly outer: PrivateScopeInfo | undefined;
    readonly names: Map<string, Set<'field' | 'method' | 'get' | 'set'>>;
}

export declare function PrivateSet(O: ObjectValue, P: PrivateName, value: Value): Generator<EvaluatorYieldType, ThrowCompletion | undefined, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-promise.any-reject-element-functions */
export declare interface PromiseAllRejectElementFunctionObject extends BuiltinFunctionObject {
    readonly Index: number;
    readonly AlreadyCalled: {
        Value: boolean;
    };
}

/** https://tc39.es/ecma262/#sec-promise-objects */
/** https://tc39.es/ecma262/#sec-promise.all-resolve-element-functions */
export declare interface PromiseAllResolveElementFunctionObject extends BuiltinFunctionObject {
    readonly Index: number;
    readonly AlreadyCalled: {
        Value: boolean;
    };
}

/** https://tc39.es/ecma262/#sec-promisecapability-records */
export declare class PromiseCapabilityRecord {
    constructor(value: PromiseCapabilityRecord);
    readonly Promise: PromiseObject;
    readonly Resolve: FunctionObject;
    readonly Reject: FunctionObject;
}

/** https://tc39.es/ecma262/#table-internal-slots-of-promise-instances */
export declare interface PromiseObject extends OrdinaryObject {
    PromiseState: 'pending' | 'fulfilled' | 'rejected';
    PromiseResult: Value | undefined;
    PromiseFulfillReactions: undefined | PromiseReactionRecord[];
    PromiseRejectReactions: undefined | PromiseReactionRecord[];
    PromiseIsHandled: boolean;
}

/** https://tc39.es/ecma262/#sec-promisereaction-records */
export declare class PromiseReactionRecord {
    readonly Capability: PromiseCapabilityRecord | undefined;
    readonly Type: 'Fulfill' | 'Reject';
    readonly Handler: JobCallbackRecord | undefined;
    constructor(O: PromiseReactionRecord);
}

/** https://tc39.es/ecma262/#sec-promise-resolve */
export declare function PromiseResolve(constructor: ObjectValue, resolution: Value): ValueEvaluator<PromiseObject>;

/** https://tc39.es/ecma262/#sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization */
export declare function PropertyBindingInitialization(node: ParseNode.BindingPropertyList | ParseNode.BindingPropertyLike, value: Value, environment: EnvironmentRecord | undefined): PlainEvaluator<PropertyKeyValue[]>;

/** https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation */
export declare function PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList: ParseNode.PropertyDefinitionList, object: ObjectValue, enumerable: boolean): PlainEvaluator;

export declare class PropertyKeyMap<V> implements Map<PropertyKeyValue, V> {
    #private;
    clear(): void;
    delete(key: PropertyKeyValue | string): boolean;
    forEach(callbackfn: (value: V, key: PropertyKeyValue, map: Map<PropertyKeyValue, V>) => void, thisArg?: PropertyKeyMap<V>): void;
    get(key: PropertyKeyValue | string): V | undefined;
    has(key: PropertyKeyValue | string): boolean;
    set(key: PropertyKeyValue | string, value: V): this;
    get size(): number;
    entries(): Generator<[JSStringValue, V] | [SymbolValue, V], undefined, unknown>;
    keys(): Generator<JSStringValue | SymbolValue, undefined, unknown>;
    values(): Generator<V, undefined, unknown>;
    getOrInsert(key: PropertyKeyValue | string, defaultValue: V): V;
    getOrInsertComputed(key: PropertyKeyValue | string, defaultValueFn: (key: PropertyKeyValue) => V): V;
    [Symbol.iterator]: () => MapIterator<[PropertyKeyValue, V]>;
    [Symbol.toStringTag]: string;
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export declare type PropertyKeyValue = JSStringValue | SymbolValue;

export declare type PropertyReference = ReferenceRecord & {
    readonly Base: Exclude<ReferenceRecord['Base'], 'unresolvable' | EnvironmentRecord>;
};

export declare function PropName(node: ParseNode): string | undefined;

/** https://tc39.es/ecma262/#sec-proxycreate */
export declare function ProxyCreate(target: Value, handler: Value): ValueCompletion<ProxyObject>;

export declare interface ProxyObject extends ExoticObject, BuiltinFunctionObject {
    ProxyHandler: Value | NullValue;
    ProxyTarget: ObjectValue | NullValue;
}

/** https://tc39.es/ecma262/#sec-putvalue */
export declare function PutValue(V: ReferenceRecord | Value, W: Value): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-returnifabrupt */
export declare type Q<T> = T extends NormalCompletion<infer V> ? V : T extends AbruptCompletion ? never : T;

export declare function R(x: NumberValue): number;

export declare function R(x: BigIntValue): bigint;

export declare function R(x: BigIntValue | NumberValue): bigint | number;

declare interface Range_2 {
    readonly startIndex: number;
    readonly endIndex: number;
}
export { Range_2 as Range }

/** https://tc39.es/ecma262/#sec-rawbytestonumeric */
export declare function RawBytesToNumeric(type: TypedArrayTypes, rawBytes: readonly number[], isLittleEndian: boolean): BigIntValue | NumberValue;

export declare const RawTokens: readonly [readonly ["TEMPLATE", "`"], readonly ["PERIOD", "."], readonly ["LBRACK", "["], readonly ["OPTIONAL", "?."], readonly ["LPAREN", "("], readonly ["RPAREN", ")"], readonly ["RBRACK", "]"], readonly ["LBRACE", "{"], readonly ["COLON", ":"], readonly ["ELLIPSIS", "..."], readonly ["CONDITIONAL", "?"], readonly ["SEMICOLON", ";"], readonly ["RBRACE", "}"], readonly ["EOS", "EOS"], readonly ["ARROW", "=>"], readonly ["ASSIGN", "="], readonly ["ASSIGN_NULLISH", "??="], readonly ["ASSIGN_OR", "||="], readonly ["ASSIGN_AND", "&&="], readonly ["ASSIGN_BIT_OR", "|="], readonly ["ASSIGN_BIT_XOR", "^="], readonly ["ASSIGN_BIT_AND", "&="], readonly ["ASSIGN_SHL", "<<="], readonly ["ASSIGN_SAR", ">>="], readonly ["ASSIGN_SHR", ">>>="], readonly ["ASSIGN_MUL", "*="], readonly ["ASSIGN_DIV", "/="], readonly ["ASSIGN_MOD", "%="], readonly ["ASSIGN_EXP", "**="], readonly ["ASSIGN_ADD", "+="], readonly ["ASSIGN_SUB", "-="], readonly ["COMMA", ","], readonly ["NULLISH", "??"], readonly ["OR", "||"], readonly ["AND", "&&"], readonly ["BIT_OR", "|"], readonly ["BIT_XOR", "^"], readonly ["BIT_AND", "&"], readonly ["SHL", "<<"], readonly ["SAR", ">>"], readonly ["SHR", ">>>"], readonly ["MUL", "*"], readonly ["DIV", "/"], readonly ["MOD", "%"], readonly ["EXP", "**"], readonly ["ADD", "+"], readonly ["SUB", "-"], readonly ["NOT", "!"], readonly ["BIT_NOT", "~"], readonly ["DELETE", "delete"], readonly ["TYPEOF", "typeof"], readonly ["VOID", "void"], readonly ["INC", "++"], readonly ["DEC", "--"], readonly ["EQ", "=="], readonly ["EQ_STRICT", "==="], readonly ["NE", "!="], readonly ["NE_STRICT", "!=="], readonly ["LT", "<"], readonly ["GT", ">"], readonly ["LTE", "<="], readonly ["GTE", ">="], readonly ["INSTANCEOF", "instanceof"], readonly ["IN", "in"], readonly ["BREAK", "break"], readonly ["CASE", "case"], readonly ["CATCH", "catch"], readonly ["CONTINUE", "continue"], readonly ["DEBUGGER", "debugger"], readonly ["DEFAULT", "default"], readonly ["DO", "do"], readonly ["ELSE", "else"], readonly ["FINALLY", "finally"], readonly ["FOR", "for"], readonly ["FUNCTION", "function"], readonly ["IF", "if"], readonly ["NEW", "new"], readonly ["RETURN", "return"], readonly ["SWITCH", "switch"], readonly ["THROW", "throw"], readonly ["TRY", "try"], readonly ["VAR", "var"], readonly ["WHILE", "while"], readonly ["WITH", "with"], readonly ["THIS", "this"], readonly ["NULL", "null"], readonly ["TRUE", "true"], readonly ["FALSE", "false"], readonly ["NUMBER", null], readonly ["STRING", null], readonly ["BIGINT", null], readonly ["SUPER", "super"], readonly ["IDENTIFIER", null], readonly ["AWAIT", "await"], readonly ["YIELD", "yield"], readonly ["CLASS", "class"], readonly ["CONST", "const"], readonly ["EXPORT", "export"], readonly ["EXTENDS", "extends"], readonly ["IMPORT", "import"], readonly ["PRIVATE_IDENTIFIER", null], readonly ["AT", "@"], readonly ["ENUM", "enum"], readonly ["ESCAPED_KEYWORD", null]];

/** https://tc39.es/proposal-deferred-reexports/#sec-ReadyForSyncExecution */
export declare function ReadyForSyncExecution(module: AbstractModuleRecord, importedNames?: ImportedNamesValue, seen?: Set<CyclicModuleRecord>): boolean;

/** https://tc39.es/ecma262/#sec-code-realms */
export declare abstract class Realm {
    abstract readonly AgentSignifier: unknown;
    abstract readonly Intrinsics: Intrinsics;
    abstract readonly GlobalObject: ObjectValue;
    abstract readonly GlobalEnv: GlobalEnvironmentRecord;
    abstract readonly TemplateMap: {
        Site: ParseNode.TemplateLiteral;
        Array: ObjectValue;
    }[];
    readonly LoadedModules: LoadedModuleRequestRecord[];
    abstract readonly HostDefined: ManagedRealmHostDefined;
    abstract randomState: undefined | BigUint64Array;
    mark(m: GCMarker): void;
}

export declare type ReferenceEvaluator = Evaluator<PlainCompletion<ReferenceRecord>>;

export declare class ReferenceRecord {
    readonly Base: 'unresolvable' | Value | EnvironmentRecord;
    ReferencedName: Value | PrivateName;
    readonly Strict: boolean;
    readonly ThisValue: Value | undefined;
    constructor({ Base, ReferencedName, Strict, ThisValue }: Pick<ReferenceRecord, 'Base' | 'ReferencedName' | 'Strict' | 'ThisValue'>);
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-destructuring-assignment */
export declare function refineLeftHandSideExpression(node: ParseNode.ArrayLiteral | ParseNode.ObjectLiteral | ParseNode.PropertyDefinition | ParseNode.MemberExpression | ParseNode.CoverInitializedName | ParseNode.AssignmentExpression | ParseNode.Elision | ParseNode.IdentifierReference | ParseNode.ElementListElement | DestructuringParseNode | ParseNode.Expression, type?: 'array' | 'object'): ParseNode.AssignmentPattern;

/** https://tc39.es/ecma262/#sec-regexpalloc */
export declare function RegExpAlloc(newTarget: FunctionObject): ValueEvaluator<RegExpObject>;

/** https://tc39.es/ecma262/#sec-regexpcreate */
export declare function RegExpCreate(P: Value, F: Value): ValueEvaluator<RegExpObject>;

/** https://tc39.es/ecma262/#sec-regexphasflag */
export declare function RegExpHasFlag(R: Value, codeUnit: string): PlainCompletion<boolean | undefined>;

/** https://tc39.es/ecma262/#sec-regexpinitialize */
export declare function RegExpInitialize(obj: Mutable<RegExpObject>, pattern: string | Value, flags: string | Value): Generator<EvaluatorYieldType, Mutable<RegExpObject> | ThrowCompletion, EvaluatorNextType>;

export declare type RegExpMatcher = (input: RegExpMatchingSource, index: number) => MatcherResult;

export declare type RegExpMatchingSource = (readonly string[]) & {
    readonly raw: string;
};

export declare interface RegExpObject extends OrdinaryObject {
    readonly OriginalSource: string;
    readonly OriginalFlags: string;
    readonly RegExpMatcher: RegExpMatcher;
    readonly RegExpRecord: RegExpRecord;
    readonly parsedPattern: ParseNode.RegExp.Pattern;
}

export declare class RegExpParser {
    private decorateError?;
    private source;
    private position;
    get debug(): string;
    private capturingGroups;
    private leftCapturingParenthesesBefore;
    private decimalEscapes;
    private groupNameRefs;
    private groupNameThatMatches;
    private getAllGroupsWithName;
    private state;
    constructor(source: string, decorateError?: ((error: ErrorObject, position: number) => void) | undefined);
    scope<T>(flags: RegExpParserContext, f: () => T): T;
    private get inUnicodeMode();
    private get inNamedCaptureGroups();
    private get inUnicodeSetMode();
    private raise;
    private peek;
    private test;
    private eat;
    private next;
    private expect;
    parsePattern(): ParseNode.RegExp.Pattern;
    private disjunctionCheckedCaptureGroups;
    private parseDisjunction;
    private parseAlternative;
    private parseTerm;
    private maybeParseAssertion;
    private maybeParseQuantifier;
    private parseAtom;
    private parseAtomModifiers;
    private parseAtomEscape;
    private parseCharacterEscape;
    private maybeParseDecimalEscape;
    private maybeParseCharacterClassEscape;
    private parseCharacterClass;
    private parseClassContents;
    private parseNonemptyClassRanges;
    private parseClassAtom;
    private parseSourceCharacter;
    private parseGroupName;
    private parseRegExpIdentifierName;
    private parseDecimalDigits;
    private parseHexEscapeSequence;
    private scanHex;
    private maybeParseRegExpUnicodeEscapeSequence;
    private parseClassSetExpression;
    private parseClassUnion;
    private parseClassIntersectionOrSubtraction;
    private parseClassSetOperand;
    private maybeParseClassSetCharacter;
    private parseClassStringDisjunctionContents;
}

export declare interface RegExpParserContext {
    UnicodeMode?: boolean;
    NamedCaptureGroups?: boolean;
    UnicodeSetsMode?: boolean;
}

/** https://tc39.es/ecma262/#sec-regexp-records */
export declare interface RegExpRecord {
    readonly IgnoreCase: boolean;
    readonly Multiline: boolean;
    readonly DotAll: boolean;
    readonly Unicode: boolean;
    readonly UnicodeSets: boolean;
    readonly CapturingGroupsCount: number;
}

/** https://tc39.es/ecma262/#pattern-matchstate */
export declare class RegExpState {
    readonly input: RegExpMatchingSource;
    readonly endIndex: number;
    readonly captures: readonly (Range_2 | undefined)[];
    constructor(input: RegExpMatchingSource, endIndex: number, captures: readonly (undefined | Range_2)[]);
    static createRegExpMatchingSource(input: readonly string[], raw: string): RegExpMatchingSource;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-regulateisodate */
export declare function RegulateISODate(year: Integer, month: Integer, day: Integer, overflow: 'constrain' | 'reject'): PlainCompletion<ISODateRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-regulatetime */
export declare function RegulateTime(hour: Integer, minute: Integer, second: Integer, millisecond: Integer, microsecond: Integer, nanosecond: Integer, overflow: 'constrain' | 'reject'): PlainCompletion<TimeRecord>;

export declare type RequiredCalendarFields = 'partial' | 'time-zone' | 'no-required-fields';

/** https://tc39.es/ecma262/#sec-requireinternalslot */
export declare function RequireInternalSlot(O: Value, internalSlot: string): ThrowCompletion | undefined;

/** https://tc39.es/ecma262/#sec-testing-and-comparison-operations */
/** https://tc39.es/ecma262/#sec-requireobjectcoercible */
export declare function RequireObjectCoercible(argument: Value): ThrowCompletion | undefined;

export declare interface ResizableArrayBufferObject extends ArrayBufferObject {
    readonly ArrayBufferMaxByteLength: number;
}

/** https://tc39.es/ecma262/#sec-resolvebinding */
export declare function ResolveBinding(name: string, strict: boolean, env?: EnvironmentRecord | undefined | null): PlainEvaluator<ReferenceRecord>;

export declare class ResolvedBindingRecord {
    readonly Module: AbstractModuleRecord;
    readonly BindingName: 'namespace' | 'deferred-namespace' | 'source' | JSStringValue;
    constructor({ Module, BindingName }: Pick<ResolvedBindingRecord, 'BindingName' | 'Module'>);
    mark(m: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-resolve-private-identifier */
export declare function ResolvePrivateIdentifier(privEnv: PrivateEnvironmentRecord, identifier: string): PrivateName;

export declare interface ResolveSetItem {
    readonly Module: AbstractModuleRecord;
    readonly ExportName: string;
}

/** https://tc39.es/ecma262/#sec-resolvethisbinding */
export declare function ResolveThisBinding(): ThrowCompletion | Value;

export declare function RestBindingInitialization({ BindingIdentifier }: ParseNode.BindingRestProperty, value: Value, environment: EnvironmentRecord | undefined, excludedNames: readonly PropertyKeyValue[]): Generator<EvaluatorYieldType, PlainCompletion<void>, EvaluatorNextType>;

export declare interface ResumeEvaluateOptions {
    noBreakpoint?: boolean;
    pauseAt?: 'step-over' | 'step-in' | 'step-out';
    debuggerStatementCompletion?: ValueCompletion;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare type ReturnCompletion = ReturnCompletion_;

/** https://tc39.es/ecma262/#sec-throwcompletion */
export declare const ReturnCompletion: typeof ReturnCompletion_ & {
    /** https://tc39.es/ecma262/#sec-throwcompletion */
    <T extends Value = Value>(value: T): ThrowCompletion<T>;
};

export declare class ReturnCompletion_ extends AbruptCompletion<Value> {
    readonly Type: 'return';
    readonly Value: Value;
    readonly Target: undefined;
    private constructor();
}

export declare type ReturnCompletionInit = Pick<ReturnCompletion, 'Type' | 'Value' | 'Target'>;

/** https://tc39.es/ecma262/pr/3759/#sec-roundepochnanoseconds */
export declare function RoundEpochNanoseconds(epochNanoseconds: EpochNanoseconds, increment: Integer, unit: TimeUnit, roundingMode: RoundingMode): EpochNanoseconds;

/** https://tc39.es/proposal-temporal/#table-temporal-rounding-modes */
export declare type RoundingMode = 'ceil' | 'floor' | 'expand' | 'trunc' | 'halfCeil' | 'halfFloor' | 'halfExpand' | 'halfTrunc' | 'halfEven';

/** https://tc39.es/proposal-temporal/#sec-temporal-roundisodatetime */
export declare function RoundISODateTime(isoDateTime: ISODateTimeRecord, increment: Integer, unit: TimeUnit | 'day', roundingMode: RoundingMode): ISODateTimeRecord;

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrement */
export declare function RoundNumberToIncrement(quantity: MathematicalValue, increment: Integer, roundingMode: RoundingMode): Integer;

/** https://tc39.es/proposal-temporal/#sec-roundnumbertoincrementasifpositive */
export declare function RoundNumberToIncrementAsIfPositive(quantity: MathematicalValue, increment: Integer, roundingMode: RoundingMode): Integer;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration */
export declare function RoundRelativeDuration(duration: InternalDurationRecord, originEpochNanoseconds: EpochNanoseconds, destEpochNanoseconds: EpochNanoseconds, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier | NoTimeZone, calendar: KnownCalendarType, largestUnit: TemporalUnit, increment: Integer, smallestUnit: TemporalUnit, roundingMode: RoundingMode): PlainCompletion<InternalDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtime */
export declare function RoundTime(time: TimeRecord, increment: Integer, unit: TimeUnit | 'day', roundingMode: RoundingMode): TimeRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimeduration */
export declare function RoundTimeDuration(timeDuration: TimeDuration, increment: Integer, unit: TimeUnit, roundingMode: RoundingMode): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-roundtimedurationtoincrement */
export declare function RoundTimeDurationToIncrement(timeDuration: TimeDuration, increment: Integer, roundingMode: RoundingMode): PlainCompletion<TimeDuration>;

/** https://tc39.es/ecma262/#sec-runcallercontext */
export declare function RunCallerContext(passingValue: EvaluatorYieldType_Await): ValueEvaluator;

export declare function RunCallerContext(passingValue: EvaluatorYieldType_Yield | EvaluatorYieldType_AsyncYield): Evaluator<YieldCompletion>;

/** https://tc39.es/ecma262/#running-execution-context */
export declare function runningExecutionContext(): ExecutionContext;

/** https://tc39.es/ecma262/#sec-jobs */
export declare function runSingleJobInQueue(job: Job, onError: (error: Value) => void, finished: () => void): void;

/** https://tc39.es/ecma262/#sec-runsuspendedcontext */
export declare function RunSuspendedContext(context: ExecutionContext, completionRecord: EvaluatorNextType_Yield): YieldEvaluator;

export declare function RunSuspendedContext(context: ExecutionContext, completionRecord: EvaluatorNextType_Await | EvaluatorNextType_AsyncYield): AwaitEvaluator;

export declare type SafeAccessMethods = 'map' | 'values' | 'entries' | 'filter' | 'forEach' | 'find';

/** https://tc39.es/proposal-defer-import-eval/#sec-getmodulenamespace */
export declare function SafePerformPromiseAll(promises: readonly PromiseObject[]): PromiseObject;

/** https://tc39.es/ecma262/#sec-sametype */
export declare function SameType(x: Value, y: Value): boolean;

/** https://tc39.es/ecma262/#sec-samevalue */
export declare function SameValue(x: Value, y: Value): boolean;

/** https://tc39.es/ecma262/#sec-samevaluenonnumber */
export declare function SameValueNonNumber(x: Value, y: Value): boolean;

/** https://tc39.es/ecma262/#sec-samevaluezero */
export declare function SameValueZero(x: Value, y: Value): boolean;

export declare class Scope {
    private readonly parser;
    private readonly scopeStack;
    labels: Label[];
    readonly arrowInfoStack: (ArrowInfo | null)[];
    readonly assignmentInfoStack: AssignmentInfo[];
    private arrowParameterCandidateDepth;
    private arrowBodyDepth;
    readonly exports: Set<string>;
    readonly undefinedExports: Map<string, ParseNode.ModuleExportName>;
    privateScope: PrivateScopeInfo | undefined;
    private readonly undefinedPrivateAccesses;
    private flags;
    constructor(parser: Parser);
    hasReturn(): boolean;
    hasAwait(): boolean;
    hasYield(): boolean;
    hasNewTarget(): boolean;
    hasSuperCall(): boolean;
    hasSuperProperty(): boolean;
    hasImportMeta(): boolean;
    hasIn(): boolean;
    inParameters(): boolean;
    inClassStaticBlock(): boolean;
    isDefault(): boolean;
    isModule(): boolean;
    inArrowParameterCandidate(): boolean;
    enterArrowParameterCandidate(): void;
    exitArrowParameterCandidate(): void;
    inArrowBody(): boolean;
    enterArrowBody(): void;
    exitArrowBody(): void;
    with<R>(flags: ScopeFlagSetters, f: () => R): R;
    pushArrowInfo(isAsync?: boolean): void;
    popArrowInfo(): ArrowInfo;
    get arrowInfo(): ArrowInfo | null | undefined;
    pushAssignmentInfo(type: 'assign' | 'arrow' | 'for'): void;
    popAssignmentInfo(): AssignmentInfo;
    registerObjectLiteralEarlyError(error: ErrorObject): void;
    lexicalScope(): ScopeInfo;
    variableScope(): ScopeInfo;
    declare(node: ParseNode | readonly ParseNode[], type: 'private', extraType?: 'field' | 'method' | 'get' | 'set'): void;
    declare(node: ParseNode | readonly ParseNode[], type: 'lexical' | 'lexical-allow-let' | 'import' | 'function' | 'parameter' | 'variable' | 'export'): void;
    checkUndefinedExports(NamedExports: ParseNode.NamedExports): void;
    checkUndefinedPrivate(PrivateIdentifier: ParseNode.PrivateIdentifier): void;
}

export declare type ScopeFlagSetters = {
    readonly [P in (keyof typeof Flag) & string]?: boolean;
} & {
    readonly lexical?: boolean;
    readonly variable?: boolean;
    readonly variableFunctions?: boolean;
    readonly private?: boolean;
    readonly label?: LabelType | 'boundary';
    readonly strict?: boolean;
};

export declare interface ScopeInfo {
    readonly flags: ScopeFlagSetters;
    readonly lexicals: Set<string>;
    readonly variables: Set<string>;
    readonly functions: Set<string>;
    readonly parameters: Set<string>;
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation */
export declare function ScriptEvaluation(scriptRecord: ScriptRecord): ValueEvaluator;

export declare class ScriptRecord {
    readonly Realm: Realm;
    readonly ECMAScriptCode: ParseNode.Script;
    readonly LoadedModules: LoadedModuleRequestRecord[];
    readonly HostDefined: ParseScriptHostDefined;
    mark(m: GCMarker): void;
    constructor(record: Omit<ScriptRecord, 'mark'>);
}

export declare function SecondFromTime(t: FiniteTimeValue): Integer;

export declare const SecondsPerMinute = 60n;

/** https://tc39.es/ecma262/#sec-set-o-p-v-throw */
declare function Set_2(O: ObjectValue, P: PropertyKeyValue | string, V: Value, throws: boolean): Generator<EvaluatorYieldType, boolean | ThrowCompletion, EvaluatorNextType>;
export { Set_2 as Set }

/** https://tc39.es/ecma262/#sec-setdefaultglobalbindings */
export declare function SetDefaultGlobalBindings(realmRec: Realm): void;

/** https://tc39.es/ecma262/#sec-setfunctionlength */
export declare function SetFunctionLength(F: FunctionObject, length: number): void;

/** https://tc39.es/ecma262/#sec-setfunctionname */
export declare function SetFunctionName(func: FunctionObject, name: string | PropertyKeyValue | PrivateName, prefix?: string): void;

/** https://tc39.es/ecma262/#sec-set-immutable-prototype */
export declare function SetImmutablePrototype(O: ObjectValue, V: Value): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-setintegritylevel */
export declare function SetIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): PlainEvaluator<boolean>;

export declare interface SetObject extends OrdinaryObject {
    readonly SetData: (Value | undefined)[];
}

export declare function setSurroundingAgent(a: Agent): void;

/** https://tc39.es/ecma262/#sec-SetterThatIgnoresPrototypeProperties */
export declare function SetterThatIgnoresPrototypeProperties(thisValue: Value, home: ObjectValue, propertyKey: PropertyKeyValue, value: Value): PlainEvaluator;

/** https://tc39.es/ecma262/#sec-setvalueinbuffer */
export declare function SetValueInBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayTypes, value: BigIntValue | NumberValue, _isTypedArray: boolean, _order: 'seq-cst' | 'unordered' | 'init', isLittleEndian?: boolean): PlainEvaluator<void>;

/** https://tc39.es/ecma262/#sec-setviewvalue */
export declare function SetViewValue(view: Value, requestIndex: Value, isLittleEndian: boolean | Value, type: TypedArrayTypes, value: Value): PlainEvaluator<void>;

/** https://tc39.es/proposal-shadowrealm/#sec-shadowrealmimportvalue */
export declare function ShadowRealmImportValue(specifierString: string, exportNameString: string, callerRealm: Realm, evalRealm: Realm): Value;

export declare interface ShadowRealmObject extends OrdinaryObject {
    readonly ShadowRealm: Realm;
}

export declare type ShowCalendarNameOption = 'auto' | 'always' | 'never' | 'critical';

export declare type ShowTimeZoneNameOption = 'auto' | 'never' | 'critical';

export declare function skipDebugger<T>(iterator: Evaluator<T>, maxSteps?: number): T;

/** https://tc39.es/ecma262/#sec-snaptointeger */
export declare function SnapToInteger(arg: Value, nonIntHandling: 'reject' | 'strict' | 'truncate', minimum?: Integer, maximum?: Integer): PlainEvaluator<Integer>;

export declare function sourceTextMatchedBy(node: ParseNode): string;

/** https://tc39.es/ecma262/#sec-source-text-module-records */
export declare class SourceTextModuleRecord extends CyclicModuleRecord {
    ImportMeta: ObjectValue | undefined;
    readonly ECMAScriptCode: ParseNode.Module;
    readonly Context: ExecutionContext | undefined;
    readonly ImportEntries: readonly ImportEntry[];
    readonly LocalExportEntries: readonly ExportEntry[];
    readonly IndirectExportEntries: readonly ExportEntry[];
    readonly StarExportEntries: readonly ExportEntry[];
    /** https://tc39.es/proposal-deferred-reexports/ — deferred re-export entries (`export defer ... from`). */
    readonly OptionalIndirectExportEntries: readonly ExportEntry[];
    constructor(init: SourceTextModuleRecordInit);
    /** https://tc39.es/ecma262/#sec-getexportednames */
    GetExportedNames(exportStarSet: AbstractModuleRecord[]): string[];
    /** https://tc39.es/ecma262/#sec-resolveexport */
    ResolveExport(exportName: string, resolveSet?: ResolveSetItem[], deferNamespaceExportSet?: AbstractModuleRecord[]): "ambiguous" | ResolvedBindingRecord | null;
    /** https://tc39.es/proposal-deferred-reexports/#sec-GetOptionalIndirectExportsModuleRequests */
    GetOptionalIndirectExportsModuleRequests(importedNames?: ImportedNamesValue): readonly ModuleRequestRecord[];
    /** https://tc39.es/ecma262/#sec-source-text-module-record-initialize-environment */
    InitializeEnvironment(): NormalCompletion<undefined> | ThrowCompletion;
    /** https://tc39.es/ecma262/#sec-source-text-module-record-execute-module */
    ExecuteModule(capability?: PromiseCapabilityRecord): ValueEvaluator;
    mark(m: GCMarker): void;
}

export declare type SourceTextModuleRecordInit = CyclicModuleRecordInit & Pick<SourceTextModuleRecord, 'ImportMeta' | 'ECMAScriptCode' | 'Context' | 'ImportEntries' | 'LocalExportEntries' | 'IndirectExportEntries' | 'StarExportEntries'> & Partial<Pick<SourceTextModuleRecord, 'OptionalIndirectExportEntries'>>;

/** https://tc39.es/ecma262/#sec-speciesconstructor */
export declare function SpeciesConstructor(O: ObjectValue, defaultConstructor: FunctionObject): ValueEvaluator<FunctionObject>;

export declare type StatementEvaluator = Evaluator<PlainCompletion<void | Value> | AbruptCompletion>;

export declare abstract class StatementParser extends ExpressionParser {
    private canParseAwaitUsingDeclaration;
    eatSemicolonWithASI(): boolean;
    semicolon(): void;
    /**
     * @param endToken endToken
     * @param directives directives, this array will be mutated.
     */
    parseStatementList(endToken: string | Token, directives?: string[]): ParseNode.StatementList;
    parseStatementListItem(): ParseNode.StatementListItem;
    parseHoistableDeclaration(): ParseNode.HoistableDeclaration;
    parseClassDeclaration(decoratorsAttachedToClassDeclaration: null | readonly ParseNode.Decorator[]): ParseNode.ClassDeclaration;
    parseLexicalDeclaration(): ParseNode.LexicalDeclarationLike;
    parseUsingDeclaration(): ParseNode.UsingDeclaration;
    parseAwaitUsingDeclaration(): ParseNode.AwaitUsingDeclaration;
    parseBindingList(allowPattern?: boolean): ParseNode.BindingList;
    parseBindingElement(): ParseNode.BindingElementLike;
    parseBindingPattern(): ParseNode.BindingPattern;
    parseObjectBindingPattern(): ParseNode.ObjectBindingPattern;
    parseBindingProperty(): ParseNode.BindingPropertyLike;
    parseBindingRestProperty(): ParseNode.BindingRestProperty;
    parseArrayBindingPattern(): ParseNode.ArrayBindingPattern;
    parseBindingRestElement(): ParseNode.BindingRestElement;
    parseInitializerOpt(): ParseNode.Initializer | null;
    parseFunctionDeclaration(kind: FunctionKind): ParseNode.FunctionDeclarationLike;
    parseStatement(): ParseNode.Statement;
    parseBlockStatement(): ParseNode.BlockStatement;
    parseBlock(lexical?: boolean): ParseNode.Block;
    parseVariableStatement(): ParseNode.VariableStatement;
    parseVariableDeclarationList(firstDeclarationRequiresInit?: boolean): ParseNode.VariableDeclarationList;
    parseVariableDeclaration(firstDeclarationRequiresInit: boolean): ParseNode.VariableDeclaration;
    parseIfStatement(): ParseNode.IfStatement;
    parseWhileStatement(): ParseNode.WhileStatement;
    parseDoWhileStatement(): ParseNode.DoWhileStatement;
    protected finishForDeclaration(node: ParseNode.Unfinished<ParseNode.LexicalDeclarationLike | ParseNode.ForDeclaration>, binding: ParseNode.LexicalBinding, production: ParseNode.ForDeclaration['production']): ParseNode.ForDeclaration;
    private parseForStatementTail;
    private parseForInStatementTail;
    private parseForOfStatementTail;
    parseForStatement(): ParseNode.ForStatement | ParseNode.ForInOfStatement;
    parseForBinding(): ParseNode.ForBinding;
    parseSwitchStatement(): ParseNode.SwitchStatement;
    parseCaseBlock(): ParseNode.CaseBlock;
    parseBreakContinueStatement(): ParseNode.BreakStatement | ParseNode.ContinueStatement;
    verifyBreakContinue(node: ParseNode.Unfinished<ParseNode.BreakStatement | ParseNode.ContinueStatement>, isBreak: boolean): void;
    parseReturnStatement(): ParseNode.ReturnStatement;
    parseWithStatement(): ParseNode.WithStatement;
    parseThrowStatement(): ParseNode.ThrowStatement;
    parseTryStatement(): ParseNode.TryStatement;
    parseDebuggerStatement(): ParseNode.DebuggerStatement;
    parseExpressionStatement(): ParseNode.ExpressionStatement | ParseNode.LabelledStatement;
}

/** https://tc39.es/ecma262/#sec-stringcreate */
export declare function StringCreate(value: string, prototype: ObjectValue): Mutable<StringObject>;

/** https://tc39.es/ecma262/#sec-stringgetownproperty */
export declare function StringGetOwnProperty(string: StringObject, propertyKey: string | PropertyKeyValue): FullyPopulatedDataDescriptor | undefined;

export declare function StringIndexOf(string: string, searchValue: string, fromIndex: number): NumberValue;

export declare interface StringObject extends ExoticObject {
    readonly StringData: string;
    Prototype: ObjectValue | NullValue;
    Extensible: boolean;
}

/** https://tc39.es/ecma262/#sec-stringpad */
export declare function StringPad(_string: string | Value, maxLength: Value, fillString: Value, placement: 'start' | 'end'): PlainEvaluator<string>;

/** https://tc39.es/ecma262/#sec-stringtobigint */
export declare function StringToBigInt(argument: JSStringValue): BigIntValue | undefined;

/** https://tc39.es/ecma262/#sec-stringtocodepoints */
export declare function StringToCodePoints(string: string): CodePoint[];

/** https://tc39.es/ecma262/#sec-stringtonumber */
export declare function StringToNumber(str: string): number;

export declare function StringValue(node: ParseNode): string;

/** https://tc39.es/ecma262/#surrounding-agent */
export declare let surroundingAgent: Agent;

/** https://tc39.es/ecma262/#sec-symboldescriptivestring */
export declare function SymbolDescriptiveString(sym: SymbolValue): string;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type */
export declare class SymbolValue extends PrimitiveValue {
    readonly type: 'Symbol';
    readonly Description: string | undefined;
    constructor(Description: string | undefined);
    static [Symbol.hasInstance]: (value: unknown) => value is SymbolValue;
}

/** https://tc39.es/ecma262/#sec-synthetic-module-records */
export declare class SyntheticModuleRecord extends AbstractModuleRecord {
    LoadRequestedModules(): PromiseObject;
    readonly ExportNames: readonly string[];
    readonly EvaluationSteps: (module: SyntheticModuleRecord) => PlainEvaluator | Completion<unknown> | void;
    constructor(init: SyntheticModuleRecordInit);
    /** https://tc39.es/ecma262/#sec-synthetic-module-record-getexportednames */
    GetExportedNames(): readonly string[];
    /** https://tc39.es/ecma262/#sec-synthetic-module-record-resolveexport */
    ResolveExport(exportName: string): ResolvedBindingRecord | null;
    /** https://tc39.es/ecma262/#sec-synthetic-module-record-link */
    Link(): undefined;
    /** https://tc39.es/ecma262/#sec-synthetic-module-record-evaluate */
    Evaluate(): Evaluator<PromiseObject>;
    SetSyntheticExport(name: string, value: Value): PlainEvaluator;
}

export declare type SyntheticModuleRecordInit = AbstractModuleInit & Pick<SyntheticModuleRecord, 'ExportNames' | 'EvaluationSteps'>;

/** https://tc39.es/proposal-temporal/#sec-temporal-systemdatetime */
export declare function SystemDateTime(temporalTimeZoneLike: Value): PlainCompletion<ISODateTimeRecord>;

/** https://tc39.es/proposal-temporal/#sec-systemtimezoneidentifier */
export declare function SystemTimeZoneIdentifier(): TimeZoneIdentifier;

/** https://tc39.es/ecma262/#sec-systemutcepochmilliseconds */
export declare function SystemUTCEpochMilliseconds(): IntegralNumber;

/** https://tc39.es/proposal-temporal/#sec-temporal-systemutcepochnanoseconds */
export declare function SystemUTCEpochNanoseconds(): EpochNanoseconds;

/** https://tc39.es/ecma262/#table-nonbinary-unicode-properties */
export declare const Table69_NonbinaryUnicodeProperties: {
    readonly General_Category: 'General_Category';
    readonly gc: 'General_Category';
    readonly Script: 'Script';
    readonly sc: 'Script';
    readonly Script_Extensions: 'Script_Extensions';
    readonly scx: 'Script_Extensions';
};

export declare type Table69_NonbinaryUnicodePropertiesCanonicalized = (typeof Table69_NonbinaryUnicodeProperties)[keyof typeof Table69_NonbinaryUnicodeProperties];

/** https://tc39.es/ecma262/#table-binary-unicode-properties */
export declare const Table70_BinaryUnicodeProperties: {
    readonly ASCII: 'ASCII';
    readonly ASCII_Hex_Digit: 'ASCII_Hex_Digit';
    readonly AHex: 'ASCII_Hex_Digit';
    readonly Alphabetic: 'Alphabetic';
    readonly Alpha: 'Alphabetic';
    readonly Any: 'Any';
    readonly Assigned: 'Assigned';
    readonly Bidi_Control: 'Bidi_Control';
    readonly Bidi_C: 'Bidi_Control';
    readonly Bidi_Mirrored: 'Bidi_Mirrored';
    readonly Bidi_M: 'Bidi_Mirrored';
    readonly Case_Ignorable: 'Case_Ignorable';
    readonly CI: 'Case_Ignorable';
    readonly Cased: 'Cased';
    readonly Changes_When_Casefolded: 'Changes_When_Casefolded';
    readonly CWCF: 'Changes_When_Casefolded';
    readonly Changes_When_Casemapped: 'Changes_When_Casemapped';
    readonly CWCM: 'Changes_When_Casemapped';
    readonly Changes_When_Lowercased: 'Changes_When_Lowercased';
    readonly CWL: 'Changes_When_Lowercased';
    readonly Changes_When_NFKC_Casefolded: 'Changes_When_NFKC_Casefolded';
    readonly CWKCF: 'Changes_When_NFKC_Casefolded';
    readonly Changes_When_Titlecased: 'Changes_When_Titlecased';
    readonly CWT: 'Changes_When_Titlecased';
    readonly Changes_When_Uppercased: 'Changes_When_Uppercased';
    readonly CWU: 'Changes_When_Uppercased';
    readonly Dash: 'Dash';
    readonly Default_Ignorable_Code_Point: 'Default_Ignorable_Code_Point';
    readonly DI: 'Default_Ignorable_Code_Point';
    readonly Deprecated: 'Deprecated';
    readonly Dep: 'Deprecated';
    readonly Diacritic: 'Diacritic';
    readonly Dia: 'Diacritic';
    readonly Emoji: 'Emoji';
    readonly Emoji_Component: 'Emoji_Component';
    readonly EComp: 'Emoji_Component';
    readonly Emoji_Modifier: 'Emoji_Modifier';
    readonly EMod: 'Emoji_Modifier';
    readonly Emoji_Modifier_Base: 'Emoji_Modifier_Base';
    readonly EBase: 'Emoji_Modifier_Base';
    readonly Emoji_Presentation: 'Emoji_Presentation';
    readonly EPres: 'Emoji_Presentation';
    readonly Extended_Pictographic: 'Extended_Pictographic';
    readonly ExtPict: 'Extended_Pictographic';
    readonly Extender: 'Extender';
    readonly Ext: 'Extender';
    readonly Grapheme_Base: 'Grapheme_Base';
    readonly Gr_Base: 'Grapheme_Base';
    readonly Grapheme_Extend: 'Grapheme_Extend';
    readonly Gr_Ext: 'Grapheme_Extend';
    readonly Hex_Digit: 'Hex_Digit';
    readonly Hex: 'Hex_Digit';
    readonly IDS_Binary_Operator: 'IDS_Binary_Operator';
    readonly IDSB: 'IDS_Binary_Operator';
    readonly IDS_Trinary_Operator: 'IDS_Trinary_Operator';
    readonly IDST: 'IDS_Trinary_Operator';
    readonly ID_Continue: 'ID_Continue';
    readonly IDC: 'ID_Continue';
    readonly ID_Start: 'ID_Start';
    readonly IDS: 'ID_Start';
    readonly Ideographic: 'Ideographic';
    readonly Ideo: 'Ideographic';
    readonly Join_Control: 'Join_Control';
    readonly Join_C: 'Join_Control';
    readonly Logical_Order_Exception: 'Logical_Order_Exception';
    readonly LOE: 'Logical_Order_Exception';
    readonly Lowercase: 'Lowercase';
    readonly Lower: 'Lowercase';
    readonly Math: 'Math';
    readonly Noncharacter_Code_Point: 'Noncharacter_Code_Point';
    readonly NChar: 'Noncharacter_Code_Point';
    readonly Pattern_Syntax: 'Pattern_Syntax';
    readonly Pat_Syn: 'Pattern_Syntax';
    readonly Pattern_White_Space: 'Pattern_White_Space';
    readonly Pat_WS: 'Pattern_White_Space';
    readonly Quotation_Mark: 'Quotation_Mark';
    readonly QMark: 'Quotation_Mark';
    readonly Radical: 'Radical';
    readonly Regional_Indicator: 'Regional_Indicator';
    readonly RI: 'Regional_Indicator';
    readonly Sentence_Terminal: 'Sentence_Terminal';
    readonly STerm: 'Sentence_Terminal';
    readonly Soft_Dotted: 'Soft_Dotted';
    readonly SD: 'Soft_Dotted';
    readonly Terminal_Punctuation: 'Terminal_Punctuation';
    readonly Term: 'Terminal_Punctuation';
    readonly Unified_Ideograph: 'Unified_Ideograph';
    readonly UIdeo: 'Unified_Ideograph';
    readonly Uppercase: 'Uppercase';
    readonly Upper: 'Uppercase';
    readonly Variation_Selector: 'Variation_Selector';
    readonly VS: 'Variation_Selector';
    readonly White_Space: 'White_Space';
    readonly space: 'White_Space';
    readonly XID_Continue: 'XID_Continue';
    readonly XIDC: 'XID_Continue';
    readonly XID_Start: 'XID_Start';
    readonly XIDS: 'XID_Start';
};

/** https://tc39.es/ecma262/#table-binary-unicode-properties-of-strings */
export declare const Table71_BinaryPropertyOfStrings: {
    readonly Basic_Emoji: 'Basic_Emoji';
    readonly Emoji_Keycap_Sequence: 'Emoji_Keycap_Sequence';
    readonly RGI_Emoji_Modifier_Sequence: 'RGI_Emoji_Modifier_Sequence';
    readonly RGI_Emoji_Flag_Sequence: 'RGI_Emoji_Flag_Sequence';
    readonly RGI_Emoji_Tag_Sequence: 'RGI_Emoji_Tag_Sequence';
    readonly RGI_Emoji_ZWJ_Sequence: 'RGI_Emoji_ZWJ_Sequence';
    readonly RGI_Emoji: 'RGI_Emoji';
};

export declare function TemplateStrings(node: ParseNode.TemplateLiteral, escapes: 'raw' | 'cooked'): (JSStringValue | UndefinedValue)[];

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldatetostring */
export declare function TemporalDateToString(temporalDate: TemporalPlainDateObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationfrominternal */
export declare function TemporalDurationFromInternal(internalDuration: InternalDurationRecord, largestUnit: TemporalUnit): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-duration-instances */
export declare interface TemporalDurationObject extends OrdinaryObject {
    readonly InitializedTemporalDuration: never;
    readonly Years: bigint;
    readonly Months: bigint;
    readonly Weeks: bigint;
    readonly Days: bigint;
    readonly Hours: bigint;
    readonly Minutes: bigint;
    readonly Seconds: bigint;
    readonly Milliseconds: bigint;
    readonly Microseconds: bigint;
    readonly Nanoseconds: bigint;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationtostring */
export declare function TemporalDurationToString(duration: TemporalDurationObject, precision: Integer | 'auto'): string;

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-instances */
export declare interface TemporalInstantObject extends OrdinaryObject {
    readonly InitializedTemporalInstant: never;
    readonly EpochNanoseconds: bigint;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalinstant-tostring */
export declare function TemporalInstantToString(instant: TemporalInstantObject, timeZone: TimeZoneIdentifier | undefined, precision: Integer | 'minute' | 'auto'): string;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalmonthdaytostring */
export declare function TemporalMonthDayToString(monthDay: TemporalPlainMonthDayObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

export declare type TemporalOffsetOption = 'prefer' | 'use' | 'ignore' | 'reject';

export declare interface TemporalPlainDateObject extends OrdinaryObject {
    /** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-instances */
    readonly InitializedTemporalDate: never;
    readonly ISODate: ISODateRecord;
    readonly Calendar: KnownCalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindatetime-instances */
export declare interface TemporalPlainDateTimeObject extends OrdinaryObject {
    readonly InitializedTemporalDateTime: never;
    readonly ISODateTime: ISODateTimeRecord;
    readonly Calendar: KnownCalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-instances */
export declare interface TemporalPlainMonthDayObject extends OrdinaryObject {
    readonly InitializedTemporalMonthDay: never;
    readonly ISODate: ISODateRecord;
    readonly Calendar: KnownCalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-instances */
export declare interface TemporalPlainTimeObject extends OrdinaryObject {
    readonly InitializedTemporalTime: never;
    readonly Time: TimeRecord;
}

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainyearmonth-instances */
export declare interface TemporalPlainYearMonthObject extends OrdinaryObject {
    readonly InitializedTemporalYearMonth: never;
    readonly ISODate: ISODateRecord;
    readonly Calendar: KnownCalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-units */
export declare type TemporalUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond';

/** https://tc39.es/proposal-temporal/#sec-temporalunitlength */
export declare function TemporalUnitLength(unit: TimeUnit | 'day'): Integer;

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalyearmonthtostring */
export declare function TemporalYearMonthToString(yearMonth: TemporalPlainYearMonthObject, showCalendar: 'auto' | 'always' | 'never' | 'critical'): string;

/** https://tc39.es/proposal-temporal/#sec-properties-of-temporal-zoneddatetime-instances */
export declare interface TemporalZonedDateTimeObject extends OrdinaryObject {
    readonly InitializedTemporalZonedDateTime: never;
    readonly EpochNanoseconds: bigint;
    readonly TimeZone: TimeZoneIdentifier;
    readonly Calendar: KnownCalendarType;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-temporalzoneddatetimetostring */
export declare function TemporalZonedDateTimeToString(zonedDateTime: TemporalZonedDateTimeObject, precision: Integer | 'minute' | 'auto', showCalendar: 'auto' | 'always' | 'never' | 'critical', showTimeZone: 'auto' | 'never' | 'critical', showOffset: 'auto' | 'never', increment?: Integer, unit?: Exclude<TimeUnit, 'hour'>, roundingMode?: RoundingMode): string;

/** https://tc39.es/ecma262/#sec-testintegritylevel */
export declare function TestIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): PlainEvaluator<boolean>;

/** https://tc39.es/ecma262/#sec-thisbigintvalue */
export declare function ThisBigIntValue(value: Value): BigIntValue | ThrowCompletion;

export declare function ThisBooleanValue(value: Value): BooleanValue<boolean> | ThrowCompletion;

export declare function ThisNumberValue(value: Value): NumberValue | ThrowCompletion;

/** https://tc39.es/ecma262/#sec-thisstringvalue */
export declare function ThisStringValue(value: Value): JSStringValue | ThrowCompletion;

/** https://tc39.es/ecma262/#sec-thissymbolvalue */
export declare function ThisSymbolValue(value: Value): SymbolValue | ThrowCompletion;

/** https://tc39.es/ecma262/#sec-throw-an-exception */
export declare function Throw(_: never): never;

export declare namespace Throw {
    var EvalError: Throw;
}

export declare namespace Throw {
    var RangeError: Throw;
}

export declare namespace Throw {
    var ReferenceError: Throw;
}

export declare namespace Throw {
    var SyntaxError: Throw;
}

export declare namespace Throw {
    var TypeError: Throw;
}

export declare namespace Throw {
    var URIError: Throw;
}

export declare namespace Throw {
    var Error: Throw;
}

export declare namespace Throw {
    var AggregateError: Throw;
}

export declare interface Throw {
    (m: '"arguments" cannot be used as an identifier in class static block' | '"day" is required' | '"month-code" or "month" is required' | '"year" is required' | "'getPrototypeOf' on proxy: proxy target is non-extensible but the trap did not return its actual prototype" | "'getPrototypeOf' on proxy: trap returned neither object nor null" | "'ownKeys' on proxy: trap result returned extra keys but proxy target is non-extensible" | "'ownKeys' on proxy: trap returned duplicate entries" | "'preventExtensions' on proxy: trap returned truthy but the proxy target is extensible" | "'setPrototypeOf' on proxy: trap returned truthy for setting a new prototype on the non-extensible proxy target" | 'A class cannot have static and instance private methods with the same name' | 'A class element cannot be named as "constructor"' | 'A class element cannot be named as "prototype" or "constructor"' | 'A class static field cannot be named as "constructor"' | 'AbstractModuleSource cannot be constructed' | 'Array length must be uint32.' | 'Array length too big.' | 'ArrayBuffer cannot be invoked without new' | 'AsyncDisposableStack cannot be invoked without new' | 'Attempt to access detached ArrayBuffer' | 'Attempt to access shared ArrayBuffer' | 'BigInt has no unsigned right shift, use >> instead' | 'BigInt is not a constructor' | 'BigInt literal cannot have leading zero' | 'Calendar annotation is not allowed when day is absent' | 'Calendar annotation is not allowed when year is absent' | 'Calendars are not equal' | 'Cannot JSON stringify a circular structure' | 'Cannot add a date to an instant' | 'Cannot allocate memory' | 'Cannot call addInitializer after decoration is finished' | 'Cannot convert object to primitive value' | 'Cannot define private element to a non-extensible object' | 'Cannot delete a super property' | 'Cannot delete an identifier in strict mode' | 'Cannot delete private names' | 'Cannot divide by zero' | 'Cannot make length of array-like object surpass the bounds of an integer index' | 'Cannot mix BigInt and other types, use explicit conversions' | 'Cannot mix logical operator with ?? operator. Add parentheses to determine precedence.' | 'Cannot reduce an empty array with no initial value' | 'Cannot resize ArrayBuffer to bigger than maxByteLength' | 'Cannot serialize a BigInt to JSON' | 'Cannot transfer ArrayBuffer with custom detach key' | 'Class missing binding identifier' | 'Could not set prototype of object' | 'Critical calendar annotation failed.' | 'DataView cannot be invoked without new' | 'Date value is not an integral number' | 'DateTime outside of range' | 'Decorators can only be used to decorate classes' | 'Decorators cannot appear on both sides of the export keyword' | 'Default export already declared' | 'Derived TypedArray constructor created an array which was too small' | 'Duplicate __proto__ property' | 'Duplicate constructor' | 'Exponent of bigint must be positive' | 'Filtered namespace exports cannot contain aliased export specifiers' | 'Filtered namespace exports must be followed by `from`' | 'Filtered namespace imports cannot contain aliased or string import specifiers' | 'Filtered namespace imports cannot contain duplicate names' | 'FinalizationRegistry cannot be invoked without new' | 'For-await syntax is only valid with for-of loops' | 'For-in/of loop declarations cannot bind "let"' | 'Host does not set a module loader' | 'ISODate is out of range' | 'Identifier has already been declared' | 'Illegal octal escape' | 'Import name cannot be "eval" or "arguments"' | 'Import name cannot be a keyword' | 'Import name cannot be a string' | 'Initializers are not allowed in for-in/of loop declarations' | 'Invalid ForDeclaration binding initialization' | 'Invalid Unicode escape' | 'Invalid alphabet' | 'Invalid assignment in rest element' | 'Invalid assignment target' | 'Invalid base64 string' | 'Invalid call to ArrayBuffer.prototype.detached on shared ArrayBuffer' | 'Invalid call to ArrayBuffer.prototype.maxByteLength on shared ArrayBuffer' | 'Invalid call to ArrayBuffer.prototype.resizable on shared ArrayBuffer' | 'Invalid call to ArrayBuffer.prototype.resize on detached ArrayBuffer' | 'Invalid call to ArrayBuffer.prototype.resize on shared ArrayBuffer' | 'Invalid class range' | 'Invalid code point' | 'Invalid date' | 'Invalid decimal digits' | 'Invalid duration' | 'Invalid empty identifier' | 'Invalid hex digit' | 'Invalid hex string' | 'Invalid identifier escape' | 'Invalid identity escape' | 'Invalid lastChunkHandling' | 'Invalid leap month' | 'Invalid left-hand side in for-in/of statement' | 'Invalid length' | 'Invalid month' | 'Invalid normalization form' | 'Invalid receiver' | 'Invalid surrogate pair' | 'Invalid template escape' | 'Invalid time' | 'Invalid trailing surrogate' | 'Invalid unicode escape' | 'Invalid unicode property' | 'Invalid unicode property name' | 'Invalid unicode property name or value' | 'Invalid unicode property value' | 'Invalid use of arguments' | 'Invalid use of super' | 'Iterator cannot be invoked without new' | 'Iterator is an abstract class' | 'Iterator length is bigger than MAX_SAFE_INTEGER' | 'Iterator.zip mode must be one of "shortest", "longest", or "strict"' | 'Iterator.zip strict mode requires all iterators to end together' | 'Iterator.zipKeyed mode must be one of "shortest", "longest", or "strict"' | 'Legacy octal literal in strict mode' | 'Let in lexical binding' | 'Map cannot be invoked without new' | 'Mismatching month and month code' | 'Missing catch or finally clause in try statement' | 'Missing initializer in await using declaration' | 'Missing initializer in const declaration' | 'Missing initializer in using declaration' | 'Module export name contains invalid Unicode' | 'Module source is not available' | 'Multiple possible epoch nanoseconds' | 'Newline after throw statement' | "Newly created TypedArray did not match exemplar's content type" | 'No matching offset found for the given date and time' | 'No possible epoch nanoseconds' | 'No promises passed to Promise.any were fulfilled' | 'Non-simple parameter cannot be used with "use strict" directive' | 'Not a Uint8Array' | 'Not a hex digit' | 'Numbers out of order in quantifier' | 'Object is disposed' | 'Object prototype must be an Object or null' | 'Object prototype must be an object or null' | 'Offset is out of bound' | 'Offset is outside the bounds of the DataView' | 'Options parameter is required' | 'PlainDateTime outside of range' | 'PlainMonthDay out of range' | 'PlainYearMonth calendars do not match' | 'PlainYearMonth out of range' | 'PlusModifiers and MinusModifiers cannot be both empty.' | 'Promise cannot be invoked without new' | 'Promise reject function already set' | 'Promise resolve function already set' | 'Proxy cannot be invoked without new' | 'RegExp flags "v" and "u" cannot be used together' | 'Repeated modifiers in modifier group' | 'Rest element must be last element' | 'Rest property must be last property' | 'Resulting ISODate is out of range' | 'Resulting date-time is out of range' | 'Separator is not allowed after leading zero' | 'Set cannot be invoked without new' | 'ShadowRealm cannot be invoked without new' | 'Spread element must be last element' | 'String is too long' | 'Sum of start offset and byte length should be less than the size of underlying buffer' | "Super class's prototype must be an object or null" | 'Symbol is not a constructor' | 'Template in optional chain' | 'Temporal.Duration cannot be converted to primitive value. If you are comparing two Temporal.Duration objects with > or <, use Temporal.Duration.compare() instead.' | 'Temporal.Duration constructor cannot be called without new' | 'Temporal.Instant cannot be called without new' | 'Temporal.Instant cannot be converted to primitive value If you are comparing two Temporal.Duration objects with > or <, use Temporal.Instant.compare() instead.' | 'Temporal.PlainDate cannot be converted to primitive value. If you are comparing two Temporal.PlainDate objects with > or <, use Temporal.PlainDate.compare() instead.' | 'Temporal.PlainDate constructor cannot be called without new' | 'Temporal.PlainDateTime cannot be called without new' | 'Temporal.PlainDateTime cannot be converted to primitive value. If you are comparing two Temporal.PlainDateTime objects with > or <, use Temporal.PlainDateTime.compare() instead.' | 'Temporal.PlainMonthDay cannot be called without new' | 'Temporal.PlainMonthDay cannot be converted to primitive value. If you are comparing two Temporal.PlainMonthDay objects with > or <, use Temporal.PlainMonthDay.compare() instead.' | 'Temporal.PlainTime cannot be called without new' | 'Temporal.PlainTime cannot be converted to primitive value. If you are comparing two Temporal.PlainTime objects with > or <, use Temporal.PlainTime.compare() instead.' | 'Temporal.PlainYearMonth cannot be called without new' | 'Temporal.PlainYearMonth cannot be converted to primitive value. If you are comparing two Temporal.PlainYearMonth objects with > or <, use Temporal.PlainYearMonth.compare() instead.' | 'Temporal.ZonedDateTime cannot be called without new' | 'Temporal.ZonedDateTime cannot be converted to primitive value. If you are comparing two Temporal.ZonedDateTime objects with > or <, use Temporal.ZonedDateTime.compare() instead.' | 'The caller, callee, and arguments properties may not be accessed on functions or the arguments objects for calls to them' | 'The iterator is already complete.' | 'This class cannot be inverted' | 'Time zones are not equal' | 'Too many capturing groups' | 'TypedArray index out of bounds' | 'URI malformed' | 'Unexpected - in modifiers' | 'Unexpected end of CharacterClass' | 'Unexpected end of input' | 'Unexpected escape' | 'Unexpected token' | 'Unexpected token in JSON' | 'Unterminated comment' | 'Unterminated range' | 'Unterminated regular expression' | 'Unterminated string literal' | 'Unterminated template literal' | 'Using declarations are not allowed at the top level of a Script' | 'Using declarations are not allowed directly in switch clauses' | 'Using declarations are only allowed in for-of loop heads' | 'WeakMap cannot be invoked without new' | 'WeakRef cannot be invoked without new' | 'WeakSet cannot be invoked without new' | 'argument[0] must be a string' | 'argument[0] must be an ArrayBuffer' | 'arguments cannot be referenced in a class field initializer' | 'await cannot be used as an identifier inside async functions' | 'await cannot be used as an identifier inside async functions or modules' | 'await cannot be used as an identifier inside parameters of async functions' | 'await cannot be used in class static block' | 'await cannot be used in formal parameters' | 'await cannot be used inside parameters of arrow functions' | 'calendar is not a string' | 'direction option is required' | 'directionParam is required' | 'largestUnit must be larger than smallestUnit' | 'object.constructor[Symbol.species] is not a constructor' | 'offset is not a string' | 'relativeTo is required for calendar units' | 'relativeTo option is required when comparing durations with calendar units' | 'roundTo is required' | 'roundingIncrement must be 1 when rounding a date unit to a larger unit' | 'size property must be a positive integer' | 'size property must not be undefined, as it will be NaN' | 'smallestUnit and largestUnit cannot both be omitted' | 'smallestUnit cannot be auto' | 'smallestUnit cannot be hour' | 'smallestUnit cannot be hour or minute' | 'this has already been initialized' | 'this has not been initialized' | 'time-zone is required' | 'timeZone is not a string' | 'totalOf is required' | 'u and v cannot be used together' | 'unit cannot be auto' | 'with statement cannot be used in strict mode' | 'yield cannot be used as an identifier inside generator functions' | 'yield cannot be used as an identifier inside generator functions or modules' | 'yield cannot be used in formal parameters' | 'yield cannot be used inside parameters of arrow functions'): ThrowCompletion;
    (m: '$1 can only be used with v flag' | '$1 cannot be inverted' | '$1 cannot be invoked without new' | '$1 cannot be used as a WeakMap key' | '$1 cannot be used as an identifier' | '$1 cannot be used as an identifier in strict mode' | '$1 cannot be used as an index' | '$1 cannot be used before initialization' | '$1 cannot be weakly referenced' | '$1 does not look like a TemporalTimeLike object' | '$1 is already declared' | '$1 is not a Promise constructor' | '$1 is not a RegExp object' | '$1 is not a TemporalTimeLike object' | '$1 is not a constructor' | '$1 is not a finite number' | '$1 is not a function' | '$1 is not a number' | '$1 is not a partial Temporal object' | '$1 is not a string' | '$1 is not a supported calendar' | '$1 is not a valid array length' | '$1 is not a valid epoch nanoseconds' | '$1 is not a valid modifier' | '$1 is not a valid month code' | '$1 is not a valid property name' | '$1 is not a valid undersized mode' | '$1 is not an integer' | '$1 is not an integral Number' | '$1 is not an integral Number or infinity' | '$1 is not an object' | '$1 is not an object or a symbol' | '$1 is not defined' | '$1 is not iterable' | '$1 is not object or null' | '$1 is not the [[ArrayBufferDetachKey]] of the given ArrayBuffer' | '$1 is out of range' | '$1 is too large' | '$1 is too small' | "'defineProperty' on proxy: trap returned truthy for adding property $1 that is incompatible with the existing property in the proxy target" | "'defineProperty' on proxy: trap returned truthy for adding property $1 to the non-extensible proxy target" | "'defineProperty' on proxy: trap returned truthy for defining non-configurable property $1 which cannot be non-writable, unless there exists a corresponding non-configurable, non-writable own property of the target object" | "'defineProperty' on proxy: trap returned truthy for defining non-configurable property $1 which is either non-existent or configurable in the proxy target" | "'deleteProperty' on proxy: trap returned truthy for property $1 but the proxy target is non-extensible" | "'deleteProperty' on proxy: trap returned truthy for property $1 which is non-configurable in the proxy target" | "'get' on proxy: property $1 is a non-configurable accessor property on the proxy target and does not have a getter function, but the trap did not return 'undefined'" | "'get' on proxy: property $1 is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value" | "'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property $1 which is either non-existent or configurable in the proxy target" | "'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property $1 which is writable or configurable in the proxy target" | "'getOwnPropertyDescriptor' on proxy: trap returned descriptor for property $1 that is incompatible with the existing property in the proxy target" | "'getOwnPropertyDescriptor' on proxy: trap returned neither object nor undefined for property $1" | "'getOwnPropertyDescriptor' on proxy: trap returned undefined for property $1 which exists in the non-extensible target" | "'getOwnPropertyDescriptor' on proxy: trap returned undefined for property $1 which is non-configurable in the proxy target" | "'has' on proxy: trap returned falsy for property $1 but the proxy target is not extensible" | "'has' on proxy: trap returned falsy for property $1 which exists in the proxy target as non-configurable" | "'isExtensible' on proxy: trap result does not reflect extensibility of proxy target (which is $1)" | "'ownKeys' on proxy: trap result did not include $1" | "'set' on proxy: trap returned truthy for property $1 which exists in the proxy target as a non-configurable and non-writable accessor property without a setter" | "'set' on proxy: trap returned truthy for property $1 which exists in the proxy target as a non-configurable and non-writable data property with a different value" | 'Accessor decorator must return an object or undefined, but $1 was returned' | 'Assignment to constant variable $1' | 'Cannot convert $1 to Temporal.Duration' | 'Cannot convert $1 to TemporalPartialDurationRecord' | 'Cannot convert $1 to a BigInt' | 'Cannot convert $1 to object' | 'Cannot convert a Symbol value to a $1' | 'Cannot convert a symbol value $1 to a number' | 'Cannot create a ShadowRealm wrapped function on $1' | 'Cannot define property $1' | 'Cannot delete property $1' | 'Cannot load module $1' | 'Cannot manipulate a running generator $1' | 'Cannot mix BigInt and other types in $1 operation' | "Cannot perform '$1' on a proxy that has been revoked" | 'Cannot resolve a promise $1 with itself' | 'Class decorator must return a function or undefined, but $1 was returned' | 'Count $1 is invalid' | 'Critical annotation "$1" failed.' | 'Duplicate import attribute $1' | 'Duplicate regular expression flag "$1"' | 'Duplicated capture group $1' | 'Expect a CharacterClassEscape but $1 found' | "Expected 'this' value to be a function but got $1" | 'Expected a character but got $1' | 'Export identifier $1 already declared' | 'Field decorator must return a function or undefined, but $1 was returned' | 'First argument to $1 must not be a regular expression' | 'Function $1 already declared' | 'Identifier $1 already declared' | 'Import attribute value must be a string, but $1' | 'Index $1 is too big' | 'Invalid TemporalUnit value $1' | 'Invalid code point $1' | 'Invalid format range for $1' | 'Invalid hint: $1' | 'Invalid temporal unit value $1' | 'Invalid time string $1' | 'Invalid time zone identifier: $1' | 'Label $1 not found' | 'Method decorator must return a function or undefined, but $1 was returned' | 'Module "$1" is not ready for synchronous execution' | 'Module undefined export $1' | 'No module loader can load this module request.$1' | 'Only primitive values and functions can be passed across the ShadowRealm boundary, but $1 is an object' | 'Private field $1 is not a getter' | 'Private field $1 is not a setter' | 'Private identifier $1 already declared' | 'Private identifier $1 not defined' | 'Private method $1 cannot be set' | 'Promise reject function $1 is not callable' | 'Promise resolve function $1 is not callable' | 'Property descriptors must not specify both accessors and a value or writable attribute, but $1 does' | 'RegExp flags must not have duplicates ($1)' | 'RegExp has invalid flags ($1)' | 'Return value $1 of a derived constructor is not an object or undefined' | 'Right-hand side of "in" ($1) is not an object' | 'Right-hand side of "instanceof" ($1) is not a function' | 'Right-hand side of "instanceof" ($1) is not an object' | 'Subclass constructor returned a smaller-than-requested object $1' | 'Subclass constructor returned the same object $1' | 'Super class $1 is not a constructor' | 'The "with" option in import() must be an object, but $1' | 'The RegExp passed to String.prototype.$1 must have the global flag' | 'The get property of the return value of an accessor decorator must be a function or undefined, but $1 was returned' | 'The init property of the return value of an accessor decorator must be a function or undefined, but $1 was returned' | 'The iterator $1 does not provide a throw method' | 'The second argument to import() must be an object, but $1' | 'The set property of the return value of an accessor decorator must be a function or undefined, but $1 was returned' | 'There is no $1 capture groups' | 'There is no capture group called $1' | 'Unable to freeze object $1' | 'Unable to prevent extensions on object $1' | 'Unable to seal object $1' | 'Unexpected $1' | 'Unexpected character $1 in JSON' | 'Unsupported import attribute "$1"' | 'Unsupported import attribute $1' | 'Variable $1 already declared' | 'addInitializer must be called with a function, but $1 was passed' | 'arguments[0] ($1) is not a symbol' | 'arguments[1] ($1) is not a function' | 'calendar must be a string, but $1' | 'calendarName option is invalid ($1), only "auto", "always", "never" and "critical" are accepted' | 'callbackfn ($1) is not a function' | 'comparator ($1) is not a function' | 'direction option is not valid ($1), only "next" and "previous" are accepted' | 'disambiguation option is invalid ($1), only "compatible", "earlier", "later" and "reject" are accepted' | 'heldValue $1 matches target' | 'invalid time zone identifier: $1' | 'mapper ($1) is not a function' | 'monthCode ($1) is not a string' | 'offset option is invalid ($1), only "auto" and "never" are accepted' | 'offset option is invalid ($1), only "prefer", "use", "ignore" and "reject" are accepted' | 'option $1 is required' | 'option.padding $1 is not an object' | 'options.padding $1 is not an object' | 'overflow option is invalid ($1), only "constrain" and "reject" are accepted' | 'stack property must be set to a string value, but got $1' | 'super ($1) is not a constructor' | 'targetOffset ($1) cannot be negative' | 'temporalCalendarLike must be a string or a Temporal object, but got $1' | 'this value $1 is not an object' | 'this.add ($1) is not a function' | 'timeZoneName option is invalid ($1), only "auto", "never" and "critical" are accepted', $1: Formattable): ThrowCompletion;
    (m: '"add" property ($1) of object $2 is not a function' | '"set" property ($1) of object $2 is not a function' | '$1 called on invalid receiver: $2' | '$1 does not exist on $2' | '$1 does not match any of productions ($2)' | '$1 is not a $2' | '$1 is not a $2 object' | 'Cannot create a proxy with a $1 as $2' | 'Cannot not delete property $1 on $2' | 'Cannot set property $1 on $2' | 'Expected $1 but got $2' | 'Expected character $1 but got $2 in JSON' | 'Export $1 from module "$2" is ambiguous' | 'Invalid range: $1 is bigger than $2' | 'Module "$1" does not have an export named $2' | 'Module $1 does not have an export named $2' | 'Object $1 does not have internal slot [[$2]]' | 'Private element $1 is already defined on $2' | 'Size of $1 should be a multiple of $2' | 'Start offset of $1 should be a multiple of $2' | 'The return value ($1) of the next() on an iterator ($2) must be an object' | 'The return value ($1) of the return() on an iterator ($2) must be an object' | 'The return value ($1) of the throw() on an iterator ($2) must be an object' | 'getter ($1) in a property descriptor $2 must be a function' | 'setter ($1) in a property descriptor $2 must be a function', $1: Formattable, $2: Formattable): ThrowCompletion;
    (m: '"roundingMode" on object $1 is not valid ($2), only $3 are accepted' | '$1 is not a function. (In "$2", it is $3)' | '$1-$2-$3 is not a valid ISO date' | '$1-$2-$3 is not a valid date' | 'Duration($1, $2, $3, $4) is not a valid duration', $1: Formattable, $2: Formattable, $3: Formattable): ThrowCompletion;
    <const S extends string>(m: S, ...args: ParsePrintFormat<S>): ThrowCompletion;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export declare type ThrowCompletion<T extends Value = Value> = ThrowCompletion_<T>;

/** https://tc39.es/ecma262/#sec-throwcompletion */
export declare const ThrowCompletion: typeof ThrowCompletion_ & {
    /** https://tc39.es/ecma262/#sec-throwcompletion */
    <T extends Value = Value>(value: T): ThrowCompletion<T>;
};

export declare class ThrowCompletion_<T extends Value = Value> extends AbruptCompletion<T> {
    readonly Type: 'throw';
    readonly Value: T;
    readonly Target: undefined;
    readonly stack: Error | undefined;
    private constructor();
}

export declare type ThrowCompletionInit = Pick<ThrowCompletion, 'Type' | 'Value' | 'Target'>;

/** https://tc39.es/ecma262/#sec-timeclip */
export declare function TimeClip(time: Num): TimeValue;

/** https://tc39.es/proposal-temporal/#sec-temporal-internal-duration-records */
export declare type TimeDuration = Integer & {
    specName?: 'TimeDuration';
};

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromcomponents */
export declare function TimeDurationFromComponents(hours: Integer, minutes: Integer, seconds: Integer, milliseconds: Integer, microseconds: Integer, nanoseconds: Integer): PlainCompletion<TimeDuration>;

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationfromepochnanosecondsdifference */
export declare function TimeDurationFromEpochNanosecondsDifference(epochNanosecondsFrom: EpochNanoseconds, epochNanosecondsTo: EpochNanoseconds): TimeDuration;

/** https://tc39.es/proposal-temporal/#sec-temporal-timedurationsign */
export declare function TimeDurationSign(timeDuration: TimeDuration): -1n | 0n | 1n;

export declare function TimeFromYear(y: Integer): TimeValue;

/** https://tc39.es/proposal-temporal/#sec-temporal-time-records */
export declare interface TimeRecord {
    readonly Days: Integer;
    readonly Hour: Integer;
    readonly Minute: Integer;
    readonly Second: Integer;
    readonly Millisecond: Integer;
    readonly Microsecond: Integer;
    readonly Nanosecond: Integer;
}

/** https://tc39.es/proposal-temporal/#sec-temporal-timerecordtostring */
export declare function TimeRecordToString(time: TimeRecord, precision: Integer | 'minute' | 'auto'): string;

/** https://tc39.es/proposal-temporal/#table-temporal-units */
export declare type TimeUnit = 'hour' | 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond';

export declare type TimeValue = FiniteTimeValue | NaN_2;

/** https://tc39.es/proposal-temporal/#sec-temporal-timevaluetoisodatetimerecord */
export declare function TimeValueToISODateTimeRecord(tv: FiniteTimeValue): ISODateTimeRecord;

export declare function TimeWithinDay(t: FiniteTimeValue): Integer;

export declare function TimeZoneEquals(xTimeZone: TimeZoneIdentifier, yTimeZone: TimeZoneIdentifier): boolean;

/** https://tc39.es/proposal-temporal/#sec-time-zone-identifiers */
export declare type TimeZoneIdentifier = string & {
    specName: 'TimeZoneIdentifier';
};

/** https://tc39.es/ecma262/#sec-time-zone-identifier-record */
export declare interface TimeZoneIdentifierRecord {
    readonly Identifier: TimeZoneIdentifier;
    readonly PrimaryIdentifier: TimeZoneIdentifier;
}

/** https://tc39.es/ecma262/#sec-toabsoluteindex */
export declare function ToAbsoluteIndex(value: Value | number, length: number): PlainEvaluator<number>;

/** https://tc39.es/ecma262/#sec-tobigint */
export declare function ToBigInt(argument: Value): ValueEvaluator<BigIntValue>;

/** https://tc39.es/ecma262/#sec-tobigint64 */
export declare function ToBigInt64(argument: Value): ValueEvaluator<BigIntValue>;

/** https://tc39.es/ecma262/#sec-tobiguint64 */
export declare function ToBigUint64(argument: Value): PlainEvaluator<bigint>;

/** https://tc39.es/ecma262/#sec-toboolean */
export declare function ToBoolean(argument: Value): boolean;

/** https://tc39.es/ecma262/#sec-toclampedindex */
export declare function ToClampedIndex(value: Value | number, length: number): PlainEvaluator<number>;

/** https://tc39.es/ecma262/#sec-tofixedsizeinteger */
export declare function ToFixedSizeInteger(int: number, signed: 'signed' | 'unsigned', bitWidth: number): number;

export declare function ToFixedSizeInteger(int: bigint, signed: 'signed' | 'unsigned', bitWidth: bigint): bigint;

/** https://tc39.es/ecma262/#sec-toindex */
export declare function ToIndex(value: Value): Generator<EvaluatorYieldType, number | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/ecma262/#sec-toint16 */
export declare function ToInt16(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-toint32 */
export declare function ToInt32(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-toint8 */
export declare function ToInt8(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-tointegerorinfinity */
export declare function ToIntegerOrInfinity(argument: Value | number): PlainEvaluator<number>;

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecord */
export declare function ToInternalDurationRecord(duration: TemporalDurationObject): InternalDurationRecord;

/** https://tc39.es/proposal-temporal/#sec-temporal-tointernaldurationrecordwith24hourdays */
export declare function ToInternalDurationRecordWith24HourDays(duration: TemporalDurationObject): InternalDurationRecord;

export declare const Token: TokenArrayToEnumLike<typeof RawTokens>;

export declare type Token = (typeof Token)[keyof typeof Token];

export declare type TokenArrayToEnumLike<A extends readonly TokenDefinition[]> = {
    readonly [I in ParserTokenIndex<keyof A> as A[I][0]]: I;
};

export declare class TokenData {
    readonly type: Token;
    readonly startIndex: number;
    readonly endIndex: number;
    readonly line: number;
    readonly column: number;
    readonly hadLineTerminatorBefore: boolean;
    readonly name: string;
    readonly value: string | number | bigint | boolean | null;
    readonly escaped: boolean;
    constructor({ type, startIndex, endIndex, line, column, hadLineTerminatorBefore, name, value, escaped }: Pick<TokenData, 'type' | 'startIndex' | 'endIndex' | 'line' | 'column' | 'hadLineTerminatorBefore' | 'name' | 'value' | 'escaped'>);
    valueAsString(): string;
    valueAsNumeric(): number | bigint;
    valueAsBoolean(): boolean;
}

export declare type TokenDefinition = readonly [name: string, value: string | null];

/** https://tc39.es/ecma262/#sec-tolength */
export declare function ToLength(arg: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-tonumber */
export declare function ToNumber(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-tonumeric */
export declare function ToNumeric(value: Value): ValueEvaluator<NumberValue | BigIntValue>;

/** https://tc39.es/ecma262/#sec-toobject */
export declare function ToObject(argument: Value): ValueCompletion<ObjectValue>;

/** https://tc39.es/proposal-temporal/#sec-temporal-tooffsetstring */
export declare function ToOffsetString(argument: Value): PlainEvaluator<string>;

/** https://tc39.es/proposal-temporal/#sec-topartialdurationrecord */
export declare function ToPartialDurationRecord(temporalDurationLike: Value): PlainEvaluator<PartialDurationRecord>;

/** https://tc39.es/proposal-temporal/#sec-topartialtimerecord */
export declare function ToPartialTimeRecord(temporalTimeLike: ObjectValue, completeness: 'partial' | 'complete'): PlainEvaluator<PartialTimeRecord>;

export declare function TopLevelLexicallyDeclaredNames(node: ParseNode | readonly ParseNode[]): string[];

export declare function TopLevelLexicallyScopedDeclarations(node: ParseNode | readonly ParseNode[]): LexicallyScopedDeclaration[];

export declare function TopLevelVarDeclaredNames(node: ParseNode | readonly ParseNode[]): string[];

export declare function TopLevelVarScopedDeclarations(node: ParseNode | readonly ParseNode[]): VarScopedDeclaration[];

/** https://tc39.es/ecma262/#sec-toprimitive */
export declare function ToPrimitive(input: Value, preferredType?: 'string' | 'number'): ValueEvaluator<PrimitiveValue>;

/** https://tc39.es/ecma262/#sec-topropertydescriptor */
export declare function ToPropertyDescriptor(Obj: Value): PlainEvaluator<Descriptor>;

/** https://tc39.es/ecma262/#sec-topropertykey */
export declare function ToPropertyKey(argument: Value): ValueEvaluator<PropertyKeyValue>;

/** https://tc39.es/proposal-temporal/#sec-tosecondsstringprecisionrecord */
export declare function ToSecondsStringPrecisionRecord(smallestUnit: Exclude<TimeUnit, 'hour'> | 'no-unit', fractionalDigitCount: 'auto' | Integer): {
    Precision: 'minute';
    Unit: 'minute';
    Increment: 1n;
} | {
    Precision: Integer;
    Unit: 'minute' | 'second' | 'millisecond' | 'microsecond' | 'nanosecond';
    Increment: bigint;
} | {
    Precision: 'auto' | Integer;
    Unit: 'nanosecond';
    Increment: 1n | 10n | 100n;
};

/** https://tc39.es/ecma262/#sec-tostring */
export declare function ToString(argument: Value): PlainEvaluator<string>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totalrelativeduration */
export declare function TotalRelativeDuration(duration: InternalDurationRecord, originEpochNanoseconds: EpochNanoseconds, destEpochNanoseconds: EpochNanoseconds, isoDateTime: ISODateTimeRecord, timeZone: TimeZoneIdentifier | NoTimeZone, calendar: KnownCalendarType, unit: TemporalUnit): PlainCompletion<MathematicalValue>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totaltimeduration */
export declare function TotalTimeDuration(timeDuration: TimeDuration, unit: TimeUnit | 'day'): MathematicalValue;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalcalendaridentifier */
export declare function ToTemporalCalendarIdentifier(temporalCalendarLike: Value): PlainCompletion<KnownCalendarType>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate */
export declare function ToTemporalDate(item: Value, options?: Value): ValueEvaluator<TemporalPlainDateObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime */
export declare function ToTemporalDateTime(item: Value, options?: Value): PlainEvaluator<TemporalPlainDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration */
export declare function ToTemporalDuration(item: Value): ValueEvaluator<TemporalDurationObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalinstant */
export declare function ToTemporalInstant(item: Value): ValueEvaluator<TemporalInstantObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalmonthday */
export declare function ToTemporalMonthDay(item: Value, options?: Value): ValueEvaluator<TemporalPlainMonthDayObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime */
export declare function ToTemporalTime(item: Value, options?: Value): ValueEvaluator<TemporalPlainTimeObject>;

export declare function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: Value | string): PlainCompletion<TimeZoneIdentifier>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalyearmonth */
export declare function ToTemporalYearMonth(item: Value, options?: Value): ValueEvaluator<TemporalPlainYearMonthObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime */
export declare function ToTemporalZonedDateTime(item: Value, options?: Value): ValueEvaluator<TemporalZonedDateTimeObject>;

/** https://tc39.es/proposal-temporal/#sec-temporal-totimerecordormidnight */
export declare function ToTimeRecordOrMidnight(item: Value): PlainEvaluator<TimeRecord>;

/** https://tc39.es/ecma262/#sec-touint16 */
export declare function ToUint16(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-touint32 */
export declare function ToUint32(argument: number | Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-touint8 */
export declare function ToUint8(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-touint8clamp */
export declare function ToUint8Clamp(argument: Value): ValueEvaluator<NumberValue>;

/** https://tc39.es/ecma262/#sec-tozeropaddeddecimalstring */
export declare function ToZeroPaddedDecimalString(n: Integer, minLength: Integer): string;

/** https://tc39.es/ecma262/#sec-trimstring */
export declare function TrimString(arg: string | Value, where: 'start' | 'end' | 'start+end'): PlainEvaluator<string>;

/** https://tc39.es/ecma262/#sec-static-semantics-tv */
export declare function TV(s: string): string | undefined;

/** https://tc39.es/ecma262/#sec-typedarraybytelength */
export declare function TypedArrayByteLength(taRecord: TypedArrayWithBufferWitnessRecord): number;

export declare type TypedArrayConstructorNames = keyof typeof typedArrayInfoByName;

/** https://tc39.es/ecma262/#sec-typedarraycreate */
export declare function TypedArrayCreate(prototype: ObjectValue): ObjectValue & Record<"ArrayLength" | "ByteLength" | "ByteOffset" | "ContentType" | "Extensible" | "Prototype" | "TypedArrayName" | "ViewedArrayBuffer", unknown>;

/** https://tc39.es/ecma262/#sec-typedarraygetelement */
export declare function TypedArrayGetElement(O: TypedArrayObject, index: NumberValue): BigIntValue | NumberValue | UndefinedValue;

export declare const typedArrayInfoByName: {
    readonly Int8Array: {
        readonly IntrinsicName: '%Int8Array%';
        readonly ElementType: 'Int8';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToInt8;
    };
    readonly Uint8Array: {
        readonly IntrinsicName: '%Uint8Array%';
        readonly ElementType: 'Uint8';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToUint8;
    };
    readonly Uint8ClampedArray: {
        readonly IntrinsicName: '%Uint8ClampedArray%';
        readonly ElementType: 'Uint8C';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToUint8Clamp;
    };
    readonly Int16Array: {
        readonly IntrinsicName: '%Int16Array%';
        readonly ElementType: 'Int16';
        readonly ElementSize: 2;
        readonly ConversionOperation: typeof ToInt16;
    };
    readonly Uint16Array: {
        readonly IntrinsicName: '%Uint16Array%';
        readonly ElementType: 'Uint16';
        readonly ElementSize: 2;
        readonly ConversionOperation: typeof ToUint16;
    };
    readonly Int32Array: {
        readonly IntrinsicName: '%Int32Array%';
        readonly ElementType: 'Int32';
        readonly ElementSize: 4;
        readonly ConversionOperation: typeof ToInt32;
    };
    readonly Uint32Array: {
        readonly IntrinsicName: '%Uint32Array%';
        readonly ElementType: 'Uint32';
        readonly ElementSize: 4;
        readonly ConversionOperation: typeof ToUint32;
    };
    readonly BigInt64Array: {
        readonly IntrinsicName: '%BigInt64Array%';
        readonly ElementType: 'BigInt64';
        readonly ElementSize: 8;
        readonly ConversionOperation: typeof ToBigInt64;
    };
    readonly BigUint64Array: {
        readonly IntrinsicName: '%BigUint64Array%';
        readonly ElementType: 'BigUint64';
        readonly ElementSize: 8;
        readonly ConversionOperation: typeof ToBigUint64;
    };
    readonly Float16Array: {
        readonly IntrinsicName: '%Float16Array%';
        readonly ElementType: 'Float16';
        readonly ElementSize: 2;
        readonly ConversionOperation: undefined;
    };
    readonly Float32Array: {
        readonly IntrinsicName: '%Float32Array%';
        readonly ElementType: 'Float32';
        readonly ElementSize: 4;
        readonly ConversionOperation: undefined;
    };
    readonly Float64Array: {
        readonly IntrinsicName: '%Float64Array%';
        readonly ElementType: 'Float64';
        readonly ElementSize: 8;
        readonly ConversionOperation: undefined;
    };
};

export declare const typedArrayInfoByType: {
    readonly Int8: {
        readonly IntrinsicName: '%Int8Array%';
        readonly ElementType: 'Int8';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToInt8;
    };
    readonly Uint8: {
        readonly IntrinsicName: '%Uint8Array%';
        readonly ElementType: 'Uint8';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToUint8;
    };
    readonly Uint8C: {
        readonly IntrinsicName: '%Uint8ClampedArray%';
        readonly ElementType: 'Uint8C';
        readonly ElementSize: 1;
        readonly ConversionOperation: typeof ToUint8Clamp;
    };
    readonly Int16: {
        readonly IntrinsicName: '%Int16Array%';
        readonly ElementType: 'Int16';
        readonly ElementSize: 2;
        readonly ConversionOperation: typeof ToInt16;
    };
    readonly Uint16: {
        readonly IntrinsicName: '%Uint16Array%';
        readonly ElementType: 'Uint16';
        readonly ElementSize: 2;
        readonly ConversionOperation: typeof ToUint16;
    };
    readonly Int32: {
        readonly IntrinsicName: '%Int32Array%';
        readonly ElementType: 'Int32';
        readonly ElementSize: 4;
        readonly ConversionOperation: typeof ToInt32;
    };
    readonly Uint32: {
        readonly IntrinsicName: '%Uint32Array%';
        readonly ElementType: 'Uint32';
        readonly ElementSize: 4;
        readonly ConversionOperation: typeof ToUint32;
    };
    readonly BigInt64: {
        readonly IntrinsicName: '%BigInt64Array%';
        readonly ElementType: 'BigInt64';
        readonly ElementSize: 8;
        readonly ConversionOperation: typeof ToBigInt64;
    };
    readonly BigUint64: {
        readonly IntrinsicName: '%BigUint64Array%';
        readonly ElementType: 'BigUint64';
        readonly ElementSize: 8;
        readonly ConversionOperation: typeof ToBigUint64;
    };
    readonly Float16: {
        readonly IntrinsicName: '%Float16Array%';
        readonly ElementType: 'Float16';
        readonly ElementSize: 2;
        readonly ConversionOperation: undefined;
    };
    readonly Float32: {
        readonly IntrinsicName: '%Float32Array%';
        readonly ElementType: 'Float32';
        readonly ElementSize: 4;
        readonly ConversionOperation: undefined;
    };
    readonly Float64: {
        readonly IntrinsicName: '%Float64Array%';
        readonly ElementType: 'Float64';
        readonly ElementSize: 8;
        readonly ConversionOperation: undefined;
    };
};

/** https://tc39.es/ecma262/#sec-typedarraylength */
export declare function TypedArrayLength(taRecord: TypedArrayWithBufferWitnessRecord): number;

export declare interface TypedArrayObject extends ExoticObject {
    readonly Prototype: ObjectValue | NullValue;
    readonly Extensible: false;
    ViewedArrayBuffer: ArrayBufferObject | undefined;
    readonly ArrayLength: number | 'auto';
    readonly ByteOffset: number;
    readonly ContentType: 'BigInt' | 'Number';
    readonly TypedArrayName: TypedArrayConstructorNames;
    readonly ByteLength: number | 'auto';
}

/** https://tc39.es/ecma262/#sec-integerindexedelementset */
export declare function TypedArraySetElement(O: TypedArrayObject, index: NumberValue, value: Value): PlainEvaluator<boolean>;

export declare type TypedArrayTypes = keyof typeof typedArrayInfoByType;

/** https://tc39.es/ecma262/#sec-typedarray-with-buffer-witness-records */
export declare interface TypedArrayWithBufferWitnessRecord {
    readonly Object: TypedArrayObject;
    readonly CachedBufferByteLength: 'detached' | number;
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type */
export declare class UndefinedValue extends PrimitiveValue {
    readonly type: 'Undefined';
    readonly value: undefined;
    private constructor();
    static [Symbol.hasInstance]: (value: unknown) => value is UndefinedValue;
}

export declare const Unicode: {
    toUppercase(ch: CodePoint): ListOfCharacter;
    toCodePoint(ch: Character): CodePoint;
    toCharacter(ch: CodePoint): UnicodeCharacter;
    isCharacter(ch: Character | ListOfCharacter): ch is Character;
    toCodeUnit(ch: Character): [CodeUnit, CodeUnit?];
    iterateByCodePoint(x: string): UnicodeCharacter[];
    characterMatchPropertyValue(ch: Character | ListOfCharacter, property: Table69_NonbinaryUnicodePropertiesCanonicalized, value: string | undefined, rer: RegExpRecord | undefined): boolean;
    getStringPropertySet(property: keyof typeof Table71_BinaryPropertyOfStrings): readonly ListOfCharacter[];
    /** https://www.unicode.org/reports/tr44/#Simple_Case_Folding */
    SimpleOrCommonCaseFoldingMapping(ch: Character): Character | undefined;
    iterateCharacterByCodePoint(string: Character | ListOfCharacter): IterableIterator<Character>;
    str_normalization(string: string, form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string;
    str_toLowercase(string: string): string;
    str_toUppercase(string: string): string;
    str_toLocaleLowercase(string: string): string;
    str_toLocaleUppercase(string: string): string;
};

/** https://tc39.es/ecma262/#sec-pattern-semantics */
export declare type UnicodeCharacter = string & {
    description: 'A code point';
    length: 1 | 2;
};

export declare interface UnmappedArgumentsObject extends OrdinaryObject {
    readonly ParameterMap: undefined;
}

/** https://tc39.es/proposal-temporal/#table-unsigned-rounding-modes */
export declare type UnsignedRoundingMode = 'infinity' | 'zero' | 'half-infinity' | 'half-zero' | 'half-even';

/** https://tc39.es/ecma262/#sec-updateempty */
export declare function UpdateEmpty<C extends Completion<unknown>, const T>(completionRecord: C, value: T): UpdateEmpty<C, T>;

/** https://tc39.es/ecma262/#sec-updateempty */
export declare type UpdateEmpty<T extends Completion<unknown>, U> = T extends NormalCompletion<infer V> ? NormalCompletion<V extends undefined ? U : V> : T extends BreakCompletion ? BreakCompletion : T extends ContinueCompletion ? ContinueCompletion : T extends AbruptCompletion ? T : T extends ReturnCompletion ? T : never;

/** https://tc39.es/ecma262/#sec-utc-t */
export declare function UTC(t: Num): TimeValue;

/** https://tc39.es/ecma262/#sec-utf16encodecodepoint */
export declare function UTF16EncodeCodePoint(cp: CodePoint): string;

/** https://tc39.es/ecma262/#sec-utf16decodesurrogatepair */
export declare function UTF16SurrogatePairToCodePoint(lead: number, trail: number): CodePoint;

/** https://tc39.es/ecma262/#sec-validateandapplypropertydescriptor */
export declare function ValidateAndApplyPropertyDescriptor(obj: ObjectValue | undefined, propertyKey: PropertyKeyValue | string, extensible: boolean, propertyDesc: Descriptor, current: undefined | FullyPopulatedDescriptor): boolean;

/** https://tc39.es/proposal-temporal/#sec-validateisodaysrange */
export declare function ValidateISODaysRange(isoDate: ISODateRecord): PlainCompletion<void>;

/** https://tc39.es/proposal-shadowrealm/#sec-validateshadowrealmobject */
export declare function ValidateShadowRealmObject(O: Value): PlainCompletion<void>;

/** https://tc39.es/proposal-temporal/#sec-validatetemporalroundingincrement */
export declare function ValidateTemporalRoundingIncrement(increment: Integer, dividend: Integer, inclusive: boolean): PlainCompletion<void>;

/** https://tc39.es/proposal-temporal/#sec-temporal-validatetemporalunitvaluedoption */
export declare function ValidateTemporalUnitValue(value: TemporalUnit | 'no-unit' | 'auto', unitGroup: 'date' | 'time' | 'datetime', extraValues?: Array<TemporalUnit | 'auto'>): PlainCompletion<void>;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export declare type Value = UndefinedValue | NullValue | BooleanValue | JSStringValue | SymbolValue | NumberValue | BigIntValue | ObjectValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export declare const Value: typeof BaseValue & {
    <T extends null | undefined | boolean | string | number | bigint>(value: T): T extends null ? NullValue : T extends undefined ? UndefinedValue : T extends boolean ? BooleanValue<T> : T extends string ? JSStringValue : T extends number ? NumberValue : T extends bigint ? BigIntValue : never;
};

/**
 * A NON-SPEC shorthand to notate "returns either a normal completion containing an ECMAScript language value or a throw completion".
 */
export declare type ValueCompletion<T extends Value = Value> = T | NormalCompletion<T> | ThrowCompletion;

export declare type ValueEvaluator<V extends Value = Value> = Evaluator<ValueCompletion<V>>;

export declare function ValueOfNormalCompletion<T>(value: NormalCompletion<T> | T): T;

export declare function VarDeclaredNames(node: ParseNode | readonly ParseNode[]): string[];

export declare type VarScopedDeclaration = ParseNode.ForBinding | ParseNode.VariableDeclaration | ParseNode.FunctionDeclaration | ParseNode.GeneratorDeclaration | ParseNode.AsyncFunctionDeclaration | ParseNode.AsyncGeneratorDeclaration | ParseNode.BindingIdentifier;

export declare function VarScopedDeclarations(node: ParseNode | readonly ParseNode[]): VarScopedDeclaration[];

export declare interface WeakMapObject extends OrdinaryObject {
    readonly WeakMapData: {
        Key: Value | undefined;
        Value: Value | undefined;
    }[];
}

/** https://tc39.es/ecma262/#sec-weakrefderef */
export declare function WeakRefDeref(weakRef: WeakRefObject): ObjectValue | SymbolValue | UndefinedValue;

export declare interface WeakRefObject extends OrdinaryObject {
    WeakRefTarget: ObjectValue | SymbolValue | undefined;
}

export declare interface WeakSetObject extends OrdinaryObject {
    readonly WeakSetData: (Value | undefined)[];
}

/** https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth */
export declare class WebLikeEventLoop extends AbstractEventLoop {
    protected jobsByType: Record<string, Set<Job>>;
    protected queuedJobs: Map<Job, string>;
    /**
     * Enqueue a host job (macrotask) now.
     */
    enqueue(type: NodeJSJobType | string, job: Job): void;
    protected shiftNextJob(): Job | undefined;
    protected get hasQueuedJobs(): boolean;
    mark(marker: GCMarker): void;
}

/** https://tc39.es/ecma262/#sec-week-day */
export declare function WeekDay(t: FiniteTimeValue): Integer;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type */
export declare const wellKnownSymbols: {
    readonly asyncDispose: SymbolValue;
    readonly asyncIterator: SymbolValue;
    readonly dispose: SymbolValue;
    readonly hasInstance: SymbolValue;
    readonly isConcatSpreadable: SymbolValue;
    readonly iterator: SymbolValue;
    readonly match: SymbolValue;
    readonly matchAll: SymbolValue;
    readonly replace: SymbolValue;
    readonly search: SymbolValue;
    readonly species: SymbolValue;
    readonly split: SymbolValue;
    readonly toPrimitive: SymbolValue;
    readonly toStringTag: SymbolValue;
    readonly unscopables: SymbolValue;
};

/** https://tc39.es/proposal-shadowrealm/#sec-wrappedfunctioncreate */
export declare function WrappedFunctionCreate(callerRealm: Realm, Target: FunctionObject): Generator<EvaluatorYieldType, Mutable<WrappedFunctionExoticObject> | ThrowCompletion, EvaluatorNextType>;

/** https://tc39.es/proposal-shadowrealm/#table-internal-slots-of-wrapped-function-exotic-objects */
export declare interface WrappedFunctionExoticObject extends BuiltinFunctionObject, ExoticObject {
    readonly WrappedTargetFunction: FunctionObject;
    readonly Realm: Realm;
}

export declare function wrappedParse<T>(init: ParserOptions, f: (parser: Parser) => T): T | ObjectValue[];

/**
 * https://tc39.es/ecma262/#sec-returnifabrupt-shorthands ! OperationName()
 */
declare function X<const T>(completion: T | Evaluator<T>): Q<T>;
export { X }
export { X as unwrapCompletion }

export declare function YearFromTime(t: FiniteTimeValue): Integer;

/** https://tc39.es/proposal-temporal/#sec-year-week-record-specification-type */
export declare interface YearWeekRecord {
    readonly Week: bigint | undefined;
    readonly Year: bigint | undefined;
}

/** https://tc39.es/ecma262/#sec-yield */
export declare function Yield(value: Value): YieldEvaluator;

export declare type YieldCompletion = Value | NormalCompletion<Value> | ThrowCompletion | ReturnCompletion;

export declare type YieldEvaluator = Evaluator<YieldCompletion>;

export declare type YieldOrAwaitEvaluator = Evaluator<YieldCompletion | void>;

export declare function Z(x: bigint): BigIntValue;

/** https://tc39.es/proposal-temporal/#sec-temporal-zerodateduration */
export declare function ZeroDateDuration(): DateDurationRecord;

export { }
