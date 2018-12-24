// 14.6.10 #sec-static-semantics-nonconstructormethoddefinitions
//   ClassElementList :
//     ClassElement
//     ClassElementList ClassElement
function NonConstructorMethodDefinitions_ClassElementList(ClassElementList) {
  return ClassElementList.filter((ClassElement) => ClassElement.kind !== 'constructor');
}

// (implicit)
//   ClassBody : ClassElementList
export const NonConstructorMethodDefinitions_ClassBody = NonConstructorMethodDefinitions_ClassElementList;
