import { HostGetImportMetaProperties, HostFinalizeImportMeta } from '../engine.mjs';
import { isNewTarget, isImportMeta } from '../ast.mjs';
import {
  Assert,
  GetNewTarget,
  GetActiveScriptOrModule,
  ObjectCreate,
  CreateDataProperty,
} from '../abstract-ops/all.mjs';
import { AbstractModuleRecord } from '../modules.mjs';
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
  const module = GetActiveScriptOrModule();
  Assert(module instanceof AbstractModuleRecord);
  let importMeta = module.ImportMeta;
  if (importMeta === Value.undefined) {
    importMeta = ObjectCreate(Value.null);
    const importMetaValues = X(HostGetImportMetaProperties(module));
    for (const p of importMetaValues) {
      X(CreateDataProperty(importMeta, p.Key, p.Value));
    }
    X(HostFinalizeImportMeta(importMeta, module));
    module.ImportMeta = importMeta;
    return importMeta;
  } else {
    Assert(Type(importMeta) === 'Object');
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
