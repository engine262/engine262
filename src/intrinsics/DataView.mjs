import { surroundingAgent } from '../engine.mjs';
import {
  IsDetachedBuffer,
  OrdinaryCreateFromConstructor,
  ToIndex,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { msg } from '../helpers.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// 24.3.2 #sec-dataview-constructor
function DataViewConstructor([buffer, byteOffset = Value.undefined, byteLength = Value.undefined], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', 'DataView'));
  }
  if (Type(buffer) !== 'Object' || !('ArrayBufferData' in buffer)) {
    return surroundingAgent.Throw('TypeError', msg('NotAnTypeObject', 'ArrayBuffer', buffer));
  }
  const offset = Q(ToIndex(byteOffset)).numberValue();
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const bufferByteLength = buffer.ArrayBufferByteLength.numberValue();
  if (offset > bufferByteLength) {
    return surroundingAgent.Throw('RangeError', msg('DataViewOOB'));
  }
  let viewByteLength;
  if (byteLength === Value.undefined) {
    viewByteLength = bufferByteLength - offset;
  } else {
    viewByteLength = Q(ToIndex(byteLength)).numberValue();
    if (offset + viewByteLength > bufferByteLength) {
      return surroundingAgent.Throw('RangeError', msg('DataViewOOB'));
    }
  }
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DataViewPrototype%', ['DataView', 'ViewedArrayBuffer', 'ByteLength', 'ByteOffset']));
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  O.ViewedArrayBuffer = buffer;
  O.ByteLength = new Value(viewByteLength);
  O.ByteOffset = new Value(offset);
  return O;
}

export function CreateDataView(realmRec) {
  const dvConstructor = BootstrapConstructor(realmRec, DataViewConstructor, 'DataView', 1, realmRec.Intrinsics['%DataViewPrototype%'], []);

  realmRec.Intrinsics['%DataView%'] = dvConstructor;
}
