/* "Look inside" installation viewer. Photoreal Blender step renders (panel model + trim, sealant and fasteners built to the
   Interior IMP Installation Guide) with step text, spec rows and callout labels (install_data.js). Project drawings always govern. */
(function(){
  const root=document.getElementById('inst'); if(!root||!window.INSTALL) return;
  const $=(s,r=root)=>r.querySelector(s), $$=(s,r=root)=>[...r.querySelectorAll(s)];
  const tabs=$$('.inst-tabs button'), panePanel=$('[data-p="panel"]'), paneScene=$('[data-p="scene"]');
  const stage=$('.inst-img'), imgA=$('.inst-img img:nth-child(1)'), imgB=$('.inst-img img:nth-child(2)');
  const ring=$('.inst-ring'), line=$('.inst-line'), inset=$('.inst-inset'), insetImg=$('img',inset), view=$('.inst-view');
  const labelsHost=$('.inst-labels'), stepsHost=$('.inst-steps'), detail=$('.inst-detail');
  const playBtn=$('[data-act="play"]'), prevBtn=$('[data-act="prev"]'), nextBtn=$('[data-act="next"]'), count=$('.inst-count');
  let scene=null, step=0, front=imgA, playing=false, timer=null;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function preload(sc){ INSTALL[sc].forEach(s=>{ new Image().src=s.img; new Image().src=s.det; }); }
  // ring on the spot being installed, connected by a line to the magnified inset
  function place(st){ const w=view.clientWidth, h=view.clientHeight; if(!w) return; const an=st.anchor||{x:50,y:45}; ring.style.display=st.anchor?'':'none'; line.style.display=st.anchor?'':'none'; const ax=an.x*w/100, ay=an.y*h/100;
    const R=Math.min(w*.17,h*.30), ix=w-R-w*.035, iy=h-R-h*.13;
    inset.style.cssText='width:'+(R*2)+'px;height:'+(R*2)+'px;left:'+(ix-R)+'px;top:'+(iy-R)+'px';
    ring.style.cssText='left:'+ax+'px;top:'+ay+'px';
    const dx=ix-ax, dy=iy-ay, d=Math.hypot(dx,dy), ang=Math.atan2(dy,dx);
    const x0=ax+Math.cos(ang)*16, y0=ay+Math.sin(ang)*16, len=Math.max(0,d-R-16);
    line.style.cssText='left:'+x0+'px;top:'+y0+'px;width:'+len+'px;transform:rotate('+ang+'rad)'; }
  new ResizeObserver(()=>{ if(scene) place(INSTALL[scene][step]); }).observe(view);
  function show(n){
    const st=INSTALL[scene][n]; step=n;
    const back=front===imgA?imgB:imgA;
    back.onload=()=>{ if(back===front) return; back.classList.add('on'); front.classList.remove('on'); front=back; };
    back.alt=st.title+' - installation detail'; back.src=st.img; if(back.complete&&back.naturalWidth) back.onload();
    insetImg.src=st.det; insetImg.alt=st.title+' - close-up'; inset.classList.remove('on'); place(st); setTimeout(()=>inset.classList.add('on'),reduce?0:250);
    labelsHost.innerHTML=st.labels.map(l=>`<span class="ilab" style="left:${l.x}%;top:${l.y}%">${l.t.replace(/&/g,'&amp;')}</span>`).join('');
    requestAnimationFrame(()=>$$('.ilab',labelsHost).forEach((e,i)=>setTimeout(()=>e.classList.add('on'),reduce?0:350+i*120)));
    $$('.istep',stepsHost).forEach((b,i)=>{ b.classList.toggle('on',i===n); b.classList.toggle('done',i<n); b.setAttribute('aria-current',i===n?'step':'false'); });
    detail.innerHTML=`<h4>${st.title}</h4><p>${st.body}</p><dl>${st.specs.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    count.textContent=(n+1)+' / '+INSTALL[scene].length;
    prevBtn.disabled=n===0; nextBtn.disabled=n===INSTALL[scene].length-1;
  }
  function load(sc){
    scene=sc; stop(); preload(sc);
    stepsHost.innerHTML=INSTALL[sc].map((s,i)=>`<button class="istep" type="button"><i>${i+1}</i><span>${s.title}</span></button>`).join('');
    $$('.istep',stepsHost).forEach((b,i)=>b.onclick=()=>{ stop(); show(i); });
    imgA.classList.remove('on'); imgB.classList.remove('on'); front=imgA; show(0);
  }
  function stop(){ playing=false; clearInterval(timer); playBtn.innerHTML='&#9654; Play steps'; playBtn.classList.remove('on'); }
  function play(){ playing=true; playBtn.innerHTML='&#9208; Pause'; playBtn.classList.add('on');
    if(step>=INSTALL[scene].length-1) show(0);
    timer=setInterval(()=>{ if(step<INSTALL[scene].length-1) show(step+1); else stop(); },4800); }
  playBtn.onclick=()=>playing?stop():play();
  prevBtn.onclick=()=>{ stop(); if(step>0) show(step-1); };
  nextBtn.onclick=()=>{ stop(); if(step<INSTALL[scene].length-1) show(step+1); };
  root.addEventListener('keydown',e=>{ if(paneScene.hidden) return; if(e.key==='ArrowRight'){ e.preventDefault(); nextBtn.click(); } if(e.key==='ArrowLeft'){ e.preventDefault(); prevBtn.click(); } });

  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>{ x.classList.toggle('on',x===t); x.setAttribute('aria-selected',x===t); });
    if(t.dataset.pane==='panel'){ panePanel.hidden=false; paneScene.hidden=true; stop(); return; }
    panePanel.hidden=true; paneScene.hidden=false; load(t.dataset.scene);
  }));

  // fastener estimator (guide spacings)
  const est=$('#fast-est');
  if(est){ const sel=$('select',est), out=$('.fe-out',est);
    const calc=()=>{ const ft=+sel.value, joint=Math.floor(ft*12/12)+1, trackPer=Math.floor(39.37/12)+1, pins=Math.ceil(39.37/24)+1;
      out.innerHTML=`<div><b>${joint}</b><span>Screws per joint through the female lip, if the drawings call for them (12&quot; / 305 mm O.C.)</span></div>`+
        `<div><b>${trackPer*2}</b><span>Floor-track screws per panel (${trackPer} per leg, 12&quot; / 305 mm O.C.)</span></div>`+
        `<div><b>${pins}</b><span>Shot pins per panel at a curb base (24&quot; / 610 mm O.C. alternate)</span></div>`; };
    sel.onchange=calc; calc(); }
})();
