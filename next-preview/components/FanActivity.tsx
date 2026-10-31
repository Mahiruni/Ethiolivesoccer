'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Bookmark,ChartNoAxesColumn,Heart,RefreshCcw,Trash2} from 'lucide-react';

type Favorite={id:number;name_en:string;short_name:string|null};
type Prediction={
 id:number;match_id:number;vote_choice:'home'|'draw'|'away';
 home_en:string;away_en:string;match_date:string|null
};
async function getAccountItems<T>(path:string,token:string):Promise<T>{
 const response=await fetch('/api/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(body?.error||'Your account activity is unavailable.');
 return body as T;
}
export default function FanActivity({token}:{token:string}){
 const [favorites,setFavorites]=useState<Favorite[]>([]);
 const [predictions,setPredictions]=useState<Prediction[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[removing,setRemoving]=useState<number|null>(null);
 const refresh=async()=>{
  setError('');setLoading(true);
  try{
   const results=await Promise.allSettled([
    getAccountItems<Favorite[]>('me/favorites',token),
    getAccountItems<Prediction[]>('me/predictions',token)
   ]);
   if(results[0].status==='fulfilled')setFavorites(results[0].value);
   if(results[1].status==='fulfilled')setPredictions(results[1].value);
   if(results.some(r=>r.status==='rejected'))setError('Some activity could not be loaded. Retry to check your account.');
  }catch{setError('Account activity is currently unavailable.')}
  finally{setLoading(false)}
 };
 useEffect(()=>{let active=true;setLoading(true);
  Promise.allSettled([
   getAccountItems<Favorite[]>('me/favorites',token),
   getAccountItems<Prediction[]>('me/predictions',token)
  ]).then(results=>{if(!active)return;
   if(results[0].status==='fulfilled')setFavorites(results[0].value);
   if(results[1].status==='fulfilled')setPredictions(results[1].value);
   if(results.some(r=>r.status==='rejected'))setError('Some activity is unavailable in the preview.');
   setLoading(false);
  });return()=>{active=false};
 },[token]);
 const remove=async(id:number)=>{
  setRemoving(id);setError('');
  try{
   const response=await fetch('/api/me/favorites/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.error||'Could not remove club.')}
   setFavorites(items=>items.filter(item=>item.id!==id));
  }catch(e){setError(e instanceof Error?e.message:'Could not update favorites.')}
  finally{setRemoving(null)}
 };
 return <section className="fan-activity" aria-label="Your football activity">
  <div className="fan-activity-heading"><div><span className="eyebrow">YOUR MATCHDAY</span><h3>Favorites & predictions</h3></div><button className="fan-refresh" type="button" disabled={loading} onClick={refresh} aria-label="Refresh football activity"><RefreshCcw size={16}/></button></div>
  {loading?<p className="muted" role="status">Loading your activity…</p>:<>
   <div className="fan-activity-subhead"><Heart size={15}/><strong>Favorite clubs</strong><small>{favorites.length}</small></div>
   {favorites.length?<div className="fan-favorites">{favorites.map(item=><div className="fan-favorite" key={item.id}><span className="fan-favorite-symbol">{(item.short_name||item.name_en).slice(0,2).toUpperCase()}</span><strong>{item.name_en}</strong><button type="button" disabled={removing===item.id} onClick={()=>remove(item.id)} aria-label={'Remove '+item.name_en+' from favorites'}><Trash2 size={16}/></button></div>)}</div>:<div className="fan-empty"><Bookmark size={17}/><span>No favorite clubs saved yet.</span></div>}
   <div className="fan-activity-subhead"><ChartNoAxesColumn size={15}/><strong>Your predictions</strong><small>{predictions.length}</small></div>
   {predictions.length?<div className="fan-predictions">{predictions.slice(0,6).map(item=><div className="fan-prediction" key={item.id}><span><strong>{item.home_en}</strong> vs <strong>{item.away_en}</strong></span><small>Picked: {item.vote_choice==='home'?'Home win':item.vote_choice==='away'?'Away win':'Draw'}</small></div>)}</div>:<div className="fan-empty"><ChartNoAxesColumn size={17}/><span>No predictions yet. Open a verified match to vote.</span></div>}
   <Link className="fan-activity-link" href="/">Explore international fixtures →</Link>
  </>}
  {error&&<p className="account-feedback error" role="alert">{error}</p>}
 </section>
}