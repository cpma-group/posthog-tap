// Zero-dependency checks for the HTTP surface, run with `node --test`.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 40000 + Math.floor(Math.random() * 10000);
const BASE = `http://127.0.0.1:${PORT}`;
let child;

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});

after(() => child && child.kill());

for (const p of ["/static/surveys.js", "/static/1.434.15/surveys.js", "/static/1.434.15/exception-autocapture.js"]) {
  test(`GET ${p} serves the script stub`, async () => {
    const res = await fetch(BASE + p);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/javascript/);
    assert.match(await res.text(), /optional script stubbed/);
  });
}

test("a deeper /static path is still a 404", async () => {
  const res = await fetch(`${BASE}/static/a/b/surveys.js`);
  assert.equal(res.status, 404);
});
