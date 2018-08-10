/* @flow */

/* ::
import type { Realm } from '../realm';
*/
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all';
import {
  New as NewValue,
} from '../value';

export function CreateFunctionPrototype(realmRec /* : Realm */) {
  const proto = CreateBuiltinFunction(() => NewValue(undefined), [], realmRec);
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];

  realmRec.Intrinsics['%FunctionPrototype%'] = proto;
}
