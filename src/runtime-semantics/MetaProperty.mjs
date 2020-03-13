import { HostGetImportMetaProperties, HostFinalizeImportMeta } from '../engine.mjs';
import { isNewTarget, isImportMeta } from '../ast.mjs';
import {
  Assert,
  GetNewTarget,
  GetActiveScriptOrModule,
  OrdinaryObjectCreate,
  CreateDataProperty,
} from '../abstract-ops/all.mjs';
import { SourceTextModuleRecord } from '../modules.mjs';
import { X } from '../completion.mjs';
import { Type, Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.3.9.1 #sec-meta-properties-runtime-semantics-evaluation
// NewTarget : `new` `.` `target`
function Evaluate_NewTarget() {
  return GetNewTarget();
}

// https://tc39.es/proposal-import-meta/#sec-meta-properties
// ImportMeta : `import` `.` `meta`
function Evaluate_ImportMeta() {
  // 1. Let module be GetActiveScriptOrModule().
  const module = GetActiveScriptOrModule();
  // 2. Assert: module is a Source Text Module Record;
  Assert(module instanceof SourceTextModuleRecord);
  // 3. Let importMeta be module.ImportMeta.
  let importMeta = module.ImportMeta;
  // 4. If importMeta is empty, then
  if (importMeta === undefined) {
    // a. Set importMeta to ! OrdinaryObjectCreate(null).
    importMeta = X(OrdinaryObjectCreate(Value.null));
    // b. Let importMetaValues be ! HostGetImportMetaProperties(module).
    const importMetaValues = X(HostGetImportMetaProperties(module));
    // c. For each Record { [[Key]], [[Value]] } p that is an element of importMetaValues,
    for (const p of importMetaValues) {
      // i. Perform ! CreateDataPropertyOrThrow(importMeta, p.[[Key]], p.[[Value]]).
      X(CreateDataProperty(importMeta, p.Key, p.Value));
    }
    // d. Perform ! HostFinalizeImportMeta(importMeta, module).
    X(HostFinalizeImportMeta(importMeta, module));
    // e. Set module.[[ImportMeta]] to importMeta.
    module.ImportMeta = importMeta;
    // f. Return importMeta.
    return importMeta;
  } else {
    // a. Assert: Type(importMeta) is Object.
    Assert(Type(importMeta) === 'Object');
    // b. Return importMeta.
    return importMeta;
  }
}

// #prod-MetaProperty
// MetaProperty : NewTarget
export function* Evaluate_MetaProperty(MetaProperty) { // eslint-disable-line require-yield
  switch (true) {
    case isNewTarget(MetaProperty):
      return Evaluate_NewTarget();
    case isImportMeta(MetaProperty):
      return Evaluate_ImportMeta();
    default:
      throw new OutOfRange('Evaluate_MetaProperty', MetaProperty);
  }
}
