const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { createSession, revokeSession } = require('../session');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const trip = '33333333-3333-4333-8333-333333333333';

test('trip endpoints require the owning session and save ordered stops atomically', async t => {
  const queries = [];
  let rejectStop = false;
  const client = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (/INSERT INTO public.trips/.test(sql)) return { rows: [{ id: trip, title: args[1] }] };
    if (/UPDATE public.trips/.test(sql)) return { rows: args[1] === trip ? [{ id: trip, title: args[0] }] : [] };
    if (/INSERT INTO public.trip_stops/.test(sql) && rejectStop) throw Object.assign(new Error('foreign key'), { code: '23503' });
    return { rows: [], rowCount: 1 };
  }, release: () => queries.push({ sql: 'RELEASE' }) };
  const db = { connect: async () => client, query: async (sql, args) => {
    queries.push({ sql, args });
    if (/SELECT t.id/.test(sql)) return { rows: [{ id: trip, title: 'Jalan', stops: [{ poi_id: 'P01', visit_time: '09.00', stop_order: 0 }] }] };
    return { rows: [], rowCount: 1 };
  } };
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const token = createSession(owner); t.after(() => revokeSession(token));
  const call = (user, path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/users/${user}${path}`, options);
  const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` };
  assert.equal((await call(owner, '/trips')).status, 401);
  assert.equal((await call(other, '/trips', {headers})).status, 403);
  const body = { id:'plan-123', title:'Jalan', stops:[{id:'P01',time:'09.00'},{id:'P02',time:'10.15'}] };
  const response = await call(owner, '/trips', {method:'POST',headers,body:JSON.stringify(body)});
  assert.equal(response.status, 201); assert.equal((await response.json()).id,trip);
  assert.deepEqual(queries.filter(q=>/INSERT INTO public.trip_stops/.test(q.sql)).map(q=>q.args),[[trip,'P01','09.00',0],[trip,'P02','10.15',1]]);
  assert.ok(queries.some(q=>q.sql==='COMMIT'));
  const list=await call(owner,'/trips',{headers}); assert.equal((await list.json())[0].stops[0].poi_id,'P01');
  queries.length=0; rejectStop=true;
  const failed=await call(owner,'/trips',{method:'POST',headers,body:JSON.stringify({...body,id:trip})});
  assert.equal(failed.status,400); assert.ok(queries.some(q=>q.sql==='ROLLBACK')); assert.ok(!queries.some(q=>q.sql==='COMMIT'));
  assert.equal((await call(owner,'/trips',{method:'POST',headers,body:JSON.stringify({...body,stops:[]})})).status,400);
});
