import {
  ToInt16,
  ToInt32,
  ToInt8,
  ToUint16,
  ToUint32,
  ToUint8,
  ToUint8Clamp,
} from './all.mjs';

// #sec-typedarray-objects
export const typedArrayInfo = new Map([
  ['Int8Array', { ElementType: 'Int8', ElementSize: 1, ConversionOperation: ToInt8 }],
  ['Uint8Array', { ElementType: 'Uint8', ElementSize: 1, ConversionOperation: ToUint8 }],
  ['Uint8ClampedArray', { ElementType: 'Uint8C', ElementSize: 1, ConversionOperation: ToUint8Clamp }],
  ['Int16Array', { ElementType: 'Int16', ElementSize: 2, ConversionOperation: ToInt16 }],
  ['Uint16Array', { ElementType: 'Uint16', ElementSize: 2, ConversionOperation: ToUint16 }],
  ['Int32Array', { ElementType: 'Int32', ElementSize: 4, ConversionOperation: ToInt32 }],
  ['Uint32Array', { ElementType: 'Uint32', ElementSize: 4, ConversionOperation: ToUint32 }],
  ['Float32Array', { ElementType: 'Float32', ElementSize: 4 }],
  ['Float64Array', { ElementType: 'Float64', ElementSize: 8 }],
]);
