import {
  surroundingAgent,
} from '../engine.mjs';
import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Call,
  CreateBuiltinFunction,
  CreateResolvingFunctions,
  Get,
  IsCallable,
  NewPromiseCapability,
  OrdinaryCreateFromConstructor,
  PromiseResolve,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion,
  Q,
} from '../completion.mjs';


function PromiseConstructor([executor], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'value is not a constructor');
  }
  if (IsCallable(executor).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'Promise resolver is not a function');
  }
  const promise = Q(OrdinaryCreateFromConstructor(NewTarget, '%PromisePrototype%', [
    'PromiseState',
    'PromiseResult',
    'PromiseFulfillReactions',
    'PromiseRejectReactions',
    'PromiseIsHandled',
  ]));
  promise.PromiseState = 'pending';
  promise.PromiseFulfillReactions = [];
  promise.PromiseRejectReactions = [];
  promise.PromiseIsHandled = false;
  const resolvingFunctions = CreateResolvingFunctions(promise);
  const completion = Call(executor, NewValue(undefined), [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (completion instanceof AbruptCompletion) {
    Q(Call(resolvingFunctions.Reject, NewValue(undefined), [completion.Value]));
  }
  return promise;
}

function Promise_all() {
  return NewValue(undefined);
}

function Promise_race() {
  return NewValue(undefined);
}

function Promise_reject([r], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const promiseCapability = NewPromiseCapability(C);
  Q(Call(promiseCapability.Reject, NewValue(undefined), [r]));
  return promiseCapability.Promise;
}

function Promise_resolve([x], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(PromiseResolve(C, x));
}

function Promise_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreatePromise(realmRec) {
  const promiseConstructor = CreateBuiltinFunction(PromiseConstructor, [], realmRec);
  SetFunctionName(promiseConstructor, NewValue('Promise'));
  SetFunctionLength(promiseConstructor, NewValue(1));

  const proto = realmRec.Intrinsics['%PromisePrototype%'];

  promiseConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: promiseConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  [
    ['all', Promise_all, 1],
    ['race', Promise_race, 1],
    ['reject', Promise_reject, 1],
    ['resolve', Promise_resolve, 1],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    promiseConstructor.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  promiseConstructor.DefineOwnProperty(wellKnownSymbols.species, {
    Get: CreateBuiltinFunction(Promise_symbolSpecies, [], realmRec),
    Set: NewValue(undefined),
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%Promise_all%'] = Get(promiseConstructor, NewValue('all'));
  realmRec.Intrinsics['%Promise_reject%'] = Get(promiseConstructor, NewValue('reject'));
  realmRec.Intrinsics['%Promise_resolve%'] = Get(promiseConstructor, NewValue('resolve'));

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
}
