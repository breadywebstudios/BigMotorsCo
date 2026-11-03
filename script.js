(function(){
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CARS=[];
  var hero=document.getElementById('hero');
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  // ---------- Hero video: YouTube id comes from bm_settings (set in admin), data-video is the fallback ----------
  var heroFrame=document.querySelector('.hero-video iframe');
  if(heroFrame){
    // The frame stays invisible (hero photo shows) until YouTube reports it is actually playing,
    // so its title, play button and "More videos" overlays never sit over the hero text.
    var heroWrap=heroFrame.parentNode,heroReveal;
    var setHeroVideo=function(id){
      if(!/^[\w-]{11}$/.test(id))id=heroFrame.dataset.video;
      heroFrame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&loop=1&playlist='+id+'&controls=0&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1&origin='+encodeURIComponent(location.origin);
      var bind=function(){
        new YT.Player(heroFrame,{events:{
          onReady:function(e){e.target.mute();e.target.playVideo()},
          onStateChange:function(e){
            // 1 playing: reveal after 3.5s, once YouTube has faded its own play icon and title;
            // 0 ended / 3 buffering keep the last frame (loop restart); -1, 2, 5 hide it
            clearTimeout(heroReveal);
            if(e.data===1){if(!heroWrap.classList.contains('playing'))heroReveal=setTimeout(function(){heroWrap.classList.add('playing')},3500)}
            else if(e.data!==0&&e.data!==3)heroWrap.classList.remove('playing');
            if(e.data===0)e.target.playVideo();
          }
        }});
      };
      if(window.YT&&YT.Player)bind();
      else{
        var prev=window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady=function(){if(prev)prev();bind()};
        var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';document.head.appendChild(tag);
      }
    };
    fetch(SB_URL+'/rest/v1/bm_settings?key=eq.hero_video&select=value',{headers:{apikey:SB_KEY}})
      .then(function(r){return r.ok?r.json():[]})
      .then(function(rows){setHeroVideo(rows[0]?rows[0].value:'')})
      .catch(function(){setHeroVideo('')});
  }

  // ---------- Phone menu ----------
  var nav=$('nav'),menuBtn=$('menu-btn');
  if(nav&&menuBtn){
    var setMenu=function(open){nav.classList.toggle('open',open);menuBtn.setAttribute('aria-expanded',open);menuBtn.setAttribute('aria-label',open?'Close menu':'Menu')};
    menuBtn.addEventListener('click',function(){setMenu(!nav.classList.contains('open'))});
    $('nav-menu').addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    document.addEventListener('click',function(e){if(nav.classList.contains('open')&&!nav.contains(e.target))setMenu(false)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){setMenu(false);menuBtn.focus()}});
  }

  // ---------- WhatsApp test mode ----------
  // ?test=1 sends every WhatsApp link to the test number for this browser tab; ?test=0 switches back
  var qs=new URLSearchParams(location.search),testMode=false;
  try{
    if(qs.has('test'))sessionStorage.setItem('bm-test',qs.get('test')==='0'?'':'1');
    testMode=!!sessionStorage.getItem('bm-test');
  }catch(e){testMode=qs.get('test')==='1'}
  if(testMode&&window.WA_TEST){
    window.WA=WA_TEST;
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function(a){a.href=a.href.replace(/wa\.me\/\d+/,'wa.me/'+WA)});
    var tb=document.createElement('div');tb.className='test-badge';
    tb.innerHTML='Test mode · WhatsApp goes to '+waDisplay()+' <a href="?test=0">Exit</a>';
    document.body.appendChild(tb);
  }
  function waDisplay(){var n=WA;return '+'+n.slice(0,3)+' '+n.slice(3,5)+' '+n.slice(5,8)+' '+n.slice(8)}

  // ---------- Start lights intro ----------
  function startHero(){if(hero)hero.classList.add('go')}
  var lights=$('lights');
  if(lights&&root.classList.contains('intro')){
    var lamps=lights.querySelectorAll('.lamps i'),timers=[],done=false;
    var launch=function(){
      if(done)return;done=true;
      timers.forEach(clearTimeout);
      lights.classList.add('launch');
      try{sessionStorage.setItem('bm-intro','1')}catch(e){}
      setTimeout(startHero,150);
      setTimeout(function(){root.classList.remove('intro')},560);
    };
    lamps.forEach(function(l,i){timers.push(setTimeout(function(){l.classList.add('on')},250+i*240))});
    timers.push(setTimeout(function(){lights.classList.add('go')},250+lamps.length*240+300));
    timers.push(setTimeout(launch,250+lamps.length*240+650));
    lights.addEventListener('click',launch);
    addEventListener('keydown',launch,{once:true});
  }else{
    root.classList.remove('intro');
    requestAnimationFrame(startHero);
  }

  // ---------- Reveal + slash-wipe + count-up ----------
  function countUp(el){
    var target=+el.getAttribute('data-count');
    if(reduce){el.textContent=target;return}
    var from=target===0?999:0,t0=null;
    (function step(t){
      if(!t0)t0=t;
      var k=Math.min(1,(t-t0)/1400);
      el.textContent=Math.round(from+(target-from)*(1-Math.pow(1-k,4)));
      if(k<1)requestAnimationFrame(step);
    })(performance.now());
  }
  var io='IntersectionObserver' in window?new IntersectionObserver(function(es){
    var batch=0;
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      if(!reduce)e.target.style.transitionDelay=(batch++*0.08)+'s';
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(e.target);
    });
  },{threshold:.12,rootMargin:'0px 0px -5% 0px'}):null;
  function observe(el){if(io)io.observe(el);else el.classList.add('in')}
  document.querySelectorAll('[data-reveal],[data-wipe]').forEach(observe);

  // ---------- Card tilt + glare ----------
  function bindTilt(el){
    if(!finePointer||reduce)return;
    var g=document.createElement('span');g.className='glare';el.appendChild(g);
    el.addEventListener('pointerenter',function(){el.style.transition='transform .15s ease-out, box-shadow .3s'});
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
      el.style.transform='perspective(900px) rotateX('+((.5-py)*6).toFixed(2)+'deg) rotateY('+((px-.5)*8).toFixed(2)+'deg)';
      el.style.setProperty('--gx',(px*100)+'%');el.style.setProperty('--gy',(py*100)+'%');
    });
    el.addEventListener('pointerleave',function(){el.style.transition='transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .3s';el.style.transform=''});
  }

  document.querySelectorAll('#about .tilt').forEach(bindTilt);

  // ---------- Car card ----------
  function cardHTML(c){
    var manual=/manual/i.test(c.gearbox);
    return '<a class="car tilt" data-wipe href="car.html?c='+c.id+'">'+
      '<div class="ph"><img src="'+carImg(c,c.cover,true)+'" alt="'+esc(c.year+' '+c.make+' '+c.model)+'" loading="lazy" style="'+carPos(c.photos[c.cover])+'">'+
      '<span class="yr">'+c.year+'</span>'+(manual?'<span class="tag">Manual</span>':'')+
      '<span class="select"><svg class="select-icon" viewBox="0 0 86 24" aria-hidden="true"><g class="sl"><path d="M64 9h20M68 13h16M66 17h12"/></g><path class="bd" d="M2 17.5c0-2.6 2-4.4 6.2-5L19 11c3.6-3.4 9.6-6 18-6 7.2 0 12.6 2.4 16.6 5.6l5.6.8c2.4.4 3.8 2 3.8 4.4V19H2z"/><path class="wn" d="M23 11.2c3-2.4 7.4-4 13.6-4h1.2l1.4 4.6zM42 7.4c4 .4 7.4 1.8 9.6 3.8l-8 .6z"/><circle class="wh" cx="14" cy="19" r="4.2"/><circle class="wh" cx="51" cy="19" r="4.2"/><circle class="rm" cx="14" cy="19" r="1.6"/><circle class="rm" cx="51" cy="19" r="1.6"/></svg><span>View Car</span></span></div>'+
      '<div class="body"><div class="mk">'+esc(c.make)+'</div><h3>'+esc(c.model)+'</h3><div class="sub">'+esc(c.sub)+'</div>'+
      '<div class="specs"><span>'+c.year+'</span><span>'+fmtMiles(c)+'</span><span>'+esc(c.gearbox)+'</span></div></div></a>';
  }
  function mountCards(container,list){
    container.innerHTML=list.length?list.map(cardHTML).join(''):'<p class="empty">No cars match. Try another filter.</p>';
    container.querySelectorAll('.car').forEach(function(el){bindTilt(el);observe(el)});
  }

  // ---------- Showroom: "View car" opens a 3D carousel of the car's photos ----------
  // Rotation is a fixed-length eased tween (not a per-frame chase), and the loop only runs while something moves
  var sr=null,srRing,srItems=[],srCar=null,srN=0,srStep=0,srR=0,srAngle=0,srTarget=0,srFront=-1,srRaf=0,srOpener=null,srDrag=null;
  var srFrom=0,srT0=0,srDur=0,SR_MAX=12;
  function easeOut(t){return 1-Math.pow(1-t,3)}
  function buildShowroom(){
    sr=document.createElement('div');
    sr.className='showroom';sr.hidden=true;
    sr.setAttribute('role','dialog');sr.setAttribute('aria-modal','true');sr.setAttribute('aria-labelledby','sr-title');
    sr.innerHTML='<div class="sr-floor" aria-hidden="true"></div>'+
      '<header class="sr-head"><div><div class="kicker" id="sr-make"></div><h2 id="sr-title"></h2><p id="sr-sub"></p></div>'+
      '<button class="sr-close" type="button" aria-label="Close">✕</button></header>'+
      '<div class="sr-scene"><div class="sr-ring"></div></div>'+
      '<footer class="sr-foot"><div class="sr-nav">'+
        '<button class="sr-btn" type="button" data-dir="-1" aria-label="Previous photo">‹</button>'+
        '<span class="sr-count" id="sr-count" aria-live="polite"></span>'+
        '<button class="sr-btn" type="button" data-dir="1" aria-label="Next photo">›</button>'+
        '<span class="sr-hint">Drag or use ← →</span></div>'+
        '<div class="sr-specs" id="sr-specs"></div>'+
        '<a class="btn red nitro" id="sr-details"><span>Full details</span> <span class="arr">→</span></a></footer>';
    document.body.appendChild(sr);
    srRing=sr.querySelector('.sr-ring');
    var scene=sr.querySelector('.sr-scene');
    sr.querySelector('.sr-close').addEventListener('click',closeShowroom);
    sr.querySelectorAll('.sr-btn').forEach(function(b){b.addEventListener('click',function(){turn(+b.dataset.dir)})});
    scene.addEventListener('pointerdown',function(e){
      srDrag={x:e.clientX,a:srAngle,moved:0,target:e.target};
      scene.setPointerCapture(e.pointerId);scene.classList.add('dragging');
    });
    scene.addEventListener('pointermove',function(e){
      if(!srDrag)return;
      var dx=e.clientX-srDrag.x;srDrag.moved=Math.max(srDrag.moved,Math.abs(dx));
      if(srDrag.moved<6)return;
      srAngle=srTarget=srDrag.a+dx*0.28;srDur=0;
      srRender();
    });
    var endDrag=function(){
      if(!srDrag)return;
      var d=srDrag;srDrag=null;scene.classList.remove('dragging');
      if(d.moved<6){
        var fig=d.target.closest&&d.target.closest('.sr-item');
        if(fig){var k=srItems.indexOf(fig);if(k===srFront)location.href=$('sr-details').href;else goTo(k)}
        return;
      }
      spinTo(Math.round(srAngle/srStep)*srStep,280);
    };
    scene.addEventListener('pointerup',endDrag);
    scene.addEventListener('pointercancel',endDrag);
    var wheelT=0;
    scene.addEventListener('wheel',function(e){
      var d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
      if(Math.abs(d)<8)return;
      e.preventDefault();
      var now=performance.now();if(now-wheelT<350)return;wheelT=now;turn(d>0?1:-1);
    },{passive:false});
    addEventListener('keydown',function(e){
      if(sr.hidden)return;
      if(e.key==='Escape')closeShowroom();
      else if(e.key==='ArrowRight'){e.preventDefault();turn(1)}
      else if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}
      else if(e.key==='Tab'){
        var f=[].slice.call(sr.querySelectorAll('button,a[href]')),i=f.indexOf(document.activeElement);
        if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}
        else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}
      }
    });
    addEventListener('resize',function(){if(!sr.hidden)layoutRing()});
  }
  // Desktop: photos stand on a 3D ring. Phones: a cover-flow fan (front photo flat, neighbours angled
  // and stepped back) so the side photos stay on screen without passing through the front one
  var srFlow=false,srW=0;
  function layoutRing(){
    srFlow=innerWidth<700;
    srW=Math.max(180,Math.min(innerWidth*(srFlow?0.66:0.5),620,(innerHeight-260)*1.5));
    srR=srFlow?0:srN<3?srW*0.7:Math.round((srW/2)/Math.tan(Math.PI/srN))+28;
    srRing.style.setProperty('--w',srW+'px');
    if(!srFlow)srItems.forEach(function(f,i){f.style.transform='rotateY('+(i*srStep)+'deg) translateZ('+srR+'px)'});
    if(srItems.length)srRender();
  }
  function spinTo(angle,dur){
    srFrom=srAngle;srTarget=angle;srT0=performance.now();srDur=reduce?0:dur;
    if(!srDur){srAngle=angle;srRender();return}
    srRender();
    cancelAnimationFrame(srRaf);srRaf=requestAnimationFrame(srTick);
  }
  function turn(dir){spinTo(Math.round(srTarget/srStep)*srStep-dir*srStep,420)}
  function goTo(k){var d=((k-srFront)%srN+srN)%srN;if(d>srN/2)d-=srN;turn(d)}
  function srTick(){
    var t=Math.max(0,Math.min(1,(performance.now()-srT0)/srDur));
    srAngle=srFrom+(srTarget-srFrom)*easeOut(t);
    srRender();
    if(t<1)srRaf=requestAnimationFrame(srTick);
  }
  function srRender(){
    if(srFlow){
      srRing.style.transform='rotateX(-4deg)';
      var pos=-srAngle/srStep;
      for(var j=0;j<srN;j++){
        var d=((j-pos)%srN+srN*1.5)%srN-srN/2,a=Math.abs(d),s=d<0?-1:1;
        var near=Math.min(a,1),far=Math.max(Math.min(a,3)-1,0);
        var x=s*(near*0.56+far*0.18)*srW,z=-(near*0.62+far*0.3)*srW;
        srItems[j].style.transform='translate3d('+x.toFixed(1)+'px,0,'+z.toFixed(1)+'px) rotateY('+(s*near*52).toFixed(1)+'deg)';
        srItems[j].style.opacity=a>2.6?'0':(1-a*0.28).toFixed(2);
      }
    }else{
      srRing.style.transform='translate3d(0,0,'+(-srR)+'px) rotateY('+srAngle.toFixed(2)+'deg)';
      for(var i=0;i<srN;i++){
        var rel=((i*srStep+srAngle)%360+540)%360-180;
        srItems[i].style.opacity=(1-Math.min(Math.abs(rel),160)/160*0.8).toFixed(2);
      }
    }
    var f=((Math.round(-srTarget/srStep)%srN)+srN)%srN;
    if(f!==srFront){
      if(srItems[srFront])srItems[srFront].classList.remove('front');
      srFront=f;srItems[f].classList.add('front');
      var img=srItems[f].querySelector('img');
      if(img.dataset.full&&img.getAttribute('src')!==img.dataset.full)img.src=img.dataset.full;
      $('sr-count').textContent=String(f+1).padStart(2,'0')+' / '+String(srN).padStart(2,'0');
    }
  }
  function openShowroom(car,opener){
    if(!sr)buildShowroom();
    srCar=car;srOpener=opener;
    var ph=car.photos.slice(0,SR_MAX),cover=Math.min(car.cover,ph.length-1);
    srN=ph.length;srStep=360/srN;srFront=-1;
    var alt=car.year+' '+car.make+' '+car.model;
    srRing.innerHTML=ph.map(function(p,i){
      return '<figure class="sr-item"><img src="'+esc(p.sm||p.src)+'" data-full="'+esc(p.src)+'" alt="'+esc(alt+', photo '+(i+1))+'" draggable="false" decoding="async" style="'+carPos(p)+'"></figure>';
    }).join('');
    srItems=[].slice.call(srRing.children);
    layoutRing();
    $('sr-make').textContent=car.make;
    $('sr-title').textContent=car.model;
    $('sr-sub').textContent=car.year+(car.sub?' · '+car.sub:'');
    $('sr-specs').innerHTML=[car.year,fmtMiles(car),car.gearbox,car.engine].filter(Boolean).map(function(s){return '<span>'+esc(s)+'</span>'}).join('');
    $('sr-details').href='car.html?c='+encodeURIComponent(car.id);
    var home=-cover*srStep;
    srTarget=home;srAngle=reduce?home:home+60; // short settle-in turn
    sr.hidden=false;document.body.style.overflow='hidden';
    srRender();
    requestAnimationFrame(function(){sr.classList.add('open');spinTo(home,650)});
    sr.querySelector('.sr-close').focus();
  }
  function closeShowroom(){
    sr.classList.remove('open');
    setTimeout(function(){sr.hidden=true;cancelAnimationFrame(srRaf);srRing.innerHTML='';srItems=[]},reduce?0:350);
    document.body.style.overflow='';
    if(srOpener)srOpener.focus({preventScroll:true});
  }
  // on touch screens the first tap only shows the red tag; tapping the tag opens the car
  var touch=window.matchMedia('(hover:none)');
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a.car');
    if(touch.matches&&!(a&&e.target.closest('.select'))){
      document.querySelectorAll('a.car.armed').forEach(function(c){if(c!==a)c.classList.remove('armed')});
      if(a){e.preventDefault();a.classList.add('armed')}
      return;
    }
    if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var id=new URL(a.href,location.href).searchParams.get('c');
    var car=CARS.filter(function(c){return c.id===id})[0];
    if(!car||!car.photos.length)return;
    e.preventDefault();openShowroom(car,a);
  });

  // ---------- "About this car": turn pasted listing text into paragraphs, headings, lists and a spec table ----------
  function aboutHTML(car){
    var text=String(car.about||'').replace(/\r/g,'').trim();
    if(!text)return '';
    var paras=text.split(/\n\s*\n/).map(function(p){return p.trim()}).filter(Boolean);
    // Drop a first line that only repeats the listing title (the panel already shows the name)
    if(paras.length>1&&paras[0].indexOf('\n')<0&&paras[0].length<140&&paras[0].toLowerCase().indexOf(car.make.toLowerCase())>-1)paras.shift();
    var blocks=[];
    paras.forEach(function(p){
      p.split('\n').map(function(l){return l.trim()}).filter(Boolean).forEach(function(line){
        var spaced=line.match(/^(?:[A-Z] ){2,}[A-Z](?: +(?:[A-Z] )*[A-Z])*$/);
        var spec=line.match(/^([A-Z][A-Za-z0-9()&\/.-]*(?: [A-Za-z0-9()&\/.-]+){0,2}):\s+(.+)$/); // short labels only, e.g. "Service history: full"
        var bullet=line.match(/^[•·\-–]\s*(.+)$/);
        if(spaced)blocks.push({t:'h',v:line.replace(/ {2,}/g,'\u0000').replace(/ /g,'').replace(/\u0000/g,' ')});
        else if(spec&&!/^price$/i.test(spec[1].trim()))blocks.push({t:'spec',k:spec[1].trim(),v:spec[2].trim()});
        else if(spec)return;
        else if(bullet)blocks.push({t:'li',v:bullet[1]});
        else if(line.length<48&&!/[.!?,:]$/.test(line)&&line===line.toUpperCase()&&/[A-Z]/.test(line))blocks.push({t:'h',v:line});
        else blocks.push({t:'p',v:line});
      });
    });
    var html='',lead=false,i=0;
    while(i<blocks.length){
      var b=blocks[i];
      if(b.t==='spec'){
        html+='<dl class="about-specs">';
        while(i<blocks.length&&blocks[i].t==='spec'){html+='<div><dt>'+esc(blocks[i].k)+'</dt><dd>'+esc(blocks[i].v)+'</dd></div>';i++}
        html+='</dl>';continue;
      }
      if(b.t==='li'){
        html+='<ul class="about-list">';
        while(i<blocks.length&&blocks[i].t==='li'){html+='<li>'+esc(blocks[i].v)+'</li>';i++}
        html+='</ul>';continue;
      }
      if(b.t==='h')html+='<h3>'+esc(b.v.toLowerCase().replace(/(^|\s)\S/g,function(c){return c.toUpperCase()}))+'</h3>';
      else{
        // "Engine. The oil pan came off…" -> bold the short lead-in label
        var lab=lead&&b.v.match(/^([A-Z][A-Za-z]+(?: [A-Za-z]+){0,2}\.)\s+(.+)$/);
        html+='<p'+(lead?'':' class="intro"')+'>'+(lab?'<b>'+esc(lab[1])+'</b> '+esc(lab[2]):esc(b.v))+'</p>';lead=true;
      }
      i++;
    }
    // Long descriptions open with the first part and a "Read full description" button
    if(text.length>1100){
      var cut=0,len=0,parts=html.split(/(?=<p|<h3|<dl|<ul)/);
      for(cut=0;cut<parts.length&&len<700;cut++)len+=parts[cut].replace(/<[^>]+>/g,'').length;
      if(cut<parts.length-1)
        html=parts.slice(0,cut).join('')+'<div class="about-more" hidden>'+parts.slice(cut).join('')+'</div>'+
          '<button class="about-toggle" type="button" aria-expanded="false">Read full description</button>';
    }
    return '<div class="about-desc">'+html+'</div>';
  }

  // Pages that need the inventory run once it has loaded from Supabase
  function initPages(){

  // ---------- Catalog page ----------
  var grid=$('grid');
  if(grid){
    var FILTERS=[
      {k:'all',label:'All',f:function(){return true}},
      {k:'porsche',label:'Porsche',f:function(c){return c.make==='Porsche'}},
      {k:'mercedes',label:'Mercedes-Benz',f:function(c){return c.make==='Mercedes-Benz'}},
      {k:'american',label:'American',f:function(c){return c.make==='Cadillac'||c.make==='Chevrolet'}},
      {k:'classic',label:'Classics',f:function(c){return c.year<1990}},
      {k:'youngtimer',label:'Youngtimers',f:function(c){return c.year>=1990&&c.year<2010}},
      {k:'modern',label:'2010 +',f:function(c){return c.year>=2010}},
      {k:'manual',label:'Manual',f:function(c){return /manual/i.test(c.gearbox)}}
    ];
    var SORTS={
      featured:function(){return 0},
      'year-asc':function(a,b){return a.year-b.year},
      'year-desc':function(a,b){return b.year-a.year}
    };
    var state={f:'all',s:'featured'};
    try{var saved=JSON.parse(sessionStorage.getItem('bm-garage')||'null');if(saved)state=saved}catch(e){}
    var filters=$('filters'),sortSel=$('sort'),count=$('result-count');
    filters.innerHTML=FILTERS.map(function(f){
      var n=CARS.filter(f.f).length;
      return n?'<button class="chip" type="button" data-k="'+f.k+'" aria-pressed="false"><span>'+f.label+'</span><small>'+n+'</small></button>':'';
    }).join('');
    if(!SORTS[state.s])state.s='featured';
    sortSel.value=state.s;
    var render=function(){
      var f=FILTERS.filter(function(x){return x.k===state.f})[0]||FILTERS[0];
      var list=CARS.filter(f.f).slice().sort(SORTS[state.s]||SORTS.featured);
      filters.querySelectorAll('.chip').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.k===f.k))});
      count.textContent=list.length+(list.length===1?' car':' cars')+(f.k==='all'?' in stock':' · '+f.label);
      mountCards(grid,list);
      try{sessionStorage.setItem('bm-garage',JSON.stringify(state))}catch(e){}
    };
    filters.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;state.f=b.dataset.k;render()});
    sortSel.addEventListener('change',function(){state.s=sortSel.value;render()});
    render();
    var sc=$('stock-count');if(sc)sc.textContent=CARS.length+' in stock';
  }

  // ---------- Enquiry form: builds the message and opens WhatsApp ----------
  var waForm=$('wa-form');
  if(waForm){
    var topic=$('wa-topic'),note=$('wa-note');
    topic.innerHTML='<option>General enquiry</option><option>Selling my car</option><option>Booking a viewing</option>'+
      '<optgroup label="Cars in stock">'+CARS.map(function(c){
        return '<option value="'+esc(c.year+' '+c.make+' '+c.model)+'">'+esc(c.year+' '+c.make+' '+c.model)+'</option>';
      }).join('')+'</optgroup>';
    waForm.addEventListener('submit',function(e){
      e.preventDefault();
      var f=waForm.elements,name=f.name.value.trim(),phone=f.phone.value.trim(),msg=f.message.value.trim();
      f.name.setAttribute('aria-invalid',String(!name));
      if(!name){note.textContent='Please add your name.';note.className='form-note err';f.name.focus();return}
      var lines=['Hello Big Motors,','','Name: '+name];
      if(phone)lines.push('Phone: '+phone);
      lines.push('Regarding: '+topic.value);
      if(msg)lines.push('','Message: '+msg);
      var a=document.createElement('a');
      a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(lines.join('\n'));
      a.target='_blank';a.rel='noopener';
      document.body.appendChild(a);a.click();a.remove();
      note.innerHTML='WhatsApp should now be open with your message. If not, message <b>'+waDisplay()+'</b> directly.';
      note.className='form-note ok';
    });
  }

  // ---------- Car detail page ----------
  var stage=$('stage');
  if(stage){
    var id=new URLSearchParams(location.search).get('c');
    var idx=CARS.findIndex(function(c){return c.id===id});
    if(idx<0){
      document.querySelector('.detail-grid').innerHTML='<div class="gone"><div class="kicker">Not available</div><h2>This car has left the garage.</h2><a class="btn red nitro" href="index.html#garage"><span>See what is in stock</span> <span class="arr">→</span></a></div>';
      $('carnav').remove();
      mountCards($('more'),CARS.slice(0,3));
      return;
    }
    var car=CARS[idx];
    document.title=car.year+' '+car.make+' '+car.model+' · Big Motors Co.';
    $('crumb').textContent=car.make;

    var specs=[['Offer Price',car.price!=null?fmtAED(car.price):'On request'],['Year',car.year],['Mileage',fmtMiles(car)],['Gearbox',car.gearbox],['Engine',car.engine],['Power',car.power],['Drive',car.drive],['Colour',car.colour],['Spec',car.spec]]
      .filter(function(s){return s[1]});
    var msg='Hello Big Motors, I am interested in the '+car.year+' '+car.make+' '+car.model+'.';
    if(/^https?:/.test(location.href))msg+=' '+location.href;
    $('panel').innerHTML=
      '<div><div class="kicker">'+esc(car.make)+'</div><h1>'+esc(car.model)+'</h1><p class="sub">'+car.year+' · '+esc(car.sub)+'</p></div>'+
      
      '<dl class="spec-list">'+specs.map(function(s){return '<div><dt>'+s[0]+'</dt><dd>'+esc(s[1])+'</dd></div>'}).join('')+'</dl>'+
      '<a class="btn red nitro" href="https://wa.me/'+WA+'?text='+encodeURIComponent(msg)+'" target="_blank" rel="noopener"><span class="wa-ico" aria-hidden="true"></span><span>Enquire on WhatsApp</span> <span class="arr">→</span></a>'+
      '<p class="fine">Viewing in Dubai by appointment</p>';
    $('car-about').innerHTML=
      '<div><div class="kicker">About this car</div>'+aboutHTML(car)+
      (car.note?'<div class="note"><b>Please note</b>'+esc(car.note)+'</div>':'')+'</div>'+
      '<ul class="points">'+car.points.map(function(p){return '<li><span>'+esc(p)+'</span></li>'}).join('')+'</ul>';

    var tog=$('car-about').querySelector('.about-toggle');
    if(tog)tog.addEventListener('click',function(){
      var more=$('car-about').querySelector('.about-more'),open=more.hidden;
      more.hidden=!open;tog.setAttribute('aria-expanded',String(open));tog.textContent=open?'Show less':'Read full description';
    });
    var prev=CARS[(idx-1+CARS.length)%CARS.length],next=CARS[(idx+1)%CARS.length];
    $('carnav').innerHTML=
      '<a href="car.html?c='+prev.id+'"><span class="k">◀ Previous car</span><b>'+esc(prev.make+' '+prev.model)+'</b></a>'+
      '<a class="nx" href="car.html?c='+next.id+'"><span class="k">Next car ▶</span><b>'+esc(next.make+' '+next.model)+'</b></a>';
    var others=CARS.filter(function(c){return c!==car});
    others.sort(function(a,b){return (b.make===car.make)-(a.make===car.make)});
    mountCards($('more'),others.slice(0,3));

    // Gallery
    var n=car.photos.length,cur=car.cover,main=$('main-img'),thumbs=$('thumbs'),lb=$('lightbox'),lbImg=$('lb-img');
    var alt=car.year+' '+car.make+' '+car.model;
    thumbs.innerHTML=Array.from({length:n},function(_,i){
      return '<button type="button" data-i="'+i+'" aria-label="Photo '+(i+1)+'"><img src="'+carImg(car,i,true)+'" alt="" loading="lazy" style="'+carPos(car.photos[i])+'"></button>';
    }).join('');
    var show=function(i,dir){
      cur=(i+n)%n;
      main.src=carImg(car,cur);main.alt=alt+', photo '+(cur+1);
      lbImg.src=main.src;lbImg.alt=main.alt;
      $('g-count').textContent=$('lb-count').textContent=String(cur+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
      if(dir&&!reduce){main.classList.remove('swap-next','swap-prev');void main.offsetWidth;main.classList.add(dir>0?'swap-next':'swap-prev')}
      thumbs.querySelectorAll('button').forEach(function(b,j){
        b.setAttribute('aria-current',String(j===cur));
        if(j===cur&&dir)b.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce?'auto':'smooth'});
      });
      [cur+1,cur-1].forEach(function(j){new Image().src=carImg(car,(j+n)%n)});
    };
    show(cur);
    $('g-prev').onclick=$('lb-prev').onclick=function(e){e.stopPropagation();show(cur-1,-1)};
    $('g-next').onclick=$('lb-next').onclick=function(e){e.stopPropagation();show(cur+1,1)};
    thumbs.addEventListener('click',function(e){var b=e.target.closest('button');if(b){var i=+b.dataset.i;show(i,i>cur?1:-1)}});
    var openLb=function(){lb.hidden=false;document.body.style.overflow='hidden';$('lb-close').focus()};
    var closeLb=function(){lb.hidden=true;document.body.style.overflow='';$('g-expand').focus()};
    $('g-expand').onclick=function(e){e.stopPropagation();openLb()};
    stage.addEventListener('click',function(e){if(e.target===main)openLb()});
    $('lb-close').onclick=closeLb;
    lb.addEventListener('click',function(e){if(e.target===lb)closeLb()});
    addEventListener('keydown',function(e){
      if(sr&&!sr.hidden)return;
      if(e.key==='ArrowRight')show(cur+1,1);
      else if(e.key==='ArrowLeft')show(cur-1,-1);
      else if(e.key==='Escape'&&!lb.hidden)closeLb();
    });
    var sx=null;
    [stage,lb].forEach(function(el){
      el.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
      el.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)show(cur+(dx<0?1:-1),dx<0?1:-1);sx=null});
    });
  }

  }

  var grid0=$('grid'),stage0=$('stage');
  if(grid0)grid0.innerHTML='<p class="empty">Loading the garage…</p>';
  loadCars().then(function(list){CARS=list;initPages()},function(){
    var msg='<p class="empty">We could not load the cars just now. Please refresh, or message us on WhatsApp.</p>';
    if(grid0)grid0.innerHTML=msg;
    if(stage0)$('panel').innerHTML=msg;
  });

  // ---------- Speed: scroll velocity drives streaks, HUD and ticker ----------
  var lastY=scrollY,vel=0,mouseBoost=0;
  if(hero)addEventListener('pointermove',function(e){
    if(e.clientY<hero.getBoundingClientRect().bottom)mouseBoost=Math.min(1,mouseBoost+.04);
  },{passive:true});

  var cv=$('streaks'),ctx=cv&&cv.getContext('2d'),W=0,H=0,dpr=Math.min(devicePixelRatio||1,1.5),stars=[],heroOn=!!hero;
  function size(){W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
  function spawn(s){s.a=Math.random()*Math.PI*2;s.r=Math.random()*40+10;s.v=Math.random()*2+1;s.red=Math.random()<.18;return s}
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
      var s=stars[i],grow=1+s.r/120,r0=s.r;
      s.r+=s.v*grow*speed;
      var len=Math.min(220,s.v*grow*speed*7);
      var alpha=Math.min(.55,s.r/max)*(.35+speed*.12);
      ctx.strokeStyle=s.red?'rgba(255,60,70,'+alpha+')':'rgba(255,255,255,'+alpha+')';
      ctx.lineWidth=Math.min(2.4,.4+s.r/400);
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(s.a)*r0,cy+Math.sin(s.a)*r0*.62);
      ctx.lineTo(cx+Math.cos(s.a)*(r0+len),cy+Math.sin(s.a)*(r0+len)*.62);
      ctx.stroke();
      if(s.r>max)spawn(s);
    }
  }

  // Speedometer (desktop): 0-320 km/h dial with ticks, red zone, needle, digital readout, gear and page-progress bar
  var hud=$('hud'),hudFill,hudSpeed,hudNitro,hudNeedle,hudGear,shownKmh=0,HUD_MAX=320;
  function hudPt(v,r){var a=(-135+v/HUD_MAX*270)*Math.PI/180;return [(100+r*Math.sin(a)).toFixed(1),(100-r*Math.cos(a)).toFixed(1)]}
  function hudArc(v0,v1,r){var p0=hudPt(v0,r),p1=hudPt(v1,r),big=(v1-v0)/HUD_MAX*270>180?1:0;return 'M'+p0[0]+' '+p0[1]+' A'+r+' '+r+' 0 '+big+' 1 '+p1[0]+' '+p1[1]}
  if(hud){
    var ticks='';
    for(var v=0;v<=HUD_MAX;v+=10){
      var major=v%40===0,a=hudPt(v,84),b=hudPt(v,major?70:77);
      ticks+='<line class="'+(major?'mj':'mn')+(v>=260?' hot':'')+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';
      if(major){var t=hudPt(v,58);ticks+='<text class="lb" x="'+t[0]+'" y="'+t[1]+'">'+v+'</text>'}
    }
    hud.innerHTML='<svg viewBox="0 0 200 200">'+
      '<path class="hud-track" d="'+hudArc(0,HUD_MAX,91)+'"/>'+
      '<path class="hud-red" d="'+hudArc(260,HUD_MAX,91)+'"/>'+
      '<path class="hud-fill" id="hud-fill" pathLength="100" d="'+hudArc(0,HUD_MAX,91)+'"/>'+
      ticks+
      '<g class="hud-needle" id="hud-needle"><path d="M100 26 L104 100 L96 100Z"/></g><circle class="hud-hub" cx="100" cy="100" r="9"/>'+
      '<text class="hud-speed" id="hud-speed" x="100" y="146">000</text><text class="hud-unit" x="100" y="160">km/h</text>'+
      '<text class="hud-gear" id="hud-gear" x="100" y="184">N</text></svg>'+
      '<div class="hud-nitro"><i id="hud-nitro"></i></div>';
    hudFill=$('hud-fill');hudSpeed=$('hud-speed');hudNitro=$('hud-nitro');hudNeedle=$('hud-needle');hudGear=$('hud-gear');
  }
  var ticker=$('ticker'),tickX=0;

  function frame(){
    if(sr&&!sr.hidden){requestAnimationFrame(frame);return} // keep the showroom smooth
    var y=scrollY,dy=Math.abs(y-lastY);lastY=y;
    vel+=(dy-vel)*.12;
    mouseBoost*=.96;
    // The gauge only moves when the visitor scrolls, so it runs with reduced motion too
    if(hud&&hudSpeed){
      var kmh=Math.min(HUD_MAX,Math.round(vel*9));
      shownKmh+=(kmh-shownKmh)*(reduce?1:.2);
      var k=Math.round(shownKmh);
      hudSpeed.textContent=('00'+k).slice(-3);
      hudFill.style.strokeDasharray=(shownKmh/HUD_MAX*100).toFixed(1)+' 100';
      hudNeedle.style.transform='rotate('+(-135+shownKmh/HUD_MAX*270).toFixed(1)+'deg)';
      hudGear.textContent=k<3?'N':String(Math.min(6,1+Math.floor(k/55)));
      var max=root.scrollHeight-innerHeight;
      hudNitro.style.width=(max>0?y/max*100:0).toFixed(1)+'%';
    }
    if(!reduce){
      if(ctx&&heroOn)drawStreaks(1+Math.min(vel,60)*.12+mouseBoost*2.5);
      if(ticker){
        var half=ticker.scrollWidth/2;
        tickX-=.6+Math.min(vel,80)*.25;
        if(-tickX>=half)tickX+=half;
        ticker.style.transform='translateX('+tickX+'px)';
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var yr=$('yr');if(yr)yr.textContent=new Date().getFullYear();
})();
