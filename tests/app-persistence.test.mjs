import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the real App wiring without a browser, DOM, network or real storage.
function createAppHarness(failure) {
  const states = [], timers = [];
  let cursor = 0, effects = [], storageCalls = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => {
        states[index] = typeof value === "function" ? value(states[index]) : value;
      }];
    },
    useEffect(callback) { effects.push(callback); },
    useCallback(callback) { return callback; },
    useMemo(factory) { return factory(); },
  };
  const storage = {
    getItem() {
      storageCalls++;
      if (failure === "read") throw new DOMException("Synthetic denied read", "SecurityError");
      return null;
    },
    setItem() {
      storageCalls++;
      if (failure === "quota") throw new DOMException("Synthetic full storage", "QuotaExceededError");
      if (failure === "write") throw new DOMException("Synthetic denied write", "SecurityError");
    },
  };
  const window = {
    setInterval: () => 1,
    clearInterval() {},
    setTimeout(callback) { timers.push(callback); return timers.length; },
  };
  Object.defineProperty(window, "localStorage", { get() {
    storageCalls++;
    if (failure === "getter") throw new DOMException("Synthetic blocked storage", "SecurityError");
    return storage;
  } });
  const jsx = (type, props) => ({ type, props });
  const modules = {};
  function load(file) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    runInNewContext(code, { window, module, exports: module.exports, require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (Object.hasOwn(modules, name)) return modules[name];
      throw new Error(`Unexpected import in App test: ${name}`);
    } });
    return module.exports;
  }
  modules["./game-model"] = load("game-model.ts");
  modules["./persistence"] = load("persistence.ts");
  const App = load("App.tsx").default;
  return {
    render() { cursor = 0; effects = []; return App(); },
    hydrate() { effects[0](); },
    persist() { effects[1](); },
    finishSpin() { assert.equal(timers.length, 1); timers.shift()(); },
    get storageCalls() { return storageCalls; },
    get balance() { return states[1]; },
    get spins() { return states[7]; },
  };
}

function findSpinButton(element) {
  if (!element || typeof element !== "object") return undefined;
  if (element.props?.className === "spin-button") return element;
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const match = findSpinButton(child);
    if (match) return match;
  }
  return undefined;
}

for (const failure of ["getter", "read", "write", "quota"]) {
  test(`App keeps hydrating, saving effects and an in-memory spin usable after ${failure} failure`, () => {
    const app = createAppHarness(failure);
    app.render();
    assert.doesNotThrow(() => app.hydrate());
    const ready = app.render();
    const callsBeforePersist = app.storageCalls;
    assert.doesNotThrow(() => app.persist());
    assert.ok(app.storageCalls > callsBeforePersist, "the hydrated component must attempt the write boundary");
    assert.equal(app.balance, 20_000);

    const button = findSpinButton(ready);
    assert.ok(button);
    assert.equal(button.props.disabled, false);
    assert.doesNotThrow(() => button.props.onClick());
    assert.equal(app.balance, 19_900);
    app.render();
    assert.doesNotThrow(() => app.persist());
    assert.doesNotThrow(() => app.finishSpin());
    const finished = app.render();
    assert.doesNotThrow(() => app.persist());
    assert.equal(app.spins, 1);
    assert.ok(Number.isFinite(app.balance));
    assert.equal(findSpinButton(finished).props.disabled, false);
  });
}
