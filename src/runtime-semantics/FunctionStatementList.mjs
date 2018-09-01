import { Evaluate_StatementList } from '../evaluator.mjs';

// FunctionStatementList [Yield, Await] :
//   StatementList [?Yield, ?Await, +Return] opt
export const Evaluate_FunctionStatementList = Evaluate_StatementList;
