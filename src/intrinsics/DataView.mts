import { surroundingAgent } from '../host-defined/engine.mts';
import {
  IsDetachedBuffer,
  OrdinaryCreateFromConstructor,
  ToIndex,
  RequireInternalSlot,
  type OrdinaryObject,
  type FunctionObject,
  Realm,
  type ArrayBufferObject,
} from '../abstract-ops/all.mts';
import {
  UndefinedValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { Q } from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface DataViewObject extends OrdinaryObject {
  readonly DataView: string;
  readonly ViewedArrayBuffer: Value;
  readonly ByteLength: number;
  readonly ByteOffset: number;
}
export function isDataViewObject(V: Value): V is DataViewObject {
  return 'DataView' in V;
}
/** https://tc39.es/ecma262/#sec-dataview-constructor */
function* DataViewConstructor(this: FunctionObject, [buffer = Value.undefined, byteOffset = Value.undefined, byteLength = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Perform ? RequireInternalSlot(buffer, [[ArrayBufferData]]).
  Q(RequireInternalSlot(buffer, 'ArrayBufferData'));
  // 3. Let offset be ? ToIndex(byteOffset).
  const offset = Q(yield* ToIndex(byteOffset));
  // 4. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  __ts_cast__<ArrayBufferObject>(buffer);
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 5. Let bufferByteLength be buffer.[[ArrayBufferByteLength]].
  const bufferByteLength = (buffer).ArrayBufferByteLength;
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
    viewByteLength = Q(yield* ToIndex(byteLength));
    // b. If offset + viewByteLength > bufferByteLength, throw a RangeError exception.
    if (offset + viewByteLength > bufferByteLength) {
      return surroundingAgent.Throw('RangeError', 'DataViewOOB');
    }
  }
  // 9. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%DataView.prototype%", « [[DataView]], [[ViewedArrayBuffer]], [[ByteLength]], [[ByteOffset]] »).
  const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%DataView.prototype%', ['DataView', 'ViewedArrayBuffer', 'ByteLength', 'ByteOffset'])) as Mutable<DataViewObject>;
  // 10. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer)) {
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

export function bootstrapDataView(realmRec: Realm) {
  const dvConstructor = bootstrapConstructor(realmRec, DataViewConstructor, 'DataView', 1, realmRec.Intrinsics['%DataView.prototype%'], []);

  realmRec.Intrinsics['%DataView%'] = dvConstructor;
}
