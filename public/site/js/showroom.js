/* Harvest 3D showroom. Customers pick a product, then drive it with its own controls.
   Needs three.js r128 + OrbitControls + GLTFLoader, and panel_assets.js (Blender panel geometry).
   All door/trim dimensions are illustrative. The 100 mm panel geometry is the real Blender model. Units: mm. */
(function(){
  const host=document.getElementById('sv'); if(!host||!window.THREE) return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  // ---------------- renderer / scene ----------------
  const lowGPU=(()=>{ try{ const c=document.createElement('canvas'), g=c.getContext('webgl')||c.getContext('experimental-webgl'); if(!g) return false; const d=g.getExtension('WEBGL_debug_renderer_info'), n=d?String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)):''; const lose=g.getExtension('WEBGL_lose_context'); if(lose) lose.loseContext(); return /Intel|Mesa|llvmpipe|SwiftShader|Basic Render|Adreno \(?[0-4]|Mali-[T4]|PowerVR/i.test(n); }catch(e){ return false; } })();
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  const baseRatio=Math.min(devicePixelRatio,lowGPU?1.25:1.75), moveRatio=Math.min(baseRatio,1);   // sharp when still, at most 1 pixel per CSS pixel while moving
  renderer.setPixelRatio(baseRatio);
  // render only while something is moving or the visitor is interacting (the GPU idles otherwise)
  let wakeUntil=performance.now()+4000, lastMove=0, lastBeat=0;   // lastBeat: a slow idle refresh (about 2 per second) so late-loading models and textures still appear
  const wake=(ms=3000,motion=false)=>{ const t=performance.now(); wakeUntil=Math.max(wakeUntil,t+ms); if(motion) lastMove=t; };
  const setRes=r=>{ if(renderer.getPixelRatio()!==r){ renderer.setPixelRatio(r); renderer.setSize(host.clientWidth,host.clientHeight,false); } };
  ['pointerdown','pointermove','wheel','keydown','click','input','change','touchstart'].forEach(ev=>addEventListener(ev,()=>wake(ev==='pointermove'?500:3000),{passive:true,capture:true}));
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.8;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,20,60000);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.08; controls.autoRotate=false; controls.autoRotateSpeed=1.4;
  controls.maxPolarAngle=Math.PI*0.495;

  (function(){ // studio reflections
    const es=new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:new THREE.Color(.58,.6,.64),side:THREE.BackSide})));
    const b=(w,h,x,y,z,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
    b(30,18,-25,22,25,5); b(24,14,28,10,12,3); b(40,10,0,40,0,4); b(30,8,0,12,-40,3);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(es,.02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xffffff,0xb4b9c2,.42)); { const fl=new THREE.DirectionalLight(0xffffff,.35); fl.position.set(-3200,2200,-2600); scene.add(fl); }
  const key=new THREE.DirectionalLight(0xffffff,1.2); key.position.set(2600,4200,3200); key.castShadow=true;
  key.shadow.mapSize.set(lowGPU?1024:2048,lowGPU?1024:2048); const sc=key.shadow.camera; sc.left=-3500;sc.right=3500;sc.top=3500;sc.bottom=-3500;sc.near=100;sc.far=12000;
  key.shadow.bias=-.0003; key.shadow.normalBias=2; key.shadow.radius=6; scene.add(key);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000),new THREE.ShadowMaterial({opacity:.38})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);

  // ---------------- shared materials / helpers ----------------
  const COLORS=[['Grey White','#E7EBDA'],['White','#F5F5F2'],['White Aluminum','#A8ABAA'],['Ivory','#E6D2B5'],['Light Blue','#6FA3D6'],
                ['Gentian Blue','#0E4C92'],['Signal Green','#237F52'],['Colza Yellow','#F3DA0B'],['Pure Orange','#E75B12'],['Flame Red','#AF2B1E']];
  const steelMat=hex=>new THREE.MeshPhysicalMaterial({color:hex,roughness:.4,metalness:0,clearcoat:.25,clearcoatRoughness:.3,envMapIntensity:.6});
  function noiseTex(base,speck,pores,tile){
    const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,512,512);
    for(let i=0;i<pores;i++){ g.fillStyle=`rgba(120,95,40,${.07+Math.random()*.16})`; g.beginPath(); g.arc(Math.random()*512,Math.random()*512,.6+Math.random()*2.2,0,7); g.fill(); }
    for(let i=0;i<speck;i++){ g.fillStyle=`rgba(40,30,20,${.25+Math.random()*.4})`; g.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*1.4,1+Math.random()*1.4); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; t.repeat.set(1/tile,1/tile); return t;
  }
  const bumpNoise=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); const d=g.createImageData(256,256);
    for(let i=0;i<d.data.length;i+=4){ const v=110+Math.random()*90; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } g.putImageData(d,0,0);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1/30,1/30); return t; })();
  const foamMat=()=>new THREE.MeshStandardMaterial({map:noiseTex('#f1e4b4',0,0,90),roughness:.92});
  const M={
    alu:new THREE.MeshStandardMaterial({color:0xd0d4d9,metalness:.85,roughness:.32}),
    ss:new THREE.MeshStandardMaterial({color:0xc6cbd2,metalness:.95,roughness:.22}),
    rubber:new THREE.MeshStandardMaterial({color:0x1c1d20,roughness:.9}),
    black:new THREE.MeshStandardMaterial({color:0x15161a,roughness:.5,metalness:.1}),
    wall:steelMat(0xe7ebda),
    zinc:new THREE.MeshStandardMaterial({color:0xaeb4bc,metalness:.9,roughness:.4}),
    butyl:new THREE.MeshStandardMaterial({color:0x2a2b2e,roughness:.8,side:THREE.DoubleSide}),
    concrete:new THREE.MeshStandardMaterial({color:0xcfcdc7,roughness:.95})
  };
  const sh=m=>{ m.castShadow=m.receiveShadow=true; return m; };
  const box=(w,h,d,mat,x=0,y=0,z=0)=>{ const m=sh(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat)); m.position.set(x,y,z); return m; };
  const cyl=(r,h,mat,x=0,y=0,z=0,seg=28)=>{ const m=sh(new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat)); m.position.set(x,y,z); return m; };
  const poly=pts=>new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])));
  function extrude(pts,depth){ const g=new THREE.ExtrudeGeometry(poly(pts),{depth,bevelEnabled:false}); g.translate(0,0,-depth/2); return g; }

  // ---------------- UI ----------------
  const ui={ctl:$('#ctl'),stats:$('#stats'),title:$('#ptitle'),blurb:$('#pblurb')};
  function renderControls(list){
    ui.ctl.innerHTML='';
    list.forEach(c=>{
      const w=document.createElement('div'); w.className='cg'; const lab=document.createElement('label'); lab.textContent=c.label; w.appendChild(lab);
      if(c.type==='chips'){ const row=document.createElement('div'); row.className='chips2';
        c.options.forEach(o=>{ const b=document.createElement('button'); b.className='pill'+(o.v===c.value?' on':''); b.textContent=o.label;
          b.onclick=()=>{ $$('.pill',row).forEach(x=>x.classList.toggle('on',x===b)); c.value=o.v; c.onChange(o.v); }; row.appendChild(b); }); w.appendChild(row); }
      if(c.type==='swatches'){ const row=document.createElement('div'); row.className='swrow';
        c.options.forEach(o=>{ const b=document.createElement('button'); b.className='sw2'+(o.v===c.value?' on':''); b.style.background=o.v; b.title=o.label; b.setAttribute('aria-label',o.label);
          b.onclick=()=>{ $$('.sw2',row).forEach(x=>x.classList.toggle('on',x===b)); c.value=o.v; lab.dataset.v=o.label; lab.textContent=c.label+': '+o.label; c.onChange(o.v); }; row.appendChild(b); });
        w.appendChild(row); const cur=c.options.find(o=>o.v===c.value); if(cur) lab.textContent=c.label+': '+cur.label; }
      if(c.type==='slider'){ const row=document.createElement('div'); row.className='slrow'; const i=document.createElement('input'); i.type='range'; i.min=c.min; i.max=c.max; i.value=c.value; i.step=c.step||1;
        const o=document.createElement('output'); o.textContent=c.fmt?c.fmt(+i.value):i.value; i.oninput=()=>{ c.value=+i.value; o.textContent=c.fmt?c.fmt(+i.value):i.value; c.onChange(+i.value); };
        c.setValue=v=>{ i.value=v; o.textContent=c.fmt?c.fmt(+v):v; }; row.append(i,o); w.appendChild(row); }
      if(c.type==='toggle'){ const row=document.createElement('label'); row.className='tg'; const i=document.createElement('input'); i.type='checkbox'; i.checked=!!c.value; i.onchange=()=>{ c.value=i.checked; c.onChange(i.checked); };
        row.append(i,document.createTextNode(c.text)); w.appendChild(row); lab.remove(); w.prepend(Object.assign(document.createElement('label'),{textContent:c.label})); }
      if(c.type==='button'){ const b=document.createElement('button'); b.className='btn'; b.style.cssText='padding:9px 16px;font-size:14px'; b.textContent=c.text; b.onclick=()=>c.onClick(b); w.appendChild(b); lab.remove(); }
      ui.ctl.appendChild(w);
    });
  }
  function renderStats(rows){ ui.stats.innerHTML=rows.map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join(''); }
  function tween(from,to,ms,cb,done){ const t0=performance.now(); (function f(n){ wake(300,true); const k=clamp((n-t0)/ms,0,1); cb(from+(to-from)*ease(k)); if(k<1) requestAnimationFrame(f); else done&&done(); })(t0); }

  // ---------------- camera framing ----------------
  let root=null, current=null;
  function frame(view){
    if(!root) return; const bb=new THREE.Box3().setFromObject(root); if(bb.isEmpty()) return;
    const c=bb.getCenter(new THREE.Vector3()), s=bb.getSize(new THREE.Vector3()), r=Math.max(s.x,s.y,s.z);
    const aspect=host.clientWidth/host.clientHeight, dist=(r*.74/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*Math.max(1,1.05/aspect);
    const V={'34':[38,20],front:[0,6],side:[90,6],top:[8,80]}[view||'34'];
    const az=V[0]*Math.PI/180, el=V[1]*Math.PI/180;
    controls.target.copy(c); camera.position.set(c.x+Math.sin(az)*Math.cos(el)*dist, c.y+Math.sin(el)*dist, c.z+Math.cos(az)*Math.cos(el)*dist);
    controls.minDistance=r*.35; controls.maxDistance=r*6; camera.near=Math.max(20,dist*.02); camera.far=Math.max(60000,dist*40); camera.updateProjectionMatrix(); controls.update();
  }
  window.__frame=frame; window.__sr={camera,scene,controls};

  // ================================================================= PRODUCT 1: PIR insulated metal panel (the real 100 mm Blender model; other thicknesses scale its thickness)
  function buildPir(ctx){
    const L=1875, COVER=1000, JOINED=COVER-.9, GAP=380, MAXLIFT=170;
    const rootG=new THREE.Group(), stand=new THREE.Group(), A=new THREE.Group(), B=new THREE.Group(); stand.add(A,B); stand.rotation.z=Math.PI/2; stand.position.y=L/2; rootG.add(stand);
    const parts={A:{},B:{}}; let ex=0, jn=1, T=100;   // T: panel thickness in mm
    const PIR_T=[['2″',50,15],['4″',100,30],['6″',150,45],['8″',200,60]];   // label, mm, R-value (same values as the Wall & Roof designer)
    const printTex=new THREE.TextureLoader().load(TAPE_PRINT_B64); printTex.wrapS=printTex.wrapT=THREE.RepeatWrapping; printTex.anisotropy=16; printTex.encoding=THREE.sRGBEncoding; printTex.flipY=false;
    const mats={ Steel_top:new THREE.MeshPhysicalMaterial({color:0xe3e7d9,roughness:.38,clearcoat:.25,clearcoatRoughness:.3,envMapIntensity:.55}), PIR_core:foamMat(),
      Gasket:new THREE.MeshStandardMaterial({map:noiseTex('#2a2a2d',0,3000,60),color:0x9a9a9d,roughness:.95}), Tongue_tape:new THREE.MeshStandardMaterial({color:0xf7f1da,roughness:.42}),
      Tongue_print:new THREE.MeshStandardMaterial({map:printTex,transparent:true,roughness:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}) };
    mats.Steel_bottom=mats.Steel_top;
    const boxUV=(g,tile)=>{ const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2),s=1000/tile;
      for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i)); let u,v;
        if(ax>=ay&&ax>=az){u=p.getY(i);v=p.getZ(i);} else if(ay>=az){u=p.getX(i);v=p.getZ(i);} else {u=p.getX(i);v=p.getY(i);} uv[2*i]=u*s; uv[2*i+1]=v*s; }
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); };
    function apply(){ if(!parts.A.Steel_top) return; const lift=ex*MAXLIFT/1000, f=T/100;
      ['A','B'].forEach(id=>{ const p=parts[id]; p.Steel_top.position.y=p.Steel_top.userData.base.y*f+lift; p.Steel_bottom.position.y=p.Steel_bottom.userData.base.y*f-lift; });
      B.position.z=-(JOINED+(1-jn)*GAP); }
    // Thickness: every part keeps its 100 mm geometry (p0, n0) and is stretched along the thickness axis (local Y); normals follow, and the foam and gasket textures are re-mapped so they do not stretch.
    function setThick(mm){ T=mm; const f=mm/100;
      ['A','B'].forEach(id=>Object.keys(parts[id]).forEach(nm=>{ const o=parts[id][nm], g=o.geometry, p=g.attributes.position, n=g.attributes.normal, p0=o.userData.p0, n0=o.userData.n0;
        for(let i=0;i<p.count;i++){ const j=3*i, ny=n0[j+1]/f, l=Math.hypot(n0[j],ny,n0[j+2])||1; p.setXYZ(i,p0[j],p0[j+1]*f,p0[j+2]); n.setXYZ(i,n0[j]/l,ny/l,n0[j+2]/l); }
        p.needsUpdate=n.needsUpdate=true; g.computeBoundingBox(); g.computeBoundingSphere();
        if(nm==='PIR_core'||nm==='Gasket') boxUV(g,nm==='PIR_core'?90:60); }));
      apply(); }
    const b64=s=>{ const a=atob(s),u=new Uint8Array(a.length); for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i); return u.buffer; };
    new THREE.GLTFLoader().parse(b64(PANEL_GLB_B64),'',gltf=>{
      ['A','B'].forEach(id=>{ const r=id==='A'?A:B, model=gltf.scene.clone(true); model.scale.setScalar(1000); r.add(model);
        model.traverse(o=>{ if(!o.isMesh) return; const nm=o.name.replace(/\.\d+$/,''), m=mats[nm]; if(!m) return; o.geometry=o.geometry.clone(); o.material=m;
          o.castShadow=nm!=='Tongue_print'; o.receiveShadow=nm!=='Tongue_print'; if(nm==='PIR_core'||nm==='Gasket') boxUV(o.geometry,nm==='PIR_core'?90:60); if(nm==='Tongue_print') o.renderOrder=2;
          o.userData.p0=o.geometry.attributes.position.array.slice(); o.userData.n0=o.geometry.attributes.normal.array.slice();
          o.userData.base=o.position.clone(); parts[id][nm]=o; }); });
      apply(); ctx.ready(); });
    const layersCtl={type:'slider',label:'Layers',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{ex=v/100;apply();}};
    const jointCtl={type:'slider',label:'Joint',min:0,max:100,value:100,fmt:v=>v+'%',onChange:v=>{jn=v/100;apply();}};
    return { root:rootG,
      controls:[
        {type:'chips',label:'Thickness',value:100,options:PIR_T.map(t=>({v:t[1],label:t[0]})),onChange:v=>{ setThick(+v); ctx.update(); }},
        {type:'swatches',label:'Color',value:COLORS[0][1],options:COLORS.map(c=>({v:c[1],label:c[0]})),onChange:v=>{ mats.Steel_top.color.set(v); wake(); }},
        layersCtl, jointCtl,
        {type:'button',text:'Play Layers',onClick:()=>{ const a=ex>.5?0:1; tween(ex,a,2400,v=>{ ex=v; apply(); layersCtl.setValue&&layersCtl.setValue(Math.round(v*100)); }); }},
        {type:'button',text:'Play Joint',onClick:()=>{ const a=jn>.5?0:1; tween(jn,a,2400,v=>{ jn=v; apply(); jointCtl.setValue&&jointCtl.setValue(Math.round(v*100)); }); }}],
      stats:()=>{ const t=PIR_T.find(x=>x[1]===T)||PIR_T[1]; return [['Thickness',t[0]+' ('+t[1]+' mm)'],['Cover Width','1,000 mm (39.37 in)'],['Steel Faces','0.5 mm (0.020 in)'],['Insulation','R-'+t[2]+' (RSI '+(t[2]*.1761).toFixed(1)+')']]; },
      note:()=>T===100?'':'The other thicknesses use the 4″ (100 mm) panel\'s joint, scaled to size.',
      views:'34' };
  }

  // ================================================================= PRODUCT 2: wall & roof panel designer
  const THICK=[['2″',50.8,15.0,2.85],['3″',76.2,22.5,3.04],['4″',101.6,30.0,3.22],['5″',127,37.5,3.41],['6″',152.4,45.0,3.60],['8″',203.2,60.0,3.97]];
  const PROFILES={
    flat:{n:'Flat',kind:'wall',d:'Smooth, unribbed face for a minimal, monolithic look.',pts:()=>[[-500,0],[500,0]]},
    box:{n:'Box',kind:'wall',d:'Flat pans separated by narrow ribs.',pts:()=>{ const p=[[-500,0]]; [-375,-125,125,375].forEach(c=>p.push([c-12,0],[c-8,8],[c+8,8],[c+12,0])); p.push([500,0]); return p; }},
    trap:{n:'Trapezoidal',kind:'wall',d:'Repeating angular ribs for added rigidity.',pts:()=>{ const p=[[-500,0]]; [-375,-125,125,375].forEach(c=>p.push([c-35,0],[c-15,28],[c+15,28],[c+35,0])); p.push([500,0]); return p; }},
    emb:{n:'Embossed',kind:'wall',d:'Subtle stucco-like texture that hides minor surface flaws.',pts:()=>[[-500,0],[500,0]],emboss:true},
    cop:{n:'Cop Roof',kind:'roof',d:'Double-steel roof profile with standing ribs.',pts:()=>{ const p=[[-500,0]]; [-250,250].forEach(c=>{ p.push([c-45,0],[c-20,38],[c+20,38],[c+45,0]); }); p.push([500,0]); return p; }},
    grec:{n:'Grecata Roof',kind:'roof',d:'U-rib corrugated roof profile.',pts:()=>{ const p=[]; for(let x=-500;x<=500;x+=4){ const s=Math.sin(x/125*2*Math.PI); p.push([x,15*.5*(1+Math.tanh(2.6*s))]); } return p; }}
  };
  function buildDesigner(ctx){
    const S={profile:'trap',thick:2,color:'#E7EBDA'}; const rootG=new THREE.Group(); let inner=null;
    function make(){
      if(inner){ rootG.remove(inner); inner.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
      inner=new THREE.Group(); const P=PROFILES[S.profile], T=THICK[S.thick][1], y0=T/2, t=.8, LEN=P.kind==='roof'?2000:1800;
      const skin=steelMat(S.color); if(P.emboss){ skin.bumpMap=bumpNoise; skin.bumpScale=1.2; }
      const outer=P.pts().map(([x,o])=>[x,y0+o]), inn=outer.map(([x,y])=>[x,y-t]);
      const g=new THREE.Group();
      g.add(sh(new THREE.Mesh(extrude(outer.concat(inn.slice().reverse()),LEN),skin)));
      g.add(sh(new THREE.Mesh(extrude([[-500,-y0],[500,-y0],[500,-y0+t],[-500,-y0+t]],LEN),steelMat(S.color))));
      const core=inn.concat([[500,-y0+t],[-500,-y0+t]]); g.add(sh(new THREE.Mesh(extrude(core,LEN),foamMat())));
      if(P.kind==='wall'){ g.rotation.x=Math.PI/2; g.position.y=LEN/2; inner.add(g); }   // standing, face toward +Z
      else { // roof: panel on two purlins, tilted like a low-slope roof and lifted clear of the floor
        const holder=new THREE.Group(), pm=new THREE.MeshStandardMaterial({color:0x4b5058,roughness:.6,metalness:.4});
        holder.add(g); [-LEN*.3,LEN*.3].forEach(zz=>holder.add(box(1300,60,110,pm,0,-y0-30,zz)));
        holder.rotation.x=-.2618; inner.add(holder);
        const bb=new THREE.Box3().setFromObject(holder); holder.position.y=-bb.min.y+60; }
      rootG.add(inner); ctx.update(); }
    return { root:rootG, build:make,
      controls:[
        {type:'chips',label:'Profile',value:'trap',options:Object.keys(PROFILES).map(k=>({v:k,label:PROFILES[k].n})),onChange:v=>{S.profile=v;make();ctx.view('34');}},
        {type:'chips',label:'Thickness',value:2,options:THICK.map((t,i)=>({v:i,label:t[0]})),onChange:v=>{S.thick=v;make();}},
        {type:'swatches',label:'Color',value:'#E7EBDA',options:COLORS.map(c=>({v:c[1],label:c[0]})),onChange:v=>{S.color=v;make();}}],
      stats:()=>{ const T=THICK[S.thick]; return [['Profile',PROFILES[S.profile].n],['Thickness',T[0]+' ('+T[1].toFixed(0)+' mm)'],['Insulation','R-'+T[2].toFixed(1)+' (RSI '+(T[2]*0.1761).toFixed(1)+')'],['Weight (24/24 Steel)',T[3].toFixed(2)+' psf ('+(T[3]*4.8824).toFixed(1)+' kg/m²)']]; },
      note:()=>PROFILES[S.profile].d };
  }

  // ================================================================= PRODUCT 3: doors (Blender-built models, doors/glb)
  const DOOR_TYPES=[
    {id:'hinged',label:'Hinged Cold-Room',blurb:'Insulated hinged door with a flush leaf, aluminum edge frame, gasketed rebate, heavy hinges and a key latch.',
     sizes:[['3×7','hinged-3x7','3′ × 7′','900 × 2,100 mm clear opening'],['4×7','hinged-4x7','4′ × 7′','1,200 × 2,100 mm clear opening'],['5×7','hinged-5x7','5′ × 7′','1,500 × 2,100 mm clear opening']],
     rows:[['Leaf','100 mm (3.94″) insulated, 0.5 mm steel faces'],['Frame','Aluminum edge frame, white door frame'],['Hardware','Hinges + key latch']]},
    {id:'double',label:'Double Cold-Room',blurb:'Two hinged leaves meeting at a gasketed center, with a key latch on the active leaf.',
     sizes:[['6×7','double-6x7','6′ × 7′','1,800 × 2,100 mm clear opening'],['8×7','double-8x7','8′ × 7′','2,400 × 2,100 mm clear opening'],['6×7 unequal','double-unequal-6x7','6′ × 7′, one-third / two-thirds leaves','1,800 × 2,100 mm clear opening']],
     rows:[['Leaf','100 mm (3.94″) insulated, 0.5 mm steel faces'],['Frame','Aluminum edge frame, white door frame'],['Hardware','Hinges + key latch on the active leaf']]},
    {id:'sliding',label:'Sliding Cooler',blurb:'Heavy-duty insulated sliding door hung from a top rail on roller hangers, in a gasketed U-shape frame, with a stainless pull handle and lock.',
     sizes:[['5×7','sliding-5x7','5′ × 7′','1,500 × 2,100 mm clear opening',1670],['6×7','sliding-6x7','6′ × 7′','1,800 × 2,100 mm clear opening',1970]],
     rows:[['Leaf','100 mm (3.94″) insulated, 0.5 mm steel faces'],['Frame','U-shape frame with gasket'],['Hardware','Top rail with roller hangers, floor guide, stainless pull handle + lock']]},
    {id:'office',label:'Office',blurb:'Flush insulated office door in an aluminum frame with a lever handle and key cylinder.',
     sizes:[['2.5×7','office-25x7','2.5′ × 7′','762 × 2,100 mm clear opening'],['3×7','office-3x7','3′ × 7′','900 × 2,100 mm clear opening'],['4×7','office-4x7','4′ × 7′','1,200 × 2,100 mm clear opening']],
     rows:[['Leaf','0.5 mm steel faces, aluminum frame'],['Hardware','Lever handle + key cylinder, hinged, door closer']]},
    {id:'clean',label:'Clean Room',blurb:'Flush clean-room door with a round vision window, aluminum frame and lever handle.',
     sizes:[['3×7','clean-3x7','3′ × 7′','900 × 2,100 mm clear opening']],
     rows:[['Leaf','50 mm (1.97″) polyurethane foam, 0.5 mm steel faces (RAL 9002)'],['Frame','Aluminum'],['Hardware','Lever handle, vision window, door closer']]},
    {id:'officed',label:'Double Office',blurb:'Two flush office leaves in an aluminum frame.',
     sizes:[['6×7','office-double-6x7','6′ × 7′','1,800 × 2,100 mm clear opening']],
     rows:[['Leaf','0.5 mm steel faces, aluminum frame'],['Hardware','Lever handles, hinged, door closers']]},
    {id:'cleand',label:'Double Clean Room',blurb:'Two flush clean-room leaves with round vision windows.',
     sizes:[['6×7','clean-double-6x7','6′ × 7′','1,800 × 2,100 mm clear opening']],
     rows:[['Leaf','50 mm (1.97″) polyurethane foam, 0.5 mm steel faces (RAL 9002)'],['Frame','Aluminum'],['Hardware','Lever handles, vision windows, door closers']]}];
  const DOOR_MATS={
    Door_steel_white:()=>new THREE.MeshPhysicalMaterial({color:0xe6e8e4,roughness:.42,metalness:.03,clearcoat:.15,clearcoatRoughness:.4,envMapIntensity:.55}),
    Frame_white:()=>new THREE.MeshStandardMaterial({color:0xe2e4e0,roughness:.5,envMapIntensity:.55}),
    Door_aluminum:()=>new THREE.MeshStandardMaterial({color:0xaeb2b6,roughness:.42,metalness:.6}),
    Frame_aluminum_light:()=>new THREE.MeshStandardMaterial({color:0xbfc2c5,roughness:.4,metalness:.6}),
    Hardware_dark:()=>new THREE.MeshStandardMaterial({color:0x2c2d30,roughness:.45,metalness:.1}),
    Hardware_light:()=>new THREE.MeshStandardMaterial({color:0x8d9298,roughness:.38,metalness:.5}),
    Stainless:()=>new THREE.MeshStandardMaterial({color:0xb7bbbf,roughness:.28,metalness:1}),
    Gasket_black:()=>new THREE.MeshStandardMaterial({color:0x111214,roughness:.7}),
    PIR_foam:()=>new THREE.MeshStandardMaterial({color:0xe9dcae,roughness:.9}),
    Release_green:()=>new THREE.MeshStandardMaterial({color:0x14a04a,roughness:.4}),
    Glass:()=>new THREE.MeshPhysicalMaterial({color:0xd8e9f2,roughness:.04,metalness:0,transparent:true,opacity:.22,depthWrite:false,envMapIntensity:1.6})};
  const doorCache={};
  function buildDoors(ctx){
    const S={type:'hinged',size:0,hand:'R',open:0,wall:true}; const rootG=new THREE.Group(); let model=null, pivots=[], walls=[], slideNode=null;
    const matc={}; const dm=n=>{ const k=(n||'').replace(/\.\d+$/,''); if(window.HPSP&&HPSP.has(k)) return HPSP.mat(k); return DOOR_MATS[k]?(matc[k]||(matc[k]=DOOR_MATS[k]())):null; };
    const T=()=>DOOR_TYPES.find(d=>d.id===S.type), Z=()=>T().sizes[Math.min(S.size,T().sizes.length-1)];
    function apply(){ pivots.forEach(p=>{ p.rotation.y=(p.position.x>0?1:-1)*S.open*Math.PI*.6; });
      if(slideNode) slideNode.position.x=-S.open*(Z()[4]||0)/1000;   // sliding doors: the leaf runs along the wall (travel in mm)
      walls.forEach(w=>{ w.visible=S.wall; }); if(model) model.scale.x=(S.hand==='L'?-1:1)*1000; }
    function place(gltf){
      if(model){ rootG.remove(model); }
      model=gltf.scene.clone(true); model.scale.setScalar(1000); pivots=[]; walls=[]; slideNode=null;
      model.traverse(o=>{ if(o.isMesh){ o.castShadow=o.receiveShadow=true; const m=o.material; if(window.HPSP&&!Array.isArray(m)) HPSP.prepare(o,m.name); o.material=Array.isArray(m)?m.map(x=>dm(x.name)||x):(dm(m.name)||m); }
        if(o.name==='pivotA'||o.name==='pivotB') pivots.push(o); if(o.name==='slideA') slideNode=o; if(/^Wall/.test(o.name)) walls.push(o); });
      rootG.add(model); apply(); ctx.update(); ctx.view('34');
      // start view for every door: from slightly left of the wall at eye level, the wall filling about two thirds of the width
      // (and always fully in view vertically), so the door and its hardware read clearly
      const bb=new THREE.Box3().setFromObject(model), size=bb.getSize(new THREE.Vector3()), cx=(bb.min.x+bb.max.x)/2;
      const az=-24*Math.PI/180, el=3*Math.PI/180, th=Math.tan(camera.fov*Math.PI/360), aspect=Math.max(.3,host.clientWidth/Math.max(1,host.clientHeight));
      const proj=size.x*Math.cos(az)+size.z*Math.abs(Math.sin(az));
      const dd=Math.max(proj/(.67*2*th*aspect), 2600/(.88*2*th));
      controls.target.set(cx,1250,0); camera.position.set(cx+Math.sin(az)*Math.cos(el)*dd,1250+Math.sin(el)*dd,Math.cos(az)*Math.cos(el)*dd);
      camera.near=Math.max(20,dd*.02); camera.far=Math.max(60000,dd*40); camera.updateProjectionMatrix(); controls.minDistance=1200; controls.maxDistance=dd*2.4; controls.update();
    }
    function make(){
      const id=Z()[1], url='/site/models/doors/'+id+'.glb';
      if(doorCache[id]) return place(doorCache[id]);
      new THREE.GLTFLoader().load(url,g=>{ doorCache[id]=g; if(Z()[1]===id) place(g); }); }
    function sizeOptions(){ return T().sizes.map((s,i)=>({v:i,label:s[0]})); }
    // sliding doors have no hinge: the same control says which way the leaf slides
    function syncHand(){ const sl=S.type==='sliding'; ctl.hand.label=sl?'Slides to':'Hinge Side';
      ctl.hand.options=sl?[{v:'R',label:'Left'},{v:'L',label:'Right'}]:[{v:'R',label:'Right'},{v:'L',label:'Left'}]; S.hand='R'; ctl.hand.value='R'; }
    const ctl={
      type:{type:'chips',label:'Door',value:'hinged',options:DOOR_TYPES.map(d=>({v:d.id,label:d.label})),onChange:v=>{ S.type=v; S.size=0; S.open=0; syncHand(); ctl.size.options=sizeOptions(); ctl.size.value=0; ctl.open.value=0; renderControls(ctlList); make(); }},
      size:{type:'chips',label:'Size (ft)',value:0,options:sizeOptions(),onChange:v=>{ S.size=+v; make(); ctx.update(); }},
      hand:{type:'chips',label:'Hinge Side',value:'R',options:[{v:'R',label:'Right'},{v:'L',label:'Left'}],onChange:v=>{ S.hand=v; apply(); }},
      open:{type:'slider',label:'Open',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{ S.open=v/100; apply(); }}};
    const ctlList=[ctl.type,ctl.size,ctl.hand,ctl.open,   // (not named `controls`: that is the camera's OrbitControls used in place())
      {type:'button',text:'Open / Close',onClick:()=>{ const a=S.open>.5?0:1; tween(S.open,a,1800,v=>{ S.open=v; apply(); ctl.open.setValue&&ctl.open.setValue(Math.round(v*100)); }); }},
      {type:'toggle',label:'Wall',text:'Show the Wall',value:true,onChange:v=>{ S.wall=v; apply(); }}];
    return { root:rootG, build:make, controls:ctlList,
      stats:()=>{ const z=Z(); return [['Door',T().label],['Size',z[2]+' nominal ('+z[3]+')']].concat(T().rows); },
      note:()=>'Sizes shown are nominal. Full specifications are provided with every quote.' };
  }

  // ================================================================= PRODUCT 4: trim & hardware
  function buildTrim(ctx){
    // Real Blender-built models (acc_assets.js). Shown at a short display length; true stock length is in the spec rows.
    const rootG=new THREE.Group(); let inner=null, item=ACC_META[0].id; const cache={};
    // Inside curved angle (two pieces): the model shows the white cover lifted above the metal base. Play Joint lowers it straight down
    // over the fins until the barbs sit in the grooves between the teeth. SNAP = that drop in metres (33.5 mm, the lift in hps_accessories.py).
    const SNAP=.0335; let jn=0, cover=[];
    const applyJoint=()=>{ cover.forEach(o=>{ o.position.y=o.userData.baseY-SNAP*jn; }); };
    const jointCtl={type:'slider',label:'Joint',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{ jn=v/100; applyJoint(); }};
    const playCtl={type:'button',text:'Play Joint',onClick:()=>{ const a=jn>.5?0:1; tween(jn,a,2600,v=>{ jn=v; applyJoint(); jointCtl.setValue&&jointCtl.setValue(Math.round(v*100)); }); }};
    const itemCtl={type:'chips',label:'Item',value:item,options:ACC_META.map(a=>({v:a.id,label:a.label})),onChange:v=>{ item=v; syncControls(); make(); }};
    const ctlList=[itemCtl];
    function syncControls(){ jn=0; jointCtl.value=0; ctlList.length=1; if(item==='al-inside-curved') ctlList.push(jointCtl,playCtl); renderControls(ctlList); }
    const mats={
      Alu:new THREE.MeshPhysicalMaterial({color:0xa9aeb0,metalness:.4,roughness:.3,clearcoat:.08}),
      Galv:new THREE.MeshStandardMaterial({color:0x9ea6af,metalness:.9,roughness:.34}),
      Mill:new THREE.MeshStandardMaterial({color:0xc2c7cb,metalness:.9,roughness:.34}),
      Cover:new THREE.MeshStandardMaterial({color:0xe6e8e6,metalness:.05,roughness:.42}),
      PVC:new THREE.MeshStandardMaterial({color:0xdfe1df,roughness:.38}),
      Steel:steelMat(0xe7ebda) };
    const b64=s=>{ const a=atob(s),u=new Uint8Array(a.length); for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i); return u.buffer; };
    function load(id,cb){
      if(cache[id]) return cb(cache[id].clone(true));
      new THREE.GLTFLoader().parse(b64(ACC_GLB[id]),'',g=>{ const m=g.scene; m.scale.setScalar(1000);
        m.traverse(o=>{ if(!o.isMesh) return; o.material=mats[o.name.replace(/\.?\d+$/,'')]||mats.Alu; o.castShadow=o.receiveShadow=true; });
        cache[id]=m; cb(m.clone(true)); }); }
    function make(){
      if(inner){ rootG.remove(inner); inner=null; }
      const id=item;
      load(id,m=>{ if(id!==item) return; const g=new THREE.Group(); g.add(m);
        cover=[]; m.traverse(o=>{ if(o.isMesh&&/^Cover\d*$/.test(o.name)){ o.userData.baseY=o.position.y; cover.push(o); } }); applyJoint();
        const bb=new THREE.Box3().setFromObject(m), c=bb.getCenter(new THREE.Vector3()); m.position.set(-c.x,-bb.min.y,-c.z);   // stand on the floor, centred
        inner=g; rootG.add(g); ctx.update(); ctx.view('34');
        camera.position.lerpVectors(controls.target,camera.position,.62); controls.update(); });
    }
    return { root:rootG, build:make, controls:ctlList,
      stats:()=>ACC_META.find(a=>a.id===item).stats,
      note:()=>'Custom sizes and colors are available.' };
  }
  // ---------------- registry + switching ----------------
  const reg={pir100:buildPir,designer:buildDesigner,doors:buildDoors,trim:buildTrim};
  const meta={
    pir100:{t:'PIR Insulated Metal Panel (IMP)',b:'Pick a thickness and a color, lift the steel off the core and slide two panels together to see the locking joint.'},
    designer:{t:'Wall & Roof Panels',b:'Pick a profile, a thickness and a color. The insulation value and weight update with your choice.'},
    doors:{t:'Doors',b:'Pick a door and a size, swing it open, and look at the hardware up close.'},
    trim:{t:'Trim & Accessories',b:'Aluminum and steel trim, strut channel, PVC wall panel and PVC trim. Pick an item and orbit it to see the profile up close.'}
  };
  let tickList=[], autoView=null;
  function show(id){
    if(root){ scene.remove(root); root.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
    const ctx={controls:[],update:()=>{ if(current) renderStats(current.stats()); const n=$('#pnote'); if(n) n.textContent=current&&current.note?current.note():''; },view:v=>frame(v),ready:()=>frame('34')};
    current=reg[id](ctx); ctx.controls=current.controls; root=current.root; scene.add(root);
    ui.title.textContent=meta[id].t; ui.blurb.textContent=meta[id].b;
    renderControls(current.controls); if(current.build) current.build(); ctx.update(); frame('34');
    $$('.pick .pcard3').forEach(c=>c.classList.toggle('on',c.dataset.id===id)); history.replaceState(null,'','#'+id);
  }
  $$('.pick .pcard3').forEach(c=>c.addEventListener('click',e=>{ if(c.dataset.id) { e.preventDefault(); show(c.dataset.id); } }));
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>frame(b.dataset.view)));
  const rot=$('#rotb'); const setRot=on=>{ controls.autoRotate=on; rot.innerHTML=on?'&#9208; Pause rotation':'&#9654; Play rotation'; rot.classList.toggle('on',on); };
  setRot(false); rot.onclick=()=>setRot(!controls.autoRotate); addEventListener('keydown',e=>{ if(e.code==='Space'&&document.activeElement===document.body){ e.preventDefault(); setRot(!controls.autoRotate); } });
  function resize(){ wake(1200); renderer.setSize(host.clientWidth,host.clientHeight,false); camera.aspect=host.clientWidth/host.clientHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize',()=>{ resize(); frame('34'); }); resize();
  const start=(location.hash||'').slice(1); show(reg[start]?start:'pir100');
  (function loop(now){ requestAnimationFrame(loop); if(document.hidden) return; if(controls.update()) wake(300,true); if(now>wakeUntil && now-lastBeat<600) return; lastBeat=now; setRes(now-lastMove<220?moveRatio:baseRatio); renderer.render(scene,camera); })();
})();
