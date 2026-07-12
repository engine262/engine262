import path from 'node:path';
import ts from 'typescript';

export interface TypeScriptProgramProvider {
  getProgram(fileName: string, sourceText?: string): ts.Program;
}

export interface TypeScriptProjectService extends TypeScriptProgramProvider {
  getWatchFileNames(): readonly string[];
  invalidateFile(fileName: string): void;
  dispose(): void;
}

export function createTypeScriptProjectService(configFileName: string): TypeScriptProjectService {
  return new LanguageServiceProject(configFileName);
}

class LanguageServiceProject implements TypeScriptProjectService {
  readonly #rootConfigFileName: string;
  readonly #scripts = new ScriptStore();
  readonly #registry: ts.DocumentRegistry;
  #projects: ConfiguredLanguageService[] = [];
  #owners = new Map<string, ConfiguredLanguageService>();
  #configFileNames = new Set<string>();
  #disposed = false;

  constructor(configFileName: string) {
    this.#rootConfigFileName = normalize(configFileName);
    this.#registry = ts.createDocumentRegistry(
      ts.sys.useCaseSensitiveFileNames,
      path.dirname(this.#rootConfigFileName),
    );
    this.#loadProjects();
  }

  getProgram(fileName: string, sourceText?: string): ts.Program {
    this.#assertActive();
    const normalized = normalize(fileName);
    if (sourceText !== undefined) this.#scripts.update(normalized, sourceText);

    let owner = this.#owners.get(normalized);
    if (!owner) {
      owner = this.#projects.find((project) => findSourceFile(project.getProgram(), normalized));
      if (owner) this.#owners.set(normalized, owner);
    }
    if (!owner) {
      throw new Error(`@engine262/babel-compiler: ${fileName} is not part of ${this.#rootConfigFileName} or its project references`);
    }

    const program = owner.getProgram();
    if (!findSourceFile(program, normalized)) {
      throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the current TypeScript Program`);
    }
    return program;
  }

  getWatchFileNames(): readonly string[] {
    this.#assertActive();
    return [...new Set([
      ...this.#configFileNames,
      ...this.#projects.flatMap((project) => project.fileNames),
    ])];
  }

  invalidateFile(fileName: string): void {
    this.#assertActive();
    const normalized = normalize(fileName);
    this.#scripts.invalidate(normalized);
    if (this.#configFileNames.has(normalized)) this.#loadProjects();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#disposeProjects();
  }

  #loadProjects(): void {
    this.#disposeProjects();
    const parsedProjects: ParsedProject[] = [];
    const seen = new Set<string>();
    const load = (configFileName: string) => {
      const normalized = normalize(configFileName);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const parsed = parseProject(normalized, this.#scripts);
      for (const reference of parsed.projectReferences ?? []) {
        load(ts.resolveProjectReferencePath(reference));
      }
      parsedProjects.push({ configFileName: normalized, parsed });
    };
    load(this.#rootConfigFileName);

    this.#configFileNames = seen;
    this.#owners = new Map();
    this.#projects = parsedProjects
      .filter(({ parsed }) => parsed.fileNames.length > 0)
      .map(({ configFileName, parsed }) => new ConfiguredLanguageService(
        configFileName,
        parsed,
        this.#scripts,
        this.#registry,
      ));
    for (const project of this.#projects) {
      for (const fileName of project.fileNames) {
        const normalized = normalize(fileName);
        if (!this.#owners.has(normalized)) this.#owners.set(normalized, project);
      }
    }
  }

  #disposeProjects(): void {
    for (const project of this.#projects) project.dispose();
    this.#projects = [];
  }

  #assertActive(): void {
    if (this.#disposed) throw new Error('@engine262/babel-compiler: TypeScript project service has been disposed');
  }
}

class ConfiguredLanguageService {
  readonly fileNames: readonly string[];
  readonly #service: ts.LanguageService;

  constructor(
    configFileName: string,
    parsed: ts.ParsedCommandLine,
    scripts: ScriptStore,
    registry: ts.DocumentRegistry,
  ) {
    this.fileNames = parsed.fileNames;
    const currentDirectory = path.dirname(configFileName);
    const host: ts.LanguageServiceHost & {
      useSourceOfProjectReferenceRedirect(): boolean;
    } = {
      getCompilationSettings: () => parsed.options,
      getProjectVersion: () => scripts.projectVersion,
      getScriptFileNames: () => [...parsed.fileNames],
      getScriptVersion: (fileName) => scripts.getVersion(fileName),
      getScriptSnapshot: (fileName) => scripts.getSnapshot(fileName),
      getProjectReferences: () => parsed.projectReferences,
      getParsedCommandLine: (fileName) => parseProject(fileName, scripts),
      useSourceOfProjectReferenceRedirect: () => true,
      getCurrentDirectory: () => currentDirectory,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
      readDirectory: ts.sys.readDirectory,
      readFile: (fileName, encoding) => scripts.readFile(fileName, encoding),
      fileExists: (fileName) => scripts.fileExists(fileName),
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };
    this.#service = ts.createLanguageService(host, registry);
  }

  getProgram(): ts.Program {
    const program = this.#service.getProgram();
    if (!program) throw new Error('@engine262/babel-compiler: TypeScript language service did not produce a Program');
    return program;
  }

  dispose(): void {
    this.#service.dispose();
  }
}

class ScriptStore {
  readonly #entries = new Map<string, string>();
  readonly #versions = new Map<string, number>();
  #projectVersion = 0;

  get projectVersion(): string {
    return String(this.#projectVersion);
  }

  getVersion(fileName: string): string {
    return String(this.#versions.get(normalize(fileName)) ?? 0);
  }

  getSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const text = this.readFile(fileName);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  }

  readFile(fileName: string, encoding?: string): string | undefined {
    const normalized = normalize(fileName);
    const cached = this.#entries.get(normalized);
    if (cached !== undefined) return cached;
    const text = ts.sys.readFile(normalized, encoding);
    if (text !== undefined) this.#entries.set(normalized, text);
    return text;
  }

  fileExists(fileName: string): boolean {
    const normalized = normalize(fileName);
    return this.#entries.has(normalized) || ts.sys.fileExists(normalized);
  }

  update(fileName: string, sourceText: string): void {
    const normalized = normalize(fileName);
    if (this.readFile(normalized) === sourceText) return;
    this.#entries.set(normalized, sourceText);
    this.#bump(normalized);
  }

  invalidate(fileName: string): void {
    const normalized = normalize(fileName);
    this.#entries.delete(normalized);
    this.#bump(normalized);
  }

  #bump(fileName: string): void {
    this.#versions.set(fileName, (this.#versions.get(fileName) ?? 0) + 1);
    this.#projectVersion += 1;
  }
}

interface ParsedProject {
  readonly configFileName: string;
  readonly parsed: ts.ParsedCommandLine;
}

function parseProject(configFileName: string, scripts: ScriptStore): ts.ParsedCommandLine {
  const diagnostics: ts.Diagnostic[] = [];
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configFileName,
    undefined,
    {
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      readDirectory: ts.sys.readDirectory,
      fileExists: (fileName) => scripts.fileExists(fileName),
      readFile: (fileName) => scripts.readFile(fileName),
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    },
  );
  if (!parsed) throw new Error(formatDiagnostics(diagnostics));
  if (parsed.errors.length > 0) throw new Error(formatDiagnostics(parsed.errors));
  return parsed;
}

function findSourceFile(program: ts.Program, fileName: string): ts.SourceFile | undefined {
  const normalized = normalize(fileName);
  return program.getSourceFiles().find((sourceFile) => normalize(sourceFile.fileName) === normalized);
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  });
}

function normalize(fileName: string): string {
  return path.resolve(fileName).replaceAll('\\', '/');
}
