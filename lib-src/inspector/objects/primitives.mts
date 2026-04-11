import type { Inspector } from './index.mts';
import {
  NullValue, UndefinedValue, BooleanValue, SymbolValue, SymbolDescriptiveString, JSStringValue, NumberValue, BigIntValue,
} from '#self';

export const Null: Inspector<NullValue> = {
  toRemoteObject: () => ({ type: 'object', subtype: 'null', value: null }),
  toObjectPreview: () => ({
    type: 'object', subtype: 'null', properties: [], overflow: false,
  }),
  toPropertyPreview: (name) => ({
    name, type: 'object', subtype: 'null', value: 'null',
  }),
  toDescription: () => '',
};

export const Undefined: Inspector<UndefinedValue> = {
  toRemoteObject: () => ({ type: 'undefined' }),
  toObjectPreview: () => ({
    type: 'undefined', properties: [], overflow: false,
  }),
  toPropertyPreview: (name) => ({
    name, type: 'undefined', value: 'undefined',
  }),
  toDescription: () => 'undefined',
};

export const Boolean: Inspector<BooleanValue> = {
  toRemoteObject: (value) => ({ type: 'boolean', value: value.booleanValue() }),
  toPropertyPreview: (name, value) => ({
    name, type: 'boolean', value: value.booleanValue().toString(),
  }),
  toObjectPreview(value) {
    return {
      type: 'boolean',
      value: value.booleanValue(),
      description: value.booleanValue().toString(),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => value.booleanValue().toString(),
};

export const Symbol: Inspector<SymbolValue> = {
  toRemoteObject: (value, getObjectId) => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    objectId: getObjectId(value),
  }),
  toPropertyPreview: (name, value) => ({
    name, type: 'symbol', value: SymbolDescriptiveString(value).stringValue(),
  }),
  toObjectPreview: (value) => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    overflow: false,
    properties: [],
  }),
  toDescription: (value) => SymbolDescriptiveString(value).stringValue(),
};

export const String: Inspector<JSStringValue> = {
  toRemoteObject: (value) => ({ type: 'string', value: value.stringValue() }),
  toPropertyPreview(name, value) {
    return {
      name, type: 'string', value: value.stringValue(),
    };
  },
  toObjectPreview(value) {
    return {
      type: 'string',
      description: value.stringValue(),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => value.stringValue(),
};

export const Number: Inspector<NumberValue> = {
  toRemoteObject(value) {
    const v = value.value;
    let description = v.toString();
    const isNeg0 = Object.is(v, -0);
    // Includes values `-0`, `NaN`, `Infinity`, `-Infinity`, and bigint literals.
    if (isNeg0 || !globalThis.Number.isFinite(v)) {
      if (typeof v === 'bigint') {
        description += 'n';
        return { type: 'bigint', unserializableValue: description, description };
      }
      return { type: 'number', unserializableValue: description, description: isNeg0 ? '-0' : description };
    }
    return { type: 'number', value: v, description };
  },
  toPropertyPreview(name, value, context) {
    return {
      name, type: 'number', value: this.toDescription(value, context),
    };
  },
  toObjectPreview(value, context) {
    return {
      type: 'number',
      description: this.toDescription(value, context),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => {
    const r = value.value;
    return value instanceof BigIntValue ? `${r}n` : r.toString();
  },
};
