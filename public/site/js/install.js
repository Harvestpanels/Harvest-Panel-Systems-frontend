/* "Look inside" installation viewer. Interactive 3D (drag to orbit, scroll to zoom) built from the Blender models (panel, trim,
   butyl, fasteners) to the dimensions in the Interior IMP Installation Guide, with a "Photo" mode showing the matching Blender
   renders. Step text and label data come from install_data.js. Project drawings always govern. Units: mm. */
(function(){
  const root=document.getElementById('inst'); if(!root||!window.INSTALL) return;
  const $=(s,r=root)=>r.querySelector(s), $$=(s,r=root)=>[...r.querySelectorAll(s)];
  const tabs=$$('.inst-tabs button'), panePanel=$('[data-p="panel"]'), paneScene=$('[data-p="scene"]'), view=$('.inst-view');
  const host=$('.inst-3d'), labelsHost=$('.inst-labels'), ring=$('.inst-ring'), line=$('.inst-line'), inset=$('.inst-inset'), insetImg=$('img',inset);
  const imgA=$('.inst-img img:nth-child(1)'), imgB=$('.inst-img img:nth-child(2)');
  const stepsHost=$('.inst-steps'), detail=$('.inst-detail'), count=$('.inst-count');
  const optBar=$('.inst-opt'), optBtns=optBar?$$('button',optBar):[];   // floor connection: Option A (U-channel) / Option B (double L trim)
  const playBtn=$('[data-act="play"]'), prevBtn=$('[data-act="prev"]'), nextBtn=$('[data-act="next"]'), modeBtn=$('[data-act="mode"]'), resetBtn=$('[data-act="reset"]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene=null, step=0, front=imgA, playing=false, timer=null, mode='3d';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), ease=t=>1-Math.pow(1-t,3);

  // ------------------------------------------------------------------ WebGL (optional)
  let gl=null;
  try{
    if(window.THREE&&THREE.GLTFLoader&&THREE.OrbitControls){
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputEncoding=THREE.sRGBEncoding;
      renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.85;
      renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      const camera=new THREE.PerspectiveCamera(30,1,20,40000);
      const controls=new THREE.OrbitControls(camera,renderer.domElement);
      controls.enableDamping=true; controls.dampingFactor=.08; controls.enablePan=false; controls.minDistance=120; controls.maxDistance=4200; controls.maxPolarAngle=Math.PI*.495;
      let userOrbit=false; controls.addEventListener('start',()=>{ userOrbit=true; });
      const es=new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:new THREE.Color(.66,.68,.72),side:THREE.BackSide})));
      const bx=(w,h,x,y,z,i)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide})); m.position.set(x,y,z); m.lookAt(0,0,0); es.add(m); };
      bx(30,18,-25,22,25,5); bx(24,14,28,10,12,3); bx(40,10,0,40,0,4);
      const pm=new THREE.PMREMGenerator(renderer); const envTex=pm.fromScene(es,.02).texture; pm.dispose();
      gl={renderer,camera,controls,envTex,setUser:v=>{ userOrbit=v; },get user(){ return userOrbit; }};
    }
  }catch(e){ gl=null; }
  if(!gl){ mode='photo'; modeBtn.style.display='none'; resetBtn.style.display='none'; }

  // glTF material name (from Blender) -> tuned three.js material
  const MT={
    RAL9002_satin_steel:()=>new THREE.MeshPhysicalMaterial({color:0xc4cabb,roughness:.45,metalness:.05,clearcoat:.2,clearcoatRoughness:.35}),
    PIR_foam:()=>new THREE.MeshStandardMaterial({color:0xdcc98a,roughness:.9}),
    Gasket_dark_foam:()=>new THREE.MeshStandardMaterial({color:0x2b2b2e,roughness:.95}),
    Tape_cream:()=>new THREE.MeshStandardMaterial({color:0xe6dcb8,roughness:.45}),
    Butyl:()=>new THREE.MeshStandardMaterial({color:0x8c8f95,roughness:.32,metalness:.05}),
    Sealant:()=>new THREE.MeshStandardMaterial({color:0xdadcd9,roughness:.45}),
    Galvanized_Z275:()=>new THREE.MeshStandardMaterial({color:0xaeb4bb,roughness:.38,metalness:.85}),
    Trim_26ga:()=>new THREE.MeshStandardMaterial({color:0xbcc3ca,roughness:.34,metalness:.85,side:THREE.DoubleSide}),
    Track_20ga:()=>new THREE.MeshStandardMaterial({color:0xaab2ba,roughness:.4,metalness:.88,side:THREE.DoubleSide}),
    Rubber:()=>new THREE.MeshStandardMaterial({color:0x1b1c1f,roughness:.6}),
    Screw_head:()=>new THREE.MeshStandardMaterial({color:0x9aa1a8,roughness:.3,metalness:1}),
    Screw_thread:()=>new THREE.MeshStandardMaterial({color:0xa4abb2,roughness:.4,metalness:1}),
    Rod:()=>new THREE.MeshStandardMaterial({color:0xa6adb4,roughness:.42,metalness:1}),
    Concrete:()=>new THREE.MeshStandardMaterial({color:0xb7b5ae,roughness:.96}),
    HL_orange:()=>new THREE.MeshStandardMaterial({color:0xff6a10,emissive:0xff5a00,emissiveIntensity:.9,roughness:.4}),
    HL_blue:()=>new THREE.MeshStandardMaterial({color:0x2d7dff,emissive:0x1d5be0,emissiveIntensity:.8,roughness:.4}),
    HL_yellow:()=>new THREE.MeshStandardMaterial({color:0xffc400,emissive:0xe0a000,emissiveIntensity:.8,roughness:.4})
  };
  const matCache={}; const getMat=(name,orig)=>{ const k=(name||'').replace(/\.\d+$/,''); if(window.HPSP&&HPSP.has(k)) return HPSP.mat(k); if(!MT[k]) return orig; return matCache[k]||(matCache[k]=MT[k]()); };
  const B=p=>new THREE.Vector3(p[0],p[2],-p[1]);       // Blender mm (x, y, z up) -> three mm (x up = z)

  const S3={};   // loaded scenes
  function build3D(id,done){
    if(S3[id]) return done(S3[id]);
    const data=INSTALL[id][0].model; if(!data) return done(null);
    new THREE.GLTFLoader().load(data,gltf=>{
      const sc=new THREE.Scene(); sc.environment=gl.envTex;
      sc.add(new THREE.HemisphereLight(0xffffff,0xc4c9d0,.55));
      const key=new THREE.DirectionalLight(0xffffff,1.0); key.position.set(-900,1900,1500); key.castShadow=true; key.shadow.mapSize.set(2048,2048);
      const c=key.shadow.camera; c.left=-1800;c.right=1800;c.top=1800;c.bottom=-1800;c.near=100;c.far=6000; key.shadow.bias=-.0003; key.shadow.normalBias=2; key.shadow.radius=5; sc.add(key);
      const fill=new THREE.DirectionalLight(0xcfd8ff,.3); fill.position.set(1500,700,-900); sc.add(fill);
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000),new THREE.ShadowMaterial({opacity:.22})); fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; sc.add(fl);
      const g=gltf.scene; g.scale.setScalar(1000); sc.add(g);
      const groups={}, roots={};
      g.traverse(o=>{
        if(o.name==='Mroot'||o.name==='Froot') roots[o.name[0]]=o;
        if(o.isMesh){ o.castShadow=o.receiveShadow=true; const m=o.material; if(window.HPSP&&!Array.isArray(m)) HPSP.prepare(o,m.name); o.material=Array.isArray(m)?m.map(x=>getMat(x.name,x)):getMat(m.name,m); }
        const n=o.name.split('__'); if(n.length>1&&n[0]!==''){ (groups[n[0]]=groups[n[0]]||[]).push(o); }
      });
      const mroot=roots.M, baseZ=mroot?mroot.position.z:0;
      S3[id]={sc,g,groups,roots,mroot,baseZ,gap:0,arrows:(groups.arrow||[]).concat(groups.arrowDown||[]),labels:[]};
      done(S3[id]);
    },undefined,()=>done(null));
  }
  function applyShow(s3,st){
    const show=new Set(st.show||[]);
    Object.keys(s3.groups).forEach(k=>s3.groups[k].forEach(o=>{ o.visible=show.has(k); }));
    if(s3.roots.M) s3.roots.M.visible=show.has('M'); if(s3.roots.F) s3.roots.F.visible=show.has('F');
  }
  function camGoal(st){ const c=st.cam, tgt=B(c[1]), k=scene==='joint'?1:.6; return {pos:tgt.clone().add(B(c[0]).sub(tgt).multiplyScalar(k)),tgt:tgt,lens:c[2]}; }
  let goal=null;
  function fovFor(lens,aspect){ const h=2*Math.atan(18/lens); return THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(h/2)/aspect)); }
  function resize(){ if(!gl) return; const w=host.clientWidth,h=host.clientHeight; if(!w||!h) return; gl.renderer.setSize(w,h,false); gl.camera.aspect=w/h; gl.camera.updateProjectionMatrix(); }
  if(gl){ new ResizeObserver(resize).observe(host); }
  const tmp=new THREE.Vector3();
  let visible=false; new IntersectionObserver(es=>{ visible=es[0].isIntersecting; if(visible) resize(); }).observe(view);
  function frame(t){
    requestAnimationFrame(frame); if(!gl||!visible||mode!=='3d'||!scene||!S3[scene]) return;
    const s3=S3[scene], st=INSTALL[scene][step], s=st.s3d||{};
    // slide the male panel in
    const tg=(s.gap||0); s3.gap+=(tg-s3.gap)*(reduce?1:.07); if(Math.abs(tg-s3.gap)<.05) s3.gap=tg; if(s3.mroot) s3.mroot.position.z=s3.baseZ-s3.gap/1000;
    const bob=scene==='joint'?[0,0,1]:[0,-1,0]; s3.arrows.forEach(a=>{ if(!a.userData.p0) a.userData.p0=a.position.clone(); const k=(Math.sin(t*.004)*.5+.5)*.05; a.position.set(a.userData.p0.x+bob[0]*k,a.userData.p0.y+bob[1]*k,a.userData.p0.z+bob[2]*k); });
    if(goal&&!gl.user){ const cam=gl.camera; cam.position.lerp(goal.pos,.07); gl.controls.target.lerp(goal.tgt,.07); const f=fovFor(goal.lens,cam.aspect); cam.fov+=(f-cam.fov)*.07; cam.updateProjectionMatrix(); }
    gl.controls.update();
    const w=host.clientWidth,h=host.clientHeight;
    const boxes=[]; // labels that would overlap an earlier one are stacked upward
    s3.labels.forEach(l=>{ tmp.copy(l.p).project(gl.camera); const x=(tmp.x+1)/2*w, y=(1-tmp.y)/2*h; l.el.style.left=x+'px'; l.el.style.top=y+'px'; l.el.style.visibility=tmp.z<1?'':'hidden';
      if(tmp.z>=1) return; const lw=l.el.offsetWidth, lh=l.el.offsetHeight; let mt=-12;
      for(let k=0;k<8;k++){ const top=y+mt-1.35*lh; if(!boxes.some(b=>Math.abs(b.x-x)<(b.w+lw)/2+6&&top<b.bottom+4&&top+lh>b.top-4)) break; mt-=lh+8; }
      l.el.style.marginTop=mt+'px'; boxes.push({x,w:lw,top:y+mt-1.35*lh,bottom:y+mt-.35*lh}); });
    if(s.anchor){ tmp.copy(B(s.anchor)).project(gl.camera); ring.style.left=((tmp.x+1)/2*w)+'px'; ring.style.top=((1-tmp.y)/2*h)+'px'; }
    gl.renderer.render(s3.sc,gl.camera);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ photo mode (Blender stills)
  function preload(sc){ INSTALL[sc].forEach(s=>{ new Image().src=s.img; new Image().src=s.det; }); }
  function place(st){ const w=view.clientWidth, h=view.clientHeight; if(!w||mode!=='photo') return; const an=st.anchor||{x:50,y:45}; const ax=an.x*w/100, ay=an.y*h/100;
    const R=Math.min(w*.17,h*.30), ix=w-R-w*.035, iy=h-R-h*.13;
    inset.style.cssText='width:'+(R*2)+'px;height:'+(R*2)+'px;left:'+(ix-R)+'px;top:'+(iy-R)+'px';
    ring.style.cssText='left:'+ax+'px;top:'+ay+'px';
    const dx=ix-ax, dy=iy-ay, d=Math.hypot(dx,dy), ang=Math.atan2(dy,dx);
    line.style.cssText='left:'+(ax+Math.cos(ang)*16)+'px;top:'+(ay+Math.sin(ang)*16)+'px;width:'+Math.max(0,d-R-16)+'px;transform:rotate('+ang+'rad)'; spread(); }
  // photo labels that would overlap an earlier one are moved up, so every label stays readable
  function spread(){ const W=labelsHost.clientWidth, Hh=labelsHost.clientHeight; if(!W||!Hh) return; const boxes=[];
    $$('.ilab',labelsHost).forEach(el=>{ const ox=+el.dataset.ox, oy=+el.dataset.oy; if(isNaN(ox)||isNaN(oy)) return;
      const w=el.offsetWidth, h=el.offsetHeight, x=ox/100*W; let y=oy/100*Hh;
      for(let k=0;k<8;k++){ if(!boxes.some(b=>Math.abs(b.x-x)<(b.w+w)/2+6&&Math.abs(b.y-y)<(b.h+h)/2+4)) break; y-=h+8; }
      el.style.top=(y/Hh*100)+'%'; boxes.push({x,y,w,h}); }); }
  new ResizeObserver(()=>{ if(scene) place(INSTALL[scene][step]); }).observe(view);

  // ------------------------------------------------------------------ shared UI
  function setMode(m){
    mode=m; view.classList.toggle('mode-photo',m==='photo'); view.classList.toggle('mode-3d',m==='3d');
    modeBtn.innerHTML=m==='3d'?'&#128247; Photo View':'&#9741; 3D View'; resetBtn.style.display=(m==='3d'&&gl)?'':'none';
    line.style.display=ring.style.display=''; inset.classList.remove('on');
    if(scene) show(step,true);
  }
  function show(n,keepCam){
    const st=INSTALL[scene][n]; step=n;
    $$('.istep',stepsHost).forEach((b,i)=>{ b.classList.toggle('on',i===n); b.classList.toggle('done',i<n); b.setAttribute('aria-current',i===n?'step':'false'); });
    detail.innerHTML=`<h4>${st.title}</h4><p>${st.body}</p><dl>${st.specs.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    count.textContent=(n+1)+' / '+INSTALL[scene].length; prevBtn.disabled=n===0; nextBtn.disabled=n===INSTALL[scene].length-1;
    if(mode==='photo'){
      const back=front===imgA?imgB:imgA;
      back.onload=()=>{ if(back===front) return; back.classList.add('on'); front.classList.remove('on'); front=back; };
      back.alt=st.title+' - installation detail'; back.src=st.img; if(back.complete&&back.naturalWidth) back.onload();
      insetImg.src=st.det; insetImg.alt=st.title+' - close-up'; inset.classList.remove('on'); place(st); setTimeout(()=>inset.classList.add('on'),reduce?0:250);
      labelsHost.innerHTML=st.labels.map(l=>`<span class="ilab" data-ox="${l.x}" data-oy="${l.y}" style="left:${l.x}%;top:${l.y}%">${l.t.replace(/&/g,'&amp;')}</span>`).join('');
      requestAnimationFrame(()=>{ spread(); $$('.ilab',labelsHost).forEach((e,i)=>setTimeout(()=>e.classList.add('on'),reduce?0:350+i*120)); });
    } else {
      const s3=S3[scene]; if(!s3) return; const s=st.s3d; applyShow(s3,s);
      labelsHost.innerHTML=''; s3.labels=(s.labels||[]).map(([t,p],i)=>{ const el=document.createElement('span'); el.className='ilab on'; el.textContent=t; el.style.marginTop=(-34-i*30)+'px'; labelsHost.appendChild(el); return {el,p:B(p)}; });
      goal=camGoal(s); if(!keepCam||!gl.user){ gl.setUser(false); }
      if(reduce||!s3.seen){ gl.camera.position.copy(goal.pos); gl.controls.target.copy(goal.tgt); gl.camera.fov=fovFor(goal.lens,gl.camera.aspect); gl.camera.updateProjectionMatrix(); s3.seen=true; if(!gl.user){} }
      ring.style.display=s.anchor?'':'none'; line.style.display='none'; inset.classList.remove('on');
    }
  }
  function load(sc){
    scene=sc; stop(); preload(sc);
    stepsHost.innerHTML=INSTALL[sc].map((s,i)=>`<button class="istep" type="button"><i>${i+1}</i><span>${s.title}</span></button>`).join('');
    $$('.istep',stepsHost).forEach((b,i)=>b.onclick=()=>{ stop(); gl&&gl.setUser(false); show(i); });
    imgA.classList.remove('on'); imgB.classList.remove('on'); front=imgA;
    if(mode==='3d'&&gl){ view.classList.add('loading'); build3D(sc,s3=>{ view.classList.remove('loading'); if(!s3){ setMode('photo'); return; } if(scene===sc){ resize(); show(0); } }); }
    else show(0);
  }
  function stop(){ playing=false; clearInterval(timer); playBtn.innerHTML='&#9654; Play Steps'; playBtn.classList.remove('on'); }
  function play(){ playing=true; playBtn.innerHTML='&#9208; Pause'; playBtn.classList.add('on'); if(gl) gl.setUser(false);
    if(step>=INSTALL[scene].length-1) show(0);
    timer=setInterval(()=>{ if(step<INSTALL[scene].length-1){ if(gl) gl.setUser(false); show(step+1); } else stop(); },5200); }
  playBtn.onclick=()=>playing?stop():play();
  prevBtn.onclick=()=>{ stop(); if(gl) gl.setUser(false); if(step>0) show(step-1); };
  nextBtn.onclick=()=>{ stop(); if(gl) gl.setUser(false); if(step<INSTALL[scene].length-1) show(step+1); };
  modeBtn.onclick=()=>setMode(mode==='3d'?'photo':'3d');
  resetBtn.onclick=()=>{ if(gl){ gl.setUser(false); } };
  root.addEventListener('keydown',e=>{ if(paneScene.hidden) return; if(e.key==='ArrowRight'){ e.preventDefault(); nextBtn.click(); } if(e.key==='ArrowLeft'){ e.preventDefault(); prevBtn.click(); } });

  const setOpt=b=>optBtns.forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-pressed',x===b); });
  optBtns.forEach(b=>b.addEventListener('click',()=>{ if(b.classList.contains('on')) return; setOpt(b); stop(); load(b.dataset.scene); }));
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>{ x.classList.toggle('on',x===t); x.setAttribute('aria-selected',x===t); });
    if(optBar){ optBar.hidden=t.dataset.scene!=='track'; if(t.dataset.scene==='track') setOpt(optBtns[0]); }
    if(t.dataset.pane==='panel'){ panePanel.hidden=false; paneScene.hidden=true; stop(); return; }
    panePanel.hidden=true; paneScene.hidden=false; setMode(gl?'3d':'photo'); resize(); load(t.dataset.scene);
  }));

  // fastener estimator: 15 screws per panel (wall and roof panels), 4 drive pins per wall panel (walls only); totals follow the room calculator
  const est=$('#fast-est');
  if(est){ const out=$('.fe-out',est), SCREWS=15, PINS=4, n=id=>{ const el=document.getElementById(id); return el?(parseInt(String(el.textContent).replace(/,/g,''),10)||0):0; }, f=v=>v.toLocaleString('en-US');
    const calc=()=>{ const wall=n('o-wall'), ceil=n('o-ceil');
      out.innerHTML='<div><b>'+SCREWS+'</b><span>Screws per panel, wall and roof panels</span></div>'+
        '<div><b>'+PINS+'</b><span>Drive pins per wall panel (wall panels only, none on roof panels)</span></div>'+
        (wall+ceil?'<div><b>'+f((wall+ceil)*SCREWS)+'</b><span>Screws for the room in the calculator ('+f(wall)+' wall + '+f(ceil)+' ceiling panels)</span></div><div><b>'+f(wall*PINS)+'</b><span>Drive pins for those '+f(wall)+' wall panels</span></div>':''); };
    calc(); const cc=document.getElementById('calc'); if(cc) ['input','click','change'].forEach(ev=>cc.addEventListener(ev,()=>setTimeout(calc,0))); }
})();
