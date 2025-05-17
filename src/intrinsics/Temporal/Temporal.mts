// Using spec: 87c74ec2ae7d55cf10c58674478784d09f323ff1

import { type Realm } from '#self';
import { bootstrapPrototype } from '../bootstrap.mts';
import { bootstrapTemporalPlainDate } from './PlainDate.mts';
import { bootstrapTemporalNow } from './Now.mts';

export function bootstrapTemporal(realmRec: Realm) {
  const TemporalObject = bootstrapPrototype(realmRec, [
    ['Now', bootstrapTemporalNow(realmRec)],
    ['PlainDate', bootstrapTemporalPlainDate(realmRec)],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Temporal');

  realmRec.Intrinsics['%Temporal%'] = TemporalObject;
}
