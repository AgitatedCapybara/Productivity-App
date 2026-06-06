import { BrowserWindow as H, app as S, ipcMain as b, nativeImage as U, Tray as Re, Menu as ve, globalShortcut as he } from "electron";
import k, { dirname as z, join as x } from "path";
import { fileURLToPath as Y } from "url";
import G from "fs";
import Oe from "util";
import { randomUUID as ye } from "crypto";
const Q = typeof __dirname < "u" ? __dirname : z(Y(import.meta.url));
let Te = null;
function J(e) {
  Te = e;
}
function Z() {
  const e = new H({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    frame: !1,
    transparent: !0,
    backgroundColor: "#00000000",
    show: !1,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: x(Q, "../preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  return e.once("ready-to-show", () => {
    e.show();
  }), e.on("close", (t) => {
    Te && (t.preventDefault(), e.hide());
  }), process.env.VITE_DEV_SERVER_URL ? (e.loadURL(process.env.VITE_DEV_SERVER_URL), e.webContents.openDevTools()) : e.loadFile(x(Q, "../index.html")), e;
}
const ee = typeof __dirname < "u" ? __dirname : z(Y(import.meta.url));
function Le() {
  const e = new H({
    width: 380,
    height: 320,
    frame: !1,
    transparent: !0,
    backgroundColor: "#00000000",
    alwaysOnTop: !0,
    skipTaskbar: !0,
    resizable: !1,
    show: !1,
    webPreferences: {
      preload: x(ee, "../widget.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    }
  });
  return process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL + "#/widget") : e.loadFile(x(ee, "../index.html"), { hash: "/widget" }), e;
}
function je(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var A = { exports: {} };
function be(e) {
  throw new Error('Could not dynamically require "' + e + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var D = {}, te;
function L() {
  return te || (te = 1, D.getBooleanOption = (e, t) => {
    let r = !1;
    if (t in e && typeof (r = e[t]) != "boolean")
      throw new TypeError(`Expected the "${t}" option to be a boolean`);
    return r;
  }, D.cppdb = Symbol(), D.inspect = Symbol.for("nodejs.util.inspect.custom")), D;
}
var F, re;
function we() {
  if (re) return F;
  re = 1;
  const e = { value: "SqliteError", writable: !0, enumerable: !1, configurable: !0 };
  function t(r, l) {
    if (new.target !== t)
      return new t(r, l);
    if (typeof l != "string")
      throw new TypeError("Expected second argument to be a string");
    Error.call(this, r), e.value = "" + r, Object.defineProperty(this, "message", e), Error.captureStackTrace(this, t), this.code = l;
  }
  return Object.setPrototypeOf(t, Error), Object.setPrototypeOf(t.prototype, Error.prototype), Object.defineProperty(t.prototype, "name", e), F = t, F;
}
var I = { exports: {} }, q, ne;
function Se() {
  if (ne) return q;
  ne = 1;
  var e = k.sep || "/";
  q = t;
  function t(r) {
    if (typeof r != "string" || r.length <= 7 || r.substring(0, 7) != "file://")
      throw new TypeError("must pass in a file:// URI to convert to a file path");
    var l = decodeURI(r.substring(7)), o = l.indexOf("/"), n = l.substring(0, o), i = l.substring(o + 1);
    return n == "localhost" && (n = ""), n && (n = e + e + n), i = i.replace(/^(.+)\|/, "$1:"), e == "\\" && (i = i.replace(/\//g, "\\")), /^.+\:/.test(i) || (i = e + i), n + i;
  }
  return q;
}
var oe;
function xe() {
  return oe || (oe = 1, (function(e, t) {
    var r = G, l = k, o = Se(), n = l.join, i = l.dirname, s = r.accessSync && function(f) {
      try {
        r.accessSync(f);
      } catch {
        return !1;
      }
      return !0;
    } || r.existsSync || l.existsSync, d = {
      arrow: process.env.NODE_BINDINGS_ARROW || " → ",
      compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
      platform: process.platform,
      arch: process.arch,
      nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
      version: process.versions.node,
      bindings: "bindings.node",
      try: [
        // node-gyp's linked version in the "build" dir
        ["module_root", "build", "bindings"],
        // node-waf and gyp_addon (a.k.a node-gyp)
        ["module_root", "build", "Debug", "bindings"],
        ["module_root", "build", "Release", "bindings"],
        // Debug files, for development (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Debug", "bindings"],
        ["module_root", "Debug", "bindings"],
        // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Release", "bindings"],
        ["module_root", "Release", "bindings"],
        // Legacy from node-waf, node <= 0.4.x
        ["module_root", "build", "default", "bindings"],
        // Production "Release" buildtype binary (meh...)
        ["module_root", "compiled", "version", "platform", "arch", "bindings"],
        // node-qbs builds
        ["module_root", "addon-build", "release", "install-root", "bindings"],
        ["module_root", "addon-build", "debug", "install-root", "bindings"],
        ["module_root", "addon-build", "default", "install-root", "bindings"],
        // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
        ["module_root", "lib", "binding", "nodePreGyp", "bindings"]
      ]
    };
    function h(f) {
      typeof f == "string" ? f = { bindings: f } : f || (f = {}), Object.keys(d).map(function(g) {
        g in f || (f[g] = d[g]);
      }), f.module_root || (f.module_root = t.getRoot(t.getFileName())), l.extname(f.bindings) != ".node" && (f.bindings += ".node");
      for (var T = typeof __webpack_require__ == "function" ? __non_webpack_require__ : be, c = [], u = 0, a = f.try.length, E, m, p; u < a; u++) {
        E = n.apply(
          null,
          f.try[u].map(function(g) {
            return f[g] || g;
          })
        ), c.push(E);
        try {
          return m = f.path ? T.resolve(E) : T(E), f.path || (m.path = E), m;
        } catch (g) {
          if (g.code !== "MODULE_NOT_FOUND" && g.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(g.message))
            throw g;
        }
      }
      throw p = new Error(
        `Could not locate the bindings file. Tried:
` + c.map(function(g) {
          return f.arrow + g;
        }).join(`
`)
      ), p.tries = c, p;
    }
    e.exports = t = h, t.getFileName = function(T) {
      var c = Error.prepareStackTrace, u = Error.stackTraceLimit, a = {}, E;
      Error.stackTraceLimit = 10, Error.prepareStackTrace = function(p, g) {
        for (var R = 0, K = g.length; R < K; R++)
          if (E = g[R].getFileName(), E !== __filename)
            if (T) {
              if (E !== T)
                return;
            } else
              return;
      }, Error.captureStackTrace(a), a.stack, Error.prepareStackTrace = c, Error.stackTraceLimit = u;
      var m = "file://";
      return E.indexOf(m) === 0 && (E = o(E)), E;
    }, t.getRoot = function(T) {
      for (var c = i(T), u; ; ) {
        if (c === "." && (c = process.cwd()), s(n(c, "package.json")) || s(n(c, "node_modules")))
          return c;
        if (u === c)
          throw new Error(
            'Could not find module root given file: "' + T + '". Do you have a `package.json` file? '
          );
        u = c, c = n(c, "..");
      }
    };
  })(I, I.exports)), I.exports;
}
var O = {}, ie;
function De() {
  if (ie) return O;
  ie = 1;
  const { cppdb: e } = L();
  return O.prepare = function(r) {
    return this[e].prepare(r, this, !1);
  }, O.exec = function(r) {
    return this[e].exec(r), this;
  }, O.close = function() {
    return this[e].close(), this;
  }, O.loadExtension = function(...r) {
    return this[e].loadExtension(...r), this;
  }, O.defaultSafeIntegers = function(...r) {
    return this[e].defaultSafeIntegers(...r), this;
  }, O.unsafeMode = function(...r) {
    return this[e].unsafeMode(...r), this;
  }, O.getters = {
    name: {
      get: function() {
        return this[e].name;
      },
      enumerable: !0
    },
    open: {
      get: function() {
        return this[e].open;
      },
      enumerable: !0
    },
    inTransaction: {
      get: function() {
        return this[e].inTransaction;
      },
      enumerable: !0
    },
    readonly: {
      get: function() {
        return this[e].readonly;
      },
      enumerable: !0
    },
    memory: {
      get: function() {
        return this[e].memory;
      },
      enumerable: !0
    }
  }, O;
}
var P, ae;
function Ae() {
  if (ae) return P;
  ae = 1;
  const { cppdb: e } = L(), t = /* @__PURE__ */ new WeakMap();
  P = function(n) {
    if (typeof n != "function") throw new TypeError("Expected first argument to be a function");
    const i = this[e], s = r(i, this), { apply: d } = Function.prototype, h = {
      default: { value: l(d, n, i, s.default) },
      deferred: { value: l(d, n, i, s.deferred) },
      immediate: { value: l(d, n, i, s.immediate) },
      exclusive: { value: l(d, n, i, s.exclusive) },
      database: { value: this, enumerable: !0 }
    };
    return Object.defineProperties(h.default.value, h), Object.defineProperties(h.deferred.value, h), Object.defineProperties(h.immediate.value, h), Object.defineProperties(h.exclusive.value, h), h.default.value;
  };
  const r = (o, n) => {
    let i = t.get(o);
    if (!i) {
      const s = {
        commit: o.prepare("COMMIT", n, !1),
        rollback: o.prepare("ROLLBACK", n, !1),
        savepoint: o.prepare("SAVEPOINT `	_bs3.	`", n, !1),
        release: o.prepare("RELEASE `	_bs3.	`", n, !1),
        rollbackTo: o.prepare("ROLLBACK TO `	_bs3.	`", n, !1)
      };
      t.set(o, i = {
        default: Object.assign({ begin: o.prepare("BEGIN", n, !1) }, s),
        deferred: Object.assign({ begin: o.prepare("BEGIN DEFERRED", n, !1) }, s),
        immediate: Object.assign({ begin: o.prepare("BEGIN IMMEDIATE", n, !1) }, s),
        exclusive: Object.assign({ begin: o.prepare("BEGIN EXCLUSIVE", n, !1) }, s)
      });
    }
    return i;
  }, l = (o, n, i, { begin: s, commit: d, rollback: h, savepoint: f, release: T, rollbackTo: c }) => function() {
    let a, E, m;
    i.inTransaction ? (a = f, E = T, m = c) : (a = s, E = d, m = h), a.run();
    try {
      const p = o.call(n, this, arguments);
      if (p && typeof p.then == "function")
        throw new TypeError("Transaction function cannot return a promise");
      return E.run(), p;
    } catch (p) {
      throw i.inTransaction && (m.run(), m !== h && E.run()), p;
    }
  };
  return P;
}
var N, se;
function Ie() {
  if (se) return N;
  se = 1;
  const { getBooleanOption: e, cppdb: t } = L();
  return N = function(l, o) {
    if (o == null && (o = {}), typeof l != "string") throw new TypeError("Expected first argument to be a string");
    if (typeof o != "object") throw new TypeError("Expected second argument to be an options object");
    const n = e(o, "simple"), i = this[t].prepare(`PRAGMA ${l}`, this, !0);
    return n ? i.pluck().get() : i.all();
  }, N;
}
var $, ce;
function ke() {
  if (ce) return $;
  ce = 1;
  const e = G, t = k, { promisify: r } = Oe, { cppdb: l } = L(), o = r(e.access);
  $ = async function(s, d) {
    if (d == null && (d = {}), typeof s != "string") throw new TypeError("Expected first argument to be a string");
    if (typeof d != "object") throw new TypeError("Expected second argument to be an options object");
    s = s.trim();
    const h = "attached" in d ? d.attached : "main", f = "progress" in d ? d.progress : null;
    if (!s) throw new TypeError("Backup filename cannot be an empty string");
    if (s === ":memory:") throw new TypeError('Invalid backup filename ":memory:"');
    if (typeof h != "string") throw new TypeError('Expected the "attached" option to be a string');
    if (!h) throw new TypeError('The "attached" option cannot be an empty string');
    if (f != null && typeof f != "function") throw new TypeError('Expected the "progress" option to be a function');
    await o(t.dirname(s)).catch(() => {
      throw new TypeError("Cannot save backup because the directory does not exist");
    });
    const T = await o(s).then(() => !1, () => !0);
    return n(this[l].backup(this, h, s, T), f || null);
  };
  const n = (i, s) => {
    let d = 0, h = !0;
    return new Promise((f, T) => {
      setImmediate(function c() {
        try {
          const u = i.transfer(d);
          if (!u.remainingPages) {
            i.close(), f(u);
            return;
          }
          if (h && (h = !1, d = 100), s) {
            const a = s(u);
            if (a !== void 0)
              if (typeof a == "number" && a === a) d = Math.max(0, Math.min(2147483647, Math.round(a)));
              else throw new TypeError("Expected progress callback to return a number or undefined");
          }
          setImmediate(c);
        } catch (u) {
          i.close(), T(u);
        }
      });
    });
  };
  return $;
}
var M, le;
function Ue() {
  if (le) return M;
  le = 1;
  const { cppdb: e } = L();
  return M = function(r) {
    if (r == null && (r = {}), typeof r != "object") throw new TypeError("Expected first argument to be an options object");
    const l = "attached" in r ? r.attached : "main";
    if (typeof l != "string") throw new TypeError('Expected the "attached" option to be a string');
    if (!l) throw new TypeError('The "attached" option cannot be an empty string');
    return this[e].serialize(l);
  }, M;
}
var C, ue;
function Fe() {
  if (ue) return C;
  ue = 1;
  const { getBooleanOption: e, cppdb: t } = L();
  return C = function(l, o, n) {
    if (o == null && (o = {}), typeof o == "function" && (n = o, o = {}), typeof l != "string") throw new TypeError("Expected first argument to be a string");
    if (typeof n != "function") throw new TypeError("Expected last argument to be a function");
    if (typeof o != "object") throw new TypeError("Expected second argument to be an options object");
    if (!l) throw new TypeError("User-defined function name cannot be an empty string");
    const i = "safeIntegers" in o ? +e(o, "safeIntegers") : 2, s = e(o, "deterministic"), d = e(o, "directOnly"), h = e(o, "varargs");
    let f = -1;
    if (!h) {
      if (f = n.length, !Number.isInteger(f) || f < 0) throw new TypeError("Expected function.length to be a positive integer");
      if (f > 100) throw new RangeError("User-defined functions cannot have more than 100 arguments");
    }
    return this[t].function(n, l, f, i, s, d), this;
  }, C;
}
var B, de;
function qe() {
  if (de) return B;
  de = 1;
  const { getBooleanOption: e, cppdb: t } = L();
  B = function(n, i) {
    if (typeof n != "string") throw new TypeError("Expected first argument to be a string");
    if (typeof i != "object" || i === null) throw new TypeError("Expected second argument to be an options object");
    if (!n) throw new TypeError("User-defined function name cannot be an empty string");
    const s = "start" in i ? i.start : null, d = r(i, "step", !0), h = r(i, "inverse", !1), f = r(i, "result", !1), T = "safeIntegers" in i ? +e(i, "safeIntegers") : 2, c = e(i, "deterministic"), u = e(i, "directOnly"), a = e(i, "varargs");
    let E = -1;
    if (!a && (E = Math.max(l(d), h ? l(h) : 0), E > 0 && (E -= 1), E > 100))
      throw new RangeError("User-defined functions cannot have more than 100 arguments");
    return this[t].aggregate(s, d, h, f, n, E, T, c, u), this;
  };
  const r = (o, n, i) => {
    const s = n in o ? o[n] : null;
    if (typeof s == "function") return s;
    if (s != null) throw new TypeError(`Expected the "${n}" option to be a function`);
    if (i) throw new TypeError(`Missing required option "${n}"`);
    return null;
  }, l = ({ length: o }) => {
    if (Number.isInteger(o) && o >= 0) return o;
    throw new TypeError("Expected function.length to be a positive integer");
  };
  return B;
}
var V, pe;
function Pe() {
  if (pe) return V;
  pe = 1;
  const { cppdb: e } = L();
  V = function(u, a) {
    if (typeof u != "string") throw new TypeError("Expected first argument to be a string");
    if (!u) throw new TypeError("Virtual table module name cannot be an empty string");
    let E = !1;
    if (typeof a == "object" && a !== null)
      E = !0, a = T(r(a, "used", u));
    else {
      if (typeof a != "function") throw new TypeError("Expected second argument to be a function or a table definition object");
      a = t(a);
    }
    return this[e].table(a, u, E), this;
  };
  function t(c) {
    return function(a, E, m, ...p) {
      const g = {
        module: a,
        database: E,
        table: m
      }, R = d.call(c, g, p);
      if (typeof R != "object" || R === null)
        throw new TypeError(`Virtual table module "${a}" did not return a table definition object`);
      return r(R, "returned", a);
    };
  }
  function r(c, u, a) {
    if (!s.call(c, "rows"))
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition without a "rows" property`);
    if (!s.call(c, "columns"))
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition without a "columns" property`);
    const E = c.rows;
    if (typeof E != "function" || Object.getPrototypeOf(E) !== h)
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition with an invalid "rows" property (should be a generator function)`);
    let m = c.columns;
    if (!Array.isArray(m) || !(m = [...m]).every((w) => typeof w == "string"))
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition with an invalid "columns" property (should be an array of strings)`);
    if (m.length !== new Set(m).size)
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition with duplicate column names`);
    if (!m.length)
      throw new RangeError(`Virtual table module "${a}" ${u} a table definition with zero columns`);
    let p;
    if (s.call(c, "parameters")) {
      if (p = c.parameters, !Array.isArray(p) || !(p = [...p]).every((w) => typeof w == "string"))
        throw new TypeError(`Virtual table module "${a}" ${u} a table definition with an invalid "parameters" property (should be an array of strings)`);
    } else
      p = i(E);
    if (p.length !== new Set(p).size)
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition with duplicate parameter names`);
    if (p.length > 32)
      throw new RangeError(`Virtual table module "${a}" ${u} a table definition with more than the maximum number of 32 parameters`);
    for (const w of p)
      if (m.includes(w))
        throw new TypeError(`Virtual table module "${a}" ${u} a table definition with column "${w}" which was ambiguously defined as both a column and parameter`);
    let g = 2;
    if (s.call(c, "safeIntegers")) {
      const w = c.safeIntegers;
      if (typeof w != "boolean")
        throw new TypeError(`Virtual table module "${a}" ${u} a table definition with an invalid "safeIntegers" property (should be a boolean)`);
      g = +w;
    }
    let R = !1;
    if (s.call(c, "directOnly") && (R = c.directOnly, typeof R != "boolean"))
      throw new TypeError(`Virtual table module "${a}" ${u} a table definition with an invalid "directOnly" property (should be a boolean)`);
    return [
      `CREATE TABLE x(${[
        ...p.map(f).map((w) => `${w} HIDDEN`),
        ...m.map(f)
      ].join(", ")});`,
      l(E, new Map(m.map((w, _e) => [w, p.length + _e])), a),
      p,
      g,
      R
    ];
  }
  function l(c, u, a) {
    return function* (...m) {
      const p = m.map((g) => Buffer.isBuffer(g) ? Buffer.from(g) : g);
      for (let g = 0; g < u.size; ++g)
        p.push(null);
      for (const g of c(...m))
        if (Array.isArray(g))
          o(g, p, u.size, a), yield p;
        else if (typeof g == "object" && g !== null)
          n(g, p, u, a), yield p;
        else
          throw new TypeError(`Virtual table module "${a}" yielded something that isn't a valid row object`);
    };
  }
  function o(c, u, a, E) {
    if (c.length !== a)
      throw new TypeError(`Virtual table module "${E}" yielded a row with an incorrect number of columns`);
    const m = u.length - a;
    for (let p = 0; p < a; ++p)
      u[p + m] = c[p];
  }
  function n(c, u, a, E) {
    let m = 0;
    for (const p of Object.keys(c)) {
      const g = a.get(p);
      if (g === void 0)
        throw new TypeError(`Virtual table module "${E}" yielded a row with an undeclared column "${p}"`);
      u[g] = c[p], m += 1;
    }
    if (m !== a.size)
      throw new TypeError(`Virtual table module "${E}" yielded a row with missing columns`);
  }
  function i({ length: c }) {
    if (!Number.isInteger(c) || c < 0)
      throw new TypeError("Expected function.length to be a positive integer");
    const u = [];
    for (let a = 0; a < c; ++a)
      u.push(`$${a + 1}`);
    return u;
  }
  const { hasOwnProperty: s } = Object.prototype, { apply: d } = Function.prototype, h = Object.getPrototypeOf(function* () {
  }), f = (c) => `"${c.replace(/"/g, '""')}"`, T = (c) => () => c;
  return V;
}
var X, fe;
function Ne() {
  if (fe) return X;
  fe = 1;
  const e = function() {
  };
  return X = function(r, l) {
    return Object.assign(new e(), this);
  }, X;
}
var W, Ee;
function $e() {
  if (Ee) return W;
  Ee = 1;
  const e = G, t = k, r = L(), l = we();
  let o;
  function n(s, d) {
    if (new.target == null)
      return new n(s, d);
    let h;
    if (Buffer.isBuffer(s) && (h = s, s = ":memory:"), s == null && (s = ""), d == null && (d = {}), typeof s != "string") throw new TypeError("Expected first argument to be a string");
    if (typeof d != "object") throw new TypeError("Expected second argument to be an options object");
    if ("readOnly" in d) throw new TypeError('Misspelled option "readOnly" should be "readonly"');
    if ("memory" in d) throw new TypeError('Option "memory" was removed in v7.0.0 (use ":memory:" filename instead)');
    const f = s.trim(), T = f === "" || f === ":memory:", c = r.getBooleanOption(d, "readonly"), u = r.getBooleanOption(d, "fileMustExist"), a = "timeout" in d ? d.timeout : 5e3, E = "verbose" in d ? d.verbose : null, m = "nativeBinding" in d ? d.nativeBinding : null;
    if (c && T && !h) throw new TypeError("In-memory/temporary databases cannot be readonly");
    if (!Number.isInteger(a) || a < 0) throw new TypeError('Expected the "timeout" option to be a positive integer');
    if (a > 2147483647) throw new RangeError('Option "timeout" cannot be greater than 2147483647');
    if (E != null && typeof E != "function") throw new TypeError('Expected the "verbose" option to be a function');
    if (m != null && typeof m != "string" && typeof m != "object") throw new TypeError('Expected the "nativeBinding" option to be a string or addon object');
    let p;
    if (m == null ? p = o || (o = xe()("better_sqlite3.node")) : typeof m == "string" ? p = (typeof __non_webpack_require__ == "function" ? __non_webpack_require__ : be)(t.resolve(m).replace(/(\.node)?$/, ".node")) : p = m, p.isInitialized || (p.setErrorConstructor(l), p.isInitialized = !0), !T && !f.startsWith("file:") && !e.existsSync(t.dirname(f)))
      throw new TypeError("Cannot open database because the directory does not exist");
    Object.defineProperties(this, {
      [r.cppdb]: { value: new p.Database(f, s, T, c, u, a, E || null, h || null) },
      ...i.getters
    });
  }
  const i = De();
  return n.prototype.prepare = i.prepare, n.prototype.transaction = Ae(), n.prototype.pragma = Ie(), n.prototype.backup = ke(), n.prototype.serialize = Ue(), n.prototype.function = Fe(), n.prototype.aggregate = qe(), n.prototype.table = Pe(), n.prototype.loadExtension = i.loadExtension, n.prototype.exec = i.exec, n.prototype.close = i.close, n.prototype.defaultSafeIntegers = i.defaultSafeIntegers, n.prototype.unsafeMode = i.unsafeMode, n.prototype[r.inspect] = Ne(), W = n, W;
}
var me;
function Me() {
  return me || (me = 1, A.exports = $e(), A.exports.SqliteError = we()), A.exports;
}
var Ce = Me();
const Be = /* @__PURE__ */ je(Ce);
function Ve(e) {
  const t = e.prepare("PRAGMA user_version");
  let { user_version: r } = t.get();
  r < 1 && (e.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        icon TEXT DEFAULT 'folder',
        sort_order REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'todo',
        due_date TEXT,
        due_time TEXT,
        recurrence TEXT,
        sort_order REAL DEFAULT 0,
        time_estimate_mins INTEGER DEFAULT 0,
        time_logged_mins INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_mins INTEGER DEFAULT 0,
        distraction_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE distractions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        app_name TEXT NOT NULL,
        window_title TEXT DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER DEFAULT 0
      );
    `), e.exec("PRAGMA user_version = 1"), r = 1), r < 2 && (e.prepare(`
      INSERT INTO projects (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run("inbox-default", "Inbox", "#6366f1", "inbox", 0), e.exec("PRAGMA user_version = 2"), r = 2);
}
let v = null;
function _() {
  if (v)
    return v;
  const e = process.env.NODE_ENV === "development" ? "dev.sqlite" : x(S.getPath("userData"), "app.db");
  return v = new Be(e), v.pragma("journal_mode = WAL"), v.pragma("busy_timeout = 5000"), v.pragma("foreign_keys = ON"), Ve(v), v;
}
process.on("exit", () => {
  v && v.close();
});
function Xe() {
  return _().prepare("SELECT * FROM tasks ORDER BY sort_order").all();
}
function We(e) {
  return _().prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order").all(e);
}
function He() {
  return _().prepare(`
    SELECT * FROM tasks 
    WHERE due_date <= date('now') AND status != 'done' 
    ORDER BY sort_order
  `).all();
}
function ze() {
  return _().prepare(`
    SELECT * FROM tasks 
    WHERE due_date > date('now') AND due_date <= date('now', '+7 days') AND status != 'done' 
    ORDER BY due_date, sort_order
  `).all();
}
function Ye(e) {
  const t = _(), r = ye(), l = e.project_id ? t.prepare("SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id = ?") : t.prepare("SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id IS NULL"), o = e.project_id ? l.get(e.project_id) : l.get(), n = (o == null ? void 0 : o.max_sort) || 0, i = e.sort_order ?? n + 1e3;
  return t.prepare(`
    INSERT INTO tasks (
      id, title, notes, project_id, priority, status, due_date, due_time, 
      recurrence, sort_order, time_estimate_mins, time_logged_mins, completed_at
    ) VALUES (
      @id, @title, @notes, @project_id, @priority, @status, @due_date, @due_time,
      @recurrence, @sort_order, @time_estimate_mins, @time_logged_mins, @completed_at
    )
  `).run({
    id: r,
    title: e.title,
    notes: e.notes ?? "",
    project_id: e.project_id ?? null,
    priority: e.priority ?? 0,
    status: e.status ?? "todo",
    due_date: e.due_date ?? null,
    due_time: e.due_time ?? null,
    recurrence: e.recurrence ?? null,
    sort_order: i,
    time_estimate_mins: e.time_estimate_mins ?? 0,
    time_logged_mins: e.time_logged_mins ?? 0,
    completed_at: e.completed_at ?? null
  }), t.prepare("SELECT * FROM tasks WHERE id = ?").get(r);
}
function Ge(e) {
  const t = _(), { id: r, ...l } = e, o = Object.keys(l);
  if (o.length === 0)
    return t.prepare("SELECT * FROM tasks WHERE id = ?").get(r);
  const n = o.map((d) => `${d} = @${d}`).join(", ");
  return t.prepare(`
    UPDATE tasks 
    SET ${n}, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...l, id: r }), t.prepare("SELECT * FROM tasks WHERE id = ?").get(r);
}
function Ke(e) {
  _().prepare("DELETE FROM tasks WHERE id = ?").run(e);
}
function Qe(e) {
  const t = _();
  t.transaction((l) => {
    const o = t.prepare("UPDATE tasks SET sort_order = ? WHERE id = ?");
    l.forEach((n, i) => o.run((i + 1) * 1e3, n));
  })(e);
}
function Je(e) {
  const t = _();
  return t.prepare(`
    UPDATE tasks 
    SET status = 'done', completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(e), t.prepare("SELECT * FROM tasks WHERE id = ?").get(e);
}
function Ze() {
  b.handle("tasks:getAll", async () => Xe()), b.handle("tasks:getDueToday", async () => He()), b.handle("tasks:getUpcoming", async () => ze()), b.handle("tasks:getByProject", async (e, t) => We(t)), b.handle("tasks:create", async (e, t) => Ye(t)), b.handle("tasks:update", async (e, t) => Ge(t)), b.handle("tasks:delete", async (e, t) => Ke(t)), b.handle("tasks:reorder", async (e, t) => Qe(t)), b.handle("tasks:complete", async (e, t) => Je(t));
}
function et() {
  return _().prepare("SELECT * FROM projects ORDER BY sort_order").all();
}
function tt(e) {
  const t = _(), r = ye();
  return t.prepare(`
    INSERT INTO projects (id, name, color, icon, sort_order)
    VALUES (@id, @name, @color, @icon, @sort_order)
  `).run({
    id: r,
    name: e.name,
    color: e.color ?? "#6366f1",
    icon: e.icon ?? "folder",
    sort_order: e.sort_order ?? 0
  }), t.prepare("SELECT * FROM projects WHERE id = ?").get(r);
}
function rt(e, t) {
  const r = _(), l = Object.keys(t);
  if (l.length === 0)
    return r.prepare("SELECT * FROM projects WHERE id = ?").get(e);
  const o = l.map((s) => `${s} = @${s}`).join(", ");
  return r.prepare(`
    UPDATE projects
    SET ${o}
    WHERE id = @id
  `).run({ ...t, id: e }), r.prepare("SELECT * FROM projects WHERE id = ?").get(e);
}
function nt(e) {
  _().prepare("DELETE FROM projects WHERE id = ?").run(e);
}
function ot() {
  b.handle("projects:getAll", async () => et()), b.handle(
    "projects:create",
    async (e, t) => tt(t)
  ), b.handle(
    "projects:update",
    async (e, t, r) => rt(t, r)
  ), b.handle(
    "projects:delete",
    async (e, t) => nt(t)
  );
}
function ge(e) {
  b.handle("window:minimize", () => {
    e.minimize();
  }), b.handle("window:maximize", () => {
    e.isMaximized() ? e.unmaximize() : e.maximize();
  }), b.handle("window:close", () => {
    e.close();
  });
}
function it() {
  Ze(), ot();
}
const at = typeof __dirname < "u" ? __dirname : z(Y(import.meta.url));
let y = null, st = null, j = null;
it();
S.whenReady().then(() => {
  y = Z(), ge(y), st = Le();
  let e;
  try {
    e = U.createFromPath(x(at, "../../resources/icon.png")), e.isEmpty() && (e = U.createEmpty());
  } catch {
    e = U.createEmpty();
  }
  j = new Re(e), j.setToolTip("Productivity App");
  const t = ve.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        y && !y.isDestroyed() && (y.show(), y.focus());
      }
    },
    {
      label: "Quick Add",
      click: () => {
        y && !y.isDestroyed() && (y.show(), y.focus(), y.webContents.send("global-shortcut:quick-add"));
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        J(null), j == null || j.destroy(), S.quit();
      }
    }
  ]);
  j.setContextMenu(t), j.on("double-click", () => {
    y && !y.isDestroyed() && (y.show(), y.focus());
  }), J(j), he.register("CommandOrControl+Shift+Space", () => {
    y && !y.isDestroyed() && (y.show(), y.focus(), y.webContents.send("global-shortcut:quick-add"));
  }), S.on("activate", () => {
    H.getAllWindows().length === 0 ? (y = Z(), ge(y)) : y && !y.isVisible() && y.show();
  });
});
S.on("window-all-closed", () => {
});
S.on("before-quit", () => {
  he.unregisterAll();
});
export {
  y as mainWindow,
  j as tray,
  st as widgetWindow
};
