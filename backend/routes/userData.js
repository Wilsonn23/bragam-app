const express = require('express');
const { requireUserSession } = require('../session');
const router = express.Router({ mergeParams: true });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.use(requireUserSession);
router.get('/bookmarks', async (req, res, next) => {
  try { const {rows} = await req.db.query('SELECT poi_id FROM public.user_bookmarks WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]); res.json(rows); } catch (e) { next(e); }
});
router.post('/bookmarks', async (req, res, next) => {
  if (typeof req.body?.poiId !== 'string' || !req.body.poiId.trim()) return res.status(400).json({error:'POI tidak valid.'});
  try { await req.db.query('INSERT INTO public.user_bookmarks(user_id,poi_id) VALUES ($1,$2) ON CONFLICT (user_id,poi_id) DO NOTHING', [req.params.userId,req.body.poiId]); res.status(204).end(); }
  catch (e) { if(e.code==='23503') return res.status(400).json({error:'POI tidak ditemukan.'}); next(e); }
});
router.delete('/bookmarks/:poiId', async (req,res,next) => {
  try { await req.db.query('DELETE FROM public.user_bookmarks WHERE user_id=$1 AND poi_id=$2',[req.params.userId,req.params.poiId]);res.status(204).end(); } catch(e){next(e);}
});
router.get('/trips', async (req,res,next) => {
  try {
    const {rows} = await req.db.query(`SELECT t.id,t.title,t.created_at, COALESCE(json_agg(json_build_object('poi_id',s.poi_id,'visit_time',s.visit_time,'stop_order',s.stop_order) ORDER BY s.stop_order,s.created_at,s.id) FILTER (WHERE s.id IS NOT NULL),'[]'::json) AS stops FROM public.trips t LEFT JOIN public.trip_stops s ON s.trip_id=t.id WHERE t.user_id=$1 GROUP BY t.id ORDER BY t.created_at DESC`,[req.params.userId]);
    res.json(rows);
  } catch(e){next(e);}
});
router.post('/trips', async (req,res,next) => {
  const {id,title,stops}=req.body || {};
  if(typeof title!=='string' || !title.trim() || title.length>200 || !Array.isArray(stops) || !stops.length || stops.length>100 || stops.some(s=>typeof s?.id!=='string'||!s.id.trim()||typeof s.time!=='string'||!/^\d{1,2}[.:]\d{2}$/.test(s.time))) return res.status(400).json({error:'Judul atau destinasi trip tidak valid.'});
  const editing = typeof id==='string' && uuid.test(id);
  let client;
  try {
    client=await req.db.connect(); await client.query('BEGIN');
    let trip;
    if(editing) {
      const result=await client.query('UPDATE public.trips SET title=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id,title',[title.trim(),id,req.params.userId]);
      if(!result.rows.length){await client.query('ROLLBACK');return res.status(404).json({error:'Trip tidak ditemukan.'});}
      trip=result.rows[0]; await client.query('DELETE FROM public.trip_stops WHERE trip_id=$1',[trip.id]);
    } else {
      const result=await client.query('INSERT INTO public.trips(user_id,title) VALUES($1,$2) RETURNING id,title',[req.params.userId,title.trim()]);trip=result.rows[0];
    }
    for(let i=0;i<stops.length;i++) await client.query('INSERT INTO public.trip_stops(trip_id,poi_id,visit_time,stop_order) VALUES($1,$2,$3,$4)',[trip.id,stops[i].id,stops[i].time,i]);
    await client.query('COMMIT');res.status(editing?200:201).json(trip);
  } catch(e) { if(client) await client.query('ROLLBACK').catch(()=>{}); if(e.code==='23503') return res.status(400).json({error:'Salah satu destinasi tidak ditemukan.'}); next(e); }
  finally { client?.release(); }
});
router.post('/trips/:tripId/stops', async(req,res,next)=>{
  const {poiId,time,stopOrder}=req.body || {};
  if(!uuid.test(req.params.tripId)||typeof poiId!=='string'||!poiId.trim()||typeof time!=='string'||!/^\d{1,2}[.:]\d{2}$/.test(time)||!Number.isInteger(stopOrder)||stopOrder<0) return res.status(400).json({error:'Destinasi trip tidak valid.'});
  try {const {rowCount}=await req.db.query('INSERT INTO public.trip_stops(trip_id,poi_id,visit_time,stop_order) SELECT id,$1,$2,$3 FROM public.trips WHERE id=$4 AND user_id=$5',[poiId,time,stopOrder,req.params.tripId,req.params.userId]); if(!rowCount)return res.status(404).json({error:'Trip tidak ditemukan.'});res.status(204).end();}
  catch(e){if(e.code==='23503')return res.status(400).json({error:'POI tidak ditemukan.'});next(e);}
});
router.delete('/trips/:tripId',async(req,res,next)=>{
  if(!uuid.test(req.params.tripId))return res.status(400).json({error:'ID trip tidak valid.'});
  try{const {rowCount}=await req.db.query('DELETE FROM public.trips WHERE id=$1 AND user_id=$2',[req.params.tripId,req.params.userId]); if(!rowCount)return res.status(404).json({error:'Trip tidak ditemukan.'});res.status(204).end();}catch(e){next(e);}
});
module.exports=router;
