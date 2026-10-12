/* Page behaviours: sticky pill nav (scroll-spy), filters, tabs, spec configurator, animated bars, gallery lightbox */
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  // sticky category pills: smooth scroll + scroll-spy
  $$('.pills[data-spy]').forEach(bar=>{
    const pills=$$('.pill',bar), targets=pills.map(p=>document.getElementById(p.dataset.target));
    pills.forEach((p,i)=>p.addEventListener('click',()=>{ const t=targets[i]; if(t) window.scrollTo({top:t.getBoundingClientRect().top+scrollY-110,behavior:'smooth'}); }));
    const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ const i=targets.indexOf(e.target);
      pills.forEach((p,j)=>p.classList.toggle('on',i===j)); const on=pills[i]; if(on) bar.firstElementChild.scrollTo({left:on.offsetLeft-24,behavior:'smooth'}); } }),{rootMargin:'-35% 0px -60% 0px'});
    targets.forEach(t=>t&&io.observe(t));
  });

  // category filters (blog, gallery)
  $$('.pills[data-filter]').forEach(bar=>{
    const items=$$(bar.dataset.filter);
    bar.addEventListener('click',e=>{ const b=e.target.closest('.pill'); if(!b) return;
      $$('.pill',bar).forEach(x=>x.classList.toggle('on',x===b));
      items.forEach(it=>it.classList.toggle('hidden', b.dataset.cat!=='all' && it.dataset.cat!==b.dataset.cat)); });
  });

  // tabs (specs tables)
  $$('[data-tabs]').forEach(g=>{
    const btns=$$('.pill',g), panels=$$('.tpanel',g.parentElement);
    btns.forEach((b,i)=>b.addEventListener('click',()=>{ btns.forEach(x=>x.classList.toggle('on',x===b)); panels.forEach((p,j)=>p.classList.toggle('on',i===j)); }));
  });

  // animated R-value bars
  const bio=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('on'); bio.unobserve(e.target);} }),{threshold:.4});
  $$('.bar').forEach(b=>bio.observe(b));

  // spec configurator: thickness + steel gauge -> R-value and weight
  const cfg=$('#cfg');
  if(cfg){
    const R={'1-5/8':11.44,'2':14.08,'2-1/2':17.61,'3':21.13,'4':28.17,'5':35.21,'6':42.25,'8':56.34};
    const WT={'26/26':[2.07,2.14,2.24,2.33,2.52,2.70,2.89,3.27],'24/26':[2.44,2.51,2.61,2.70,2.85,3.04,3.26,3.64],'24/24':[2.78,2.85,2.94,3.04,3.22,3.41,3.60,3.97],'22/26':[2.72,2.70,2.88,2.98,3.16,3.35,3.54,3.91]};
    const keys=['1-5/8','2','2-1/2','3','4','5','6','8']; let th='4', gg='24/24';   // explicit order: JS reorders integer-like object keys
    const upd=()=>{ $('#cfg-r').textContent='R-'+R[th].toFixed(1).replace(/\.0$/,''); $('#cfg-w').textContent=WT[gg][keys.indexOf(th)].toFixed(2)+' psf';
      $('#cfg-t').textContent=$(`[data-th="${th}"]`).textContent+' panel, '+gg+' steel'; };
    $$('[data-th]',cfg).forEach(b=>b.addEventListener('click',()=>{ th=b.dataset.th; $$('[data-th]',cfg).forEach(x=>x.classList.toggle('on',x===b)); upd(); }));
    $$('[data-g]',cfg).forEach(b=>b.addEventListener('click',()=>{ gg=b.dataset.g; $$('[data-g]',cfg).forEach(x=>x.classList.toggle('on',x===b)); upd(); }));
    upd();
  }

  // gallery lightbox
  const lb=$('#lb');
  if(lb){
    const img=$('img',lb), cap=$('.lc b',lb), sub=$('.lc small',lb); let list=[], idx=0;
    const show=i=>{ idx=(i+list.length)%list.length; const it=list[idx]; img.src=it.dataset.full; img.alt=it.dataset.title; cap.textContent=it.dataset.title; sub.textContent=it.dataset.cat; };
    const open=i=>{ list=$$('.gi:not(.hidden)'); show(i); lb.classList.add('on'); document.body.style.overflow='hidden'; };
    const close=()=>{ lb.classList.remove('on'); document.body.style.overflow=''; };
    $$('.gi').forEach(g=>g.addEventListener('click',()=>{ const l=$$('.gi:not(.hidden)'); list=l; open(l.indexOf(g)); }));
    $('.x',lb).onclick=close; $('.pv',lb).onclick=()=>show(idx-1); $('.nx',lb).onclick=()=>show(idx+1);
    lb.addEventListener('click',e=>{ if(e.target===lb) close(); });
    addEventListener('keydown',e=>{ if(!lb.classList.contains('on')) return; if(e.key==='Escape') close(); if(e.key==='ArrowLeft') show(idx-1); if(e.key==='ArrowRight') show(idx+1); });
    let sx=0; lb.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
    lb.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-sx; if(Math.abs(dx)>50) show(idx+(dx<0?1:-1)); });
  }
})();
