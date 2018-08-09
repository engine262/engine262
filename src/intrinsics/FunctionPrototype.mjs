/* @flow */

/* ::
import type { Realm } from '../realm.mjs';
*/
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function CreateFunctionPrototype(realmRec /* : Realm */) {
  const proto = CreateBuiltinFunction(() => NewValue(undefined), [], realmRec);
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];

  realmRec.Intrinsics['%FunctionPrototype%'] = proto;
}
