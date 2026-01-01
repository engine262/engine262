import {
  type PrivateName, type GCMarker, Assert, JSStringValue, NullValue,
} from '#self';

/** https://tc39.es/ecma262/#sec-privateenvironment-records */
export class PrivateEnvironmentRecord {
  readonly OuterPrivateEnvironment: PrivateEnvironmentRecord | NullValue;

  readonly Names: PrivateName[] = [];

  /** https://tc39.es/ecma262/#sec-newprivateenvironment */
  constructor(outerEnv: PrivateEnvironmentRecord | NullValue) {
    this.OuterPrivateEnvironment = outerEnv;
  }

  mark(m: GCMarker) {
    this.Names.forEach((name) => {
      m(name);
    });
  }
}

/** https://tc39.es/ecma262/#sec-resolve-private-identifier */
export function ResolvePrivateIdentifier(privEnv: PrivateEnvironmentRecord, identifier: JSStringValue) {
  // 1. Let names be privEnv.[[Names]].
  const names = privEnv.Names;
  // 2. If names contains a Private Name whose [[Description]] is identifier, then
  const name = names.find((n) => n.Description.stringValue() === identifier.stringValue());
  if (name) {
    // a. Let name be that Private Name.
    // b. Return name.
    return name;
  } else { // 3. Else,
    // a. Let outerPrivEnv be privEnv.[[OuterPrivateEnvironment]].
    const outerPrivEnv = privEnv.OuterPrivateEnvironment;
    // b. Assert: outerPrivEnv is not null.
    Assert(!(outerPrivEnv instanceof NullValue));
    // c. Return ResolvePrivateIdentifier(outerPrivEnv, identifier).
    return ResolvePrivateIdentifier(outerPrivEnv, identifier);
  }
}
