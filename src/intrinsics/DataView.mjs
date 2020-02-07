import { surroundingAgent } from '../engine.mjs';
import {
  IsDetachedBuffer,
  OrdinaryCreateFromConstructor,
  ToIndex,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// 24.3.2 #sec-dataview-constructor
function DataViewConstructor([buffer = Value.undefined, byteOffset = Value.undefined, byteLength = Value.undefined], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'ConstructorRequiresNew', 'DataView');
  }
  Q(RequireInternalSlot(buffer, 'ArrayBufferData'));
  const offset = Q(ToIndex(byteOffset)).numberValue();
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', 'BufferDetached');
  }
  const bufferByteLength = buffer.ArrayBufferByteLength.numberValue();
  if (offset > bufferByteLength) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  let viewByteLength;
  if (byteLength === Value.undefined) {
    viewByteLength = bufferByteLength - offset;
  } else {
    viewByteLength = Q(ToIndex(byteLength)).numberValue();
    if (offset + viewByteLength > bufferByteLength) {
      return surroundingAgent.Throw('RangeError', 'DataViewOOB');
    }
  }
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DataView.prototype%', ['DataView', 'ViewedArrayBuffer', 'ByteLength', 'ByteOffset']));
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', 'BufferDetached');
  }
  O.ViewedArrayBuffer = buffer;
  O.ByteLength = new Value(viewByteLength);
  O.ByteOffset = new Value(offset);
  return O;
}

export function BootstrapDataView(realmRec) {
  const dvConstructor = BootstrapConstructor(realmRec, DataViewConstructor, 'DataView', 1, realmRec.Intrinsics['%DataView.prototype%'], []);

  realmRec.Intrinsics['%DataView%'] = dvConstructor;
}
