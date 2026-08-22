const API='/api';
const memoryCache=new Map();
const inFlight=new Map();

function ttlFor(path,method){
  if(method!=='GET')return 0;
  if(path.startsWith('/matches'))return 12000;
  if(path==='/standings'||path.startsWith('/standings?'))return 45000;
  if(path==='/provider/status')return 60000;
  if(path==='/competitions')return 300000;
  if(path.startsWith('/competitions/'))return 30000;
  if(path==='/teams'||path.startsWith('/teams?'))return 300000;
  if(path==='/news'||path.startsWith('/news?'))return 60000;
  if(path.startsWith('/news/'))return 120000;
  if(path.startsWith('/match/')&&path.endsWith('/details'))return 10000;
  return 0;
}

function timeoutFor(path,method){
  if(method!=='GET')return 15000;
  if(path.startsWith('/matches')||path.startsWith('/standings'))return 6500;
  if(path==='/provider/status')return 3500;
  if(path.startsWith('/news'))return 7000;
  return 9000;
}

export function clearApiCache(prefix=''){
  for(const key of memoryCache.keys())if(!prefix||key.includes(prefix))memoryCache.delete(key);
}

export async function apiFetch(path,options={}){
  const token=localStorage.getItem('ethio_token');
  const method=String(options.method||'GET').toUpperCase();
  const headers=new Headers(options.headers||{});
  if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  if(token)headers.set('Authorization',`Bearer ${token}`);

  const ttl=ttlFor(path,method);
  const key=ttl?`${method}:${path}`:null;
  if(key){
    const cached=memoryCache.get(key);
    if(cached&&Date.now()-cached.at<ttl)return cached.data;
    if(inFlight.has(key))return inFlight.get(key);
  }

  const request=(async()=>{
    const {timeoutMs,...fetchOptions}=options;
    const controller=new AbortController();
    const limit=Number(timeoutMs)||timeoutFor(path,method);
    const timer=setTimeout(()=>controller.abort(),limit);
    const upstreamSignal=fetchOptions.signal;
    const abortFromUpstream=()=>controller.abort();
    if(upstreamSignal){
      if(upstreamSignal.aborted)controller.abort();
      else upstreamSignal.addEventListener('abort',abortFromUpstream,{once:true});
    }
    try{
      const response=await fetch(`${API}${path}`,{...fetchOptions,method,headers,signal:controller.signal,cache:method==='GET'?'default':'no-store'});
      let data=null;
      const type=response.headers.get('content-type')||'';
      if(type.includes('application/json'))data=await response.json();
      if(!response.ok){
        const error=new Error(data?.error||`Request failed (${response.status})`);
        error.status=response.status;
        error.data=data;
        throw error;
      }
      if(key)memoryCache.set(key,{at:Date.now(),data});
      if(method!=='GET')clearApiCache();
      return data;
    }catch(error){
      if(error?.name==='AbortError'){
        const timeoutError=new Error('Live data request timed out.');
        timeoutError.status=504;
        throw timeoutError;
      }
      throw error;
    }finally{
      clearTimeout(timer);
      upstreamSignal?.removeEventListener?.('abort',abortFromUpstream);
    }
  })();

  if(key)inFlight.set(key,request);
  try{return await request}finally{if(key)inFlight.delete(key)}
}
