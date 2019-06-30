import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import { Value, Type } from '../value.mjs';
import { AbruptCompletion, Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { msg } from '../helpers.mjs';

class FakeWeakRef {
  constructor(target) {
    if (new.target === undefined) {
      throw new TypeError(msg('ConstructorRequiresNew', 'WeakRef'));
    }
    if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
      throw new TypeError(msg('NotAnObject'));
    }
    this.target = target;
  }

  deref() {
    return this.target;
  }
}

const ActualWeakRef = typeof WeakRef === 'function' ? WeakRef : FakeWeakRef;

class WeakSetData {
  constructor() {
    this.data = [];
  }

  push(value) {
    Assert(Type(value) === 'Object');
    this.data.push(new ActualWeakRef(value));
  }

  remove(i) {
    this.data[i] = undefined;
  }

  * entries() {
    for (let i = 0; i < this.data.length; i += 1) {
      let e = this.data[i];
      if (e !== undefined) {
        e = e.deref();
      }
      if (e === undefined) {
        this.data[i] = undefined;
      }
      yield [i, e];
    }
  }

  * [Symbol.iterator]() {
    for (const [, e] of this.entries()) {
      yield e;
    }
  }
}

// 23.4.1.1 #sec-weakset-iterable
function WeakSetConstructor([iterable], { NewTarget }) {
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', 'WeakSet'));
  }
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%WeakSetPrototype%', ['WeakSetData']));
  set.WeakSetData = new WeakSetData();
  if (iterable === undefined || iterable === Value.undefined || iterable === Value.null) {
    return set;
  }
  const adder = Q(Get(set, new Value('add')));
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAFunction', adder));
  }
  const iteratorRecord = Q(GetIterator(iterable));

  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (next === Value.false) {
      return set;
    }
    const nextValue = Q(IteratorValue(next));
    const status = Call(adder, set, [nextValue]);
    if (status instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, status));
    }
  }
}

export function CreateWeakSet(realmRec) {
  const weakSetConstructor = BootstrapConstructor(realmRec, WeakSetConstructor, 'WeakSet', 0, realmRec.Intrinsics['%WeakSetPrototype%']);

  realmRec.Intrinsics['%WeakSet%'] = weakSetConstructor;
}
