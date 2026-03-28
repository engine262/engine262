import { ObjectInspector } from './objects.mts';
import { type PromiseObject, Value } from '#self';

export const Promise = new ObjectInspector<PromiseObject>('Promise', 'promise', () => 'Promise', {
  internalProperties: (value) => [['[[PromiseState]]', Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || Value.undefined]],
});
