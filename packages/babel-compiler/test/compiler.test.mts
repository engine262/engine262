/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as babel from '@babel/core';
import { types as babelTypes } from '@babel/core';
import ts from 'typescript';
import { expect, test } from 'vitest';
import transformer, {
  analyzeEvaluatorDataFlow,
  analyzeEvaluatorFrames,
  analyzeQMacroTransformations,
  analyzeRecordClasses,
  planEvaluatorFrames,
  createTypeScriptProjectService,
  type TypeScriptProgramProvider,
} from '../src/index.mts';

function compile(comment: string, file: string) {
  const filename = `/engine262-compiler-tests/${comment.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}.mts`;
  const program = programFor(filename, file);
  const result = transform(filename, file, program, { internals: '#self' });
  expect(result?.code).toMatchSnapshot(comment);
  expect(JSON.stringify(result?.map, undefined, 2)).toMatchSnapshot(`${comment} source map`);
}

function transform(
  filename: string,
  source: string,
  program: ts.Program,
  options: { readonly internals?: string; readonly valueDefinitionPath?: string } = {},
) {
  const project: TypeScriptProgramProvider = {
    getProgram: () => program,
  };
  return babel.transformSync(source, {
    filename,
    sourceFileName: 'unknown',
    parserOpts: { plugins: ['decorators', 'typescript'] },
    plugins: [[transformer, { project, ...options }]],
    sourceMaps: true,
  });
}

function programFor(fileName: string, source: string, extraFiles: ReadonlyMap<string, string> = new Map()) {
  const files = new Map(extraFiles);
  files.set(fileName, source);
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
    baseUrl: '/',
    paths: {
      '@engine262/engine262': ['engine262-compiler-tests/node_modules/@engine262/engine262/index.d.mts'],
    },
  };
  const defaultHost = ts.createCompilerHost(options);
  const virtualDirectories = new Set<string>();
  for (const name of files.keys()) {
    let directory = name.slice(0, name.lastIndexOf('/')) || '/';
    while (directory.length > 1) {
      virtualDirectories.add(directory);
      directory = directory.slice(0, directory.lastIndexOf('/')) || '/';
    }
    virtualDirectories.add('/');
  }
  const host: ts.CompilerHost = {
    ...defaultHost,
    directoryExists: (name) => virtualDirectories.has(name) || defaultHost.directoryExists?.(name) === true,
    fileExists: (name) => files.has(name) || defaultHost.fileExists(name),
    readFile: (name) => files.get(name) ?? defaultHost.readFile(name),
    getSourceFile: (name, languageVersion) => {
      const text = files.get(name);
      return text === undefined
        ? defaultHost.getSourceFile(name, languageVersion)
        : ts.createSourceFile(name, text, languageVersion, true);
    },
  };
  return ts.createProgram([...files.keys()], options, host);
}

test('requires a TypeScript project service', () => {
  expect(() => babel.transformSync('const value = 1;', {
    filename: '/engine262-compiler-tests/missing-program.mts',
    parserOpts: { plugins: ['typescript'] },
    plugins: [[transformer, {}]],
  })).toThrow('requires a TypeScript project service');
});

test('reuses language service state across incremental source updates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'engine262-project-service-'));
  const sourceDirectory = join(directory, 'src');
  const configFileName = join(directory, 'tsconfig.json');
  const valueFileName = join(sourceDirectory, 'value.mts');
  const evaluatorFileName = join(sourceDirectory, 'evaluator.mts');
  const initialSource = `
    import type { Value, ValueEvaluator } from './value.mjs';
    export function* Example(value: Value): ValueEvaluator {
      yield undefined;
      return value;
    }
  `;
  const updatedSource = `
    import type { Value, ValueEvaluator } from './value.mjs';
    export function* Example(value: Value): ValueEvaluator {
      const retained = value;
      yield undefined;
      return retained;
    }
  `;
  await mkdir(sourceDirectory);
  await writeFile(configFileName, JSON.stringify({
    compilerOptions: {
      strict: true,
      target: 'ESNext',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
    include: ['src/**/*.mts'],
  }));
  await writeFile(valueFileName, `
    export declare class Value { mark(): void; }
    export type ValueEvaluator = Generator<unknown, Value, unknown>;
  `);
  await writeFile(evaluatorFileName, initialSource);

  const project = createTypeScriptProjectService(configFileName);
  try {
    const initialProgram = project.getProgram(evaluatorFileName, initialSource);
    expect(project.getProgram(evaluatorFileName, initialSource)).toBe(initialProgram);
    const valueSourceFile = initialProgram.getSourceFile(valueFileName);
    expect(valueSourceFile).toBeDefined();

    const updatedProgram = project.getProgram(evaluatorFileName, updatedSource);
    expect(updatedProgram).not.toBe(initialProgram);
    expect(updatedProgram.getSourceFile(valueFileName)).toBe(valueSourceFile);
    expect(updatedProgram.getSourceFile(evaluatorFileName)?.text).toBe(updatedSource);
    expect(analyzeEvaluatorFrames(evaluatorFileName, {
      program: updatedProgram,
      valueDefinitionPath: valueFileName,
    })).toMatchObject([{ names: ['retained'] }]);
  } finally {
    project.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('routes files through referenced TypeScript projects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'engine262-project-references-'));
  const engineDirectory = join(directory, 'engine');
  const appDirectory = join(directory, 'app');
  const rootConfig = join(directory, 'tsconfig.json');
  const engineConfig = join(engineDirectory, 'tsconfig.json');
  const appConfig = join(appDirectory, 'tsconfig.json');
  const valueFileName = join(engineDirectory, 'value.mts');
  const indexFileName = join(engineDirectory, 'index.mts');
  const evaluatorFileName = join(appDirectory, 'evaluator.mts');
  const evaluatorSource = `
    import type { Value, ValueEvaluator } from '../engine/index.mjs';
    export function* Referenced(value: Value): ValueEvaluator {
      yield undefined;
      return value;
    }
  `;
  await mkdir(engineDirectory);
  await mkdir(appDirectory);
  await writeFile(rootConfig, JSON.stringify({
    files: [],
    references: [{ path: './engine' }, { path: './app' }],
  }));
  await writeFile(engineConfig, JSON.stringify({
    compilerOptions: {
      composite: true,
      declaration: true,
      target: 'ESNext',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
    include: ['./*.mts'],
  }));
  await writeFile(appConfig, JSON.stringify({
    compilerOptions: {
      composite: true,
      target: 'ESNext',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
    references: [{ path: '../engine' }],
    include: ['./*.mts'],
  }));
  await writeFile(valueFileName, `
    export declare class Value {}
    export type ValueEvaluator = Generator<unknown, Value, unknown>;
  `);
  await writeFile(indexFileName, `export type { Value, ValueEvaluator } from './value.mjs';`);
  await writeFile(evaluatorFileName, evaluatorSource);

  const project = createTypeScriptProjectService(rootConfig);
  try {
    const program = project.getProgram(evaluatorFileName, evaluatorSource);
    expect(analyzeEvaluatorFrames(evaluatorFileName, {
      program,
      valueDefinitionPath: valueFileName,
    })).toHaveLength(1);
    expect(project.getWatchFileNames()).toEqual(expect.arrayContaining([
      rootConfig,
      engineConfig,
      appConfig,
      valueFileName,
      evaluatorFileName,
    ]));
  } finally {
    project.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('recognizes Value imported from @engine262/engine262', () => {
  const filename = '/engine262-compiler-tests/package-consumer.mts';
  const source = `
    import type { Value, ValueEvaluator } from '@engine262/engine262';
    /** https://tc39.es/ecma262/#sec-example */
    export function* Example(value: Value): ValueEvaluator {
      yield undefined;
      return value;
    }
  `;
  const files = new Map([
    ['/engine262-compiler-tests/node_modules/@engine262/engine262/package.json', JSON.stringify({
      name: '@engine262/engine262',
      type: 'module',
      exports: { '.': { types: './index.d.mts' } },
    })],
    ['/engine262-compiler-tests/node_modules/@engine262/engine262/index.d.mts', `
      export declare class Value {}
      export type ValueEvaluator = Generator<unknown, Value, unknown>;
    `],
  ]);
  const program = programFor(filename, source, files);
  expect(analyzeEvaluatorFrames(filename, { program })).toHaveLength(1);
  const code = transform(filename, source, program)?.code;
  expect(code).toContain("import { captureEvaluatorFrame } from \"@engine262/engine262\";");
  expect(code).toContain(
    'using _ = captureEvaluatorFrame(() => ({\n    value\n  }), "Example");',
  );
});

test('recognizes a configured repository-internal Value definition', () => {
  const filename = '/work/project/src/example.mts';
  const valueDefinition = '/work/project/src/value.mts';
  const source = `
    import type { Value, ValueEvaluator } from './value.mjs';
    export function* Internal(value: Value): ValueEvaluator {
      yield undefined;
      return value;
    }
  `;
  const files = new Map([[valueDefinition, `
    export declare class Value {}
    export type ValueEvaluator = Generator<unknown, Value, unknown>;
  `]]);
  const program = programFor(filename, source, files);
  expect(analyzeEvaluatorFrames(filename, { program, valueDefinitionPath: valueDefinition })).toHaveLength(1);
  expect(transform(filename, source, program, { valueDefinitionPath: valueDefinition })?.code).toContain(
    'using _ = captureEvaluatorFrame(() => ({\n    value\n  }), Internal.specName || "Internal");',
  );
});

test('inlines statically typed Value calls', () => {
  const filename = '/engine262-compiler-tests/value-consumer.mts';
  const source = `
    import { Value as V } from '@engine262/engine262';
    const text: string = 'typed';
    const stringLiteral = V("");
    const stringTyped = V(text);
    const numberLiteral = V(1);
    const bigintLiteral = V(1n);
    declare const mixed: string | number;
    const mixedValue = V(mixed);
  `;
  const files = new Map([
    ['/engine262-compiler-tests/node_modules/@engine262/engine262/package.json', JSON.stringify({
      name: '@engine262/engine262',
      type: 'module',
      exports: { '.': { types: './index.d.mts' } },
    })],
    ['/engine262-compiler-tests/node_modules/@engine262/engine262/index.d.mts', `
      export declare class JSStringValue { readonly value: string; }
      export declare class NumberValue { readonly value: number; }
      export declare class BigIntValue { readonly value: bigint; }
      export declare function Value(value: string): JSStringValue;
      export declare function Value(value: number): NumberValue;
      export declare function Value(value: bigint): BigIntValue;
      export declare function Value(value: string | number): JSStringValue | NumberValue;
    `],
  ]);
  const program = programFor(filename, source, files);
  const code = transform(filename, source, program)?.code;
  expect(code).toContain('import { Value as V, JSStringValue, NumberValue, BigIntValue } from');
  expect(code).toContain('__proto__: JSStringValue.prototype,\n  value: ""');
  expect(code).toContain('__proto__: JSStringValue.prototype,\n  value: text');
  expect(code).toContain('__proto__: NumberValue.prototype,\n  value: 1');
  expect(code).toContain('__proto__: BigIntValue.prototype,\n  value: 1n');
  expect(code).toContain('const mixedValue = V(mixed);');

  const typeOnlyFilename = '/engine262-compiler-tests/value-consumer-type-only.mts';
  const typeOnlySource = `
    import { Value, type JSStringValue } from '@engine262/engine262';
    const value: JSStringValue = Value("");
  `;
  const typeOnlyProgram = programFor(typeOnlyFilename, typeOnlySource, files);
  const typeOnlyCode = transform(typeOnlyFilename, typeOnlySource, typeOnlyProgram)?.code;
  expect(typeOnlyCode).toContain('JSStringValue as _JSStringValue');
  expect(typeOnlyCode).toContain('__proto__: _JSStringValue.prototype');
});

test('captures GC references inherited from an enclosing function', () => {
  const filename = '/engine262-compiler-tests/nested-evaluator.mts';
  const source = `
    export class Value { mark() {} }
    export type ValueEvaluator = Generator<unknown, Value, unknown>;
    export function Create(value: Value) {
      const closure = function* closure(): ValueEvaluator {
        let result;
        result = value;
        yield result;
        return value;
      };
      return closure;
    }
  `;
  const program = programFor(filename, source);
  expect(analyzeEvaluatorFrames(filename, { program })).toMatchObject([{
    names: ['value'],
  }]);
  expect(transform(filename, source, program)?.code).toMatch(
    /using _ = captureEvaluatorFrame\(\(\) => \(\{\s+value\s+\}\), closure\.specName \|\| "closure"\);/,
  );
});

test('captures GC references used only by nested closures', () => {
  const filename = '/engine262-compiler-tests/nested-closure.mts';
  const source = `
    export class Value { mark() {} }
    export type ValueEvaluator = Generator<unknown, Value, unknown>;
    export function* Evaluate(value: Value): ValueEvaluator {
      const nested = () => {
        const local = value;
        return local;
      };
      yield undefined;
      return nested();
    }
  `;
  const program = programFor(filename, source);
  const flows = analyzeEvaluatorDataFlow(filename, { program });
  expect(flows).toHaveLength(1);
  expect([...flows[0].bindings.keys()].map(({ name }) => name)).toEqual(['value']);
  expect([...flows[0].uses.get([...flows[0].bindings.keys()][0])!]).toContain(
    flows[0].function.body!.getEnd(),
  );
  expect(planEvaluatorFrames(flows).plans).toMatchObject([{
    names: ['value'],
    yield: {
      start: source.indexOf('yield undefined'),
    },
  }]);
  expect(transform(filename, source, program)?.code).toMatch(
    /using _ = captureEvaluatorFrame\(\(\) => \(\{\s+value\s+\}\), Evaluate\.specName \|\| "Evaluate"\);/,
  );
});

// TODO: tests:
// Macro failure case
// Rest Macros with () => ...
// X
// IfAbruptCloseIterator and IfAbruptCloseAsyncIterator
// IfAbruptRejectPromise

test('function.section', () => {
  compile('case', `
    /** https://tc39.es/ecma262/#sec-test */
    function Test() {}
    /** https://tc39.es/ecma262/#sec-test */
    export function Test2() {}
    /** https://tc39.es/ecma262/#sec-test */
    const Test5 = function () {}
    /** https://tc39.es/ecma262/#sec-test */
    const Test6 = () => {}
    /** https://tc39.es/ecma262/#sec-test */
    function SomeProto_Test_getter() {}
    /** https://tc39.es/ecma262/#sec-test */
    function Test_fooSetter() {}
    /** https://tc39.es/ecma262/#sec-test */
    function TestCapture() {}
    /** https://tc39.es/ecma262/#sec-test */
    export function TestExportCapture() {}

    class TestClass {
      /** https://tc39.es/ecma262/#sec-test */
      TestMethod() {}

      static {
        Object.assign(this.prototype.TestMethod, {
          section: 'https://tc39.es/ecma262/#sec-test',
          specName: 'TestMethod',
        });
      }
    }

    const TestObject = {
      /** https://tc39.es/ecma262/#sec-test */
      TestMethod() {},
    };

    /** https://tc39.es/ecma262/#sec-test-overload */
    export function TestOverload(value: string): string;
    export function TestOverload(value: number): number;
    export function TestOverload(value: string | number) {
      return value;
    }

    /** https://tc39.es/ecma262/#sec-test */
    export const Test3 = function () {}
    /** https://tc39.es/ecma262/#sec-test */
    export const Test4 = () => {}
    /** https://tc39.es/ecma262/#sec-test */
    export const TestData = {};

    /** https://tc39.es/ecma262/#typedarray-species-create */
    export function TypedArraySpeciesCreate() {}
  `);
});

test('Assert with source code', () => {
  compile('case', `
    // optimized
    Assert(expr + expr2);
    // unoptimized
    Assert(expr) || true;
  `);
});

test('Struct optimization', () => {
  compile('case', `
    interface record {}
    declare function record(value: object): void;

    class ProtocolRecord implements record {
      readonly Value: number;
      constructor(o: { Value: number }) {
        if (new.target !== ProtocolRecord) throw new TypeError('final');
        this.Value = o.Value;
      }
    }

    @record
    class DecoratedRecord {
      readonly Value: number;
      constructor(o: { Value: number }) {
        if (new.target !== DecoratedRecord) throw new TypeError('final');
        this.Value = o.Value;
      }
    }

    const called = ProtocolRecord({ Value: 1 });
    const constructed = new ProtocolRecord({ Value: 2 });
    const decorated = DecoratedRecord({ Value: 3 });
  `);
});

test('Completion optimization', () => {
  compile('case', `
    function f() {
      const value1 = _;
      // normal
      const value2 = NormalCompletion({ Value: 1 });
      // nested
      const value3 = NormalCompletion(Q(value1));
    }
  `);
});

test('transform OutOfRange', () => {
  compile('case', `
    function f() { throw OutOfRange.exhaustive('message'); }
    switch (key) {
      case value:
        break;
      default:
        throw OutOfRange.nonExhaustive(key);
    }
  `);
});


test('transform Q() correctly', () => {
  compile('value', `
    function f() {
      let value;
      const x = Q(value);
    }
  `);
  compile('complex', `
    function f() {
      let value;
      const completion = Apply(Q(Call(value)), Q(Call(value)));
    }
  `);
  compile('statement', `
    function f() {
      let value;
      Q(value);
    }
  `);
  compile('return', `
    function f() {
      let value;
      return Q(value);
    }
  `);
  compile('return arrow', `
    let value;
    const f = () => Q(value);
  `);
});

test('plans Q macro transformations without type information', () => {
  const source = `
    function invalid(value, condition, capability) {
      while (Q(value)) {}
      if (condition && Q(value)) {}
      consume(condition ? Q(value) : value);
      IfAbruptRejectPromise(createValue(), capability);
      const closure = () => X(value);
    }
    function evalQ(Q) {
      return Q(value);
    }
  `;
  const ast = babel.parseSync(source, {
    filename: '/engine262-compiler-tests/q-macro-analysis.mts',
    parserOpts: { plugins: ['typescript'] },
  });
  if (!ast) throw new Error('Babel did not return an AST');
  const result = analyzeQMacroTransformations(ast.program, babelTypes.VISITOR_KEYS);
  expect(result.diagnostics.map(({ message }) => message)).toEqual([
    'Q() cannot be transformed in this control-flow position',
    'Q() cannot be transformed in this control-flow position',
    'Q() cannot be transformed within this conditional expression',
    'The first argument to IfAbruptRejectPromise must be an identifier',
    'X() cannot be the sole expression of an arrow function',
  ]);
  expect(result.plans).toEqual([]);
});

test('analyzes record class constraints for ESLint consumers', () => {
  const filename = '/engine262-compiler-tests/record-class-analysis.mts';
  const source = `
    interface record {}
    declare function record(value: object, context: ClassDecoratorContext): void;
    declare function other(value: unknown, context: ClassDecoratorContext): void;
    class Base {}

    @other
    @record
    class Invalid extends Base {
      @other
      readonly Initialized: string = '';
      protected Protected: string;
      #private: string;
      static {}
      @other method() {}

      constructor(o: { Initialized: string; Protected: string }) {
        super();
        this.Initialized = o.Initialized;
        this.Protected = o.Protected;
        this.#private = '';
      }
    }

    class MissingCopy implements record {
      readonly A: string;
      declare readonly B: string;

      constructor(o: Pick<MissingCopy, 'A' | 'B'>) {
        if (new.target !== MissingCopy) {
          throw new TypeError('MissingCopy is final');
        }
        this.A = o.A;
      }
    }
  `;
  const result = analyzeRecordClasses(filename, programFor(filename, source));
  expect(result.diagnostics.map(({ kind }) => kind)).toEqual([
    'classDecorator',
    'extends',
    'elementDecorator',
    'fieldInitializer',
    'visibility',
    'privateName',
    'staticBlock',
    'elementDecorator',
    'constructorGuard',
    'fieldCopy',
    'fieldCopy',
    'fieldCopy',
  ]);
  expect(result.diagnostics.flatMap(({ fix }) => fix?.text ?? [])).toEqual([
    expect.stringContaining('if (new.target !== Invalid)'),
    expect.stringContaining('this.B = o.B;'),
  ]);
});

test('transform X() correctly', () => {
  compile('value', `
    let value;
    const x = X(value);
  `);
  compile('complex', `
    let value;
    Apply(X(Call(value)));
  `);
  compile('statement', `
    const value = 1;
    X(value);
  `);
  compile('return', `
    function f() {
      let value;
      return X(value);
    }
  `);
  compile('condition', `
    function f() {
      let value;
      if (test) return X(value.compute());
    }
  `);
});

test('transform simple ternary', () => {
  compile('case', `
    function f() {
      let value, error;
      const x = condition ? Q(value) : (error);
    }
  `);
});

test('transform Throw() correctly', () => {
  compile('case', `
    function f(value) {
      Throw(value);
    }
  `);

  compile('direct return', `
    function f(value) {
      return Throw(value);
    }
    const f2 = value => Throw(value);
  `);
});
