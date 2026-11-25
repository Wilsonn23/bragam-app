const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/services/userDataService.js'), 'utf8')
  .replace("import { API_BASE_URL } from '../config/api';", '')
  .replace("import { getToken, clearSession } from './session';", '')
  .replace(/export (async function|function) /g, '$1 ')
  + '\nmodule.exports={saveUserTripPlan,fetchUserTrips};';
function load(fetch) {
  const context = { module:{exports:{}}, API_BASE_URL:'http://test.invalid', getToken:()=> 'session-token',
    clearSession:()=>{}, fetch, AbortController, setTimeout, clearTimeout, JSON, encodeURIComponent };
  vm.runInNewContext(source, context);
  return context.module.exports;
}
test('trip save uses configured API, bearer session, and server-generated ID', async () => {
  let request;
  const service = load(async (url, options) => {
    request = {url, options};
    return {ok:true,status:201,text:async()=>JSON.stringify({id:'server-id'})};
  });
  const saved = await service.saveUserTripPlan('user-1',{id:'plan-1',title:'Braga',stops:[{id:'P01',time:'09.00'}]});
  assert.equal(saved.id,'server-id');
  assert.equal(request.url,'http://test.invalid/api/users/user-1/trips');
  assert.equal(request.options.headers.Authorization,'Bearer session-token');
  assert.equal(JSON.parse(request.options.body).stops[0].id,'P01');
});
test('backend and network failures reach the caller rather than report a saved trip', async () => {
  let service = load(async()=>({ok:false,status:400,json:async()=>({error:'Destinasi tidak ditemukan.'})}));
  await assert.rejects(service.saveUserTripPlan('u',{title:'Trip',stops:[]}),/Destinasi tidak ditemukan/);
  service = load(async()=>{throw new Error('Network request failed');});
  await assert.rejects(service.saveUserTripPlan('u',{title:'Trip',stops:[]}),/Periksa koneksi/);
});
