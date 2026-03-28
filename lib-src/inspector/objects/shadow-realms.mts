import { ObjectInspector } from './objects.mts';
import type { ShadowRealmObject } from '#self';

export const ShadowRealm = new ObjectInspector<ShadowRealmObject>('ShadowRealm', undefined, () => 'ShadowRealm', {
  internalProperties: (realm) => [['[[GlobalObject]]', realm.ShadowRealm.GlobalObject]],
});
