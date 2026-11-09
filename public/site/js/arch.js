/* Architectural panels: profile drawings + the "pick the look" designer.
   Everything here is an illustration. Profiles are described by their bands (width, depth), so one table drives the
   cross-section drawings, the facade shading and the labels. Sizes are intentionally not shown until they are confirmed. */
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const COLORS=[['Grey White','#E7EBDA'],['White','#F5F5F2'],['White Aluminum','#A8ABAA'],['Ivory','#E6D2B5'],['Light Blue','#6FA3D6'],
    ['Gentian Blue','#0E4C92'],['Signal Green','#237F52'],['Colza Yellow','#F3DA0B'],['Pure Orange','#E75B12'],['Flame Red','#AF2B1E']]
    .map(([n,h])=>({n,h,slug:n.toLowerCase().replace(/ /g,'-')}));
  // band: w = width across the module, h = height toward the viewer (0 = back plane, 1 = deepest rib)
  const PROFILES={
    flush:{n:'Flush',W:96,dir:'v',reveal:true,bands:[{w:96,h:0}],
      d:'A clean, flat face with a fine shadow-line seam. The quietest look, and the one that shows color and perforation best.'},
    rib:{n:'Single Rib',W:96,dir:'v',bands:[{w:78,h:0},{w:18,h:1}],
      d:'A flat pan broken by one bold box rib. Strong vertical lines from a simple profile.'},
    step:{n:'Multi-Step',W:96,dir:'h',bands:[{w:24,h:.15},{w:24,h:.85},{w:24,h:.5},{w:24,h:0}],
      d:'Bands stepping between several depths, like louvers. Hung horizontally it throws deep shadow lines across the wall.'},
    reveal:{n:'Wide Reveal',W:96,dir:'h',bands:[{w:58,h:1},{w:13,h:.55},{w:13,h:.25},{w:12,h:0}],
      d:'A wide flat face with a small stepped reveal along one edge. Calm surfaces with a crisp, layered detail.'}
  };
  const PERFS={solid:{n:'Solid'},fine:{n:'Fine',p:6,r:1.3},medium:{n:'Medium',p:9,r:2.3},bold:{n:'Bold',p:15,r:4.4}};
  const SCENES={office:'Office',warehouse:'Warehouse',lobby:'Lobby'};
  const st={s:'office',p:'flush',f:'solid',m:'steel',c:'grey-white',d:'v',l:'day'};

  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)), hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mix=(h,t,p)=>{ const a=rgb(h),b=rgb(t); return hex(a.map((v,i)=>v+(b[i]-v)*p)); };
  const baseColor=()=>{ const c=COLORS.find(x=>x.slug===st.c).h; return st.m==='alu'?mix(c,'#cfd6dc',.07):c; };

  /* ---------- cross-section drawing (cards + side panel) ---------- */
  function section(key,color,opts){
    opts=opts||{}; const p=PROFILES[key], k=opts.k||1.35, depth=opts.depth||30, mods=opts.mods||2, y0=opts.y0||66;
    const dark=mix(color,'#000000',.55); let x=14, d='', prev=null;
    for(let m=0;m<mods;m++) p.bands.forEach(b=>{ const y=y0-b.h*depth;
      d+=(d?'':`M${x} ${y}`)+(prev!==null&&prev!==y?` L${x} ${y}`:'')+` L${x+b.w*k} ${y}`; x+=b.w*k; prev=y; });
    const w=x+14;
    return `<svg viewBox="0 0 ${w} 104" role="img" aria-label="${p.n} profile, cross-section illustration" xmlns="http://www.w3.org/2000/svg">`+
      `<line x1="8" y1="${y0+14}" x2="${w-8}" y2="${y0+14}" stroke="#9aa3ad" stroke-dasharray="3 4"/>`+
      `<path d="${d}" fill="none" stroke="${dark}" stroke-width="6.4" stroke-linejoin="round" stroke-linecap="round"/>`+
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`+
      `<text x="10" y="14" font-family="Inter,system-ui,sans-serif" font-size="9" fill="#6e6e73" letter-spacing="1.2">FRONT</text></svg>`;
  }
  function perfPreview(key,color){
    const f=PERFS[key]; if(!f.p) return `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solid"><rect width="120" height="80" rx="8" fill="${color}"/></svg>`;
    return `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${f.n} perforation"><defs><pattern id="pp-${key}" width="${f.p*1.6}" height="${f.p*1.6}" patternUnits="userSpaceOnUse"><circle cx="${f.p*.4}" cy="${f.p*.4}" r="${f.r*1.6}" fill="#0d1218" opacity=".88"/><circle cx="${f.p*1.2}" cy="${f.p*1.2}" r="${f.r*1.6}" fill="#0d1218" opacity=".88"/></pattern></defs><rect width="120" height="80" rx="8" fill="${color}"/><rect width="120" height="80" rx="8" fill="url(#pp-${key})"/></svg>`;
  }

  /* ---------- facade drawing ---------- */
  function cladding(p,dir,base){
    const TH=96, D=mix(base,'#000000',.36), L=mix(base,'#ffffff',.5); let x=0, out='';
    p.bands.forEach((b,i)=>{
      const prev=p.bands[i-1]||p.bands[p.bands.length-1], next=p.bands[i+1]||p.bands[0];
      out+=`<rect x="${x}" width="${b.w}" height="${TH}" fill="${mix(base,'#ffffff',.03+b.h*.1)}"/>`;
      if(b.h>prev.h) out+=`<rect x="${x}" width="2" height="${TH}" fill="${L}"/>`;
      if(b.h<prev.h) out+=`<rect x="${x}" width="${Math.min(b.w*.7,(prev.h-b.h)*15+3)}" height="${TH}" fill="${D}" opacity=".42"/>`;
      if(b.h<next.h) out+=`<rect x="${x+b.w-3}" width="3" height="${TH}" fill="${D}" opacity=".55"/>`;
      x+=b.w;
    });
    if(p.reveal) out+=`<rect width="2.5" height="${TH}" fill="${D}" opacity=".9"/><rect x="2.5" width="1.5" height="${TH}" fill="${L}" opacity=".6"/>`;
    return `<pattern id="clad" width="${p.W}" height="${TH}" patternUnits="userSpaceOnUse"${dir==='h'?' patternTransform="rotate(90)"':''}>${out}</pattern>`;
  }
  function perfPattern(key){
    const f=PERFS[key]; if(!f.p) return '';
    return `<pattern id="perf" width="${f.p}" height="${f.p}" patternUnits="userSpaceOnUse"><circle cx="${f.p/4}" cy="${f.p/4}" r="${f.r}" fill="#0d1218" opacity=".9"/><circle cx="${f.p*3/4}" cy="${f.p*3/4}" r="${f.r}" fill="#0d1218" opacity=".9"/></pattern>`;
  }
  function glass(x,y,w,h,d,mull=0){
    let g=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${d?'gDusk':'gDay'})" stroke="#1b2229" stroke-width="3"/>`;
    for(let i=1;i<=mull;i++){ const mx=x+w*i/(mull+1); g+=`<line x1="${mx}" y1="${y}" x2="${mx}" y2="${y+h}" stroke="#1b2229" stroke-width="2.5"/>`; }
    return g+`<polygon points="${x+3},${y+h-3} ${x+w*.38},${y+3} ${x+w*.55},${y+3} ${x+3+w*.17},${y+h-3}" fill="#fff" opacity="${d?.1:.16}"/>`;
  }
  function dock(x,y,w,h){
    let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cdd2d7" stroke="#1b2229" stroke-width="3"/>`;
    for(let i=1;i<7;i++) s+=`<line x1="${x}" y1="${y+i*h/7}" x2="${x+w}" y2="${y+i*h/7}" stroke="#a9b0b7" stroke-width="2"/>`;
    return s+`<rect x="${x-7}" y="${y+h-28}" width="7" height="28" fill="#14181c"/><rect x="${x+w}" y="${y+h-28}" width="7" height="28" fill="#14181c"/>`;
  }
  const GY=470;
  const SC={
    office:{walls:[[170,170,470,300],[640,100,150,370]],over:d=>{ let o=''; for(const y of [205,290]) for(let i=0;i<4;i++) o+=glass(195+i*110,y,90,55,d); o+=glass(195,382,300,88,d,3)+'<rect x="185" y="372" width="320" height="9" fill="#232a31"/>'; return o+glass(668,130,34,270,d)+glass(728,130,34,270,d); }},
    warehouse:{walls:[[100,250,800,220]],over:d=>{ let o=''; for(let i=0;i<6;i++) o+=glass(130+i*130,272,110,34,d,1); for(const x of [190,410,630]) o+=dock(x,372,120,98); return o+'<rect x="826" y="392" width="52" height="78" fill="#2a3139" stroke="#1b2229" stroke-width="3"/>'; }}
  };
  function flag(){ let f='<rect x="936" y="330" width="4" height="140" fill="#cfd5da"/><rect x="940" y="334" width="54" height="30" fill="#b22234"/>'; for(let i=1;i<7;i+=2) f+=`<rect x="940" y="${334+i*30/7}" width="54" height="${30/7}" fill="#fff"/>`; return f+'<rect x="940" y="334" width="22" height="16" fill="#3c3b6e"/>'; }

  function defs(base,d){
    const p=PROFILES[st.p];
    return `<defs>${cladding(p,st.d,base)}${perfPattern(st.f)}
      <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d8f2"/><stop offset="1" stop-color="#eef6fc"/></linearGradient>
      <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2757"/><stop offset=".6" stop-color="#9c4f7c"/><stop offset="1" stop-color="#f4b27a"/></linearGradient>
      <linearGradient id="gDay" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c4766"/><stop offset="1" stop-color="#7fa3c4"/></linearGradient>
      <linearGradient id="gDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a8"/><stop offset="1" stop-color="#f2a65a"/></linearGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
      <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="${st.m==='alu'?.30:.10}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="${st.m==='alu'?.16:.05}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="wash" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff3d6" stop-opacity="${d?.55:.35}"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></radialGradient>
      <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  }
  function wallLayers(x,y,w,h,d){
    let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#clad)"/>`;
    if(PERFS[st.f].p) s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#perf)"/>`;
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#shade)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gloss)"/>`;
    if(d) s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#101a3a" opacity=".4"/>`;
    return s;
  }
  function exterior(base,d){
    const g=SC[st.s]; let walls='';
    g.walls.forEach(([x,y,w,h])=>{ walls+=wallLayers(x,y,w,h,d)+`<rect x="${x-5}" y="${y-9}" width="${w+10}" height="9" fill="#232a31"/><rect x="${x}" y="${GY-9}" width="${w}" height="9" fill="#2b333b"/>`; });
    const clouds=d?'':'<g fill="#fff" opacity=".8"><ellipse cx="190" cy="80" rx="90" ry="20"/><ellipse cx="250" cy="68" rx="60" ry="18"/><ellipse cx="760" cy="60" rx="110" ry="22"/><ellipse cx="840" cy="48" rx="70" ry="16"/></g>';
    const ground=`<rect y="${GY}" width="1000" height="90" fill="#3a4046"/><rect y="${GY}" width="1000" height="14" fill="#9aa3ab"/>`+[40,200,360,520,680,840].map(x=>`<rect x="${x}" y="522" width="80" height="6" fill="#e9eef2" opacity=".75"/>`).join('')+(d?`<rect y="${GY}" width="1000" height="90" fill="#101a3a" opacity=".35"/>`:'');
    return `<rect width="1000" height="560" fill="url(#${d?'skyDusk':'skyDay'})"/>${clouds}<g>${walls}</g><g${d?' filter="url(#glow)"':''}>${g.over(d)}</g>${ground}${flag()}`;
  }
  function lobby(base,d){
    const dim=d?.55:0;
    let s=`<rect width="1000" height="560" fill="#d9dde1"/>`+
      `<rect x="0" y="0" width="1000" height="82" fill="#f2f4f6"/><rect x="0" y="82" width="1000" height="6" fill="#c7ccd1"/>`+
      `<rect x="0" y="440" width="1000" height="120" fill="#b9bfc5"/><rect x="0" y="440" width="1000" height="7" fill="#2b333b"/>`+
      wallLayers(140,88,720,352,false)+`<rect x="140" y="88" width="720" height="352" fill="url(#wash)"/>`;
    for(let i=0;i<5;i++) s+=`<ellipse cx="${200+i*150}" cy="84" rx="26" ry="5" fill="#fffbe9"/>`;
    s+=`<rect x="160" y="384" width="270" height="56" fill="#20262c"/><rect x="152" y="376" width="286" height="12" fill="#3a434b"/>`+
       `<rect x="660" y="236" width="120" height="204" fill="#161b20"/><rect x="656" y="232" width="128" height="8" fill="#2b333b"/>`+
       `<rect x="540" y="410" width="90" height="30" rx="4" fill="#2f363d"/>`+
       `<rect x="140" y="447" width="720" height="60" fill="${base}" opacity=".16"/>`;
    if(d) s+=`<rect width="1000" height="560" fill="#0d1226" opacity="${dim}"/>`+[0,1,2,3,4].map(i=>`<ellipse cx="${200+i*150}" cy="84" rx="30" ry="6" fill="#ffd89a" filter="url(#glow)"/>`).join('');
    return s;
  }
  const stage=$('#ar-stage');
  function sceneKind(){ return st.s==='lobby'; }
  function render(write){
    if(!stage) return;
    const base=baseColor(), d=st.l==='dusk', col=COLORS.find(c=>c.slug===st.c), prof=PROFILES[st.p], perf=PERFS[st.f];
    stage.innerHTML=defs(base,d)+(sceneKind()?lobby(base,d):exterior(base,d));
    stage.setAttribute('aria-label',`${SCENES[st.s]} with ${prof.n} ${st.d==='v'?'vertical':'horizontal'} ${perf.p?perf.n.toLowerCase()+' perforated':'solid'} ${st.m==='alu'?'aluminum':'steel'} panels in ${col.n}`);
    for(const k of ['s','p','f','m','d','l']) $$(`[data-g="${k}"] .pill`).forEach(c=>{ const on=c.dataset.v===st[k]; c.classList.toggle('on',on); c.setAttribute('aria-pressed',on); });
    $$('#ar-sw button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.c));
    $$('[data-g="l"] .pill').forEach(c=>{ c.textContent=sceneKind()?(c.dataset.v==='day'?'Bright':'Dim'):(c.dataset.v==='day'?'Day':'Dusk'); });
    const dirTxt=st.d==='v'?'Vertical':'Horizontal', matTxt=st.m==='alu'?'Aluminum':'Steel', perfTxt=perf.p?perf.n+' perforation':'Solid';
    $('#ar-cn').textContent=col.n;
    $('#ar-secP').innerHTML=section(st.p,base); $('#ar-secF').innerHTML=perfPreview(st.f,base);
    const set=(id,v)=>{ const e=$(id); if(e) e.textContent=v; };
    set('#ar-sS',SCENES[st.s]); set('#ar-sP',prof.n); set('#ar-sF',perfTxt); set('#ar-sM',matTxt); set('#ar-sD',dirTxt); set('#ar-sC',col.n);
    $('#ar-profd').textContent=prof.d;
    $('#ar-look').value=lookText();
    if(write) history.replaceState(null,'','#'+new URLSearchParams(st).toString());
  }
  const lookText=()=>{ const col=COLORS.find(c=>c.slug===st.c), perf=PERFS[st.f]; return `${SCENES[st.s]} · ${PROFILES[st.p].n} · ${perf.p?perf.n+' perforation':'Solid'} · ${st.m==='alu'?'Aluminum':'Steel'} · ${col.n} · ${st.d==='v'?'Vertical':'Horizontal'}`; };

  /* ---------- wire up ---------- */
  function validate(){ if(!SC[st.s]&&st.s!=='lobby') st.s='office'; if(!PROFILES[st.p]) st.p='flush'; if(!PERFS[st.f]) st.f='solid'; if(!['steel','alu'].includes(st.m)) st.m='steel'; if(!COLORS.some(c=>c.slug===st.c)) st.c='grey-white'; if(!['v','h'].includes(st.d)) st.d='v'; if(!['day','dusk'].includes(st.l)) st.l='day'; }
  function fromHash(){ const q=new URLSearchParams(location.hash.slice(1)); let any=false; for(const k of Object.keys(st)){ const v=q.get(k); if(v){ st[k]=v; any=true; } } validate(); return any; }
  // profile cards and the perforation row
  $$('[data-section]').forEach(el=>{ const k=el.dataset.section; el.innerHTML=section(k,mix('#A8ABAA','#ffffff',.1)); });
  $$('[data-perf]').forEach(el=>{ el.innerHTML=perfPreview(el.dataset.perf,'#A8ABAA'); });
  $$('[data-use]').forEach(b=>b.addEventListener('click',()=>{ st.p=b.dataset.use; st.d=PROFILES[st.p].dir; render(true); $('#designer').scrollIntoView({behavior:'smooth',block:'start'}); }));
  if(!stage) return;
  const sw=$('#ar-sw'); COLORS.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='sw2'; b.style.background=c.h; b.title=c.n; b.dataset.v=c.slug; b.setAttribute('aria-label',c.n); b.onclick=()=>{ st.c=c.slug; render(true); }; sw.appendChild(b); });
  $$('[data-g] .pill').forEach(ch=>ch.onclick=()=>{ const g=ch.closest('[data-g]').dataset.g; st[g]=ch.dataset.v; if(g==='p') st.d=PROFILES[st.p].dir; render(true); });
  fromHash(); render(false);
  addEventListener('hashchange',()=>{ if(fromHash()) render(false); });
  const link=()=>location.origin+location.pathname+'#'+new URLSearchParams(st).toString();
  const flash=(b,t)=>{ const o=b.dataset.t||(b.dataset.t=b.textContent); b.textContent=t; setTimeout(()=>{ b.textContent=o; },1800); };
  $('#ar-copy').onclick=function(){ const b=this; const txt=`Architectural panels, my look: ${lookText()}. Please send pricing and lead time.\n${link()}`; (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>flash(b,'Copied, paste it in the form'),()=>flash(b,'Copy it from the box below')); };
  $('#ar-share').onclick=function(){ const b=this; (navigator.clipboard?navigator.clipboard.writeText(link()):Promise.reject()).then(()=>flash(b,'Link copied'),()=>flash(b,'Copy it from the address bar')); };
  const mail=$('#ar-mail'); if(mail) mail.addEventListener('click',()=>{ mail.href='mailto:Sales@harvestpanels.com?subject='+encodeURIComponent('Architectural panels quote request')+'&body='+encodeURIComponent(`My look: ${lookText()}\n${link()}\n\nProject, location and timeline:\n`); });
})();
