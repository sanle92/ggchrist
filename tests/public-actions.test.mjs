import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function load(file, client) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  const dependencies = name => {
    if (name === '@/lib/supabase/server') return { createClient: async () => client };
    if (name === 'next/server') return { NextResponse: { json: (data, options) => Response.json(data, options) } };
    if (name === 'zod') return require('zod');
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`)(dependencies, module, module.exports);
  return module.exports;
}

const userId = '11111111-1111-4111-a111-111111111111';
const contentId = '22222222-2222-4222-a222-222222222222';
function fixture({ user = userId, reactionError = false, stateError = false } = {}) {
  const state = { liked: false, writes: 0 };
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: user } } }) },
    rpc: async () => ({ data: true, error: null }),
    from(table) {
      let operation = 'select';
      const query = {
        select() { return query; }, eq() { return query; }, is() { return query; }, order() { return query; }, limit() { return query; }, maybeSingle() { return query; },
        insert() { operation = 'insert'; return query; }, delete() { operation = 'delete'; return query; },
        then(resolve, reject) {
          let result = { data: null, error: null };
          if (table === 'content_reactions') {
            if (operation === 'select') result = reactionError ? { data: null, error: { code: '42501' } } : { data: state.liked ? { id: contentId } : null, error: null };
            else { state.liked = operation === 'insert'; state.writes++; }
          } else if (table === 'forum_posts') result = stateError ? { data: null, error: { code: '42501' } } : { data: { like_count: Number(state.liked), comment_count: 0, share_count: 0 }, error: null };
          else if (table === 'comments') result.data = [];
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, state };
}
const likeRequest = () => new Request('https://example.test/api/engagement', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' },
  body: JSON.stringify({ action: 'like', contentType: 'post', contentId }),
});

test('likes and unlikes return current state without a service-role client', async () => {
  const { client, state } = fixture();
  const route = load('../app/api/engagement/route.ts', client);
  let response = await route.POST(likeRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).counts.likes, 1);
  response = await route.POST(likeRequest());
  assert.equal((await response.json()).liked, false);
  assert.equal(state.writes, 2);
});
test('failed reaction reads do not accidentally toggle a like', async () => {
  const { client, state } = fixture({ reactionError: true });
  const route = load('../app/api/engagement/route.ts', client);
  const response = await route.POST(likeRequest());
  assert.equal(response.status, 503);
  assert.equal(state.writes, 0);
});
test('signed-out users cannot like', async () => {
  const { client, state } = fixture({ user: null });
  const route = load('../app/api/engagement/route.ts', client);
  assert.equal((await route.POST(likeRequest())).status, 401);
  assert.equal(state.writes, 0);
});
test('failed engagement state reads return JSON errors instead of zero counts', async () => {
  const { client } = fixture({ stateError: true });
  const route = load('../app/api/engagement/route.ts', client);
  const response = await route.GET(new Request(`https://example.test/api/engagement?contentType=post&contentId=${contentId}`));
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error);
});
test('newsletter validates email and handles duplicates without exposing subscription status', async () => {
  const writes = [];
  const client = { from: table => ({ insert: async data => { writes.push({ table, data }); return { error: { code: '23505' } }; } }) };
  const { subscribeNewsletter } = load('../app/newsletter/actions.ts', client);
  const form = new FormData(); form.set('website', ''); form.set('email', 'bad');
  assert.equal((await subscribeNewsletter({}, form)).success, false);
  assert.equal(writes.length, 0);
  form.set('email', ' Person@Example.com ');
  assert.equal((await subscribeNewsletter({}, form)).success, true);
  assert.equal(writes[0].data.email, 'person@example.com');
  form.set('website', 'spam');
  assert.equal((await subscribeNewsletter({}, form)).success, false);
  assert.equal(writes.length, 1);
});
