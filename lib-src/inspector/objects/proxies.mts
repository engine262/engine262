import { ObjectInspector } from './objects.mts';
import { type ProxyObject, IsCallable, ObjectValue } from '#self';

export const Proxy = new ObjectInspector<ProxyObject>('Proxy', 'proxy', (value) => {
  if (IsCallable(value.ProxyTarget)) {
    return 'Proxy(Function)';
  }
  if (value.ProxyTarget instanceof ObjectValue) {
    return 'Proxy(Object)';
  }
  return 'Proxy';
});
