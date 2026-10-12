/* Scroll-driven 20' x 20' room built from 1 m insulated panels.
   Floor slab -> 4 walls (door in the front wall) -> ceiling panels -> hotspots. Needs three.js r128. */
(function(){
  const host=document.getElementById('room'), sec=document.getElementById('build');
  if(!host||!sec||!window.THREE) return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  // ---- dimensions (metres). 20 ft = 6.096 m, 12 ft wall = 3.658 m, 100 mm panels, 1 m cover ----
  const W=6.096, H=3.658, T=0.1, GAP=0.004, DOOR_H=2.286;
  const OUT=W+2*T;                         // front/back walls and ceiling run over the side walls
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-t,3), smooth=t=>t*t*(3-2*t);

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,0.5,200);

  // soft studio reflections
  (function(){
    const es=new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:new THREE.Color(.62,.64,.68),side:THREE.BackSide})));
    const box=(w,h,x,y,z,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
    box(30,18,-25,22,25,5); box(24,14,28,10,12,3); box(40,10,0,40,0,4);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(es,0.02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd9d6cc,.55));
  const sun=new THREE.DirectionalLight(0xffffff,1.15); sun.position.set(-7,13,9); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-9;sc.right=9;sc.top=9;sc.bottom=-9;sc.near=1;sc.far=40;
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02; sun.shadow.radius=5; scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.28}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-0.121; ground.receiveShadow=true; scene.add(ground);

  // ---- materials ----
  function lineTex(){
    const c=document.createElement('canvas'); c.width=64; c.height=4; const g=c.getContext('2d');
    g.fillStyle='#e4e8dc'; g.fillRect(0,0,64,4); g.fillStyle='#aab2a1'; g.fillRect(0,0,2,4); g.fillStyle='#f4f7ef'; g.fillRect(2,0,1,4);
    const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; return t;
  }
  const baseTex=lineTex();
  function steelMat(w){ const t=baseTex.clone(); t.needsUpdate=true; t.repeat.set(Math.max(.2,w/0.125),1);
    return new THREE.MeshStandardMaterial({map:t,roughness:.42,metalness:.05}); }
  const doorMat=new THREE.MeshStandardMaterial({color:0x10233f,roughness:.45,metalness:.1});
  const handleMat=new THREE.MeshStandardMaterial({color:0xc9ced6,roughness:.25,metalness:.9});
  const slabMat=new THREE.MeshStandardMaterial({color:0x9fa3a8,roughness:.9});

  // ---- build list ----
  const items=[];   // {obj, t0, t1, from:Vector3, to:Vector3, area}
  function add(obj,to,from,t0,t1,area){ obj.position.copy(from); obj.visible=false; scene.add(obj); items.push({obj,to,from,t0,t1,area}); }
  function strip(total){ const o=[]; for(let i=0;i<6;i++) o.push({c:-total/2+.5+i,w:1}); const cw=total-6; o.push({c:-total/2+6+cw/2,w:cw}); return o; }
  function pbox(w,h,d,shadow=true){ const m=new THREE.Mesh(new THREE.BoxGeometry(w-GAP,h,d),steelMat(w)); m.castShadow=shadow; m.receiveShadow=true; return m; }
  const SQFT=10.7639;

  // floor slab
  const slab=new THREE.Mesh(new THREE.BoxGeometry(OUT+1.2,0.12,OUT+1.2),slabMat); slab.receiveShadow=true; slab.castShadow=true;
  slab.position.y=-0.06; slab.scale.set(.001,1,.001); scene.add(slab);

  // walls: back, left, right, front
  const wallY=H/2;
  strip(OUT).forEach((s,i)=>{ const m=pbox(s.w,H,T); add(m,new THREE.Vector3(s.c,wallY,-(W/2+T/2)),new THREE.Vector3(s.c,wallY+5,-(W/2+T/2)-2.4),.08+i*.018,.22+i*.018,s.w*H*SQFT); });
  [-1,1].forEach((side,k)=>{ strip(W).forEach((s,i)=>{ const m=pbox(s.w,H,T); m.rotation.y=Math.PI/2;
      const t0=(k?.32:.2)+i*.018; add(m,new THREE.Vector3(side*(W/2+T/2),wallY,s.c),new THREE.Vector3(side*(W/2+T/2+2.4),wallY+5,s.c),t0,t0+.14,s.w*H*SQFT); }); });
  strip(OUT).forEach((s,i)=>{
    const t0=.44+i*.016, to=new THREE.Vector3(s.c,wallY,W/2+T/2), from=new THREE.Vector3(s.c,wallY+5,W/2+T/2+2.4);
    if(i===3){ // door slot: insulated door + lintel panel above
      const door=new THREE.Group(); const dm=new THREE.Mesh(new THREE.BoxGeometry(s.w-GAP,DOOR_H,T+.02),doorMat); dm.castShadow=dm.receiveShadow=true; door.add(dm);
      const hd=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.55,16),handleMat); hd.position.set(.36,0,T/2+.06); hd.castShadow=true; door.add(hd);
      const f=new THREE.Mesh(new THREE.BoxGeometry(.04,DOOR_H,.04),handleMat); f.position.set(.31,0,T/2+.03); door.add(f);
      add(door,new THREE.Vector3(s.c,DOOR_H/2,W/2+T/2+.01),new THREE.Vector3(s.c,DOOR_H/2+5,W/2+T/2+2.6),.58,.72,s.w*DOOR_H*SQFT);
      const lh=H-DOOR_H, lm=pbox(s.w,lh,T);
      add(lm,new THREE.Vector3(s.c,DOOR_H+lh/2,W/2+T/2),new THREE.Vector3(s.c,DOOR_H+lh/2+5,W/2+T/2+2.4),t0,t0+.14,s.w*lh*SQFT);
    } else { const m=pbox(s.w,H,T); add(m,to,from,t0,t0+.14,s.w*H*SQFT); }
  });
  // ceiling: 20 ft panels spanning the room, dropped in one by one
  strip(OUT).forEach((s,i)=>{ const m=pbox(s.w,T,W); const t0=.62+i*.035;
    add(m,new THREE.Vector3(s.c,H+T/2,0),new THREE.Vector3(s.c,H+T/2+6.5,0),t0,t0+.16,s.w*W*SQFT); });
  // LED strips under the ceiling edge glow on at the end (visible through the door side as accent)
  const glowMat=new THREE.MeshBasicMaterial({color:0x4a8fd6,transparent:true,opacity:0});
  const glow=new THREE.Mesh(new THREE.BoxGeometry(OUT,0.03,0.03),glowMat); glow.position.set(0,H+.02,W/2+T+.03); scene.add(glow);

  const totalItems=items.length, totalArea=items.reduce((a,b)=>a+b.area,0);
  // report interior surface area (walls net of door + ceiling), the same definition the calculator uses
  const targetArea=(4*W*H-0.914*DOOR_H)*SQFT+W*W*SQFT;

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

  const tgt=new THREE.Vector3(0,1.5,0), tmp=new THREE.Vector3();
  function frame(){
    requestAnimationFrame(frame);
    if(!visible) return;
    cur+=(target-cur)*(reduce?1:.085); if(Math.abs(target-cur)<1e-4) cur=target;
    const p=cur;

    // camera orbit: 3/4 view that swings round to the front while the room closes up
    const e=smooth(p), az=lerp(42,-24,e)*Math.PI/180, el=lerp(28,13,e)*Math.PI/180;
    const fit=Math.max(1,1.15/aspect), dist=lerp(21,18,e)*fit;
    camera.position.set(Math.sin(az)*Math.cos(el)*dist, tgt.y+Math.sin(el)*dist, Math.cos(az)*Math.cos(el)*dist);
    camera.lookAt(tgt.x, tgt.y-.15, tgt.z);

    // slab
    const sk=ease(clamp(p/.08,0,1)); slab.scale.set(Math.max(.001,sk),1,Math.max(.001,sk)); slab.visible=sk>.001;

    let placed=0, area=0;
    for(const it of items){
      const k=clamp((p-it.t0)/(it.t1-it.t0),0,1);
      it.obj.visible=k>0;
      if(k>0){ const q=ease(k); it.obj.position.lerpVectors(it.from,it.to,q); }
      if(k>=.9){ placed++; area+=it.area; }
    }
    glowMat.opacity=clamp((p-.9)/.08,0,1)*.9;

    // HUD + stages + rail
    if(hP) hP.textContent=placed+' / '+totalItems;
    if(hA) hA.textContent=Math.round(area/totalArea*targetArea).toLocaleString('en-US');
    if(hR) hR.textContent='R-28';
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
