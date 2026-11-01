import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Mic,MicOff,Volume2,VolumeX,Send,Square,AudioLines} from 'lucide-react';
import './VoiceFooter.css';

const commands=[
  {words:/\b(score|scores|match|matches|fixture|fixtures|live)\b/i,answer:'Opening the match center.',path:'/#scores'},
  {words:/\b(news|headline|article)\b/i,answer:'Opening football news.',path:'/news'},
  {words:/\b(league|competition|standings|table)\b/i,answer:'Opening competitions.',path:'/competitions'}
];
function answerFor(input){
  const q=input.trim();
  if(!q)return {answer:'Please enter a question.'};
  const match=commands.find(c=>c.words.test(q));
  if(match)return match;
  if(/\b(hello|hi|hey)\b/i.test(q))return {answer:'Hello! I can help you navigate Fetan. Try saying live scores, football news, or competitions.'};
  return {answer:'I can currently help you navigate Fetan to live scores, news, and competitions. Live AI conversations will become available when a supported voice model is connected.'};
}
export default function VoiceFooter(){
 const [open,setOpen]=useState(false),[listening,setListening]=useState(false),[muted,setMuted]=useState(false),[input,setInput]=useState(''),[status,setStatus]=useState('Ready'),[messages,setMessages]=useState([]);
 const recognition=useRef(null),speech=useRef(null);
 useEffect(()=>()=>{recognition.current?.abort?.();window.speechSynthesis?.cancel?.()},[]);
 function stop(){recognition.current?.abort?.();setListening(false);window.speechSynthesis?.cancel?.();setStatus('Ready')}
 function speak(text){if(muted||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=1;window.speechSynthesis.speak(u)}
 function submit(value){const q=value.trim();if(!q)return;const result=answerFor(q);setMessages(m=>[...m.slice(-5),{q,a:result.answer,path:result.path}]);setInput('');setStatus('Ready');speak(result.answer)}
 function toggleMic(){
   if(listening){stop();return}
   const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!Recognition){setStatus('Voice recognition is not supported here. Use the text box.');return}
   try{
    const r=new Recognition();recognition.current=r;r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;
    r.onresult=e=>submit(e.results[0][0].transcript);
    r.onerror=e=>{setStatus(e.error==='not-allowed'?'Microphone permission denied. Enable it in browser settings.':'Microphone unavailable. Try typing instead.');setListening(false)};
    r.onend=()=>setListening(false);r.start();setListening(true);setStatus('Listening…');
   }catch{setStatus('Unable to start microphone. Try typing instead.')}
 }
 return <footer className="fetan-voice-footer">
  <div className="fetan-voice-inner">
   <div className="fetan-voice-heading"><span className="fetan-voice-symbol"><AudioLines size={21}/></span><div><strong>Fetan Voice</strong><small>Voice-powered football navigation · Dessa-ready</small></div></div>
   <button className="fetan-voice-open" type="button" aria-expanded={open} aria-controls="fetan-voice-panel" onClick={()=>{if(open)stop();setOpen(!open)}}>{open?'Close assistant':'Talk to Fetan'} <Mic size={17}/></button>
  </div>
  {open&&<section id="fetan-voice-panel" className="fetan-voice-panel" aria-label="Fetan voice assistant">
    <p className="fetan-voice-disclosure">This is a browser-powered voice navigation preview, not Block’s Dessa model or a generative AI chat.</p>
    <div className="fetan-voice-messages" aria-live="polite">
      {messages.length===0?<p>Ask for <b>live scores</b>, <b>news</b>, or <b>competitions</b>.</p>:messages.map((m,i)=><div className="fetan-voice-exchange" key={i}><p className="fetan-voice-question">{m.q}</p><p>{m.a} {m.path&&<Link to={m.path} onClick={()=>{setOpen(false);stop()}}>Open page</Link>}</p></div>)}
    </div>
    <div className="fetan-voice-status" role="status">{status}</div>
    <form className="fetan-voice-controls" onSubmit={e=>{e.preventDefault();submit(input)}}>
      <button type="button" className={listening?'fetan-mic active':'fetan-mic'} aria-label={listening?'Stop listening':'Start voice input'} onClick={toggleMic}>{listening?<Square size={19}/>:<Mic size={19}/>}</button>
      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about football…" aria-label="Voice assistant message" maxLength={250}/>
      <button type="submit" aria-label="Send message"><Send size={18}/></button>
      <button type="button" aria-label={muted?'Enable spoken responses':'Mute spoken responses'} onClick={()=>{setMuted(!muted);window.speechSynthesis?.cancel?.()}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
    </form>
    <p className="fetan-voice-privacy">Microphone access requires your permission. Recognized text is handled in this browser; this preview does not send recordings to Fetan servers.</p>
  </section>}
  <div className="fetan-voice-bottom"><span>© {new Date().getFullYear()} Fetan · Football, faster.</span><span>Voice preview · <a href="https://block.xyz/dessa" target="_blank" rel="noopener noreferrer">About Dessa research</a></span></div>
 </footer>;
}
