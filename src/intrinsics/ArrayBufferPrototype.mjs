import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import {
  RequireInternalSlot, IsDetachedBuffer, IsSharedArrayBuffer,
  SpeciesConstructor, Construct, ToIntegerOrInfinity, SameValue, CopyDataBlockBytes,
  F,
} from '../abstract-ops/all.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-get-arraybuffer.prototype.bytelength
function ArrayBufferProto_byteLength(args, { thisValue }) {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
  Q(RequireInternalSlot(O, 'ArrayBufferData'));
  // 3. If IsSharedArrayBuffer(O) is true, throw a TypeError exception.
  if (IsSharedArrayBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferShared');
  }
  // 4. If IsDetachedBuffer(O) is true, return +0f.
  if (IsDetachedBuffer(O) === Value.true) {
    return F(+0);
  }
  // 5. Let length be O.[[ArrayBufferByteLength]].
  const length = O.ArrayBufferByteLength;
  // 6. Return length.
  return F(length);
}

// #sec-arraybuffer.prototype.slice
function ArrayBufferProto_slice([start = Value.undefined, end = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
  Q(RequireInternalSlot(O, 'ArrayBufferData'));
  // 3. If IsSharedArrayBuffer(O) is true, throw a TypeError exception.
  if (IsSharedArrayBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferShared');
  }
  // 4. If IsDetachedBuffer(O) is true, throw a TypeError exception.
  if (IsDetachedBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 5. Let len be O.[[ArrayBufferByteLength]].
  const len = O.ArrayBufferByteLength;
  // 6. Let relativeStart be ? ToIntegerOrInfinity(start).
  const relativeStart = Q(ToIntegerOrInfinity(start));
  let first;
  // 7. If relativeStart < 0, let first be max((len + relativeStart), 0); else let first be min(relativeStart, len).
  if (relativeStart < 0) {
    first = Math.max(len + relativeStart, 0);
  } else {
    first = Math.min(relativeStart, len);
  }
  let relativeEnd;
  // 8. If end is undefined, let relativeEnd be len; else let relativeEnd be ? ToIntegerOrInfinity(end).
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  let final;
  // 9. If relativeEnd < 0, let final be max((len + relativeEnd), 0); else let final be min(relativeEnd, len).
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  // 10. Let newLen be max(final - first, 0).
  const newLen = Math.max(final - first, 0);
  // 11. Let ctor be ? SpeciesConstructor(O, %ArrayBuffer%).
  const ctor = Q(SpeciesConstructor(O, surroundingAgent.intrinsic('%ArrayBuffer%')));
  // 12. Let new be ? Construct(ctor, « newLen »).
  const newO = Q(Construct(ctor, [F(newLen)]));
  // 13. Perform ? RequireInternalSlot(new, [[ArrayBufferData]]).
  Q(RequireInternalSlot(newO, 'ArrayBufferData'));
  // 14. If IsSharedArrayBuffer(new) is true, throw a TypeError exception.
  if (IsSharedArrayBuffer(newO) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferShared');
  }
  // 15. If IsDetachedBuffer(new) is true, throw a TypeError exception.
  if (IsDetachedBuffer(newO) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 16. If SameValue(new, O) is true, throw a TypeError exception.
  if (SameValue(newO, O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'SubclassSameValue', newO);
  }
  // 17. If new.[[ArrayBufferByteLength]] < newLen, throw a TypeError exception.
  if (newO.ArrayBufferByteLength < newLen) {
    return surroundingAgent.Throw('TypeError', 'SubclassLengthTooSmall', newO);
  }
  // 18. NOTE: Side-effects of the above steps may have detached O.
  // 19. If IsDetachedBuffer(O) is true, throw a TypeError exception.
  if (IsDetachedBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 20. Let fromBuf be O.[[ArrayBufferData]].
  const fromBuf = O.ArrayBufferData;
  // 21. Let toBuf be new.[[ArrayBufferData]].
  const toBuf = newO.ArrayBufferData;
  // 22. Perform CopyDataBlockBytes(toBuf, 0, fromBuf, first, newLen).
  CopyDataBlockBytes(toBuf, 0, fromBuf, first, newLen);
  // 23. Return new.
  return newO;
}

export function bootstrapArrayBufferPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['byteLength', [ArrayBufferProto_byteLength]],
    ['slice', ArrayBufferProto_slice, 2],
  ], realmRec.Intrinsics['%Object.prototype%'], 'ArrayBuffer');

  realmRec.Intrinsics['%ArrayBuffer.prototype%'] = proto;
}
