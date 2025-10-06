import { F } from '../abstract-ops/all.mts';
import { __ts_cast__ } from '../helpers.mts';
import { Value, type Arguments, type FunctionCallContext } from '../value.mts';
import {
  AllocateTypedArray, type TypedArrayObject,
} from './TypedArray.mts';
import { assignProps } from './bootstrap.mts';
import {
  Assert, CodePointsToString, CreateDataPropertyOrThrow, EnsureCompletion, Get, GetValueFromBuffer, IsTypedArrayOutOfBounds, JSStringValue, MakeTypedArrayWithBufferWitnessRecord, NumberValue, ObjectValue, OrdinaryObjectCreate, Q, R, Realm, RequireInternalSlot, SetValueInBuffer, StringPad, surroundingAgent, ThrowCompletion, ToBoolean, TypedArrayLength, UndefinedValue, X, type ArrayBufferObject, type PlainCompletion, type ValueCompletion,
} from '#self';

/** https://tc39.es/ecma262/#sec-uint8array.prototype.tobase64 */
function* Uint8Array_prototype_toBase64([options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const O = thisValue;
  Q(ValidateUint8Array(O));
  __ts_cast__<TypedArrayObject>(O);
  const opts = Q(GetOptionsObject(options));
  let alphabet = Q(yield* Get(opts, Value('alphabet')));
  if (alphabet instanceof UndefinedValue) {
    alphabet = Value('base64');
  }
  if (!(alphabet instanceof JSStringValue) || (alphabet.stringValue() !== 'base64' && alphabet.stringValue() !== 'base64url')) {
    return surroundingAgent.Throw('TypeError', 'InvalidAlphabet');
  }
  const omitPadding = ToBoolean(Q(yield* Get(opts, Value('omitPadding'))));
  const toEncode = Q(GetUint8ArrayBytes(O));
  let outAscii: string;
  if (alphabet.stringValue() === 'base64') {
    // Let outAscii be the sequence of code points which results from encoding toEncode according to the base64 encoding specified in section 4 of RFC 4648. Padding is included if and only if omitPadding is false.
    outAscii = btoa(String.fromCharCode(...toEncode));
    if (omitPadding !== Value.false) {
      outAscii = outAscii.replace(/=/g, '');
    }
  } else {
    Assert(alphabet.stringValue() === 'base64url');
    // Let outAscii be the sequence of code points which results from encoding toEncode according to the base64url encoding specified in section 5 of RFC 4648. Padding is included if and only if omitPadding is false.
    outAscii = btoa(String.fromCharCode(...toEncode)).replace(/\+/g, '-').replace(/\//g, '_');
    if (omitPadding !== Value.false) {
      outAscii = outAscii.replace(/=/g, '');
    }
  }
  return Value(CodePointsToString(outAscii));
}

/** https://tc39.es/ecma262/#sec-uint8array.prototype.tohex */
function Uint8Array_prototype_toHex(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const O = thisValue;
  Q(ValidateUint8Array(O));
  __ts_cast__<TypedArrayObject>(O);
  const toEncode = Q(GetUint8ArrayBytes(O));
  let out = '';
  for (const byte of toEncode) {
    let hex = NumberValue.toString(F(byte), 16);
    hex = X(StringPad(hex, Value(2), Value('0'), 'start'));
    out += hex.stringValue();
  }
  return Value(out);
}

/** https://tc39.es/ecma262/#sec-uint8array.frombase64 */
function* Uint8Array_fromBase64([string, options = Value.undefined]: Arguments) {
  if (!(string instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', string);
  }
  const opts = Q(GetOptionsObject(options));
  let alphabet = Q(yield* Get(opts, Value('alphabet')));
  if (alphabet instanceof UndefinedValue) {
    alphabet = Value('base64');
  }
  if (!(alphabet instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidAlphabet');
  }
  const alphabetStr = alphabet.stringValue();
  if (alphabetStr !== 'base64' && alphabetStr !== 'base64url') {
    return surroundingAgent.Throw('TypeError', 'InvalidAlphabet');
  }
  let lastChunkHandling = Q(yield* Get(opts, Value('lastChunkHandling')));
  if (lastChunkHandling instanceof UndefinedValue) {
    lastChunkHandling = Value('loose');
  }
  if (!(lastChunkHandling instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidLastChunkHandling');
  }
  const lastChunkHandlingStr = lastChunkHandling.stringValue();
  if ((lastChunkHandlingStr !== 'loose' && lastChunkHandlingStr !== 'strict' && lastChunkHandlingStr !== 'stop-before-partial')) {
    return surroundingAgent.Throw('TypeError', 'InvalidLastChunkHandling');
  }
  const result = FromBase64(string.stringValue(), alphabetStr, lastChunkHandlingStr);
  if (result.Error) {
    return ThrowCompletion(result.Error);
  }
  const resultLength = result.Bytes.length;
  const ta = Q(yield* AllocateTypedArray(Value('Uint8Array'), surroundingAgent.intrinsic('%Uint8Array%'), '%Uint8Array.prototype%', resultLength));

  // TODO: Assert: ta.[[ViewedArrayBuffer]].[[ArrayBufferByteLength]] is the number of elements in result.[[Bytes]].

  // Set the value at each index of ta.[[ViewedArrayBuffer]].[[ArrayBufferData]] to the value at the corresponding index of result.[[Bytes]].
  for (let i = 0; i < resultLength; i += 1) {
    const byte = result.Bytes[i];
    yield* SetValueInBuffer(ta.ViewedArrayBuffer as ArrayBufferObject, ta.ByteOffset + i, 'Uint8', F(byte), true, 'unordered');
  }
  return ta;
}

/** https://tc39.es/ecma262/#sec-uint8array.prototype.setfrombase64 */
function* Uint8Array_prototype_setFromBase64([string, options = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const into = thisValue;
  Q(ValidateUint8Array(into));
  __ts_cast__<TypedArrayObject>(into);
  if (!(string instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', string);
  }
  const opts = Q(GetOptionsObject(options));
  let alphabet = Q(yield* Get(opts, Value('alphabet')));
  if (alphabet instanceof UndefinedValue) {
    alphabet = Value('base64');
  }
  if (!(alphabet instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidAlphabet');
  }
  const alphabetStr = alphabet.stringValue();
  if (alphabetStr !== 'base64' && alphabetStr !== 'base64url') {
    return surroundingAgent.Throw('TypeError', 'InvalidAlphabet');
  }
  let lastChunkHandling = Q(yield* Get(opts, Value('lastChunkHandling')));
  if (lastChunkHandling instanceof UndefinedValue) {
    lastChunkHandling = Value('loose');
  }
  if (!(lastChunkHandling instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidLastChunkHandling');
  }
  const lastChunkHandlingStr = lastChunkHandling.stringValue();
  if ((lastChunkHandlingStr !== 'loose' && lastChunkHandlingStr !== 'strict' && lastChunkHandlingStr !== 'stop-before-partial')) {
    return surroundingAgent.Throw('TypeError', 'InvalidLastChunkHandling');
  }
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(into, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
  }
  const byteLength = TypedArrayLength(taRecord);
  const result = FromBase64(string.stringValue(), alphabetStr, lastChunkHandlingStr, byteLength);
  const bytes = result.Bytes;
  const written = bytes.length;
  Assert(written <= byteLength);
  yield* SetUint8ArrayBytes(into, bytes);
  if (result.Error) {
    return ThrowCompletion(result.Error);
  }
  const resultObject = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataPropertyOrThrow(resultObject, Value('read'), F(result.Read)));
  X(CreateDataPropertyOrThrow(resultObject, Value('written'), F(written)));
  return resultObject;
}

/** https://tc39.es/ecma262/#sec-uint8array.fromhex */
function* Uint8Array_fromHex([string]: Arguments) {
  if (!(string instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', string);
  }
  const result = FromHex(string.stringValue());
  if (result.Error) {
    return ThrowCompletion(result.Error);
  }
  const resultLength = result.Bytes.length;
  const ta = Q(yield* AllocateTypedArray(Value('Uint8Array'), surroundingAgent.intrinsic('%Uint8Array%'), '%Uint8Array.prototype%', resultLength));
  // TODO Assert: ta.[[ViewedArrayBuffer]].[[ArrayBufferByteLength]] is the number of elements in result.[[Bytes]].

  // Set the value at each index of ta.[[ViewedArrayBuffer]].[[ArrayBufferData]] to the value at the corresponding index of result.[[Bytes]].
  for (let i = 0; i < resultLength; i += 1) {
    const byte = result.Bytes[i];
    yield* SetValueInBuffer(ta.ViewedArrayBuffer as ArrayBufferObject, ta.ByteOffset + i, 'Uint8', F(byte), true, 'unordered');
  }
  return ta;
}

/** https://tc39.es/ecma262/#sec-uint8array.prototype.setfromhex */
function* Uint8Array_prototype_setFromHex([string]: Arguments, { thisValue }: FunctionCallContext) {
  const into = thisValue;
  Q(ValidateUint8Array(into));
  __ts_cast__<TypedArrayObject>(into);
  if (!(string instanceof JSStringValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAString', string);
  }
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(into, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
  }
  const byteLength = TypedArrayLength(taRecord);
  const result = FromHex(string.stringValue(), byteLength);
  const bytes = result.Bytes;
  const written = bytes.length;
  Assert(written <= byteLength);
  yield* SetUint8ArrayBytes(into, bytes);
  if (result.Error) {
    return ThrowCompletion(result.Error);
  }
  const resultObject = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataPropertyOrThrow(resultObject, Value('read'), F(result.Read)));
  X(CreateDataPropertyOrThrow(resultObject, Value('written'), F(written)));
  return resultObject;
}

/** https://tc39.es/ecma262/#sec-validateuint8array */
function ValidateUint8Array(ta: Value) {
  Q(RequireInternalSlot(ta, 'TypedArrayName'));
  __ts_cast__<TypedArrayObject>(ta);
  if (ta.TypedArrayName.stringValue() !== 'Uint8Array') {
    return surroundingAgent.Throw('TypeError', 'NotUint8Array');
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-getuint8arraybytes */
function GetUint8ArrayBytes(ta: TypedArrayObject): PlainCompletion<number[]> {
  const buffer = ta.ViewedArrayBuffer;
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(ta, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
  }
  const len = TypedArrayLength(taRecord);
  const byteOffset = ta.ByteOffset;
  const bytes = [];
  let index = 0;
  while (index < len) {
    const byteIndex = byteOffset + index;
    const byte = R(GetValueFromBuffer(buffer as ArrayBufferObject, byteIndex, 'Uint8', true, 'unordered'));
    Assert(typeof byte === 'number');
    bytes.push(byte);
    index += 1;
  }
  return bytes;
}

/** https://tc39.es/ecma262/#sec-setuint8arraybytes */
function* SetUint8ArrayBytes(into: TypedArrayObject, bytes: readonly number[]) {
  const offset = into.ByteOffset;
  const len = bytes.length;
  let index = 0;
  while (index < len) {
    const byte = bytes[index];
    const byteIndexInBuffer = index + offset;
    yield* SetValueInBuffer(into.ViewedArrayBuffer as ArrayBufferObject, byteIndexInBuffer, 'Uint8', F(byte), true, 'unordered');
    index += 1;
  }
}

/** https://tc39.es/ecma262/#sec-skipasciiwhitespace */
function SkipAsciiWhitespace(string: string, index: number) {
  const length = string.length;
  while (index < length) {
    const char = string.charCodeAt(index);
    if (char !== 0x09 && char !== 0x0A && char !== 0x0C && char !== 0x0D && char !== 0x20) {
      return index;
    }
    index += 1;
  }
  return index;
}

/** https://tc39.es/ecma262/#sec-decodefinalbase64chunk */
function DecodeFinalBase64Chunk(chunk: string, throwOnExtraBits: boolean): PlainCompletion<number[]> {
  const chunkLength = chunk.length;
  if (chunkLength === 2) {
    chunk += 'AA';
  } else {
    Assert(chunkLength === 3);
    chunk += 'A';
  }
  const bytes = DecodeFullLengthBase64Chunk(chunk);
  if (chunkLength === 2) {
    if (throwOnExtraBits && bytes[1] !== 0) {
      return surroundingAgent.Throw('SyntaxError', 'InvalidBase64String');
    }
    return [bytes[0]];
  } else {
    if (throwOnExtraBits && (bytes[2] !== 0)) {
      return surroundingAgent.Throw('SyntaxError', 'InvalidBase64String');
    }
    return [bytes[0], bytes[1]];
  }
}

/** https://tc39.es/ecma262/#sec-decodefulllengthbase64chunk */
function DecodeFullLengthBase64Chunk(chunk: string): number[] {
  // 1. Let byteSequence be the unique sequence of 3 bytes resulting from decoding chunk as base64 (i.e., the sequence such that applying the base64 encoding specified in section 4 of RFC 4648 to byteSequence would produce chunk).
  // 2. Return a List whose elements are the elements of byteSequence, in order.
  const byteSequence = [...atob(chunk)].map((c) => c.charCodeAt(0));
  return byteSequence;
}

interface Record {
  Read: number;
  Bytes: number[];
  Error: undefined | Value;
}
/** https://tc39.es/ecma262/#sec-frombase64 */
function FromBase64(string: string, alphabet: 'base64' | 'base64url', lastChunkHandling: 'loose' | 'strict' | 'stop-before-partial', maxLength = 2 ** 53 - 1): Record {
  if (maxLength === 0) {
    return { Read: 0, Bytes: [], Error: undefined };
  }
  let read = 0;
  const bytes: number[] = [];
  let chunk = '';
  let chunkLength = 0;
  let index = 0;
  const length = string.length;
  while (true) {
    index = SkipAsciiWhitespace(string, index);
    if (index === length) {
      if (chunkLength > 0) {
        if (lastChunkHandling === 'stop-before-partial') {
          return { Read: read, Bytes: bytes, Error: undefined };
        } else if (lastChunkHandling === 'loose') {
          if (chunkLength === 1) {
            const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
            return { Read: read, Bytes: bytes, Error: error };
          }
          bytes.push(...X(DecodeFinalBase64Chunk(chunk, false)));
        } else {
          Assert(lastChunkHandling === 'strict');
          const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
          return { Read: read, Bytes: bytes, Error: error };
        }
      }
      return { Read: length, Bytes: bytes, Error: undefined };
    }
    let char = string.substring(index, index + 1);
    index += 1;
    if (char === '=') {
      if (chunkLength < 2) {
        const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
        return { Read: read, Bytes: bytes, Error: error };
      }
      index = SkipAsciiWhitespace(string, index);
      if (chunkLength === 2) {
        if (index === length) {
          if (lastChunkHandling === 'stop-before-partial') {
            return { Read: read, Bytes: bytes, Error: undefined };
          }
          const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
          return { Read: read, Bytes: bytes, Error: error };
        }
        char = string.substring(index, index + 1);
        if (char === '=') {
          index = SkipAsciiWhitespace(string, index + 1);
        }
      }
      if (index < length) {
        const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
        return { Read: read, Bytes: bytes, Error: error };
      }
      let throwOnExtraBits;
      if (lastChunkHandling === 'strict') {
        throwOnExtraBits = true;
      } else {
        throwOnExtraBits = false;
      }
      const decodeResult = EnsureCompletion(DecodeFinalBase64Chunk(chunk, throwOnExtraBits));
      if (decodeResult instanceof ThrowCompletion) {
        return { Read: read, Bytes: bytes, Error: decodeResult.Value };
      }
      bytes.push(...X(decodeResult));
      return { Read: length, Bytes: bytes, Error: undefined };
    }
    if (alphabet === 'base64url') {
      if (char === '+' || char === '/') {
        const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
        return { Read: read, Bytes: bytes, Error: error };
      } else if (char === '-') {
        char = '+';
      } else if (char === '_') {
        char = '/';
      }
    }
    if (!/[A-Za-z0-9+/]/.test(char)) {
      const error = surroundingAgent.Throw('SyntaxError', 'InvalidBase64String').Value;
      return { Read: read, Bytes: bytes, Error: error };
    }
    const remaining = maxLength - bytes.length;
    if ((remaining === 1 && chunkLength === 2) || (remaining === 2 && chunkLength === 3)) {
      return { Read: read, Bytes: bytes, Error: undefined };
    }
    chunk += char;
    chunkLength = chunk.length;
    if (chunkLength === 4) {
      bytes.push(...X(DecodeFullLengthBase64Chunk(chunk)));
      chunk = '';
      chunkLength = 0;
      read = index;
      if (bytes.length === maxLength) {
        return { Read: read, Bytes: bytes, Error: undefined };
      }
    }
  }
}

/** https://tc39.es/ecma262/#sec-fromhex */
function FromHex(string: string, maxLength = 2 ** 53 - 1): Record {
  const length = string.length;
  const bytes: number[] = [];
  let read = 0;
  if (length % 2 !== 0) {
    const error = surroundingAgent.Throw('SyntaxError', 'InvalidHexString').Value;
    return { Read: read, Bytes: bytes, Error: error };
  }
  while (read < length && bytes.length < maxLength) {
    const hexits = string.substring(read, read + 2);
    if ([...hexits].some((c) => !/[0-9a-fA-F]/.test(c))) {
      const error = surroundingAgent.Throw('SyntaxError', 'InvalidHexString').Value;
      return { Read: read, Bytes: bytes, Error: error };
    }
    read += 2;
    const byte = parseInt(hexits, 16);
    bytes.push(byte);
  }
  return { Read: read, Bytes: bytes, Error: undefined };
}

/** https://tc39.es/ecma262/#sec-getoptionsobject */
function GetOptionsObject(options: Value) {
  if (options instanceof UndefinedValue) {
    return OrdinaryObjectCreate(Value.null);
  }
  if (options instanceof ObjectValue) {
    return options;
  }
  return surroundingAgent.Throw('TypeError', 'NotAnObject', options);
}

export function bootstrapUint8Array(realmRec: Realm) {
  if (!surroundingAgent.feature('uint8array-base64')) {
    return;
  }
  const proto = realmRec.Intrinsics['%Uint8Array.prototype%'];
  const constructor = realmRec.Intrinsics['%Uint8Array%'];
  assignProps(realmRec, proto, [
    ['toBase64', Uint8Array_prototype_toBase64, 0],
    ['setFromBase64', Uint8Array_prototype_setFromBase64, 1],
    ['toHex', Uint8Array_prototype_toHex, 0],
    ['setFromHex', Uint8Array_prototype_setFromHex, 1],
  ]);
  assignProps(realmRec, constructor, [
    ['fromBase64', Uint8Array_fromBase64, 1],
    ['fromHex', Uint8Array_fromHex, 1],
  ]);
}
