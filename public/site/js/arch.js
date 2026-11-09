/* Architectural panels: profile drawings + the "pick the look" designer.
   Everything here is an illustration (a flat panel sample, not a building). Each profile is a line across one 240 mm module (x mm, height mm toward the viewer),
   so one table drives the cross-section drawings, the facade shading and the labels. These four profiles are our own designs;
   sizes are intentionally not shown until they are confirmed. */
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const COLORS=[['Grey White','#E7EBDA'],['White','#F5F5F2'],['White Aluminum','#A8ABAA'],['Ivory','#E6D2B5'],['Light Blue','#6FA3D6'],
    ['Gentian Blue','#0E4C92'],['Signal Green','#237F52'],['Colza Yellow','#F3DA0B'],['Pure Orange','#E75B12'],['Flame Red','#AF2B1E']]
    .map(([n,h])=>({n,h,slug:n.toLowerCase().replace(/ /g,'-')}));
  const MOD=240, DEG=Math.PI/180;
  const wavePts=()=>Array.from({length:49},(_,i)=>[i*5,14*(1-Math.cos(Math.PI*i*5/60))]);           // two soft waves per module
  const sawPts=()=>{ const p=[]; for(let b=0;b<3;b++) p.push([80*b,0],[80*b+62,26]); return p.concat([[240,0]]); }; // long ramp, short steep drop
  const flutePts=()=>{ const p=[]; for(let b=0;b<4;b++){ const x=60*b; p.push([x,0],[x+7,0]); for(let a=8;a<173;a+=12) p.push([x+7+23*(1-Math.cos(a*DEG)),19*Math.sin(a*DEG)]); p.push([x+53,0]); } return p.concat([[240,0]]); };
  const pinPts=()=>{ const p=[]; for(let b=0;b<6;b++){ const x=40*b; p.push([x,5],[x+34,5],[x+37,0]); } return p.concat([[240,5]]); };
  // pts = the line across one module; vz = how much the drawing exaggerates depth
  const PROFILES={
    wave:{n:'Soft Wave',dir:'v',vz:1.1,pts:wavePts(),
      d:'A smooth, continuous wave. Soft shadows that shift with the light across the day.'},
    saw:{n:'Sawtooth',dir:'h',vz:1.1,pts:sawPts(),
      d:'Angled blades that catch the light on one side and shade the other. Hung horizontally it reads like layered louvers.'},
    flute:{n:'Flute',dir:'v',vz:1.2,pts:flutePts(),
      d:'Rounded half-round flutes in a steady rhythm. A rich, tactile surface with a crafted feel.'},
    pin:{n:'Pinstripe',dir:'h',vz:2.4,pts:pinPts(),
      d:'A flat face cut by fine, evenly spaced grooves. Quiet and modern, and it shows color and perforation best.'}
  };
  // height of a profile at x mm (repeats every module)
  function hAt(p,x){ x=((x%MOD)+MOD)%MOD; const a=p.pts; for(let i=1;i<a.length;i++){ if(x<=a[i][0]){ const [x0,h0]=a[i-1],[x1,h1]=a[i]; return x1===x0?h1:h0+(h1-h0)*(x-x0)/(x1-x0); } } return a[a.length-1][1]; }
  const PERFS={solid:{n:'Solid'},fine:{n:'Fine',p:6,r:1.3},medium:{n:'Medium',p:9,r:2.3},bold:{n:'Bold',p:15,r:4.4}};
  const HP='#look/';   // the designer's state lives in the address as #look/p=wave&f=solid..., so it never clashes with page anchors
  const st={p:'wave',f:'solid',m:'steel',c:'grey-white',d:'v'};

  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)), hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mix=(h,t,p)=>{ const a=rgb(h),b=rgb(t); return hex(a.map((v,i)=>v+(b[i]-v)*p)); };
  const baseColor=()=>{ const c=COLORS.find(x=>x.slug===st.c).h; return st.m==='alu'?mix(c,'#cfd6dc',.07):c; };

  /* ---------- cross-section drawing (cards + side panel) ---------- */
  function section(key,color,opts){
    opts=opts||{}; const p=PROFILES[key], k=opts.k||.54, mods=opts.mods||2, y0=opts.y0||66, vz=p.vz;
    const dark=mix(color,'#000000',.55); let d='';
    for(let m=0;m<mods;m++) p.pts.forEach(([px,ph],i)=>{ if(m>0&&i===0) return; d+=(d?' L':'M')+(14+(m*MOD+px)*k).toFixed(1)+' '+(y0-ph*vz).toFixed(1); });
    const w=14+mods*MOD*k+14;
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

  /* ---------- panel sample: a flat piece of the panel, no building ---------- */
  // Shades one module slice by slice: surfaces turned toward the light (upper left) are lighter, turned away are darker,
  // and anything below a taller neighbour on the light side sits in its shadow.
  function cladding(p,dir,base){
    const TH=96, TW=96, N=240, kx=TW/N; let out='';
    for(let i=0;i<N;i++){
      const x=i+.5, h=hAt(p,x), s=(hAt(p,x+1.5)-hAt(p,x-1.5))/3;
      const lam=(.5*s+.85)/Math.sqrt(1+s*s)-.85;
      let c=lam<0?mix(base,'#000000',Math.min(.42,-lam)):mix(base,'#ffffff',Math.min(.4,lam*2.2));
      for(let d=3;d<=84;d+=3){ if(hAt(p,x-d)-1.7*d>h+.3){ c=mix(c,'#000000',.26); break; } }
      // each slice runs to the right edge of the tile and the next one paints over it, so there are no hairline seams
      out+=`<rect x="${(i*kx).toFixed(2)}" width="${(TW-i*kx).toFixed(2)}" height="${TH}" fill="${c}"/>`;
    }
    return `<pattern id="clad" width="${TW}" height="${TH}" patternUnits="userSpaceOnUse" patternTransform="${dir==='h'?'rotate(90) ':''}scale(2)">${out}</pattern>`;
  }
  function perfPattern(key){
    const f=PERFS[key]; if(!f.p) return '';
    return `<pattern id="perf" width="${f.p}" height="${f.p}" patternUnits="userSpaceOnUse"><circle cx="${f.p/4}" cy="${f.p/4}" r="${f.r}" fill="#0d1218" opacity=".78"/><circle cx="${f.p*3/4}" cy="${f.p*3/4}" r="${f.r}" fill="#0d1218" opacity=".78"/></pattern>`;
  }
  // A sample of the panel seen from slightly above, so the real profile shows along its cut edges (top and bottom, or left and right).
  function sample(base){
    const p=PROFILES[st.p], perf=PERFS[st.f], v=st.d==='v', K=.8, W=880, H=464, step=4;   // K = drawing px per mm of profile
    const disp=t=>p.vz*hAt(p,t/K), n=Math.round((v?W:H)/step);
    let max=0; const a=[], b=[];
    for(let i=0;i<=n;i++){ const t=i*step, d=disp(t); max=Math.max(max,d); if(v){ a.push([t,d]); b.push([t,H+d]); } else { a.push([d,t]); b.push([W+d,t]); } }
    const pts=q=>q.map(([x,y])=>x.toFixed(1)+' '+y.toFixed(1)), line=q=>'M'+pts(q).join(' L');
    const face=line(a)+' L'+pts(b.slice().reverse()).join(' L')+' Z', edge=mix(base,'#000000',.55);
    const R=`width="${W+max+2}" height="${H+max+2}"`, ox=v?(1000-W)/2:(1000-W-max)/2, oy=v?(560-H-max)/2:(560-H)/2;
    return `<defs>${cladding(p,st.d,base)}${perfPattern(st.f)}
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f2"/><stop offset="1" stop-color="#cdd2d8"/></linearGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
      <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="${st.m==='alu'?.30:.10}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="${st.m==='alu'?.16:.05}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="cp"><path d="${face}"/></clipPath>
      <filter id="drop" x="-10%" y="-10%" width="120%" height="135%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#10233f" flood-opacity=".3"/></filter></defs>
      <rect width="1000" height="560" fill="url(#bg)"/>
      <g transform="translate(${ox} ${oy})"><path d="${face}" fill="#2b333b" filter="url(#drop)"/>
        <g clip-path="url(#cp)"><rect ${R} fill="url(#clad)"/>${perf.p?`<rect ${R} fill="url(#perf)"/>`:''}<rect ${R} fill="url(#shade)"/><rect ${R} fill="url(#gloss)"/></g>
        <path d="${line(a)}" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/><path d="${line(b)}" fill="none" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/></g>`;
  }
  const stage=$('#ar-stage');
  function render(write){
    if(!stage) return;
    const base=baseColor(), col=COLORS.find(c=>c.slug===st.c), prof=PROFILES[st.p], perf=PERFS[st.f];
    stage.innerHTML=sample(base);
    stage.setAttribute('aria-label',`${prof.n} panel sample, ${st.d==='v'?'vertical':'horizontal'}, ${perf.p?perf.n.toLowerCase()+' perforated':'solid'}, ${st.m==='alu'?'aluminum':'steel'}, ${col.n}`);
    for(const k of ['p','f','m','d']) $$(`[data-g="${k}"] .pill`).forEach(c=>{ const on=c.dataset.v===st[k]; c.classList.toggle('on',on); c.setAttribute('aria-pressed',on); });
    $$('#ar-sw button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.c));
    const dirTxt=st.d==='v'?'Vertical':'Horizontal', matTxt=st.m==='alu'?'Aluminum':'Steel', perfTxt=perf.p?perf.n+' perforation':'Solid';
    $('#ar-cn').textContent=col.n;
    $('#ar-secP').innerHTML=section(st.p,base); $('#ar-secF').innerHTML=perfPreview(st.f,base);
    const set=(id,v)=>{ const e=$(id); if(e) e.textContent=v; };
    set('#ar-sP',prof.n); set('#ar-sF',perfTxt); set('#ar-sM',matTxt); set('#ar-sD',dirTxt); set('#ar-sC',col.n);
    $('#ar-profd').textContent=prof.d;
    $('#ar-look').value=lookText();
    if(write) history.replaceState(null,'',HP+new URLSearchParams(st).toString());
  }
  const lookText=()=>{ const col=COLORS.find(c=>c.slug===st.c), perf=PERFS[st.f]; return `${PROFILES[st.p].n} · ${perf.p?perf.n+' perforation':'Solid'} · ${st.m==='alu'?'Aluminum':'Steel'} · ${col.n} · ${st.d==='v'?'Vertical':'Horizontal'}`; };

  /* ---------- wire up ---------- */
  function validate(){ if(!PROFILES[st.p]) st.p='wave'; if(!PERFS[st.f]) st.f='solid'; if(!['steel','alu'].includes(st.m)) st.m='steel'; if(!COLORS.some(c=>c.slug===st.c)) st.c='grey-white'; if(!['v','h'].includes(st.d)) st.d='v'; }
  function fromHash(){ if(!location.hash.startsWith(HP)) return false; const q=new URLSearchParams(location.hash.slice(HP.length)); let any=false; for(const k of Object.keys(st)){ const v=q.get(k); if(v){ st[k]=v; any=true; } } validate(); return any; }
  // profile cards and the perforation row
  $$('[data-section]').forEach(el=>{ const k=el.dataset.section; el.innerHTML=section(k,mix('#A8ABAA','#ffffff',.1)); });
  $$('[data-perf]').forEach(el=>{ el.innerHTML=perfPreview(el.dataset.perf,'#A8ABAA'); });
  $$('[data-use]').forEach(b=>b.addEventListener('click',()=>{ st.p=b.dataset.use; st.d=PROFILES[st.p].dir; render(true); $('#ar-pick').scrollIntoView({behavior:'smooth',block:'start'}); }));
  // each profile card: show the solid or the perforated picture
  $$('.ar-card').forEach(card=>{ const img=$('.im img',card), name=$('h3',card).textContent; const show=m=>{ img.src=m==='perf'?img.dataset.srcPerf:img.dataset.srcSolid; img.alt=name+' architectural metal panel, '+(m==='perf'?'perforated':'solid'); $$('.ar-toggle button',card).forEach(x=>{ const on=x.dataset.mode===m; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); }); };
    show('solid'); $$('.ar-toggle button',card).forEach(b=>b.onclick=()=>show(b.dataset.mode)); });
  if(!stage) return;
  const sw=$('#ar-sw'); COLORS.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='sw2'; b.style.background=c.h; b.title=c.n; b.dataset.v=c.slug; b.setAttribute('aria-label',c.n); b.onclick=()=>{ st.c=c.slug; render(true); }; sw.appendChild(b); });
  $$('[data-g] .pill').forEach(ch=>ch.onclick=()=>{ const g=ch.closest('[data-g]').dataset.g; st[g]=ch.dataset.v; if(g==='p') st.d=PROFILES[st.p].dir; render(true); });
  fromHash(); render(false);
  if(location.hash.startsWith(HP)) addEventListener('load',()=>setTimeout(()=>$('#ar-pick').scrollIntoView(),300));
  addEventListener('hashchange',()=>{ if(fromHash()) render(false); });
  const link=()=>location.origin+location.pathname+HP+new URLSearchParams(st).toString();
  const flash=(b,t)=>{ const o=b.dataset.t||(b.dataset.t=b.textContent); b.textContent=t; setTimeout(()=>{ b.textContent=o; },1800); };
  $('#ar-copy').onclick=function(){ const b=this; const txt=`Architectural panels, my look: ${lookText()}. Please send pricing and lead time.\n${link()}`; (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>flash(b,'Copied, paste it in the form'),()=>flash(b,'Copy it from the box below')); };
  $('#ar-share').onclick=function(){ const b=this; (navigator.clipboard?navigator.clipboard.writeText(link()):Promise.reject()).then(()=>flash(b,'Link copied'),()=>flash(b,'Copy it from the address bar')); };
  const mail=$('#ar-mail'); if(mail) mail.addEventListener('click',()=>{ mail.href='mailto:Sales@harvestpanels.com?subject='+encodeURIComponent('Architectural panels quote request')+'&body='+encodeURIComponent(`My look: ${lookText()}\n${link()}\n\nProject, location and timeline:\n`); });
})();
