/* Scroll-driven 20' x 16' room (12' walls) built from 1 m insulated panels.
   Floor slab and floor track -> 4 walls (cooler door in the front wall) -> ceiling panels -> trim -> the door swings open.
   Panels are the Blender-modelled 100 mm PIR panel; the door, frame and hardware are the Blender-modelled hinged cooler door.
   Needs three.js r128 (and, for the real panel look, panelmat.js loaded first). */
(function(){
  const host=document.getElementById('room'), sec=document.getElementById('build');
  if(!host||!sec||!window.THREE) return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  // ---- dimensions (metres): 20 ft x 16 ft footprint, 12 ft walls, 100 mm panels, 1 m cover ----
  const FT=0.3048, WX=20*FT, WZ=16*FT, H=12*FT, T=0.1, GAP=0.004;
  const OUTX=WX+2*T, OUTZ=WZ+2*T;          // front/back walls and the ceiling run over the side walls
  const DOOR_W=0.96, DOOR_H=2.13;          // structural opening of the 3 ft cooler door model
  const DOOR_URL='/site/models/doors/hinged-3x7.glb';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-t,3), smooth=t=>t*t*(3-2*t);

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.85;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,0.5,200);

  // soft studio reflections
  (function(){
    const es=new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:new THREE.Color(.62,.64,.68),side:THREE.BackSide})));
    const box=(w,h,x,y,z,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
    box(30,18,-25,22,25,5); box(24,14,28,10,12,3); box(40,10,0,40,0,4); box(26,12,0,8,-30,2);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(es,0.02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd9d6cc,.3));
  const sun=new THREE.DirectionalLight(0xfff4e6,1.35); sun.position.set(-8,12,9); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-9;sc.right=9;sc.top=9;sc.bottom=-9;sc.near=1;sc.far=40;
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02; sun.shadow.radius=5; scene.add(sun);
  const fill=new THREE.DirectionalLight(0xdce6ff,.3); fill.position.set(8,5,10); scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.28}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-0.121; ground.receiveShadow=true; scene.add(ground);
  // lamp inside the room: only seen through the door once it swings open
  const lamp=new THREE.PointLight(0xf3f7ff,0,10,2); lamp.position.set(0,H-.5,0); scene.add(lamp);

  // ---- materials ----
  const HP=window.HPSP;                       // shared panel look (panelmat.js), if loaded
  function lineTex(){
    const c=document.createElement('canvas'); c.width=64; c.height=4; const g=c.getContext('2d');
    g.fillStyle='#e4e8dc'; g.fillRect(0,0,64,4); g.fillStyle='#aab2a1'; g.fillRect(0,0,2,4); g.fillStyle='#f4f7ef'; g.fillRect(2,0,1,4);
    const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; return t;
  }
  const baseTex=lineTex();
  function steelMat(w){ const t=baseTex.clone(); t.needsUpdate=true; t.repeat.set(Math.max(.2,w/0.125),1);
    return new THREE.MeshStandardMaterial({map:t,roughness:.42,metalness:.05}); }
  function concreteTex(){
    const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
    g.fillStyle='#9b9ea2'; g.fillRect(0,0,512,512);
    for(let i=0;i<9000;i++){ const v=105+(Math.random()*75|0); g.fillStyle='rgba('+v+','+v+','+(v+3)+','+(.07+Math.random()*.12)+')'; g.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*2.4,1+Math.random()*2.4); }
    for(let i=0;i<26;i++){ g.fillStyle='rgba(90,92,96,'+(.03+Math.random()*.05)+')'; g.beginPath(); g.ellipse(Math.random()*512,Math.random()*512,20+Math.random()*60,12+Math.random()*34,Math.random()*3,0,7); g.fill(); }
    g.strokeStyle='rgba(60,62,66,.45)'; g.lineWidth=3; g.strokeRect(1.5,1.5,509,509);   // saw-cut control joints
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; t.repeat.set(3,3); return t;
  }
  // soft contact shadow where the walls meet the floor (a blurred dark ring around the wall footprint)
  function contactTex(pw,ph){
    const c=document.createElement('canvas'); c.width=512; c.height=Math.round(512*ph/pw); const g=c.getContext('2d');
    const k=c.width/pw, x0=(pw-OUTX)/2*k, y0=(ph-OUTZ)/2*k;
    // draw the rings far off-canvas and keep only their blurred shadow (shadowBlur works in every browser)
    const OFF=4000; g.shadowColor='rgba(0,0,0,.75)'; g.shadowBlur=22; g.shadowOffsetX=OFF; g.strokeStyle='#000'; g.lineWidth=.12*k;
    g.strokeRect(x0-.04*k-OFF,y0-.04*k,OUTX*k+.08*k,OUTZ*k+.08*k);
    g.strokeRect(x0+T*k+.03*k-OFF,y0+T*k+.03*k,(OUTX-2*T)*k-.06*k,(OUTZ-2*T)*k-.06*k);
    const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
  }
  const slabMat=new THREE.MeshStandardMaterial({map:concreteTex(),color:0xdadada,roughness:.93,metalness:0});
  const epoxyMat=new THREE.MeshStandardMaterial({color:0x7e858c,roughness:.26,metalness:.04});
  const galvMat=new THREE.MeshStandardMaterial({color:0xc2c7cc,roughness:.36,metalness:.88});
  const trimMat=(HP&&HP.mat('RAL9002_satin_steel'))||new THREE.MeshStandardMaterial({color:0xe3e7d9,roughness:.38,metalness:.1});
  const ledMat=new THREE.MeshBasicMaterial({color:0xffffff});

  // ---- build list ----
  const items=[];   // counted panels: {obj, t0, t1, from:Vector3, to:Vector3, area}
  const extras=[];  // trim and details (not counted)
  function add(obj,to,from,t0,t1,area){ obj.position.copy(from); obj.visible=false; scene.add(obj); items.push({obj,to,from,t0,t1,area}); }
  function addExtra(obj,to,from,t0,t1){ obj.position.copy(from); obj.visible=false; scene.add(obj); extras.push({obj,to,from,t0,t1}); }
  // Panel layout as in the installation guide: equal cut panels at both ends of a wall, each at least half a panel wide.
  const PITCH=1.002;                          // a 2 mm reveal at each joint so the seams read on screen
  function strip(total){
    let n=Math.floor(total/PITCH), rem=total-n*PITCH, edge=rem/2;
    if(edge<.5*PITCH){ n-=1; edge=(rem+PITCH)/2; }
    const o=[]; let x=-total/2;
    o.push({c:x+edge/2,w:edge}); x+=edge;
    for(let i=0;i<n;i++){ o.push({c:x+PITCH/2,w:1}); x+=PITCH; }
    o.push({c:x+edge/2,w:edge});
    return o;
  }

  // The panels are the Blender-modelled 100 mm PIR panel (panel_assets.js). Until that model has
  // decoded, each panel shows a plain box of the same size; dressPanels() swaps the real model in.
  const PANEL_LEN=1.875;                       // length of the modelled panel (m); stretched to the length needed
  const panels=[];
  function pbox(w,h,d,kind){ const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.BoxGeometry(w-GAP,h,d),steelMat(w)); m.castShadow=true; m.receiveShadow=true; g.add(m);
    g.userData={w,h,d,kind}; panels.push(g); return g; }
  // model axes: X = length, Y = thickness, Z = cover width (tongue on +Z)
  const BASIS={ wall:new THREE.Matrix4().makeBasis(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0)),
                ceil:new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0)) };
  function dressPanels(proto){ panels.forEach(g=>{ const {w,h,d,kind,yo}=g.userData; g.clear();
      const model=proto.clone(true); model.scale.set((kind==='wall'?h:d)/PANEL_LEN,1,w);
      const hg=new THREE.Group(); hg.add(model); hg.quaternion.setFromRotationMatrix(BASIS[kind]); hg.position.y=yo||0; g.add(hg); }); }
  if(THREE.GLTFLoader && typeof PANEL_GLB_B64!=='undefined'){
    const ab=(s=>{ const a=atob(s),u=new Uint8Array(a.length); for(let i=0;i<a.length;i++)u[i]=a.charCodeAt(i); return u.buffer; })(PANEL_GLB_B64);
    const mats= HP ? { Steel_top:HP.mat('RAL9002_satin_steel'), PIR_core:HP.mat('PIR_foam'), Gasket:HP.mat('Gasket_dark_foam'), Tongue_tape:HP.mat('Tape_cream') }
                   : { Steel_top:new THREE.MeshPhysicalMaterial({color:0xcfd5c8,roughness:.5,clearcoat:.1,clearcoatRoughness:.4}),
                       PIR_core:new THREE.MeshStandardMaterial({color:0xe9dcae,roughness:.85}), Gasket:new THREE.MeshStandardMaterial({color:0x3a3a3d,roughness:.95}),
                       Tongue_tape:new THREE.MeshStandardMaterial({color:0xf7f1da,roughness:.42}) };
    mats.Steel_bottom=mats.Steel_top;
    const hpName={PIR_core:'PIR_foam',Gasket:'Gasket_dark_foam'};
    new THREE.GLTFLoader().parse(ab,'',gltf=>{ const proto=gltf.scene;
      proto.traverse(o=>{ if(!o.isMesh) return; const nm=o.name.replace(/\.\d+$/,''); if(nm==='Tongue_print'){ o.visible=false; return; } // logo tape sits inside the joint
        if(HP&&hpName[nm]) HP.prepare(o,hpName[nm]);
        if(mats[nm]) o.material=mats[nm]; o.castShadow=true; o.receiveShadow=true; });
      dressPanels(proto); });
  }
  const SQFT=10.7639;

  // ---- floor: concrete slab, epoxy floor inside, galvanized floor track under every wall ----
  const floor=new THREE.Group(); floor.scale.set(.001,1,.001); scene.add(floor);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(OUTX+1.4,0.12,OUTZ+1.4),slabMat); slab.receiveShadow=true; slab.castShadow=true; slab.position.y=-0.06; floor.add(slab);
  const epoxy=new THREE.Mesh(new THREE.PlaneGeometry(WX,WZ),epoxyMat); epoxy.rotation.x=-Math.PI/2; epoxy.position.y=0.0015; epoxy.receiveShadow=true; floor.add(epoxy);
  { const pw=OUTX+1.2, ph=OUTZ+1.2;
    const ao=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph),new THREE.MeshBasicMaterial({map:contactTex(pw,ph),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    ao.rotation.x=-Math.PI/2; ao.position.y=0.0032; ao.renderOrder=1; floor.add(ao); }
  (function(){
    const LEG=0.0508, TH=0.003, E=0.0016;     // 2" legs; drawn a little thicker than 20 ga so they read
    function leg(len,x,z,alongX){ const m=new THREE.Mesh(new THREE.BoxGeometry(alongX?len:TH,LEG,alongX?TH:len),galvMat); m.position.set(x,LEG/2,z); m.castShadow=true; m.receiveShadow=true; floor.add(m); }
    // a leg along x from x0 to x1
    const legX=(x0,x1,z)=>leg(x1-x0,(x0+x1)/2,z,true);
    legX(-OUTX/2,OUTX/2,-(WZ/2-E)); legX(-OUTX/2,OUTX/2,-(OUTZ/2+E));   // back wall: legs on both faces
    [WZ/2-E,OUTZ/2+E].forEach(z=>{ legX(-OUTX/2,-DOOR_W/2,z); legX(DOOR_W/2,OUTX/2,z); });  // front wall: the track stops at the door jambs
    [-1,1].forEach(s=>{ leg(WZ,s*(WX/2-E),0,false); leg(WZ,s*(OUTX/2+E),0,false); });     // side walls
  })();

  // ---- walls: back, left, right, front ----
  const zFront=WZ/2+T/2;
  strip(OUTX).forEach((s,i)=>{ const m=pbox(s.w,H,T,'wall'); add(m,new THREE.Vector3(s.c,H/2,-zFront),new THREE.Vector3(s.c,H/2+5,-zFront-2.4),.08+i*.016,.22+i*.016,s.w*H*SQFT); });
  [-1,1].forEach((side,k)=>{ strip(WZ).forEach((s,i)=>{ const m=pbox(s.w,H,T,'wall'); m.rotation.y=Math.PI/2;
      const t0=(k?.32:.2)+i*.02; add(m,new THREE.Vector3(side*(WX/2+T/2),H/2,s.c),new THREE.Vector3(side*(WX/2+T/2+2.4),H/2+5,s.c),t0,t0+.14,s.w*H*SQFT); }); });
  let doorPivot=null;
  strip(OUTX).forEach((s,i)=>{
    const t0=.44+i*.016, to=new THREE.Vector3(s.c,H/2,zFront), from=new THREE.Vector3(s.c,H/2+5,zFront+2.4);
    if(i===3){ // door slot: the Blender cooler door in its full-height panel (frame, leaf, hinges and latch included)
      const holder=pbox(s.w,H,T,'wall');
      holder.userData.yo=H/2; holder.children[0].position.y=H/2;   // this group sits on the floor, not at mid-height
      add(holder,new THREE.Vector3(s.c,0,zFront),new THREE.Vector3(s.c,5,zFront+2.4),t0,t0+.14,s.w*H*SQFT);
      loadDoor(holder);
    } else { const m=pbox(s.w,H,T,'wall'); add(m,to,from,t0,t0+.14,s.w*H*SQFT); }
  });
  // The door model comes with a wall of three 2.6 m panels. Keep only the middle one (it has the door opening cut in)
  // and stretch its top, above the opening, to the full wall height.
  function loadDoor(holder){
    if(!THREE.GLTFLoader) return;
    new THREE.GLTFLoader().load(DOOR_URL,gltf=>{
      const asm=new THREE.Group(), dL=H-2.6;
      [...gltf.scene.children].forEach(ch=>{
        if(/^Wall_p[02]_/.test(ch.name)) return;
        if(/^Wall_p1_/.test(ch.name)&&ch.isMesh){ const g=ch.geometry.clone(), p=g.attributes.position;
          for(let v=0;v<p.count;v++) if(p.getX(v)>1.05) p.setX(v,p.getX(v)+dL);
          p.needsUpdate=true; g.computeBoundingBox(); g.computeBoundingSphere(); ch.geometry=g; }
        asm.add(ch);
      });
      asm.traverse(o=>{ if(!o.isMesh) return; o.castShadow=true; o.receiveShadow=true;
        const nm=o.material&&o.material.name||''; if(HP&&HP.has(nm)){ HP.prepare(o,nm); o.material=HP.mat(nm); } });
      doorPivot=asm.getObjectByName('pivotA');
      const k=panels.indexOf(holder); if(k>=0) panels.splice(k,1);
      holder.clear(); holder.add(asm);
    },undefined,()=>{ /* the plain panel stays if the model cannot load */ });
  }
  // ---- ceiling: 16 ft panels spanning the room, dropped in one by one ----
  strip(OUTX).forEach((s,i)=>{ const m=pbox(s.w,T,OUTZ,'ceil'); const t0=.62+i*.03;
    add(m,new THREE.Vector3(s.c,H+T/2,0),new THREE.Vector3(s.c,H+T/2+6.5,0),t0,t0+.15,s.w*OUTZ*SQFT); });

  // ---- trim (installation guide): outside corner trim on the four corners, outside trim along the top edge ----
  const TL=0.0508, TK=0.002;
  [-1,1].forEach(sx=>[-1,1].forEach((sz,j)=>{
    const g=new THREE.Group();
    const a=new THREE.Mesh(new THREE.BoxGeometry(TL,H,TK),trimMat); a.position.set(-sx*(TL/2-.0004),H/2,sz*(TK/2+.0004)); g.add(a);
    const b=new THREE.Mesh(new THREE.BoxGeometry(TK,H,TL),trimMat); b.position.set(sx*(TK/2+.0004),H/2,-sz*(TL/2-.0004)); g.add(b);
    g.children.forEach(c=>{ c.castShadow=true; c.receiveShadow=true; });
    addExtra(g,new THREE.Vector3(sx*OUTX/2,0,sz*OUTZ/2),new THREE.Vector3(sx*OUTX/2,4,sz*OUTZ/2),.84+j*.01,.93);
  }));
  [[OUTX,0,1],[OUTX,0,-1],[OUTZ,1,0],[OUTZ,-1,0]].forEach(([len,nx,nz],i)=>{   // top edge: 220 mm down the wall, 160 mm across the ceiling
    const along=nx===0, g=new THREE.Group();
    const v=new THREE.Mesh(new THREE.BoxGeometry(along?len:TK,0.22,along?TK:len),trimMat); v.position.set(nx*(TK/2+.0004),H+T-.11,nz*(TK/2+.0004));
    const h=new THREE.Mesh(new THREE.BoxGeometry(along?len:.16,TK,along?.16:len),trimMat); h.position.set(-nx*.08,H+T+TK/2+.0004,-nz*.08);
    g.add(v,h); g.children.forEach(c=>{ c.castShadow=true; c.receiveShadow=true; });
    const px=along?0:nx*OUTX/2, pz=along?nz*OUTZ/2:0;     // the wall face this piece sits on
    addExtra(g,new THREE.Vector3(px,0,pz),new THREE.Vector3(px,3,pz),.86+i*.01,.95);
  });
  // two light fixtures under the ceiling, seen through the open door
  const fixtures=[-1.25,1.25].map(x=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,1.3),ledMat); m.position.set(x,H-.02,0); m.visible=false; scene.add(m); return m; });

  const totalItems=items.length, totalArea=items.reduce((a,b)=>a+b.area,0);
  // report interior surface area (walls net of the door opening + ceiling), the same definition the calculator uses
  const targetArea=(2*WX*H+2*WZ*H-DOOR_W*DOOR_H)*SQFT+WX*WZ*SQFT;

  // ---- hotspots (3D -> screen) ----
  const hotspots=$$('.hot',sec).map(el=>({el, p:new THREE.Vector3(...el.dataset.pos.split(',').map(Number)), at:+el.dataset.at}));

  // ---- DOM hooks ----
  const stages=$$('.stage',sec), dots=$$('.rail i',sec);
  const hP=$('#h-panels'), hA=$('#h-area'), hR=$('#h-r');
  const phases=[[0,.08],[.08,.6],[.6,.86],[.86,1.01]];

  // ---- sizing ----
  let aspect=1;
  function resize(){ const w=host.clientWidth,h=host.clientHeight; renderer.setSize(w,h,false); aspect=w/h; camera.aspect=aspect; camera.updateProjectionMatrix(); }
  addEventListener('resize',resize); resize();

  // ---- scroll progress ----
  let target=reduce?1:0, cur=reduce?1:0, visible=true;
  function readScroll(){ if(reduce){target=1;return;} const r=sec.getBoundingClientRect(), total=sec.offsetHeight-innerHeight; target=clamp(-r.top/Math.max(1,total),0,1); }
  addEventListener('scroll',readScroll,{passive:true}); readScroll();
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;}).observe(sec);

  const tgt=new THREE.Vector3(0,1.6,0), tmp=new THREE.Vector3();
  function frame(){
    requestAnimationFrame(frame);
    if(!visible) return;
    cur+=(target-cur)*(reduce?1:.085); if(Math.abs(target-cur)<1e-4) cur=target;
    const p=cur;

    // camera orbit: 3/4 view that swings round to the front while the room closes up
    const e=smooth(p), az=lerp(42,-22,e)*Math.PI/180, el=lerp(28,12,e)*Math.PI/180;
    const fit=Math.max(1,1.15/aspect), dist=lerp(20,16.5,e)*fit;
    camera.position.set(Math.sin(az)*Math.cos(el)*dist, tgt.y+Math.sin(el)*dist, Math.cos(az)*Math.cos(el)*dist);
    camera.lookAt(tgt.x, tgt.y-.2, tgt.z);

    // floor
    const sk=ease(clamp(p/.08,0,1)); floor.scale.set(Math.max(.001,sk),1,Math.max(.001,sk)); floor.visible=sk>.001;

    let placed=0, area=0;
    for(const it of items){
      const k=clamp((p-it.t0)/(it.t1-it.t0),0,1);
      it.obj.visible=k>0;
      if(k>0){ const q=ease(k); it.obj.position.lerpVectors(it.from,it.to,q); }
      if(k>=.9){ placed++; area+=it.area; }
    }
    for(const it of extras){
      const k=clamp((p-it.t0)/(it.t1-it.t0),0,1);
      it.obj.visible=k>0;
      if(k>0) it.obj.position.lerpVectors(it.from,it.to,ease(k));
    }
    // the door swings open at the very end; the lamp inside comes on
    const ok=ease(clamp((p-.93)/.07,0,1));
    if(doorPivot) doorPivot.rotation.y=ok*.62;
    lamp.intensity=ok*1.5;
    fixtures.forEach(f=>{ f.visible=p>.8; });

    // HUD + stages + rail
    if(hP) hP.textContent=placed+' / '+totalItems;
    if(hA){ const a=Math.round(area/totalArea*targetArea); hA.textContent=a.toLocaleString('en-US'); const hl=document.getElementById('h-arealab'); if(hl) hl.textContent='Sq Ft Insulated ('+Math.round(a/SQFT).toLocaleString('en-US')+' m²)'; }
    if(hR) hR.textContent='R-30';
    stages.forEach(s=>s.classList.toggle('on', p>=+s.dataset.a && p<+s.dataset.b));
    dots.forEach((d,i)=>d.classList.toggle('on', p>=phases[i][0] && p<phases[i][1]));

    // hotspots
    const w=host.clientWidth,h=host.clientHeight;
    hotspots.forEach(hs=>{ tmp.copy(hs.p).project(camera);
      const on=p>=hs.at && tmp.z<1; hs.el.classList.toggle('on',on);
      hs.el.style.left=((tmp.x+1)/2*w)+'px'; hs.el.style.top=((1-tmp.y)/2*h)+'px'; });

    renderer.render(scene,camera);
  }
  frame();
})();
