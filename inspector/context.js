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
    switch (engine262.Type(object)) {
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
          } else if (engine262.IsArray(object) === engine262.Value.true) {
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
      const properties = this.getPropertyPreview(object, options);
      let entries;
      if ('MapData' in object) {
        entries = object.MapData.map((d) => ({
          key: this.toRemoteObject(d.Key, options).preview,
          value: this.toRemoteObject(d.Value, options).preview,
        }));
      }
      this.previewStack.pop();
      result.preview = {
        type: result.type,
        subtype: result.subtype,
        overflow: properties.length > 5,
        properties: properties.slice(0, 5),
        entries,
      };
    }
    return result;
  }

  getProperties(object, options) {
    const wrap = (v) => this.toRemoteObject(v, options);

    const properties = [];
    const internalProperties = [];

    let p = object;
    while (p !== engine262.Value.null) {
      const keys = p.OwnPropertyKeys();
      if (engine262.isAbruptCompletion(keys)) {
        return keys;
      }

      for (const key of keys) {
        const desc = p.GetOwnProperty(key);
        if (engine262.isAbruptCompletion(desc)) {
          return desc;
        }
        if (options.accessorPropertiesOnly && desc.Value) {
          continue;
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
          isOwn: p === object,
          symbol: key.stringValue ? undefined : wrap(key),
        };
        properties.push(descriptor);
      }

      if (options.ownProperties) {
        break;
      }
      p = p.GetPrototypeOf();
      if (engine262.isAbruptCompletion(p)) {
        return p;
      }
    }

    if ('PromiseState' in object) {
      internalProperties.push({
        name: '[[PromiseState]]',
        value: {
          type: 'string',
          value: object.PromiseState,
        },
      });
      internalProperties.push({
        name: '[[PromiseResult]]',
        value: wrap(object.PromiseResult),
      });
    }

    return { properties, internalProperties };
  }

  getPropertyPreview(object, options) {
    const wrap = (v) => this.toRemoteObject(v, options);

    const keys = object.OwnPropertyKeys();
    if (engine262.isAbruptCompletion(keys)) {
      return keys;
    }

    const properties = [];
    for (const key of keys) {
      const desc = object.GetOwnProperty(key);
      if (engine262.isAbruptCompletion(desc)) {
        return desc;
      }
      const descriptor = {
        name: key.stringValue
          ? key.stringValue()
          : `Symbol(${key.Description.stringValue ? key.Description.stringValue() : ''})`,
      };
      if (desc.Value) {
        desc.valuePreview = wrap(desc.Value).preview;
        switch (engine262.Type(desc.Value)) {
          case 'Object':
            if ('Call' in desc.Value) {
              descriptor.type = 'function';
            } else {
              descriptor.type = 'object';
              if ('PromiseState' in desc.Value) {
                descriptor.subtype = 'promise';
              } else if ('MapData' in desc.Value) {
                descriptor.subtype = 'map';
              } else if ('SetData' in desc.Value) {
                descriptor.subtype = 'set';
              } else if ('ErrorData' in desc.Value) {
                descriptor.subtype = 'error';
              } else if ('TypedArrayName' in desc.Value) {
                descriptor.subtype = 'typedarray';
              } else if ('DataView' in desc.Value) {
                descriptor.subtype = 'dataview';
              } else if ('ProxyTarget' in desc.Value) {
                descriptor.subtype = 'proxy';
              } else if ('DateValue' in desc.Value) {
                descriptor.subtype = 'date';
              } else if ('GeneratorState' in desc.Value) {
                descriptor.subtype = 'generator';
              } else if (engine262.IsArray(desc.Value) === engine262.Value.true) {
                descriptor.subtype = 'array';
              }
            }
            break;
          case 'Null':
            descriptor.type = 'object';
            descriptor.subtype = 'null';
            descriptor.value = 'null';
            break;
          case 'Undefined':
            descriptor.type = 'undefined';
            descriptor.value = 'undefined';
            break;
          case 'String':
            descriptor.type = 'string';
            descriptor.value = desc.Value.stringValue();
            break;
          case 'Number': {
            descriptor.type = 'number';
            descriptor.value = desc.Value.numberValue().toString();
            break;
          }
          case 'Boolean':
            descriptor.type = 'boolean';
            descriptor.value = desc.Value.booleanValue().toString();
            break;
          case 'BigInt':
            descriptor.type = 'bigint';
            descriptor.value = `${desc.Value.bigintValue().toString()}n`;
            break;
          case 'Symbol': {
            descriptor.type = 'symbol';
            const description = desc.Value.Description === engine262.Value.undefined
              ? ''
              : desc.Value.Description.stringValue();
            descriptor.value = `Symbol(${description})`;
            break;
          }
          default:
            throw new RangeError();
        }
      } else {
        desc.type = 'accessor';
      }
      properties.push(descriptor);
    }

    if ('PromiseState' in object) {
      properties.push({
        name: '[[PromiseState]]',
        type: 'string',
        value: object.PromiseState,
      });
    }

    return properties;
  }

  createEvaluationResult(completion, options) {
    if (engine262.isAbruptCompletion(completion)) {
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
