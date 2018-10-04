// #sec-static-semantics-nonconstructormethoddefinitions
//   ClassElementList :
//     ClassElement
//     ClassElementList ClassElement
function NonConstructorMethodDefinitions_ClassElementList(ClassElementList) {
  return ClassElementList.filter(ClassElement => ClassElement.kind !== 'constructor');
}

// (implicit)
//   ClassBody : ClassElementList
export function NonConstructorMethodDefinitions_ClassBody = NonConstructorMethodDefinitions_ClassElementList;
