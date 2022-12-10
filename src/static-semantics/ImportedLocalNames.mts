import type { JSStringValue } from '../value.mjs';
import type { ImportEntry } from './ImportEntries.mjs';

/** http://tc39.es/ecma262/#sec-importedlocalnames */
export function ImportedLocalNames(importEntries: ImportEntry[]) {
  // 1. Let localNames be a new empty List.
  const localNames: JSStringValue[] = [];
  // 2. For each ImportEntry Record i in importEntries, do
  for (const i of importEntries) {
    // a. Append i.[[LocalName]] to localNames.
    localNames.push(i.LocalName);
  }
  // 3. Return localNames.
  return localNames;
}