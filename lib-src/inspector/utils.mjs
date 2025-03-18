import { Inspector } from "./index.mjs";
import { CreateBuiltinFunction, CreateDataProperty, CreateNonEnumerableDataPropertyOrThrow, DefinePropertyOrThrow, Descriptor, DetachArrayBuffer, isArrayBufferObject, NormalCompletion, OrdinaryObjectCreate, surroundingAgent, ThrowCompletion, Value, } from '#self';
const consoleMethods = [
    'log',
    'debug',
    'info',
    'error',
    'warning',
    'dir',
    'dirxml',
    'table',
    'trace',
    'clear',
    'startGroup',
    'startGroupCollapsed',
    'endGroup',
    'assert',
    'profile',
    'profileEnd',
    'count',
    'timeEnd',
];
export function createConsole(realm, defaultBehaviour) {
    realm.scope(() => {
        const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
        DefinePropertyOrThrow(realm.GlobalObject, Value('console'), Descriptor({
            Configurable: Value.true,
            Enumerable: Value.false,
            Writable: Value.true,
            Value: console,
        }));
        consoleMethods.forEach((method) => {
            const f = CreateBuiltinFunction((args) => {
                if (surroundingAgent.debugger_isPreviewing) {
                    return Value.undefined;
                }
                if (defaultBehaviour[method]) {
                    const completion = (defaultBehaviour[method](args));
                    if (completion instanceof ThrowCompletion) {
                        return completion;
                    }
                }
                if (realm.HostDefined.attachingInspector instanceof Inspector) {
                    realm.HostDefined.attachingInspector.console(realm, method, args);
                }
                return Value.undefined;
            }, 1, Value(method), []);
            CreateDataProperty(console, Value(method), f);
        });
    });
}
export function createInternals(realm) {
    realm.scope(() => {
        const $ = OrdinaryObjectCreate.from({
            debugger: () => {
                if (surroundingAgent.debugger_isPreviewing) {
                    return;
                }
                // eslint-disable-next-line no-debugger
                debugger;
            },
            detachArrayBuffer: (object) => {
                if (!isArrayBufferObject(object)) {
                    return surroundingAgent.Throw('TypeError', 'Raw', 'Argument must be an ArrayBuffer');
                }
                return DetachArrayBuffer(object);
            },
        });
        CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('$'), $);
    });
}
//# sourceMappingURL=utils.mjs.map