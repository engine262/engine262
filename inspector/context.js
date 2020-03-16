'use strict';

const engine262 = require('..');

const contexts = [];

class InspectorContext {
  constructor(realm) {
    this.realm = realm;
    this.idToObject = new Map();
    this.objectToId = new Map();
    this.objectCounter = 0;
    this.previewStack = [];
  }

  internObject(object, group = 'default') {
    if (this.objectToId.has(object)) {
      return this.objectToId.get(object);
    }
    const id = `${group}:${this.objectCounter}`;
    this.objectCounter += 1;
    this.idToObject.set(id, object);
    this.objectToId.set(object, id);
    return id;
  }

  releaseObjectGroup(group) {
    for (const [id, object] of this.idToObject.entries()) {
      if (id.startsWith(group)) {
        this.idToObject.delete(id);
        this.objectToId.delete(object);
      }
    }
  }

  getObject(objectId) {
    return this.idToObject.get(objectId);
  }

  toRemoteObject(object, options) {
    const result = {};
    switch (engine262.Abstract.Type(object)) {
      case 'Object':
        result.objectId = this.internObject(object, options.objectGroup);
        if ('Call' in object) {
          result.type = 'function';
        } else {
          result.type = 'object';
          if ('PromiseState' in object) {
            result.subtype = 'promise';
          } else if ('MapData' in object) {
            result.subtype = 'map';
          } else if ('SetData' in object) {
            result.subtype = 'set';
          } else if ('ErrorData' in object) {
            result.subtype = 'error';
          } else if ('TypedArrayName' in object) {
            result.subtype = 'typedarray';
          } else if ('DataView' in object) {
            result.subtype = 'dataview';
          } else if ('ProxyTarget' in object) {
            result.subtype = 'proxy';
          } else if ('DateValue' in object) {
            result.subtype = 'date';
          } else if ('GeneratorState' in object) {
            result.subtype = 'generator';
          } else if (engine262.Abstract.IsArray(object) === engine262.Value.true) {
            result.subtype = 'array';
          }
        }
        break;
      case 'Null':
        result.type = 'object';
        result.subtype = 'null';
        result.value = null;
        break;
      case 'Undefined':
        result.type = 'undefined';
        break;
      case 'String':
        result.type = 'string';
        result.value = object.stringValue();
        break;
      case 'Number': {
        result.type = 'number';
        const v = object.numberValue();
        if (!Number.isFinite(v)) {
          result.unserializableValue = v.toString();
        } else {
          result.value = v;
        }
        break;
      }
      case 'Boolean':
        result.type = 'boolean';
        result.value = object.booleanValue();
        break;
      case 'BigInt':
        result.type = 'bigint';
        result.unserializableValue = `${object.bigintValue().toString()}n`;
        break;
      case 'Symbol':
        result.type = 'symbol';
        result.description = object.Description === engine262.Value.undefined
          ? undefined
          : object.Description.stringValue();
        break;
      default:
        throw new RangeError();
    }
    if (options.generatePreview
        && result.type === 'object'
        && result.subtype !== 'null'
        && !this.previewStack.includes(object)) {
      this.previewStack.push(object);
      result.preview = {
        type: result.type,
        subtype: result.subtype,
        overflow: false,
        properties: this.getProperties(object, options),
      };
      this.previewStack.pop();
    }
    return result;
  }

  getProperties(object, options) {
    const wrap = (v) => this.toRemoteObject(v, options);

    const keys = object.OwnPropertyKeys();
    if (keys instanceof engine262.AbruptCompletion) {
      return keys;
    }

    const properties = [];
    for (const key of keys) {
      const desc = object.GetOwnProperty(key);
      if (desc instanceof engine262.AbruptCompletion) {
        return desc;
      }
      const descriptor = {
        name: key.stringValue
          ? key.stringValue()
          : undefined,
        value: desc.Value ? wrap(desc.Value) : undefined,
        writable: desc.Writable === engine262.Value.true,
        get: desc.Get ? wrap(desc.Get) : undefined,
        set: desc.Set ? wrap(desc.Set) : undefined,
        configurable: desc.Configurable === engine262.Value.true,
        enumerable: desc.Enumerable === engine262.Value.true,
        wasThrown: false,
        isOwn: true,
        symbol: key.stringValue ? undefined : wrap(key),
      };
      properties.push(descriptor);
    }

    return properties;
  }

  createEvaluationResult(completion, options) {
    if (completion instanceof engine262.AbruptCompletion) {
      return {
        exceptionDetails: {
          text: 'uh oh',
          lineNumber: 0,
          columnNumber: 0,
          exception: this.toRemoteObject(completion.Value, options),
        },
      };
    } else {
      return {
        result: this.toRemoteObject(completion.Value, options),
      };
    }
  }
}

function attachRealm(realm) {
  contexts.push(new InspectorContext(realm));
}

function getContext(id) {
  return contexts[id] || contexts[0];
}

module.exports = { attachRealm, getContext };
