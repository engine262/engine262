import {
  Assert,
  GetViewValue,
  SetViewValue,
  IsDetachedBuffer,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { Type, Value } from '../value.mjs';

// 24.3.4.1 #sec-get-dataview.prototype.buffer
function DataViewProto_bufferGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('DataView' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'DataView', O));
  }
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  return buffer;
}

// 24.3.4.2 #sec-get-dataview.prototype.bytelength
function DataViewProto_byteLengthGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('DataView' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'DataView', O));
  }
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const size = O.ByteLength;
  return size;
}

// 24.3.4.3 #sec-get-dataview.prototype.byteoffset
function DataViewProto_byteOffsetGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('DataView' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'DataView', O));
  }
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const offset = O.ByteOffset;
  return offset;
}

// 24.3.4.5 #sec-dataview.prototype.getfloat32
function DataViewProto_getFloat32([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Float32'));
}

// 24.3.4.6 #sec-dataview.prototype.getfloat64
function DataViewProto_getFloat64([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Float64'));
}

// 24.3.4.7 #sec-dataview.prototype.getint8
function DataViewProto_getInt8([byteOffset], { thisValue }) {
  const v = thisValue;
  return Q(GetViewValue(v, byteOffset, Value.true, 'Int8'));
}

// 24.3.4.8 #sec-dataview.prototype.getint16
function DataViewProto_getInt16([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Int16'));
}

// 24.3.4.9 #sec-dataview.prototype.getint32
function DataViewProto_getInt32([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Int32'));
}

// 24.3.4.10 #sec-dataview.prototype.getuint8
function DataViewProto_getUint8([byteOffset], { thisValue }) {
  const v = thisValue;
  return Q(GetViewValue(v, byteOffset, Value.true, 'Uint8'));
}

// 24.3.4.11 #sec-dataview.prototype.getuint16
function DataViewProto_getUint16([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Uint16'));
}

// 24.3.4.12 #sec-dataview.prototype.getuint32
function DataViewProto_getUint32([byteOffset, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(GetViewValue(v, byteOffset, littleEndian, 'Uint32'));
}

// 24.3.4.13 #sec-dataview.prototype.setfloat32
function DataViewProto_setFloat32([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Float32', value));
}

// 24.3.4.14 #sec-dataview.prototype.setfloat64
function DataViewProto_setFloat64([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Float64', value));
}

// 24.3.4.15 #sec-dataview.prototype.setint8
function DataViewProto_setInt8([byteOffset, value], { thisValue }) {
  const v = thisValue;
  return Q(SetViewValue(v, byteOffset, Value.true, 'Int8', value));
}

// 24.3.4.16 #sec-dataview.prototype.setint16
function DataViewProto_setInt16([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Int16', value));
}

// 24.3.4.17 #sec-dataview.prototype.setint32
function DataViewProto_setInt32([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Int32', value));
}

// 24.3.4.18 #sec-dataview.prototype.setuint8
function DataViewProto_setUint8([byteOffset, value], { thisValue }) {
  const v = thisValue;
  return Q(SetViewValue(v, byteOffset, Value.true, 'Uint8', value));
}

// 24.3.4.19 #sec-dataview.prototype.setuint16
function DataViewProto_setUint16([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Uint16', value));
}

// 24.3.4.20 #sec-dataview.prototype.setuint32
function DataViewProto_setUint32([byteOffset, value, littleEndian], { thisValue }) {
  const v = thisValue;
  if (littleEndian === undefined) {
    littleEndian = Value.false;
  }
  return Q(SetViewValue(v, byteOffset, littleEndian, 'Uint32', value));
}

export function CreateDataViewPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['buffer', [DataViewProto_bufferGetter]],
    ['byteLength', [DataViewProto_byteLengthGetter]],
    ['byteOffset', [DataViewProto_byteOffsetGetter]],
    ['getFloat32', DataViewProto_getFloat32, 1],
    ['getFloat64', DataViewProto_getFloat64, 1],
    ['getInt8', DataViewProto_getInt8, 1],
    ['getInt16', DataViewProto_getInt16, 1],
    ['getInt32', DataViewProto_getInt32, 1],
    ['getUint8', DataViewProto_getUint8, 1],
    ['getUint16', DataViewProto_getUint16, 1],
    ['getUint32', DataViewProto_getUint32, 1],
    ['setFloat32', DataViewProto_setFloat32, 2],
    ['setFloat64', DataViewProto_setFloat64, 2],
    ['setInt8', DataViewProto_setInt8, 2],
    ['setInt16', DataViewProto_setInt16, 2],
    ['setInt32', DataViewProto_setInt32, 2],
    ['setUint8', DataViewProto_setUint8, 2],
    ['setUint16', DataViewProto_setUint16, 2],
    ['setUint32', DataViewProto_setUint32, 2],
  ], realmRec.Intrinsics['%ObjectPrototype%'], 'DataView');

  realmRec.Intrinsics['%DataViewPrototype%'] = proto;
}
