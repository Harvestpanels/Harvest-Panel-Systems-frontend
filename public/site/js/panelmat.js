/* Shared materials that make every panel in the site look like the 100 mm PIR panel viewer: satin RAL 9002 steel, speckled PIR foam,
   dark gasket foam, cream tongue tape. Needs three.js r128. */
window.HPSP=(function(){
  function noiseTex(base,speck,pores,tile){
    const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,512,512);
    for(let i=0;i<pores;i++){ g.fillStyle=`rgba(120,95,40,${.07+Math.random()*.16})`; g.beginPath(); g.arc(Math.random()*512,Math.random()*512,.6+Math.random()*2.2,0,7); g.fill(); }
    for(let i=0;i<speck;i++){ g.fillStyle=`rgba(40,30,20,${.25+Math.random()*.4})`; g.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*1.4,1+Math.random()*1.4); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; t.repeat.set(1/tile,1/tile); return t;
  }
  // box-projected UVs for geometry in metres that is later scaled x1000 (so 1 UV unit per `tile` mm)
  function boxUV(g,tile){
    const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2),s=1000/tile;
    for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i)); let u,v;
      if(ax>=ay&&ax>=az){u=p.getY(i);v=p.getZ(i);} else if(ay>=az){u=p.getX(i);v=p.getZ(i);} else {u=p.getX(i);v=p.getY(i);} uv[2*i]=u*s; uv[2*i+1]=v*s; }
    g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  }
  const cache={};
  const make={
    RAL9002_satin_steel:()=>new THREE.MeshPhysicalMaterial({color:0xe3e7d9,roughness:.38,clearcoat:.25,clearcoatRoughness:.3,envMapIntensity:.55}),
    PIR_foam:()=>new THREE.MeshStandardMaterial({map:noiseTex('#f1e4b4',0,0,90),roughness:.92,envMapIntensity:.6,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2}),
    Gasket_dark_foam:()=>new THREE.MeshStandardMaterial({map:noiseTex('#2a2a2d',0,3000,60),color:0x9a9a9d,roughness:.95}),
    Tape_cream:()=>new THREE.MeshStandardMaterial({color:0xf7f1da,roughness:.42})
  };
  const tiles={PIR_foam:90,Gasket_dark_foam:60};
  return {
    has:name=>!!make[(name||'').replace(/\.\d+$/,'')],
    mat:name=>{ const k=(name||'').replace(/\.\d+$/,''); return make[k]?(cache[k]||(cache[k]=make[k]())):null; },
    // call before replacing the material: gives foam/gasket meshes the UVs their texture needs
    prepare:(mesh,name)=>{ const k=(name||'').replace(/\.\d+$/,''); if(tiles[k]&&!mesh.geometry.attributes.uv){ mesh.geometry=mesh.geometry.clone(); boxUV(mesh.geometry,tiles[k]); } }
  };
})();
