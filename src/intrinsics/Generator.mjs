import {
  CreateBuiltinFunction,
  GeneratorResume,
  GeneratorResumeAbrupt,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
  ReturnCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import {
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';

// #sec-generator.prototype.next
function GeneratorProto_next([value], { thisValue }) {
  const g = thisValue;
  return Q(GeneratorResume(g, value));
}

// #sec-generator.prototype.return
function GeneratorProto_return([value], { thisValue }) {
  const g = thisValue;
  const C = new ReturnCompletion(value);
  return Q(GeneratorResumeAbrupt(g, C));
}

// #sec-generator.prototype.throw
function GeneratorProto_throw([exception], { thisValue }) {
  const g = thisValue;
  const C = new ThrowCompletion(exception);
  return Q(GeneratorResumeAbrupt(g, C));
}

export function CreateGenerator(realmRec) {
  const generatorPrototype = ObjectCreate(realmRec.Intrinsics['%IteratorPrototype%']);

  {
    const next = CreateBuiltinFunction(GeneratorProto_next, [], realmRec);
    SetFunctionName(next, NewValue('next'));
    SetFunctionLength(next, NewValue(1));
    X(generatorPrototype.DefineOwnProperty(NewValue('next'), {
      Value: next,
      Writable: false,
      Enumerable: false,
      Configurable: true,
    }));
  }

  {
    const ret = CreateBuiltinFunction(GeneratorProto_return, [], realmRec);
    SetFunctionName(ret, NewValue('return'));
    SetFunctionLength(ret, NewValue(1));
    X(generatorPrototype.DefineOwnProperty(NewValue('return'), {
      Value: ret,
      Writable: false,
      Enumerable: false,
      Configurable: true,
    }));
  }

  {
    const thr = CreateBuiltinFunction(GeneratorProto_throw, [], realmRec);
    SetFunctionName(thr, NewValue('throw'));
    SetFunctionLength(thr, NewValue(1));
    X(generatorPrototype.DefineOwnProperty(NewValue('throw'), {
      Value: thr,
      Writable: false,
      Enumerable: false,
      Configurable: true,
    }));
  }

  X(generatorPrototype.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Generator'),
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));

  realmRec.Intrinsics['%GeneratorPrototype%'] = generatorPrototype;
}
