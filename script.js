(function(){
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hero=document.getElementById('hero');

  // Hero video: some browsers block autoplay until play() is called explicitly
  var hv=document.querySelector('.hero-video');
  if(hv){hv.muted=true;var p=hv.play();if(p&&p.catch)p.catch(function(){})}

  // ---------- Start lights intro ----------
  function startHero(){hero.classList.add('go')}
  var lights=document.getElementById('lights');
  if(root.classList.contains('intro')){
    var lamps=lights.querySelectorAll('.lamps i'),timers=[],done=false;
    function launch(){
      if(done)return;done=true;
      timers.forEach(clearTimeout);
      lights.classList.add('launch');
      try{sessionStorage.setItem('bm-intro','1')}catch(e){}
      setTimeout(startHero,150);
      setTimeout(function(){root.classList.remove('intro')},560);
    }
    lamps.forEach(function(l,i){timers.push(setTimeout(function(){l.classList.add('on')},300+i*280))});
    timers.push(setTimeout(function(){lights.classList.add('go')},300+lamps.length*280+350));
    timers.push(setTimeout(launch,300+lamps.length*280+750));
    lights.addEventListener('click',launch);
    addEventListener('keydown',launch,{once:true});
  }else{
    requestAnimationFrame(startHero);
  }

  // ---------- Nav ----------
  var nav=document.getElementById('nav');
  function onScroll(){nav.classList.toggle('solid',scrollY>40)}
  onScroll();addEventListener('scroll',onScroll,{passive:true});

  var sections=[].slice.call(document.querySelectorAll('main section[id]'));
  var navLinks=document.querySelectorAll('.nav ul a');
  var currentGear=0;

  // ---------- Reveal, wipe, count-up ----------
  function countUp(el){
    var target=+el.getAttribute('data-count');
    if(reduce){el.textContent=target;return}
    var from=target===0?999:0,t0=null,dur=1400;
    function step(t){
      if(!t0)t0=t;
      var k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,4);
      el.textContent=Math.round(from+(target-from)*e);
      if(k<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      var batch=0;
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        var el=e.target;
        if(!reduce)el.style.transitionDelay=(batch++*0.09)+'s';
        el.classList.add('in');
        el.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(el);
      });
    },{threshold:.15,rootMargin:'0px 0px -6% 0px'});
    document.querySelectorAll('[data-reveal],[data-wipe]').forEach(function(el){io.observe(el)});

    var so=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        var id=e.target.id;
        currentGear=sections.indexOf(e.target);
        navLinks.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+id)});
      });
    },{rootMargin:'-45% 0px -50% 0px'});
    sections.forEach(function(s){so.observe(s)});
  }else{
    document.querySelectorAll('[data-reveal],[data-wipe]').forEach(function(el){el.classList.add('in')});
  }

  // ---------- Speed: scroll velocity drives streaks, HUD and ticker ----------
  var lastY=scrollY,vel=0,mouseBoost=0;
  addEventListener('pointermove',function(e){
    if(e.clientY<hero.getBoundingClientRect().bottom)mouseBoost=Math.min(1,mouseBoost+.04);
  },{passive:true});

  // Hero streaks: warp lines flying out from a vanishing point
  var cv=document.getElementById('streaks'),ctx=cv&&cv.getContext('2d'),W=0,H=0,dpr=Math.min(devicePixelRatio||1,1.5),stars=[],heroOn=true;
  function size(){
    W=cv.clientWidth;H=cv.clientHeight;
    cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function spawn(s){
    s.a=Math.random()*Math.PI*2;s.r=Math.random()*40+10;s.v=Math.random()*2+1;
    s.red=Math.random()<.18;return s;
  }
  if(ctx&&!reduce){
    size();addEventListener('resize',size);
    for(var i=0;i<140;i++){var s=spawn({});s.r=Math.random()*Math.max(W,H);stars.push(s)}
    if('IntersectionObserver' in window)new IntersectionObserver(function(es){heroOn=es[0].isIntersecting}).observe(hero);
  }
  function drawStreaks(speed){
    ctx.clearRect(0,0,W,H);
    var cx=W*.62,cy=H*.48,max=Math.hypot(W,H)*.7;
    ctx.lineCap='round';
    for(var i=0;i<stars.length;i++){
      var s=stars[i],grow=1+s.r/120;
      var r0=s.r;s.r+=s.v*grow*speed;
      var len=Math.min(220,s.v*grow*speed*7);
      var x1=cx+Math.cos(s.a)*r0,y1=cy+Math.sin(s.a)*r0*.62;
      var x2=cx+Math.cos(s.a)*(r0+len),y2=cy+Math.sin(s.a)*(r0+len)*.62;
      var alpha=Math.min(.55,s.r/max)*(.35+speed*.12);
      ctx.strokeStyle=s.red?'rgba(255,60,70,'+alpha+')':'rgba(255,255,255,'+alpha+')';
      ctx.lineWidth=Math.min(2.4,.4+s.r/400);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      if(s.r>max)spawn(s);
    }
  }

  // HUD
  var hud=document.getElementById('hud'),hudFill=document.getElementById('hud-fill'),hudSpeed=document.getElementById('hud-speed'),hudGear=document.getElementById('hud-gear'),hudNitro=document.getElementById('hud-nitro');
  var shownKmh=0;

  // Ticker
  var ticker=document.getElementById('ticker'),tickX=0;

  function frame(){
    var y=scrollY,dy=Math.abs(y-lastY);lastY=y;
    vel+=(dy-vel)*.12;
    mouseBoost*=.96;

    if(ctx&&!reduce&&heroOn)drawStreaks(1+Math.min(vel,60)*.12+mouseBoost*2.5);

    if(!reduce){
      var kmh=Math.min(320,Math.round(vel*9));
      shownKmh+=(kmh-shownKmh)*.2;
      var k=Math.round(shownKmh);
      hudSpeed.textContent=('00'+k).slice(-3);
      hudFill.style.strokeDasharray=(shownKmh/320*75).toFixed(1)+' 100';
      hud.classList.toggle('on',y>innerHeight*.5);
      hudGear.textContent=y<innerHeight*.5?'N':String(Math.max(1,currentGear+1));
      var max=document.documentElement.scrollHeight-innerHeight;
      hudNitro.style.width=(max>0?y/max*100:0).toFixed(1)+'%';

      var half=ticker.scrollWidth/2;
      tickX-=.6+Math.min(vel,80)*.25;
      if(-tickX>=half)tickX+=half;
      ticker.style.transform='translateX('+tickX+'px)';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- Card tilt + glare ----------
  if(finePointer&&!reduce){
    document.querySelectorAll('.tilt').forEach(function(el){
      var g=document.createElement('span');g.className='glare';el.appendChild(g);
      el.addEventListener('pointerenter',function(){el.style.transition='transform .15s ease-out'});
      el.addEventListener('pointermove',function(e){
        var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
        el.style.transform='perspective(900px) rotateX('+((.5-py)*7).toFixed(2)+'deg) rotateY('+((px-.5)*9).toFixed(2)+'deg) translateZ(0)';
        el.style.setProperty('--gx',(px*100)+'%');el.style.setProperty('--gy',(py*100)+'%');
      });
      el.addEventListener('pointerleave',function(){
        el.style.transition='transform .6s cubic-bezier(.2,.8,.2,1)';el.style.transform='';
      });
    });
  }

  // ---------- Footer year, copy, enquiry form ----------
  document.getElementById('yr').textContent=new Date().getFullYear();
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var t=b.getAttribute('data-copy');function done(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1600)}function fallback(){var r=document.createRange();r.selectNodeContents(document.getElementById('wa-num'));var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selected'}try{navigator.clipboard.writeText(t).then(done,fallback)}catch(e){fallback()}});});
  var form=document.getElementById('enq'),note=document.getElementById('f-note');
  form.addEventListener('submit',function(e){e.preventDefault();var m=form.model.value.trim();if(!m){note.textContent='Add the model so we know what we are valuing.';note.className='formnote';form.model.focus();return}var lines=['Hello Big Motors, I would like an assessment.','Model: '+m];if(form.year.value.trim())lines.push('Year: '+form.year.value.trim());if(form.km.value.trim())lines.push('Mileage: '+form.km.value.trim()+' km');lines.push('Interested in: '+form.route.value);if(form.notes.value.trim())lines.push('Notes: '+form.notes.value.trim());var url='https://wa.me/971506686691?text='+encodeURIComponent(lines.join('\n'));var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();note.innerHTML='If WhatsApp did not open, message <b>+971 50 668 6691</b> directly.';note.className='formnote ok';});
})();
