import { NormalCompletion, type Arguments, type ManagedRealm } from '#self';
declare const consoleMethods: readonly ["log", "debug", "info", "error", "warning", "dir", "dirxml", "table", "trace", "clear", "startGroup", "startGroupCollapsed", "endGroup", "assert", "profile", "profileEnd", "count", "timeEnd"];
type ConsoleMethod = typeof consoleMethods[number];
export declare function createConsole(realm: ManagedRealm, defaultBehaviour: Partial<Record<ConsoleMethod, (args: Arguments) => void | NormalCompletion<void>>>): void;
export declare function createInternals(realm: ManagedRealm): void;
export {};
//# sourceMappingURL=utils.d.mts.map