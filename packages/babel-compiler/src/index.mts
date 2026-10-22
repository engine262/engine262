import type { NodePath, PluginObject, PluginPass } from '@babel/core';
import { template, types as t } from '@babel/core';
import {
  analyzeEvaluatorDataFlow,
  planEvaluatorFrames,
  GCTransformError,
} from './gc-analysis.mjs';
import {
  analyzeBuiltinFunctionCalls,
  analyzeJobCreations,
  analyzeIteratorClosureCalls,
  type BuiltinFunctionCallAnalysis,
  type BuiltinFunctionCaptureReference,
  type IteratorClosureCallAnalysis,
  type JobCallAnalysis,
} from './builtin-function-analysis.mjs';
import { analyzeRecordCreations } from './record-analysis.mjs';
import createTransforms from './transforms.mjs';
import type { TypeScriptProgramProvider } from './typescript-project.mjs';
import { analyzeValueLiteralCreations, type ValueLiteralCreationPlan } from './value-analysis.mjs';

export interface CompilerOptions {
  readonly project: TypeScriptProgramProvider;
  readonly internals?: string;
  readonly valueDefinitionPath?: string;
}

export default function engine262Compiler(
  _api: unknown,
  rawOptions: object,
): PluginObject<PluginPass> {
  const options = rawOptions as Partial<CompilerOptions>;
  const project = options?.project;
  if (!project || typeof project.getProgram !== 'function') {
    throw new TypeError('@engine262/babel-compiler requires a TypeScript project service in the project option');
  }
  const internals = options.internals ?? '@engine262/engine262';
  return {
    name: '@engine262/babel-compiler',
    inherits: () => createTransforms({ internals }),
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename;
          if (!filename) throw new Error('@engine262/babel-compiler requires Babel to provide a filename');
          const program = project.getProgram(filename, state.file.code);
          const compilerState = state as PluginPass & {
            recordCreations: Set<string>;
            valueLiteralCreations: Map<string, Pick<ValueLiteralCreationPlan, 'constructor' | 'localConstructor'>>;
          };
          compilerState.recordCreations = new Set(
            analyzeRecordCreations(filename, program).map(({ start, end }) => `${start}:${end}`),
          );
          compilerState.valueLiteralCreations = new Map(
            analyzeValueLiteralCreations(filename, program, {
              valueDefinitionPath: options.valueDefinitionPath,
            }).map(({ start, end, constructor, localConstructor }) => [
              `${start}:${end}`,
              { constructor, localConstructor },
            ]),
          );
          const builtinFunctions = analyzeBuiltinFunctionCalls(filename, {
            program,
            valueDefinitionPath: options.valueDefinitionPath,
          });
          transformBuiltinFunctionCalls(programPath, builtinFunctions);
          const iteratorClosures = analyzeIteratorClosureCalls(filename, {
            program,
            valueDefinitionPath: options.valueDefinitionPath,
          });
          transformIteratorClosureCalls(programPath, iteratorClosures);
          const jobs = analyzeJobCreations(filename, {
            program,
            valueDefinitionPath: options.valueDefinitionPath,
          });
          transformJobCreations(programPath, jobs);
          const flows = analyzeEvaluatorDataFlow(filename, {
            program,
            valueDefinitionPath: options.valueDefinitionPath,
          });
          const { plans, diagnostics } = planEvaluatorFrames(flows);
          const diagnostic = diagnostics[0];
          if (diagnostic) throw new GCTransformError(diagnostic.message, diagnostic.yield.start);
          if (plans.length === 0) return;

          const statements = new Map<string, NodePath<t.Statement>>();
          programPath.traverse({
            Statement(path) {
              if (path.node.start !== null && path.node.start !== undefined && path.node.end !== null && path.node.end !== undefined) {
                statements.set(`${path.node.start}:${path.node.end}`, path as NodePath<t.Statement>);
              }
            },
          });
          const nextUsing = new Map<number, number>();
          for (const plan of plans) {
            const target = statements.get(`${plan.insertion.start}:${plan.insertion.end}`);
            if (!target) throw new Error(`@engine262/babel-compiler: failed to locate GC frame insertion at ${filename}:${plan.insertion.start}`);
            const index = (nextUsing.get(plan.functionStart) ?? 0) + 1;
            nextUsing.set(plan.functionStart, index);
            const resource = index === 1 ? '_' : `_${index}`;
            const captures = t.arrowFunctionExpression([], t.objectExpression(
              plan.names.map((name) => t.objectProperty(t.identifier(name), t.identifier(name), false, true)),
            ));
            const frameName = template.expression.ast(plan.frameName);
            const statement = t.variableDeclaration('using', [t.variableDeclarator(
              t.identifier(resource),
              t.callExpression(t.identifier('captureEvaluatorFrame'), [captures, frameName]),
            )]);
            if (plan.insertion.mode === 'before') target.insertBefore(statement);
            else target.insertAfter(statement);
          }
          addImport(programPath, internals, 'captureEvaluatorFrame');
        },
      },
    },
  };
}

function transformIteratorClosureCalls(
  program: NodePath<t.Program>,
  calls: readonly IteratorClosureCallAnalysis[],
): void {
  const paths = new Map<string, NodePath<t.CallExpression>>();
  program.traverse({
    CallExpression(path) {
      const { start, end } = path.node;
      if (start !== null && start !== undefined && end !== null && end !== undefined) {
        paths.set(`${start}:${end}`, path);
      }
    },
  });
  for (const analysis of calls) {
    if (!analysis.canAutoInsert || analysis.captures) continue;
    const start = analysis.call.getStart();
    const end = analysis.call.getEnd();
    const call = paths.get(`${start}:${end}`);
    if (!call) {
      throw new Error(`@engine262/babel-compiler: failed to locate CreateIteratorFromClosure at ${start}`);
    }
    const optionsArgument = call.node.arguments[3];
    const captures = t.objectProperty(t.identifier('captures'), createCaptureProvider(analysis.references));
    if (optionsArgument && t.isObjectExpression(optionsArgument)) {
      optionsArgument.properties.push(captures);
      continue;
    }
    const properties = [captures];
    if (optionsArgument) {
      if (!t.isExpression(optionsArgument)) {
        throw new Error(`@engine262/babel-compiler: invalid CreateIteratorFromClosure options at ${start}`);
      }
      properties.unshift(t.objectProperty(t.identifier('extraSlots'), optionsArgument));
    }
    call.node.arguments = [
      ...call.node.arguments.slice(0, 3),
      t.objectExpression(properties),
    ];
  }
}

function transformJobCreations(
  program: NodePath<t.Program>,
  jobs: readonly JobCallAnalysis[],
): void {
  const paths = new Map<string, NodePath<t.NewExpression>>();
  program.traverse({
    NewExpression(path) {
      const { start, end } = path.node;
      if (start !== null && start !== undefined && end !== null && end !== undefined) {
        paths.set(`${start}:${end}`, path);
      }
    },
  });
  for (const analysis of jobs) {
    if (!analysis.canAutoInsert || analysis.captures) continue;
    const start = analysis.call.getStart();
    const end = analysis.call.getEnd();
    const job = paths.get(`${start}:${end}`);
    if (!job) {
      throw new Error(`@engine262/babel-compiler: failed to locate Job at ${start}`);
    }
    const options = analysis.options;
    const argument = job.node.arguments?.[0];
    if (!options || !argument || !t.isObjectExpression(argument)) {
      throw new Error(`@engine262/babel-compiler: invalid Job options at ${start}`);
    }
    argument.properties.push(t.objectProperty(t.identifier('captures'), createCaptureProvider(analysis.references)));
  }
}

function transformBuiltinFunctionCalls(
  program: NodePath<t.Program>,
  calls: readonly BuiltinFunctionCallAnalysis[],
): void {
  const paths = new Map<string, NodePath<t.CallExpression>>();
  program.traverse({
    CallExpression(path) {
      const { start, end } = path.node;
      if (start !== null && start !== undefined && end !== null && end !== undefined) {
        paths.set(`${start}:${end}`, path);
      }
    },
  });
  for (const analysis of calls) {
    if (!analysis.canAutoInsert || analysis.captures) continue;
    const start = analysis.call.getStart();
    const end = analysis.call.getEnd();
    const call = paths.get(`${start}:${end}`);
    if (!call) {
      throw new Error(`@engine262/babel-compiler: failed to locate CreateBuiltinFunction at ${start}`);
    }
    const captures = createCaptureProvider(analysis.references);
    if (analysis.name === 'CreateBuiltinFunction.from') {
      const steps = call.node.arguments[0];
      if (!steps || !t.isExpression(steps)) {
        throw new Error(`@engine262/babel-compiler: invalid CreateBuiltinFunction.from steps at ${start}`);
      }
      const options = call.node.arguments[1];
      if (options && t.isObjectExpression(options)) {
        if (!options.properties.some((property) => (
          t.isObjectMethod(property)
            ? t.isIdentifier(property.key, { name: 'name' })
            : t.isObjectProperty(property)
              && t.isIdentifier(property.key, { name: 'name' })
        ))) {
          options.properties.unshift(t.objectProperty(
            t.identifier('name'),
            t.memberExpression(t.cloneNode(steps), t.identifier('name')),
          ));
        }
        options.properties.push(t.objectProperty(t.identifier('captures'), captures));
      } else {
        call.node.arguments = [
          steps,
          t.objectExpression([
            t.objectProperty(
              t.identifier('name'),
              t.memberExpression(t.cloneNode(steps), t.identifier('name')),
            ),
            t.objectProperty(t.identifier('captures'), captures),
          ]),
        ];
      }
      continue;
    }
    if (analysis.name === 'CreateBuiltinFunction') {
      const options = analysis.options;
      if (options) {
        const argument = call.node.arguments[4];
        if (!argument || !t.isObjectExpression(argument)) {
          throw new Error(`@engine262/babel-compiler: invalid CreateBuiltinFunction options at ${start}`);
        }
        argument.properties.push(t.objectProperty(t.identifier('captures'), captures));
      } else {
        const properties = [
          ...call.node.arguments.slice(4).map((argument, index) => {
            if (!t.isExpression(argument)) {
              throw new Error(`@engine262/babel-compiler: invalid CreateBuiltinFunction positional option at ${start}`);
            }
            return t.objectProperty(
              t.identifier(['realm', 'prototype', 'prefix', 'async'][index]!),
              argument,
            );
          }),
          t.objectProperty(t.identifier('captures'), captures),
        ];
        call.node.arguments = [
          ...call.node.arguments.slice(0, 4),
          t.objectExpression(properties),
        ];
      }
      continue;
    }
  }
}

function createCaptureProvider(
  references: readonly BuiltinFunctionCaptureReference[],
): t.Expression {
  if (references.length === 0) return t.nullLiteral();
  const properties = [...references]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((reference) => {
      const expression = template.expression.ast(reference.expression.getText());
      if (reference.path.length === 0 && t.isIdentifier(expression)) {
        return t.objectProperty(t.identifier(reference.displayName), expression, false, true);
      }
      return t.objectProperty(t.stringLiteral(reference.displayName), expression);
    });
  return t.arrowFunctionExpression([], t.objectExpression(properties));
}

function addImport(program: NodePath<t.Program>, source: string, name: string): void {
  for (const statement of program.get('body')) {
    if (
      !statement.isImportDeclaration()
      || statement.node.source.value !== source
      || statement.node.importKind === 'type'
    ) continue;
    const named = statement.node.specifiers.find((specifier) => (
      t.isImportSpecifier(specifier)
      && specifier.importKind !== 'type'
      && t.isIdentifier(specifier.imported, { name })
    ));
    if (named) return;
    statement.node.specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
    return;
  }
  program.unshiftContainer('body', t.importDeclaration(
    [t.importSpecifier(t.identifier(name), t.identifier(name))],
    t.stringLiteral(source),
  ));
}

export {
  analyzeEvaluatorDataFlow,
  analyzeEvaluatorFrames,
  isIdentifierReference,
  planEvaluatorFrames,
  referencedSymbols,
  GCTransformError,
  type EvaluatorBindingLifetime,
  type EvaluatorDataFlow,
  type FrameInsertionPlan,
  type FramePlanningOptions,
  type FramePlanningDiagnostic,
  type FramePlanningResult,
} from './gc-analysis.mjs';
export {
  analyzeBuiltinFunctionCalls,
  type BuiltinFunctionAnalysisOptions,
  type BuiltinFunctionCallAnalysis,
  type BuiltinFunctionCaptureReference,
  analyzeIteratorClosureCalls,
  type IteratorClosureCallAnalysis,
  analyzeJobCreations,
  type JobCallAnalysis,
} from './builtin-function-analysis.mjs';
export { isGCRelevant } from './gc-types.mjs';
export {
  analyzeRecordClasses,
  analyzeRecordCreations,
  isRecordClass,
  type RecordClassAnalysisResult,
  type RecordClassDiagnostic,
  type RecordClassDiagnosticKind,
  type RecordClassInsertionFix,
} from './record-analysis.mjs';
export {
  analyzeQMacroTransformations,
  qMacroNames,
  type QMacroAnalysisResult,
  type QMacroName,
  type QMacroSyntaxNode,
  type QMacroTransformationDiagnostic,
  type QMacroTransformationPlan,
  type QMacroVisitorKeys,
} from './q-macro-analysis.mjs';
export { analyzeValueLiteralCreations, type ValueLiteralConstructor } from './value-analysis.mjs';
export {
  createTypeScriptProjectService,
  type TypeScriptProgramProvider,
  type TypeScriptProjectService,
} from './typescript-project.mjs';
