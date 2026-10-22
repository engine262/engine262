/* node:coverage disable */
export class OutOfRange extends RangeError {
  private constructor(public value: never) {
    super(`Value ${String(value)} is out of range`, { cause: value });
  }

  static exhaustive(value: never): OutOfRange {
    return new OutOfRange(value);
  }

  static nonExhaustive(value: unknown): OutOfRange {
    return new OutOfRange(value as never);
  }
}
/* node:coverage enable */

export function callable<Class extends object>(
  onCalled?: (target: Class, thisArg: unknown, args: unknown[]) => unknown,
) {
  return function decorator(classValue: Class, _classContext: ClassDecoratorContext<Class & (new (...args: readonly unknown[]) => unknown)>) {
    const handler: ProxyHandler<Class> = Object.freeze({
      __proto__: null,
      apply: onCalled ?? ((target, _thisArg, args) => Reflect.construct(
        target as new (...args: unknown[]) => unknown,
        args,
        callableClass as new (...args: unknown[]) => unknown,
      )),
    });
    const callableClass = new Proxy(classValue, handler);
    return callableClass;
  };
}

/** Marks a class as a record type. */
export function record<Class extends object>(classValue: Class) {
  return classValue;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface record {
  // a marker interface
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export const isArray: (arg: unknown) => arg is readonly unknown[] = Array.isArray;

export function __ts_cast__<T>(_value: unknown): asserts _value is T { }
