import { surroundingAgent } from '../engine.mjs';
import {
  IsDetachedBuffer,
  OrdinaryCreateFromConstructor,
  ToIndex,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-dataview-constructor  */
function DataViewConstructor([buffer = Value.undefined, byteOffset = Value.undefined, byteLength = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Perform ? RequireInternalSlot(buffer, [[ArrayBufferData]]).
  Q(RequireInternalSlot(buffer, 'ArrayBufferData'));
  // 3. Let offset be ? ToIndex(byteOffset).
  const offset = Q(ToIndex(byteOffset));
  // 4. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 5. Let bufferByteLength be buffer.[[ArrayBufferByteLength]].
  const bufferByteLength = buffer.ArrayBufferByteLength;
  // 6. If offset > bufferByteLength, throw a RangeError exception.
  if (offset > bufferByteLength) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  let viewByteLength;
  // 7. If byteLength is undefined, then
  if (byteLength === Value.undefined) {
    // a. Let viewByteLength be bufferByteLength - offset.
    viewByteLength = bufferByteLength - offset;
  } else {
    // a. Let viewByteLength be ? ToIndex(byteLength).
    viewByteLength = Q(ToIndex(byteLength));
    // b. If offset + viewByteLength > bufferByteLength, throw a RangeError exception.
    if (offset + viewByteLength > bufferByteLength) {
      return surroundingAgent.Throw('RangeError', 'DataViewOOB');
    }
  }
  // 9. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%DataView.prototype%", « [[DataView]], [[ViewedArrayBuffer]], [[ByteLength]], [[ByteOffset]] »).
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%DataView.prototype%', ['DataView', 'ViewedArrayBuffer', 'ByteLength', 'ByteOffset']));
  // 10. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 11. Set O.[[ViewedArrayBuffer]] to buffer.
  O.ViewedArrayBuffer = buffer;
  // 12. Set O.[[ByteLength]] to viewByteLength.
  O.ByteLength = viewByteLength;
  // 13. Set O.[[ByteOffset]] to offset.
  O.ByteOffset = offset;
  // 14. Return O.
  return O;
}

export function bootstrapDataView(realmRec) {
  const dvConstructor = bootstrapConstructor(realmRec, DataViewConstructor, 'DataView', 1, realmRec.Intrinsics['%DataView.prototype%'], []);

  realmRec.Intrinsics['%DataView%'] = dvConstructor;
}
