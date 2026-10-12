/* Harvest Panels redesign prototype - shared interactions (no dependencies) */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s,r=document)=>r.querySelector(s), $$ = (s,r=document)=>[...r.querySelectorAll(s)];

  // glass nav: transparent over the hero, solid once scrolled
  const nav = $('.nav');
  const onScroll = ()=>{ nav && nav.classList.toggle('solid', scrollY > 40); };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // reveal on scroll
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }),{threshold:.14,rootMargin:'0px 0px -6% 0px'});
  $$('.rv').forEach(el=>io.observe(el));
  // safety net: anything already on screen at load is shown even if the observer is delayed
  setTimeout(()=>$$('.rv:not(.in)').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.top<innerHeight*.94 && r.bottom>0) el.classList.add('in'); }),900);

  // animated counters. The real value lives in the HTML (data-to + visible text) so crawlers/no-JS never see "0".
  const fmt = (v,d)=> d? v.toFixed(d) : Math.round(v).toLocaleString('en-US');
  const cio = new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; cio.unobserve(e.target);
    const el=e.target, to=parseFloat(el.dataset.to), d=+(el.dataset.dec||0), pre=el.dataset.pre||'', suf=el.dataset.suf||'';
    if(reduce){return;}
    const t0=performance.now(), dur=1600;
    (function tick(n){ const k=Math.min(1,(n-t0)/dur), v=to*(1-Math.pow(1-k,4)); el.firstChild.nodeValue=pre+fmt(v,d)+suf; if(k<1) requestAnimationFrame(tick); })(t0);
  }),{threshold:.6});
  $$('[data-to]').forEach(el=>cio.observe(el));

  // word-by-word statement (scroll-linked)
  $$('.statement p').forEach(p=>{
    const words = p.textContent.trim().split(/\s+/);
    const bold = (p.dataset.accent||'').split('|').filter(Boolean);
    p.innerHTML = words.map(w=>`<span class="w${bold.some(b=>w.toLowerCase().includes(b))?' b':''}">${w}</span>`).join(' ');
    const spans=$$('.w',p);
    const upd=()=>{ const r=p.getBoundingClientRect(), vh=innerHeight;
      const prog=Math.min(1,Math.max(0,(vh*.82-r.top)/(r.height+vh*.35)));
      spans.forEach((s,i)=>s.classList.toggle('on', reduce || i/spans.length < prog*1.05)); };
    addEventListener('scroll',upd,{passive:true}); upd();
  });

  // hero parallax
  const bg=$('.hero .bg');
  if(bg && !reduce){
    let raf=0; addEventListener('scroll',()=>{ if(raf)return; raf=requestAnimationFrame(()=>{ raf=0;
      const y=Math.min(scrollY,innerHeight); bg.style.transform=`translate3d(0,${y*.28}px,0) scale(${1.04+y/innerHeight*.06})`; });},{passive:true});
  }

  // carousel arrows
  $$('[data-rail]').forEach(r=>{ const tr=$(r.dataset.rail); if(!tr) return;
    r.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; tr.scrollBy({left:(b.dataset.dir==='next'?1:-1)*Math.min(420,tr.clientWidth*.8),behavior:'smooth'}); }); });

  // demo form
  const f=$('#quote-form'); if(f) f.addEventListener('submit',e=>{ e.preventDefault(); f.innerHTML='<p class="lead" style="grid-column:1/-1;color:#fff">Thanks. This is a prototype form, so nothing was sent.</p>'; });
  $$('[data-year]').forEach(el=>{ el.textContent=new Date().getFullYear(); });
})();
