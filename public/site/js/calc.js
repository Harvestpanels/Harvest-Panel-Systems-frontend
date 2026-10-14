/* Live room-size calculator: length x width x height -> panel counts, area, budget, install time, plan view.
   Rules come from Harvest's own published numbers: 1 m (39.37") or 45" cover, 10-36 ft stock lengths,
   $4-$8 per sq ft panel pricing and 1,000-1,500 sq ft/day crew rate (site FAQ). Estimate only, not a quote. */
(function(){
  const root=document.getElementById('calc'); if(!root) return;
  const $=id=>document.getElementById(id);
  const FT=0.3048, DOOR_W=3*FT, DOOR_H=7*FT, SQFT=10.7639;
  const COVERS={std:{m:1.0,label:'39.37" (1,000 mm)'},wide:{m:1.143,label:'45"'}};
  const S={unit:'ft',L:20,W:16,H:12,cover:'std',doors:1,ceiling:true};     // L,W,H stored in feet

  const el={l:$('c-l'),w:$('c-w'),lr:$('c-lr'),wr:$('c-wr'),h:$('c-h'),doors:$('c-doors'),ceil:$('c-ceil'),
    lv:$('c-lv'),wv:$('c-wv'),plan:$('c-plan'),warn:$('c-warn')};
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const toU=ft=>S.unit==='ft'?ft:ft*FT;
  const fromU=v=>S.unit==='ft'?v:v/FT;
  const lenTxt=ft=>S.unit==='ft'?`${+ft.toFixed(1)} ft (${+(ft*FT).toFixed(2)} m)`:`${+(ft*FT).toFixed(2)} m (${+ft.toFixed(1)} ft)`;

  function calc(){
    const cov=COVERS[S.cover].m, Lm=S.L*FT, Wm=S.W*FT, Hm=S.H*FT;
    const wallLens=[Lm,Wm,Lm,Wm];
    const slots=wallLens.map(l=>Math.max(1,Math.ceil(l/cov-1e-9)));
    const slotTotal=slots.reduce((a,b)=>a+b,0);
    const doors=Math.min(S.doors,slotTotal);
    const wallPanels=slotTotal-doors;                 // each 3 ft door takes one panel slot...
    const headers=doors;                              // ...topped by one cut header panel
    const long=Math.max(Lm,Wm), span=Math.min(Lm,Wm);
    const ceilPanels=S.ceiling?Math.max(1,Math.ceil(long/cov-1e-9)):0;
    const total=wallPanels+headers+ceilPanels;
    const perim=2*(Lm+Wm);
    const wallArea=(perim*Hm-doors*DOOR_W*DOOR_H)*SQFT, ceilArea=S.ceiling?Lm*Wm*SQFT:0, area=wallArea+ceilArea;
    const wallLenFt=Math.ceil(S.H-1e-9), ceilLenFt=Math.ceil(Math.min(S.L,S.W)-1e-9);
    const lowD=Math.max(1,Math.ceil(area/1500)), highD=Math.max(1,Math.ceil(area/1000));
    return {cov,Lm,Wm,Hm,slots,doors,wallPanels,headers,ceilPanels,total,perim,area,wallArea,ceilArea,wallLenFt,ceilLenFt,lowD,highD,long,span};
  }

  function plan(c){
    const VW=640,VH=420,pad=64, sc=Math.min((VW-pad*2)/c.Lm,(VH-pad*2)/c.Wm);
    const w=c.Lm*sc,h=c.Wm*sc,x0=(VW-w)/2,y0=(VH-h)/2, t=Math.max(7,Math.min(14,c.cov*sc*.12)), cs=c.cov*sc;
    let g='';
    // ceiling panels (stripes across the long direction, spanning the short one)
    if(S.ceiling){
      const horiz=c.Wm>c.Lm;                               // panels run along the short side
      const n=c.ceilPanels;
      for(let i=0;i<n;i++){
        const a=i*cs, rem=Math.max(0,(horiz?h:w)-a), th=Math.min(cs,rem);
        const fill=i%2?'#dde5ee':'#e8eef5', cut=th<cs-.5;
        g+= horiz? `<rect x="${x0}" y="${y0+a}" width="${w}" height="${th}" fill="${cut?'#f4e3b8':fill}"/>`
                 : `<rect x="${x0+a}" y="${y0}" width="${th}" height="${h}" fill="${cut?'#f4e3b8':fill}"/>`;
        if(i>0) g+= horiz?`<line x1="${x0}" x2="${x0+w}" y1="${y0+a}" y2="${y0+a}" stroke="#b8c4d3" stroke-width="1"/>`
                         :`<line y1="${y0}" y2="${y0+h}" x1="${x0+a}" x2="${x0+a}" stroke="#b8c4d3" stroke-width="1"/>`;
      }
    } else g+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#eef2f6"/>`;
    // walls: top, right, bottom, left (L, W, L, W). Door(s) sit on the bottom wall first, then top, left, right
    const wallDefs=[{k:0,len:c.Lm,dir:'h',x:x0,y:y0-t,sgn:1},{k:1,len:c.Wm,dir:'v',x:x0+w,y:y0,sgn:1},
                    {k:2,len:c.Lm,dir:'h',x:x0,y:y0+h,sgn:1},{k:3,len:c.Wm,dir:'v',x:x0-t,y:y0,sgn:1}];
    const doorOrder=[2,0,3,1,2,0,3,1]; const doorsOn=[0,0,0,0]; for(let i=0;i<c.doors;i++) doorsOn[doorOrder[i]]++;
    wallDefs.forEach(wd=>{
      const n=c.slots[wd.k], nDoor=doorsOn[wd.k];
      for(let i=0;i<n;i++){
        const a=i*cs, th=Math.min(cs,wd.len*sc-a), cut=th<cs-.5;
        const doorIdx=Math.floor(n/2)-Math.floor(nDoor/2); const door=nDoor>0 && i>=doorIdx && i<doorIdx+nDoor;
        const fill=door?'#10233f':(cut?'#7fb2dd':'#105c94');
        g+= wd.dir==='h'
          ? `<rect x="${wd.x+a+.6}" y="${wd.y}" width="${Math.max(0,th-1.2)}" height="${t}" rx="1.5" fill="${fill}"/>`
          : `<rect x="${wd.x}" y="${wd.y+a+.6}" width="${t}" height="${Math.max(0,th-1.2)}" rx="1.5" fill="${fill}"/>`;
      }
      // per-wall count label
      const lx= wd.dir==='h'? x0+w/2 : (wd.k===1? x0+w+t+16 : x0-t-16);
      const ly= wd.dir==='h'? (wd.k===0? y0-t-10 : y0+h+t+22) : y0+h/2+4;
      g+=`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" font-weight="700" fill="#10233f">${n-nDoor}${nDoor?` + ${nDoor} door${nDoor>1?'s':''}`:''}</text>`;
    });
    // dimensions
    const fs=Math.max(10,Math.min(22,w/9)); if(w>90){ g+=`<text x="${x0+w/2}" y="${y0+h/2-2}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#10233f" opacity=".85">${lenTxt(S.L)} × ${lenTxt(S.W)}</text>`;
    if(w>150) g+=`<text x="${x0+w/2}" y="${y0+h/2+fs+2}" text-anchor="middle" font-size="${Math.max(9,fs*.6)}" fill="#6e6e73">${S.ceiling?c.ceilPanels+" ceiling panels, "+c.ceilLenFt+" ft ("+(c.ceilLenFt*FT).toFixed(1)+" m) long":"no ceiling"}</text>`; }
    el.plan.innerHTML=`<svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Plan view of the room with panel layout">${g}</svg>`;
  }

  function out(c){
    $('o-total').textContent=fmt(c.total);
    $('o-wall').textContent=fmt(c.wallPanels+c.headers);
    $('o-ceil').textContent=fmt(c.ceilPanels);
    $('o-door').textContent=c.doors;
    $('o-area').textContent=fmt(c.area); $('o-arealab').textContent='Sq ft insulated ('+fmt(c.area/SQFT)+' m²)';
    $('o-days').textContent=c.lowD===c.highD?`${c.lowD} day${c.lowD>1?'s':''}`:`${c.lowD}–${c.highD} days`;
    $('o-cost').textContent=`$${fmt(c.area*4)} – $${fmt(c.area*8)}`;
    $('o-len').textContent=`${c.wallLenFt} ft (${+(c.wallLenFt*FT).toFixed(2)} m) walls${S.ceiling?` · ${c.ceilLenFt} ft (${+(c.ceilLenFt*FT).toFixed(2)} m) ceiling`:''}`;
    $('o-trim').textContent=`${4} corner angles · ${fmt(c.perim/FT)} ft (${fmt(c.perim)} m) ceiling-edge trim`;
    // warnings
    const w=[];
    if(S.ceiling && c.span>10.973+1e-6) w.push(`The ${lenTxt(Math.min(S.L,S.W))} ceiling span is longer than our 36 ft maximum panel length. It needs a support beam or custom lengths. Call us.`);
    if(S.H>20) w.push('Walls over 20 ft (6.1 m) need custom-length panels or a panel splice.');
    if(S.H<10) w.push(`Wall panels ship from 10 ft (3.0 m) stock, so ${lenTxt(S.H)} walls are cut to length. Cut-off may be reusable.`);
    if(c.doors>=c.slots.reduce((a,b)=>a+b,0)) w.push('That is more doors than the room has wall panels.');
    el.warn.innerHTML=w.join('<br>'); el.warn.classList.toggle('on',w.length>0);
    window.__calcSummary=()=>`Room: ${lenTxt(S.L)} x ${lenTxt(S.W)} x ${lenTxt(S.H)} high, ${c.doors} door(s)${S.ceiling?', with ceiling':', no ceiling'}. `+
      `Panels: ${c.total} (${c.wallPanels} wall + ${c.headers} door headers + ${c.ceilPanels} ceiling), ${COVERS[S.cover].label} cover. `+
      `Wall length ${c.wallLenFt} ft (${+(c.wallLenFt*FT).toFixed(2)} m)${S.ceiling?', ceiling length '+c.ceilLenFt+' ft ('+(c.ceilLenFt*FT).toFixed(2)+' m)':''}. Insulated area about ${fmt(c.area)} sq ft (${fmt(c.area/SQFT)} m²).`;
  }

  function render(){
    S.L=Math.max(4,Math.min(200,S.L)); S.W=Math.max(4,Math.min(200,S.W));
    const c=calc(); plan(c); out(c);
    el.lv.textContent=lenTxt(S.L); el.wv.textContent=lenTxt(S.W);
    $('c-presets').querySelectorAll('[data-l]').forEach(b=>b.classList.toggle('on', +b.dataset.l===S.L && +b.dataset.w===S.W && +(b.dataset.h||12)===S.H));
  }
  function syncInputs(){
    const u=S.unit, step=u==='ft'?.5:.1;
    [['l','L'],['w','W']].forEach(([k,K])=>{
      el[k].step=step; el[k].value=+(toU(S[K])).toFixed(2);
      el[k+'r'].min=u==='ft'?6:2; el[k+'r'].max=u==='ft'?100:30; el[k+'r'].step=step; el[k+'r'].value=+(toU(S[K])).toFixed(2);
    });
    [...el.h.options].forEach(o=>{ o.textContent=u==='ft'?`${o.value} ft (${(o.value*FT).toFixed(1)} m)`:`${(o.value*FT).toFixed(1)} m (${o.value} ft)`; });
    el.h.value=String(S.H);
    $('c-unit').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.u===u));
  }

  // events
  ['l','w'].forEach(k=>{ const K=k.toUpperCase();
    el[k].addEventListener('input',()=>{ const v=parseFloat(el[k].value); if(!isNaN(v)){ S[K]=fromU(v); el[k+'r'].value=el[k].value; render(); } });
    el[k+'r'].addEventListener('input',()=>{ S[K]=fromU(parseFloat(el[k+'r'].value)); el[k].value=el[k+'r'].value; render(); });
  });
  el.h.addEventListener('change',()=>{ S.H=parseFloat(el.h.value); render(); });
  $('c-unit').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; S.unit=b.dataset.u; syncInputs(); render(); });
  $('c-cover').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; S.cover=b.dataset.c;
    $('c-cover').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); render(); });
  $('c-doors').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; S.doors=Math.max(0,Math.min(8,S.doors+(+b.dataset.d))); $('c-dv').textContent=S.doors; render(); });
  el.ceil.addEventListener('change',()=>{ S.ceiling=el.ceil.checked; render(); });
  $('c-presets').addEventListener('click',e=>{ const b=e.target.closest('[data-l]'); if(!b) return;
    S.L=+b.dataset.l; S.W=+b.dataset.w; S.H=+(b.dataset.h||12); syncInputs(); render(); });
  $('c-copy').addEventListener('click',async e=>{ try{ await navigator.clipboard.writeText(window.__calcSummary()); e.target.textContent='Copied'; }catch(_){ e.target.textContent='Copy failed'; } setTimeout(()=>e.target.textContent='Copy summary',1600); });
  $('c-quote').addEventListener('click',()=>{ const s=window.__calcSummary(); location.href='mailto:Sales@harvestpanels.com?subject='+encodeURIComponent('Panel estimate request')+'&body='+encodeURIComponent(s+'\n\nPlease send me a free estimate.'); });

  syncInputs(); render();
})();
