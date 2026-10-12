/* Harvest 3D showroom. Customers pick a product, then drive it with its own controls.
   Needs three.js r128 + OrbitControls + GLTFLoader, and panel_assets.js (Blender panel geometry).
   All door/trim dimensions are illustrative. The 100 mm panel geometry is the real Blender model. Units: mm. */
(function(){
  const host=document.getElementById('sv'); if(!host||!window.THREE) return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  // ---------------- renderer / scene ----------------
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.62;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,20,60000);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.08; controls.autoRotate=true; controls.autoRotateSpeed=1.4;
  controls.maxPolarAngle=Math.PI*0.495;

  (function(){ // studio reflections
    const es=new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:new THREE.Color(.58,.6,.64),side:THREE.BackSide})));
    const b=(w,h,x,y,z,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
    b(30,18,-25,22,25,5); b(24,14,28,10,12,3); b(40,10,0,40,0,4); b(30,8,0,12,-40,3);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(es,.02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xffffff,0xb4b9c2,.32));
  const key=new THREE.DirectionalLight(0xffffff,.8); key.position.set(2600,4200,3200); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048); const sc=key.shadow.camera; sc.left=-3500;sc.right=3500;sc.top=3500;sc.bottom=-3500;sc.near=100;sc.far=12000;
  key.shadow.bias=-.0003; key.shadow.normalBias=2; key.shadow.radius=6; scene.add(key);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000),new THREE.ShadowMaterial({opacity:.34})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);

  // ---------------- shared materials / helpers ----------------
  const COLORS=[['Grey White','#E7EBDA'],['White','#F5F5F2'],['White Aluminum','#A8ABAA'],['Ivory','#E6D2B5'],['Light Blue','#6FA3D6'],
                ['Gentian Blue','#0E4C92'],['Signal Green','#237F52'],['Colza Yellow','#F3DA0B'],['Pure Orange','#E75B12'],['Flame Red','#AF2B1E']];
  const steelMat=hex=>new THREE.MeshPhysicalMaterial({color:hex,roughness:.4,metalness:0,clearcoat:.25,clearcoatRoughness:.3});
  function noiseTex(base,speck,pores,tile){
    const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,512,512);
    for(let i=0;i<pores;i++){ g.fillStyle=`rgba(120,95,40,${.07+Math.random()*.16})`; g.beginPath(); g.arc(Math.random()*512,Math.random()*512,.6+Math.random()*2.2,0,7); g.fill(); }
    for(let i=0;i<speck;i++){ g.fillStyle=`rgba(40,30,20,${.25+Math.random()*.4})`; g.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*1.4,1+Math.random()*1.4); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; t.repeat.set(1/tile,1/tile); return t;
  }
  const bumpNoise=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); const d=g.createImageData(256,256);
    for(let i=0;i<d.data.length;i+=4){ const v=110+Math.random()*90; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } g.putImageData(d,0,0);
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1/30,1/30); return t; })();
  const foamMat=()=>new THREE.MeshStandardMaterial({map:noiseTex('#f1e4b4',40,2600,90),roughness:.92});
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
  function tween(from,to,ms,cb,done){ const t0=performance.now(); (function f(n){ const k=clamp((n-t0)/ms,0,1); cb(from+(to-from)*ease(k)); if(k<1) requestAnimationFrame(f); else done&&done(); })(t0); }

  // ---------------- camera framing ----------------
  let root=null, current=null;
  function frame(view){
    if(!root) return; const bb=new THREE.Box3().setFromObject(root); if(bb.isEmpty()) return;
    const c=bb.getCenter(new THREE.Vector3()), s=bb.getSize(new THREE.Vector3()), r=Math.max(s.x,s.y,s.z);
    const aspect=host.clientWidth/host.clientHeight, dist=(r*.74/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*Math.max(1,1.05/aspect);
    const V={'34':[38,20],front:[0,6],side:[90,6],top:[8,80]}[view||'34'];
    const az=V[0]*Math.PI/180, el=V[1]*Math.PI/180;
    controls.target.copy(c); camera.position.set(c.x+Math.sin(az)*Math.cos(el)*dist, c.y+Math.sin(el)*dist, c.z+Math.cos(az)*Math.cos(el)*dist);
    controls.minDistance=r*.35; controls.maxDistance=r*6; controls.update();
  }
  window.__frame=frame;

  // ================================================================= PRODUCT 1: 100 mm PIR panel (Blender geometry)
  function buildPir(ctx){
    const L=1875, COVER=1000, JOINED=COVER-.9, GAP=380, MAXLIFT=170;
    const rootG=new THREE.Group(), stand=new THREE.Group(), A=new THREE.Group(), B=new THREE.Group(); stand.add(A,B); stand.rotation.z=Math.PI/2; stand.position.y=L/2; rootG.add(stand);
    const parts={A:{},B:{}}; let ex=0, jn=1;
    const printTex=new THREE.TextureLoader().load(TAPE_PRINT_B64); printTex.wrapS=printTex.wrapT=THREE.RepeatWrapping; printTex.anisotropy=16; printTex.encoding=THREE.sRGBEncoding; printTex.flipY=false;
    const mats={ Steel_top:new THREE.MeshPhysicalMaterial({color:0xe3e7d9,roughness:.38,clearcoat:.25,clearcoatRoughness:.3}), PIR_core:foamMat(),
      Gasket:new THREE.MeshStandardMaterial({map:noiseTex('#2a2a2d',0,3000,60),color:0x9a9a9d,roughness:.95}), Tongue_tape:new THREE.MeshStandardMaterial({color:0xf7f1da,roughness:.42}),
      Tongue_print:new THREE.MeshStandardMaterial({map:printTex,transparent:true,roughness:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}) };
    mats.Steel_bottom=mats.Steel_top;
    const boxUV=(g,tile)=>{ const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2),s=1000/tile;
      for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i)); let u,v;
        if(ax>=ay&&ax>=az){u=p.getY(i);v=p.getZ(i);} else if(ay>=az){u=p.getX(i);v=p.getZ(i);} else {u=p.getX(i);v=p.getY(i);} uv[2*i]=u*s; uv[2*i+1]=v*s; }
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); };
    function apply(){ if(!parts.A.Steel_top) return; const lift=ex*MAXLIFT/1000;
      ['A','B'].forEach(id=>{ const p=parts[id]; p.Steel_top.position.y=p.Steel_top.userData.base.y+lift; p.Steel_bottom.position.y=p.Steel_bottom.userData.base.y-lift; });
      B.position.z=-(JOINED+(1-jn)*GAP); }
    const b64=s=>{ const a=atob(s),u=new Uint8Array(a.length); for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i); return u.buffer; };
    new THREE.GLTFLoader().parse(b64(PANEL_GLB_B64),'',gltf=>{
      ['A','B'].forEach(id=>{ const r=id==='A'?A:B, model=gltf.scene.clone(true); model.scale.setScalar(1000); r.add(model);
        model.traverse(o=>{ if(!o.isMesh) return; const nm=o.name.replace(/\.\d+$/,''), m=mats[nm]; if(!m) return; o.geometry=o.geometry.clone(); o.material=m;
          o.castShadow=nm!=='Tongue_print'; o.receiveShadow=nm!=='Tongue_print'; if(nm==='PIR_core'||nm==='Gasket') boxUV(o.geometry,nm==='PIR_core'?90:60); if(nm==='Tongue_print') o.renderOrder=2;
          o.userData.base=o.position.clone(); parts[id][nm]=o; }); });
      apply(); ctx.ready(); });
    return { root:rootG,
      controls:[
        {type:'slider',label:'Layers',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{ex=v/100;apply();}},
        {type:'slider',label:'Joint',min:0,max:100,value:100,fmt:v=>v+'%',onChange:v=>{jn=v/100;apply();}},
        {type:'button',text:'Play layers',onClick:()=>{ const a=ex>.5?0:1; tween(ex,a,2400,v=>{ex=v;apply();},()=>{ctx.controls[0].setValue&&ctx.controls[0].setValue(a*100);}); }},
        {type:'button',text:'Play joint',onClick:()=>{ const a=jn>.5?0:1; tween(jn,a,2400,v=>{jn=v;apply();}); }}],
      stats:()=>[['Thickness','100 mm (3.94 in)'],['Cover width','1,000 mm (39.37 in)'],['Steel faces','0.5 mm (0.020 in)'],['Insulation','R-30 (RSI 5.3)']],
      views:'34' };
  }

  // ================================================================= PRODUCT 2: wall & roof panel designer
  const THICK=[['2″',50.8,15.0,2.85],['3″',76.2,22.5,3.04],['4″',101.6,30.0,3.22],['5″',127,37.5,3.41],['6″',152.4,45.0,3.60],['8″',203.2,60.0,3.97]];
  const PROFILES={
    flat:{n:'Flat',kind:'wall',d:'Smooth, unribbed face for a minimal, monolithic look.',pts:()=>[[-500,0],[500,0]]},
    box:{n:'Box',kind:'wall',d:'Flat pans separated by narrow ribs.',pts:()=>{ const p=[[-500,0]]; [-375,-125,125,375].forEach(c=>p.push([c-12,0],[c-8,8],[c+8,8],[c+12,0])); p.push([500,0]); return p; }},
    trap:{n:'Trapezoidal',kind:'wall',d:'Repeating angular ribs for added rigidity.',pts:()=>{ const p=[[-500,0]]; [-375,-125,125,375].forEach(c=>p.push([c-35,0],[c-15,28],[c+15,28],[c+35,0])); p.push([500,0]); return p; }},
    emb:{n:'Embossed',kind:'wall',d:'Subtle stucco-like texture that hides minor surface flaws.',pts:()=>[[-500,0],[500,0]],emboss:true},
    cop:{n:'Cop roof',kind:'roof',d:'Double-steel roof profile with standing ribs.',pts:()=>{ const p=[[-500,0]]; [-250,250].forEach(c=>{ p.push([c-45,0],[c-20,38],[c+20,38],[c+45,0]); }); p.push([500,0]); return p; }},
    grec:{n:'Grecata roof',kind:'roof',d:'U-rib corrugated roof profile.',pts:()=>{ const p=[]; for(let x=-500;x<=500;x+=4){ const s=Math.sin(x/125*2*Math.PI); p.push([x,15*.5*(1+Math.tanh(2.6*s))]); } return p; }}
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
      stats:()=>{ const T=THICK[S.thick]; return [['Profile',PROFILES[S.profile].n],['Thickness',T[0]+' ('+T[1].toFixed(0)+' mm)'],['Insulation','R-'+T[2].toFixed(1)+' (RSI '+(T[2]*0.1761).toFixed(1)+')'],['Weight (24/24 steel)',T[3].toFixed(2)+' psf ('+(T[3]*4.8824).toFixed(1)+' kg/m²)']]; },
      note:()=>PROFILES[S.profile].d };
  }

  // ================================================================= PRODUCT 3: cooler doors
  function buildDoors(ctx){
    const S={type:'hinged',open:0,xray:false,color:'#F5F5F2'}; const rootG=new THREE.Group(); let inner=null, mover=null, faceMats=[], apply=()=>{};
    const OW=1000, OH=2150, WH=2600, WT=100;
    function leaf(w,h,d,color){
      const g=new THREE.Group(), mat=steelMat(color); faceMats=[mat];
      const t=2, core=box(w-8,h-8,d-2*t-1,foamMat()); g.add(core);
      [[0,0,d/2-t/2],[0,0,-d/2+t/2]].forEach(p=>g.add(box(w,h,t,mat,p[0],p[1],p[2])));
      g.add(box(w,t,d,mat,0,h/2-t/2,0),box(w,t,d,mat,0,-h/2+t/2,0),box(t,h,d,mat,w/2-t/2,0,0),box(t,h,d,mat,-w/2+t/2,0,0));
      g.userData.core=core; return g; }
    function make(){
      if(inner){ rootG.remove(inner); inner.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
      inner=new THREE.Group();
      // wall section: 2 panels each side + header
      const wm=M.wall; [-1,1].forEach(s=>[0,1].forEach(i=>inner.add(box(996,WH,WT,wm,s*(OW/2+500+i*1000),WH/2,0))));
      inner.add(box(OW,WH-OH,WT,wm,0,OH+(WH-OH)/2,0));
      // frame + threshold
      const fr=steelMat(0xf2f2ee); inner.add(box(45,OH,WT+10,fr,-(OW/2-22.5),OH/2,0),box(45,OH,WT+10,fr,(OW/2-22.5),OH/2,0),box(OW,45,WT+10,fr,0,OH-22.5,0),box(OW-90,10,WT+10,M.alu,0,5,0));
      const dc=S.color;
      if(S.type==='hinged'||S.type==='metal'){
        const W=906,H=OH-45-14, hingeRight=S.type==='hinged', px=(hingeRight?1:-1)*(OW/2-45);
        const lf=leaf(W,H,WT-14,dc); lf.position.set((hingeRight?-1:1)*W/2,14+H/2,0);
        const pivot=new THREE.Group(); pivot.position.set(px,0,0); pivot.add(lf);
        // gasket on the frame (perimeter)
        [[-(OW/2-45),OH/2-22,8,OH-45],[(OW/2-45),OH/2-22,8,OH-45]].forEach(g=>inner.add(box(g[2],g[3],10,M.rubber,g[0]+(g[0]<0?4:-4),g[1]+22,WT/2-3)));
        inner.add(box(OW-90,8,10,M.rubber,0,OH-45-4,WT/2-3));
        // hinges on the hinge side (static knuckles)
        [300,1075,1850].forEach(y=>inner.add(cyl(11,95,M.ss,px+(hingeRight?-1:1)*0,y,WT/2+6)));
        const frontZ=(WT-14)/2;                                  // front face of the leaf (local)
        if(S.type==='hinged'){ // black cam-lock handle
          const hd=new THREE.Group(); hd.add(box(115,58,34,M.black,0,0,0), box(70,16,22,M.black,-8,0,22));
          hd.position.set(hingeRight?(-W/2+95):(W/2-95),1000-lf.position.y,frontZ+10); lf.add(hd);
        } else { // lever handle + door closer
          const hx=hingeRight?(-W/2+80):(W/2-80), lv=new THREE.Group();
          const rose=cyl(22,12,M.ss,0,0,0,24); rose.rotation.x=Math.PI/2; const bar=cyl(8,125,M.ss,hx>0?-55:55,0,16,16); bar.rotation.z=Math.PI/2; lv.add(rose,bar);
          lv.position.set(hx,1000-lf.position.y,frontZ+8); lf.add(lv);
          const cl=new THREE.Group(); cl.add(box(260,46,42,M.zinc,0,0,0)); cl.position.set(hingeRight?(W/2-150):(-W/2+150),H/2-40,frontZ+24); lf.add(cl);
        }        inner.add(pivot); mover=pivot;
        apply=()=>{ pivot.rotation.y=(hingeRight?1:-1)*S.open*1.75; };
      } else { // sliding: leaf hangs in front of the wall from an aluminium track
        const W=1200,H=OH+20, lz=WT/2+12+(WT-14)/2; const lf=leaf(W,H,WT-14,dc); lf.position.set(0,20+H/2,lz);
        const track=box(2900,52,64,M.alu,-450,OH+240,lz+14); inner.add(track);
        [-OW*.35,OW*.35].forEach(dx=>{ lf.add(box(36,170,8,M.zinc,dx,H/2+85,(WT-14)/2+6)); const r=cyl(36,22,M.black,dx,H/2+160,(WT-14)/2+6,24); r.rotation.x=Math.PI/2; lf.add(r); });
        const hb=new THREE.Group(); hb.add(cyl(11,380,M.ss,0,0,0,18),box(40,40,26,M.ss,0,-120,0),box(36,36,20,M.ss,0,120,0),box(70,26,16,M.ss,24,-10,18)); hb.position.set(W/2-190,1000-lf.position.y,(WT-14)/2+34); lf.add(hb);
        inner.add(box(60,OH,WT+20,fr,-(OW/2+30),OH/2,8),box(60,OH,WT+20,fr,(OW/2+30),OH/2,8)); inner.add(box(22,70,150,M.zinc,0,35,lz+4));
        inner.add(lf); mover=lf; apply=()=>{ lf.position.x=-S.open*1250; };
      }
      rootG.add(inner); setXray(); apply(); ctx.update(); }
    function setXray(){ faceMats.forEach(m=>{ m.transparent=S.xray; m.opacity=S.xray?.14:1; m.depthWrite=!S.xray; m.needsUpdate=true; }); }
    return { root:rootG, build:make,
      controls:[
        {type:'chips',label:'Door type',value:'hinged',options:[{v:'hinged',label:'Hinged cooler'},{v:'sliding',label:'Sliding cooler'},{v:'metal',label:'Metal'}],onChange:v=>{S.type=v;S.open=0;ctx.controls[1].setValue&&ctx.controls[1].setValue(0);make();ctx.view('34');}},
        {type:'slider',label:'Open',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{S.open=v/100;apply();}},
        {type:'button',text:'Open / close',onClick:()=>{ const a=S.open>.5?0:1; tween(S.open,a,1800,v=>{S.open=v;apply();ctx.controls[1].setValue&&ctx.controls[1].setValue(Math.round(v*100));}); }},
        {type:'toggle',label:'See inside',text:'X-ray: show the insulated core',value:false,onChange:v=>{S.xray=v;setXray();}},
        {type:'swatches',label:'Door color',value:'#F5F5F2',options:COLORS.slice(0,6).map(c=>({v:c[1],label:c[0]})),onChange:v=>{S.color=v;const o=S.open;make();S.open=o;apply();}}],
      stats:()=>({hinged:[['Type','Hinged cooler'],['Use','Cold storage entries'],['Leaf','Insulated, gasketed'],['Opening','1,000 × 2,150 mm (39.4 × 84.6 in)']],
                   sliding:[['Type','Sliding cooler'],['Use','Heavy-duty track'],['Leaf','Insulated, overlaps frame'],['Opening','1,000 × 2,150 mm (39.4 × 84.6 in)']],
                   metal:[['Type','Insulated metal'],['Use','Personnel doors'],['Hardware','Lever + closer'],['Opening','1,000 × 2,150 mm (39.4 × 84.6 in)']]})[S.type],
      note:()=>'Illustrative model. Sizes and hardware vary by order.' };
  }

  // ================================================================= PRODUCT 4: trim & hardware
  function buildTrim(ctx){
    const S={item:'corner',explode:0,color:'#0E4C92'}; const rootG=new THREE.Group(); let inner=null, mover=null, apply=()=>{};
    const ext=(pts,depth,mat)=>{ const m=sh(new THREE.Mesh(new THREE.ExtrudeGeometry(poly(pts),{depth,bevelEnabled:false}),mat)); m.rotation.x=-Math.PI/2; return m; };   // profile (a,b) -> world x, -z ; extruded upward
    function make(){
      if(inner){ rootG.remove(inner); inner.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
      inner=new THREE.Group(); const tm=steelMat(S.color), pm=steelMat(0xe7ebda);
      if(S.item==='corner'){
        inner.add(box(1000,1200,100,pm,-500,600,-50), box(100,1200,900,pm,-50,600,-550));    // two walls meeting at an outside corner
        const a=ext([[2,-2],[-70,-2],[-70,0],[0,0],[0,70],[2,70]],1200,tm); inner.add(a); mover=a;
        apply=()=>{ a.position.set(S.explode*160,0,S.explode*160); };
      } else if(S.item==='tbar'){
        inner.add(box(995,1200,100,pm,-502.5,600,-50), box(995,1200,100,pm,502.5,600,-50));  // two panels, joint between
        const tb=new THREE.Group(); const prof=ext([[-45,0],[-45,-3],[45,-3],[45,0],[2,0],[2,60],[-2,60],[-2,0]],1200,tm); tb.add(prof);
        const rod=cyl(5,520,M.zinc,0,1200+260,-30,14); tb.add(rod,box(26,26,12,M.zinc,0,1200+10,-30),cyl(14,10,M.zinc,0,1200+40,-30,6)); inner.add(tb); mover=tb;
        apply=()=>{ tb.position.set(0,S.explode*220,S.explode*180); };
      } else {
        // hardware kit: unistrut channel, all-thread rod, nut + washer, butyl roll, screws
        const kit=new THREE.Group(); inner.add(kit); mover=kit;
        const uni=ext([[-20.5,0],[-20.5,41],[-8,41],[-8,38.5],[-18,38.5],[-18,2.5],[18,2.5],[18,38.5],[8,38.5],[8,41],[20.5,41],[20.5,0]],600,M.zinc); const ug=new THREE.Group(); ug.add(uni); ug.rotation.z=-Math.PI/2; ug.position.set(-300,21,-140); kit.add(ug);
        const rod=cyl(6,620,M.zinc,0,0,0,16); rod.rotation.z=Math.PI/2; rod.position.set(0,22,40); const thread=new THREE.Mesh(new THREE.CylinderGeometry(6.4,6.4,620,16),new THREE.MeshStandardMaterial({map:(()=>{const c=document.createElement('canvas');c.width=4;c.height=16;const g=c.getContext('2d');g.fillStyle='#8f959d';g.fillRect(0,0,4,16);g.fillStyle='#b9bec5';g.fillRect(0,0,4,6);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,90);return t;})(),metalness:.8,roughness:.4})); thread.rotation.z=Math.PI/2; thread.position.copy(rod.position); kit.add(thread);
        const nut=cyl(11,10,M.zinc,0,0,0,6); nut.rotation.z=Math.PI/2; nut.position.set(120,22,40); const wsh=cyl(15,2.5,M.zinc,0,0,0,24); wsh.rotation.z=Math.PI/2; wsh.position.set(98,22,40); kit.add(nut,wsh);
        const roll=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(32,0),new THREE.Vector2(75,0),new THREE.Vector2(75,28),new THREE.Vector2(32,28),new THREE.Vector2(32,0)],40),M.butyl); roll.position.set(300,0,-120); sh(roll); roll.castShadow=true; kit.add(roll);
        for(let i=0;i<4;i++){ const sc=new THREE.Group(); sc.add(cyl(2.4,40,M.zinc,0,20,0,10),cyl(8,3,M.zinc,0,41,0,18)); sc.position.set(-150+i*60,0,160); kit.add(sc); }
        apply=()=>{ ug.position.x=-300-S.explode*220; nut.position.x=120+S.explode*140; wsh.position.x=98+S.explode*60; roll.position.x=300+S.explode*220; };
      }
      rootG.add(inner); apply(); ctx.update(); }
    return { root:rootG, build:make,
      controls:[
        {type:'chips',label:'Item',value:'corner',options:[{v:'corner',label:'Corner angle'},{v:'tbar',label:'T-bar'},{v:'kit',label:'Hardware kit'}],onChange:v=>{S.item=v;S.explode=0;ctx.controls[1].setValue&&ctx.controls[1].setValue(0);make();ctx.view('34');}},
        {type:'slider',label:'Pull apart',min:0,max:100,value:0,fmt:v=>v+'%',onChange:v=>{S.explode=v/100;apply();}},
        {type:'swatches',label:'Trim color',value:'#0E4C92',options:COLORS.map(c=>({v:c[1],label:c[0]})),onChange:v=>{S.color=v;const e=S.explode;make();S.explode=e;apply();}}],
      stats:()=>({corner:[['Item','Corner angle'],['Type','Formed trim'],['Finish','Color-matched'],['Seals','Panel corners']],
                  tbar:[['Item','T-bar'],['Type','Seam trim'],['Use','Panel-to-panel'],['Support','All-thread hanger']],
                  kit:[['Kit','Miscellaneous'],['Includes','All-thread · unistrut'],['Also','Fasteners · butyl sealant'],['Use','Hold the system together']]})[S.item],
      note:()=>'Illustrative model. Profiles and sizes are representative.' };
  }

  // ---------------- registry + switching ----------------
  const reg={pir100:buildPir,designer:buildDesigner,doors:buildDoors,trim:buildTrim};
  const meta={
    pir100:{t:'4" (100 mm) PIR panel',b:'The real Blender-built model. Lift the steel off the core and slide two panels together to see the locking joint.'},
    designer:{t:'Wall & roof panels',b:'Pick a profile, a thickness and a color. The insulation value and weight update with your choice.'},
    doors:{t:'Cooler doors',b:'Open each door type and switch on X-ray to see the insulated core.'},
    trim:{t:'Trim & hardware',b:'The small parts that finish a panel system. Pull each assembly apart to see how it fits.'}
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
  rot.onclick=()=>setRot(!controls.autoRotate); addEventListener('keydown',e=>{ if(e.code==='Space'&&document.activeElement===document.body){ e.preventDefault(); setRot(!controls.autoRotate); } });
  function resize(){ renderer.setSize(host.clientWidth,host.clientHeight,false); camera.aspect=host.clientWidth/host.clientHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize',()=>{ resize(); frame('34'); }); resize();
  const start=(location.hash||'').slice(1); show(reg[start]?start:'pir100');
  (function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene,camera); })();
})();
