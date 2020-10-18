import {
  X,
  Completion,
  NormalCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import { Value } from '../value.mjs';
import { AsyncGeneratorEnqueue } from '../abstract-ops/all.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-asyncgenerator-prototype-next
function AsyncGeneratorPrototype_next([value = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let completion be NormalCompletion(value).
  const completion = NormalCompletion(value);
  // 3. Return ! AsyncGeneratorEnqueue(generator, completion, empty).
  return X(AsyncGeneratorEnqueue(generator, completion, undefined));
}

// #sec-asyncgenerator-prototype-return
function AsyncGeneratorPrototype_return([value = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let completion be Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
  const completion = new Completion({ Type: 'return', Value: value, Target: undefined });
  // 3. Return ! AsyncGeneratorEnqueue(generator, completion, empty).
  return X(AsyncGeneratorEnqueue(generator, completion, undefined));
}

// #sec-asyncgenerator-prototype-throw
function AsyncGeneratorPrototype_throw([exception = Value.undefined], { thisValue }) {
  // 1. Let generator be the this value.
  const generator = thisValue;
  // 2. Let completion be ThrowCompletion(exception).
  const completion = ThrowCompletion(exception);
  // 3. Return ! AsyncGeneratorEnqueue(generator, completion, empty).
  return X(AsyncGeneratorEnqueue(generator, completion, undefined));
}

export function bootstrapAsyncGeneratorFunctionPrototypePrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', AsyncGeneratorPrototype_next, 1],
    ['return', AsyncGeneratorPrototype_return, 1],
    ['throw', AsyncGeneratorPrototype_throw, 1],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%'], 'AsyncGenerator');

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'] = proto;
}
