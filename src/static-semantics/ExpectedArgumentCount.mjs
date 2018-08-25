export function ExpectedArgumentCount() {}

// FormalParameters : [empty]
function ExpectedArgumentCount_Empty() {
  return 0;
}

function ExpectedArgumentCount_FormalParameterList_FunctionRestParameter() {
  return ExpectedArgumentCount_FormalParameterList_FormalParameter();
}

function ExpectedArgumentCount_FormalParameterList_FormalParameter() {
  const count = ExpectedArgumentCount(FormalParameterList);
  if (HasInitializer(FormalParameterList) || HasInitializer(FormalParameter)) {
    return count;
  }
  return count + 1;
}
