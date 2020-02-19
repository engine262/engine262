// #sec-importedlocalnames
export function ImportedLocalNames(importEntries) {
  // 1. Let localNames be a new empty List.
  const localNames = [];
  // 2. For each ImportEntry Record i in importEntries, do
  for (const i of importEntries) {
    // a. Append i.[[LocalName]] to localNames.
    localNames.push(i.LocalName);
  }
  // 3. Return localNames.
  return localNames;
}
