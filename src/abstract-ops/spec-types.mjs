/* ::
export type List<T> = T[];
declare type PropertyDescriptor = {
  Value: ?Value,
  Get: ?FunctionValue,
  Set: ?FunctionValue,
  Writable: ?boolean,
  Enumerable: boolean,
  Configurable: boolean,
};
export type { PropertyDescriptor };
*/

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Get' in Desc) && !('Set' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Value' in Desc) && !('Writable' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return false;
  }

  return true;
}
