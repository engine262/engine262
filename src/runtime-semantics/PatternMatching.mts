import {
  BigIntValue,
  JSStringValue,
  NumberValue,
  ObjectValue,
  ReferenceRecord,
  Value,
  type PropertyKeyValue,
} from '../value.mts';
import {
  Completion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  ThrowCompletion,
  type PlainCompletion,
} from '../completion.mts';
import { Evaluate, type Evaluator, type PlainEvaluator, type ValueEvaluator } from '../evaluator.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { PropertyKeyMap } from '../utils/container.mts';
import {
  Call,
  CopyDataProperties,
  CreateArrayFromList,
  DeclarativeEnvironmentRecord,
  Evaluate_PropertyName,
  Get,
  GetIteratorFromMethod,
  GetThisValue,
  GetV,
  GetValue,
  HasProperty,
  InstanceofOperator,
  IsCallable,
  IsLessThan,
  IsLooselyEqual,
  IsPropertyReference,
  IsStrictlyEqual,
  IteratorClose,
  IteratorStepValue,
  OrdinaryObjectCreate,
  SameType,
  SameValue,
  SameValueNonNumber,
  SameValueZero,
  Throw,
  ToBoolean,
  ToNumber,
  ToNumeric,
  wellKnownSymbols,
  surroundingAgent,
  type IteratorRecord,
} from '#self';

interface PatternBinding {
  readonly kind: ParseNode.PatternDeclarationKind;
  readonly value: Value;
}

interface SubjectCache {
  readonly has: PropertyKeyMap<boolean>;
  readonly get: PropertyKeyMap<Value>;
  iterator?: IteratorRecord;
}

export interface MatchCache {
  readonly subjects: Map<Value, SubjectCache>;
  readonly iteratorValues: Map<IteratorRecord, Value[]>;
  readonly iteratorsToClose: Set<IteratorRecord>;
}

interface MatchContext {
  readonly cache: MatchCache;
  bindings: Map<string, PatternBinding>;
}

export function CreateMatchCache(): MatchCache {
  return {
    subjects: new Map(),
    iteratorValues: new Map(),
    iteratorsToClose: new Set(),
  };
}

function getSubjectCache(subject: Value, cache: MatchCache) {
  let subjectCache = cache.subjects.get(subject);
  if (!subjectCache) {
    subjectCache = {
      has: new PropertyKeyMap(),
      get: new PropertyKeyMap(),
    };
    cache.subjects.set(subject, subjectCache);
  }
  return subjectCache;
}

function* HasPropertyCached(subject: ObjectValue, cache: MatchCache, propertyName: PropertyKeyValue): PlainEvaluator<boolean> {
  const subjectCache = getSubjectCache(subject, cache);
  const cached = subjectCache.has.get(propertyName);
  if (cached !== undefined) return cached;
  const result = Q(yield* HasProperty(subject, propertyName)) === Value.true;
  subjectCache.has.set(propertyName, result);
  return result;
}

function* GetCached(subject: Value, cache: MatchCache, propertyName: PropertyKeyValue): ValueEvaluator {
  const subjectCache = getSubjectCache(subject, cache);
  const cached = subjectCache.get.get(propertyName);
  if (cached !== undefined) return cached;
  const result = Q(yield* GetV(subject, propertyName));
  subjectCache.get.set(propertyName, result);
  return result;
}

function* GetIteratorCached(subject: Value, cache: MatchCache): PlainEvaluator<IteratorRecord> {
  const subjectCache = getSubjectCache(subject, cache);
  if (subjectCache.iterator) return subjectCache.iterator;
  const method = Q(yield* GetCached(subject, cache, wellKnownSymbols.iterator));
  if (!IsCallable(method)) return Throw.TypeError('$1 is not iterable', subject);
  const iterator = Q(yield* GetIteratorFromMethod(subject, method));
  subjectCache.iterator = iterator;
  cache.iteratorValues.set(iterator, []);
  cache.iteratorsToClose.add(iterator);
  return iterator;
}

function* GetIteratorNthValueCached(iterator: IteratorRecord, cache: MatchCache, index: number): PlainEvaluator<Value | 'not-matched'> {
  const values = cache.iteratorValues.get(iterator)!;
  if (index < values.length) return values[index];
  if (iterator.Done === Value.true) return 'not-matched';
  while (values.length <= index) {
    const next = Q(yield* IteratorStepValue(iterator));
    if (next === 'done') return 'not-matched';
    values.push(next);
  }
  return values[index];
}

function* FinishListMatch(iterator: IteratorRecord, cache: MatchCache, expectedLength: number | 'unlimited'): PlainEvaluator<boolean> {
  if (expectedLength === 'unlimited') return true;
  const values = cache.iteratorValues.get(iterator)!;
  if (values.length > expectedLength) return false;
  const next = Q(yield* GetIteratorNthValueCached(iterator, cache, expectedLength));
  return next === 'not-matched';
}

function* evaluateWithBindings(
  expression: ParseNode.Expression | ParseNode.LeftHandSideExpression,
  bindings: ReadonlyMap<string, PatternBinding>,
): PlainEvaluator<{ value: Value; receiver: Value }> {
  const executionContext = surroundingAgent.runningExecutionContext;
  const oldEnv = executionContext.LexicalEnvironment;
  const env = yield* createBindingEnvironment(oldEnv, bindings);
  executionContext.LexicalEnvironment = env;
  try {
    const reference = Q(yield* Evaluate(expression));
    const value = Q(yield* GetValue(reference));
    const receiver = reference instanceof ReferenceRecord && IsPropertyReference(reference) === Value.true
      ? GetThisValue(reference)
      : Value.null;
    return { value, receiver };
  } finally {
    executionContext.LexicalEnvironment = oldEnv;
  }
}

function* createBindingEnvironment(outer: typeof surroundingAgent.runningExecutionContext.LexicalEnvironment, bindings: ReadonlyMap<string, PatternBinding>) {
  const env = new DeclarativeEnvironmentRecord(outer);
  for (const [name, binding] of bindings) {
    const key = Value(name);
    if (binding.kind === 'const') {
      env.CreateImmutableBinding(key, Value.true);
    } else {
      yield* env.CreateMutableBinding(key, Value.false);
    }
    yield* env.InitializeBinding(key, binding.value);
  }
  return env;
}

function* evaluateUnaryPattern(pattern: ParseNode.UnaryMatchPattern, context: MatchContext): ValueEvaluator {
  let value = Q(yield* evaluateWithBindings(pattern.Expression, context.bindings)).value;
  if (pattern.operator === '+') {
    value = Q(yield* ToNumber(value));
  } else {
    const numeric = Q(yield* ToNumeric(value));
    value = numeric instanceof NumberValue
      ? NumberValue.unaryMinus(numeric)
      : BigIntValue.unaryMinus(numeric);
  }
  return value;
}

function InvokeCustomMatcher(matcher: Value, subject: Value, context: MatchContext, kind: 'boolean', receiver: Value): PlainEvaluator<boolean>;
function InvokeCustomMatcher(matcher: Value, subject: Value, context: MatchContext, kind: 'list', receiver: Value): PlainEvaluator<false | IteratorRecord>;
function* InvokeCustomMatcher(matcher: Value, subject: Value, context: MatchContext, kind: 'boolean' | 'list', receiver: Value): PlainEvaluator<boolean | IteratorRecord> {
  if (!(matcher instanceof ObjectValue)) {
    if (kind === 'boolean') return SameValueZero(matcher, subject);
    return Throw.TypeError('$1 is not an object', matcher);
  }
  const customMatcher = Q(yield* Get(matcher, wellKnownSymbols.customMatcher));
  if (customMatcher === Value.undefined) {
    if (kind === 'boolean') return SameType(matcher, subject) && SameValueNonNumber(matcher, subject);
    return Throw.TypeError('$1 is not a function', customMatcher);
  }
  if (!IsCallable(customMatcher)) return Throw.TypeError('$1 is not a function', customMatcher);
  const result = Q(yield* Call(customMatcher, matcher, [subject, Value(kind), receiver]));
  if (result === Value.false) return false;
  if (kind === 'boolean') return ToBoolean(result) === Value.true;
  if (!(result instanceof ObjectValue)) return Throw.TypeError('$1 is not an object', result);
  return yield* GetIteratorCached(result, context.cache);
}

function* matchList(list: ParseNode.MatchList, iterator: IteratorRecord, context: MatchContext): PlainEvaluator<boolean> {
  let index = 0;
  for (const element of list) {
    if (element.rest) {
      if (!element.MatchPattern) return true;
      const remaining: Value[] = [];
      while (true) {
        const next = Q(yield* GetIteratorNthValueCached(iterator, context.cache, index));
        if (next === 'not-matched') break;
        remaining.push(next);
        index += 1;
      }
      return yield* MatchPatternMatches(element.MatchPattern, CreateArrayFromList(remaining), context);
    }
    const value = Q(yield* GetIteratorNthValueCached(iterator, context.cache, index));
    if (element.MatchPattern === null) {
      if (value === 'not-matched') return false;
      index += 1;
      continue;
    }
    if (value === 'not-matched') {
      if (element.optional) continue;
      return false;
    }
    if (!Q(yield* MatchPatternMatches(element.MatchPattern, value, context))) return false;
    index += 1;
  }
  return yield* FinishListMatch(iterator, context.cache, index);
}

function* matchProperty(
  property: ParseNode.MatchProperty,
  subject: ObjectValue,
  context: MatchContext,
  excluded: PropertyKeyValue[],
): PlainEvaluator<boolean> {
  let propertyName: PropertyKeyValue;
  if (property.BindingIdentifier) {
    propertyName = Value(property.BindingIdentifier.name);
  } else {
    propertyName = Q(yield* Evaluate_PropertyName(property.PropertyName!)) as PropertyKeyValue;
  }
  if (!Q(yield* HasPropertyCached(subject, context.cache, propertyName))) {
    return property.optional;
  }
  excluded.push(propertyName);
  if (property.MatchPattern || property.BindingIdentifier) {
    const value = Q(yield* GetCached(subject, context.cache, propertyName));
    if (property.MatchPattern) {
      if (!Q(yield* MatchPatternMatches(property.MatchPattern, value, context))) return false;
    }
    if (property.BindingIdentifier) {
      context.bindings.set(property.BindingIdentifier.name, {
        kind: property.DeclarationKind!,
        value,
      });
    }
  }
  return true;
}

export function* MatchPatternMatches(pattern: ParseNode.MatchPattern, subject: Value, context: MatchContext): PlainEvaluator<boolean> {
  switch (pattern.kind) {
    case 'parenthesized':
      return yield* MatchPatternMatches(pattern.MatchPattern, subject, context);
    case 'primitive': {
      const value = Q(yield* evaluateWithBindings(pattern.Expression, context.bindings)).value;
      return SameValueZero(subject, value);
    }
    case 'variable':
      context.bindings.set(pattern.BindingIdentifier.name, {
        kind: pattern.DeclarationKind,
        value: subject,
      });
      return true;
    case 'member': {
      const { value, receiver } = Q(yield* evaluateWithBindings(pattern.Expression, context.bindings));
      if (!pattern.hasArguments) {
        return yield* InvokeCustomMatcher(value, subject, context, 'boolean', receiver);
      }
      const iterator = Q(yield* InvokeCustomMatcher(value, subject, context, 'list', receiver));
      if (iterator === false) return false;
      return yield* matchList(pattern.MatchList!, iterator, context);
    }
    case 'object': {
      if (!(subject instanceof ObjectValue)) return false;
      const excluded: PropertyKeyValue[] = [];
      for (const property of pattern.Properties) {
        if (!Q(yield* matchProperty(property, subject, context, excluded))) return false;
      }
      if (pattern.Rest) {
        const rest = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
        Q(yield* CopyDataProperties(rest, subject, excluded));
        if (!Q(yield* MatchPatternMatches(pattern.Rest, rest, context))) return false;
      }
      return true;
    }
    case 'array': {
      const iterator = Q(yield* GetIteratorCached(subject, context.cache));
      return yield* matchList(pattern.MatchList, iterator, context);
    }
    case 'unary': {
      const value = Q(yield* evaluateUnaryPattern(pattern, context));
      return pattern.literal ? SameValue(subject, value) : SameValueZero(subject, value);
    }
    case 'relational': {
      let value: Value;
      if (pattern.Expression.type === 'MatchPattern') {
        value = Q(yield* evaluateUnaryPattern(pattern.Expression, context));
      } else {
        value = Q(yield* evaluateWithBindings(pattern.Expression, context.bindings)).value;
      }
      switch (pattern.operator) {
        case '<': {
          if (!(subject instanceof JSStringValue || subject instanceof NumberValue || subject instanceof BigIntValue)) return false;
          const result = Q(yield* IsLessThan(subject, value, true));
          return result === Value.true;
        }
        case '>': {
          if (!(subject instanceof JSStringValue || subject instanceof NumberValue || subject instanceof BigIntValue)) return false;
          const result = Q(yield* IsLessThan(value, subject, false));
          return result === Value.true;
        }
        case '<=': {
          if (!(subject instanceof JSStringValue || subject instanceof NumberValue || subject instanceof BigIntValue)) return false;
          const result = Q(yield* IsLessThan(value, subject, false));
          return result === Value.false;
        }
        case '>=': {
          if (!(subject instanceof JSStringValue || subject instanceof NumberValue || subject instanceof BigIntValue)) return false;
          const result = Q(yield* IsLessThan(subject, value, true));
          return result === Value.false;
        }
        case 'instanceof':
          return Q(yield* InstanceofOperator(subject, value)) === Value.true;
        case 'in':
          if (!(subject instanceof JSStringValue) && subject.type !== 'Symbol') return false;
          if (!(value instanceof ObjectValue)) return false;
          return Q(yield* HasProperty(value, subject)) === Value.true;
        case '==': return Q(yield* IsLooselyEqual(subject, value));
        case '!=': return !Q(yield* IsLooselyEqual(subject, value));
        case '===': return IsStrictlyEqual(subject, value);
        case '!==': return !IsStrictlyEqual(subject, value);
        default: throw new RangeError();
      }
    }
    case 'if': {
      const value = Q(yield* evaluateWithBindings(pattern.Expression, context.bindings)).value;
      return ToBoolean(value) === Value.true;
    }
    case 'and':
      if (!Q(yield* MatchPatternMatches(pattern.Left, subject, context))) return false;
      return yield* MatchPatternMatches(pattern.Right, subject, context);
    case 'or': {
      const previous = new Map(context.bindings);
      if (Q(yield* MatchPatternMatches(pattern.Left, subject, context))) return true;
      context.bindings = previous;
      return yield* MatchPatternMatches(pattern.Right, subject, context);
    }
    case 'not': {
      const previous = context.bindings;
      context.bindings = new Map(previous);
      const matched = Q(yield* MatchPatternMatches(pattern.MatchPattern, subject, context));
      context.bindings = previous;
      return !matched;
    }
    default:
      throw new RangeError();
  }
}

export function* FinishMatch<T>(matchCompletion: Completion<T>, cache: MatchCache): Evaluator<Completion<T>> {
  const errors: Value[] = [];
  if (matchCompletion instanceof ThrowCompletion) errors.push(matchCompletion.Value);
  for (const iterator of cache.iteratorsToClose) {
    if (iterator.Done === Value.false) {
      const close = EnsureCompletion(yield* IteratorClose(iterator, NormalCompletion(Value.undefined)));
      if (close instanceof ThrowCompletion) errors.push(close.Value);
    }
  }
  if (errors.length === 0) return matchCompletion;
  if (errors.length === 1) return ThrowCompletion(errors[0]) as Completion<T>;
  const aggregate = Q(yield* Call(surroundingAgent.intrinsic('%AggregateError%'), Value.undefined, [CreateArrayFromList(errors)]));
  return ThrowCompletion(aggregate) as Completion<T>;
}

/** https://tc39.es/proposal-pattern-matching/#sec-relational-operators-runtime-semantics-evaluation */
export function* Evaluate_IsExpression(node: ParseNode.IsExpression) {
  const reference = Q(yield* Evaluate(node.RelationalExpression));
  const subject = Q(yield* GetValue(reference));
  const cache = CreateMatchCache();
  const context: MatchContext = { cache, bindings: new Map() };
  const matched = Q(yield* MatchPatternMatches(node.MatchPattern, subject, context));
  const completion = NormalCompletion(Value(matched));
  const result = yield* FinishMatch(completion, cache);
  if (!(result instanceof ThrowCompletion) && matched && context.bindings.size > 0) {
    const executionContext = surroundingAgent.runningExecutionContext;
    executionContext.LexicalEnvironment = yield* createBindingEnvironment(executionContext.LexicalEnvironment, context.bindings);
  }
  return result;
}

/** https://tc39.es/proposal-pattern-matching/#sec-match-expression-runtime-semantics-evaluation */
export function* Evaluate_MatchExpression(node: ParseNode.MatchExpression) {
  let subject = Value.undefined as Value;
  for (const expression of node.SubjectExpressions) {
    const reference = Q(yield* Evaluate(expression));
    subject = Q(yield* GetValue(reference));
  }
  const cache = CreateMatchCache();
  let result: PlainCompletion<Value> | undefined;
  for (const clause of node.Clauses) {
    const context: MatchContext = { cache, bindings: new Map() };
    if (clause.MatchPattern) {
      if (!Q(yield* MatchPatternMatches(clause.MatchPattern, subject, context))) continue;
    }
    result = EnsureCompletion(Q(yield* evaluateWithBindings(clause.Expression, context.bindings)).value);
    break;
  }
  if (result === undefined) result = Throw.TypeError('Unexpected token');
  return yield* FinishMatch(EnsureCompletion(result), cache);
}
