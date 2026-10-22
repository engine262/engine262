import { expect, test } from 'vitest';
import { Agent, ManagedRealm, NormalCompletion, setSurroundingAgent, Value } from '#self';

function evaluate(source: string) {
  setSurroundingAgent(new Agent());
  const realm = new ManagedRealm();
  const result = realm.evaluateScriptSkipDebugger(source);
  expect(result).toBeInstanceOf(NormalCompletion);
  expect((result as NormalCompletion<Value>).Value).toBe(Value.true);
}

test('transferToImmutable preserves bytes and prevents mutation or detachment', () => {
  evaluate(`
    const original = new Uint8Array([12, 34, 56]).buffer;
    const immutable = original.transferToImmutable(5);
    const view = new Uint8Array(immutable);
    const dataView = new DataView(immutable);
    original.detached === true && immutable.immutable === true &&
      immutable.detached === false && immutable.resizable === false &&
      immutable.byteLength === 5 && view[0] === 12 && view[2] === 56 && view[4] === 0 &&
      Object.getOwnPropertyDescriptor(view, '0').writable === false &&
      Object.getOwnPropertyDescriptor(view, '0').configurable === false &&
      Reflect.set(view, '0', 99) === false && view[0] === 12 &&
      (() => { try { dataView.setUint8(0, 99); return false; } catch (e) { return e instanceof TypeError; } })() &&
      (() => { try { immutable.transfer(); return false; } catch (e) { return e instanceof TypeError; } })()
  `);
});

test('sliceToImmutable copies bounds and permits frozen typed arrays', () => {
  evaluate(`
    const source = new Uint8Array([1, 2, 3, 4]).buffer;
    const immutable = source.sliceToImmutable(1, 3);
    const view = new Uint8Array(immutable);
    Object.freeze(view);
    const copy = immutable.slice(0);
    const empty = immutable.sliceToImmutable(1, 1);
    immutable.immutable && source.detached === false && view[0] === 2 && view[1] === 3 &&
      Object.isFrozen(view) && copy.immutable === false && empty.immutable && empty.byteLength === 0 &&
      (() => { try { view.fill(0); return false; } catch (e) { return e instanceof TypeError; } })() &&
      (() => { try { view.set([]); return false; } catch (e) { return e instanceof TypeError; } })()
  `);
});
