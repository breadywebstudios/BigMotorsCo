(function(){
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CARS=[];
  var hero=document.getElementById('hero');
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

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

  // Hero video: some browsers block autoplay until play() is called explicitly
  var hv=document.querySelector('.hero-video');
  if(hv){hv.muted=true;var p=hv.play();if(p&&p.catch)p.catch(function(){})}

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
      '<div class="ph"><img src="'+carImg(c,c.cover,true)+'" alt="'+esc(c.year+' '+c.make+' '+c.model)+'" loading="lazy">'+
      '<span class="yr">'+c.year+'</span>'+(manual?'<span class="tag">Manual</span>':'')+
      '<span class="select">View car ▶</span></div>'+
      '<div class="body"><div class="mk">'+esc(c.make)+'</div><h3>'+esc(c.model)+'</h3><div class="sub">'+esc(c.sub)+'</div>'+
      '<div class="specs"><span>'+c.year+'</span><span>'+fmtMiles(c)+'</span><span>'+esc(c.gearbox)+'</span></div></div></a>';
  }
  function mountCards(container,list){
    container.innerHTML=list.length?list.map(cardHTML).join(''):'<p class="empty">No cars match. Try another filter.</p>';
    container.querySelectorAll('.car').forEach(function(el){bindTilt(el);observe(el)});
  }

  // ---------- Showroom: "View car" opens a 3D carousel of the car's photos ----------
  var sr=null,srRing,srItems=[],srCar=null,srN=0,srStep=0,srR=0,srAngle=0,srTarget=0,srFront=-1,srRaf=0,srLast=0,srOpener=null,srDrag=null;
  var SR_MAX=12;
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
      srDrag={x:e.clientX,a:srTarget,moved:0,target:e.target};
      scene.setPointerCapture(e.pointerId);scene.classList.add('dragging');
    });
    scene.addEventListener('pointermove',function(e){
      if(!srDrag)return;
      var dx=e.clientX-srDrag.x;srDrag.moved=Math.max(srDrag.moved,Math.abs(dx));
      srTarget=srDrag.a+dx*0.28;srLast=performance.now();
    });
    var endDrag=function(){
      if(!srDrag)return;
      var d=srDrag;srDrag=null;scene.classList.remove('dragging');
      if(d.moved<6){
        var fig=d.target.closest&&d.target.closest('.sr-item');
        if(fig){var k=srItems.indexOf(fig);if(k===srFront)location.href=$('sr-details').href;else goTo(k)}
      }
      srTarget=Math.round(srTarget/srStep)*srStep;srLast=performance.now();
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
  function layoutRing(){
    var w=Math.max(200,Math.min(innerWidth*(innerWidth<700?0.78:0.5),620,(innerHeight-260)*1.5));
    srR=srN<3?w*0.7:Math.round((w/2)/Math.tan(Math.PI/srN))+28;
    srRing.style.setProperty('--w',w+'px');
    srItems.forEach(function(f,i){f.style.transform='rotateY('+(i*srStep)+'deg) translateZ('+srR+'px)'});
  }
  function turn(dir){srTarget=Math.round(srTarget/srStep)*srStep-dir*srStep;srLast=performance.now()}
  function goTo(k){var d=((k-srFront)%srN+srN)%srN;if(d>srN/2)d-=srN;turn(d)}
  function srTick(now){
    srAngle+=(srTarget-srAngle)*(reduce?1:0.08);
    srRing.style.transform='translateZ('+(-srR)+'px) rotateY('+srAngle.toFixed(2)+'deg)';
    for(var i=0;i<srN;i++){
      var rel=((i*srStep+srAngle)%360+540)%360-180;
      srItems[i].style.opacity=(1-Math.min(Math.abs(rel),160)/160*0.8).toFixed(2);
    }
    var f=((Math.round(-srTarget/srStep)%srN)+srN)%srN;
    if(f!==srFront){
      if(srItems[srFront])srItems[srFront].classList.remove('front');
      srFront=f;srItems[f].classList.add('front');
      var img=srItems[f].querySelector('img');
      if(img.dataset.full&&img.getAttribute('src')!==img.dataset.full)img.src=img.dataset.full;
      $('sr-count').textContent=String(f+1).padStart(2,'0')+' / '+String(srN).padStart(2,'0');
    }
    if(!reduce&&!srDrag&&now-srLast>3800)turn(1);
    srRaf=requestAnimationFrame(srTick);
  }
  function openShowroom(car,opener){
    if(!sr)buildShowroom();
    srCar=car;srOpener=opener;
    var ph=car.photos.slice(0,SR_MAX),cover=Math.min(car.cover,ph.length-1);
    srN=ph.length;srStep=360/srN;srFront=-1;
    var alt=car.year+' '+car.make+' '+car.model;
    srRing.innerHTML=ph.map(function(p,i){
      return '<figure class="sr-item"><img src="'+esc(p.sm||p.src)+'" data-full="'+esc(p.src)+'" alt="'+esc(alt+', photo '+(i+1))+'" draggable="false"></figure>';
    }).join('');
    srItems=[].slice.call(srRing.children);
    layoutRing();
    $('sr-make').textContent=car.make;
    $('sr-title').textContent=car.model;
    $('sr-sub').textContent=car.year+(car.sub?' · '+car.sub:'');
    $('sr-specs').innerHTML=[car.year,fmtMiles(car),car.gearbox,car.engine].filter(Boolean).map(function(s){return '<span>'+esc(s)+'</span>'}).join('');
    $('sr-details').href='car.html?c='+encodeURIComponent(car.id);
    srTarget=-cover*srStep;
    srAngle=reduce?srTarget:srTarget+300; // spin in
    srLast=performance.now()+1200;
    sr.hidden=false;document.body.style.overflow='hidden';
    requestAnimationFrame(function(){sr.classList.add('open')});
    cancelAnimationFrame(srRaf);srRaf=requestAnimationFrame(srTick);
    sr.querySelector('.sr-close').focus();
  }
  function closeShowroom(){
    sr.classList.remove('open');
    setTimeout(function(){sr.hidden=true;cancelAnimationFrame(srRaf);srRing.innerHTML='';srItems=[]},reduce?0:350);
    document.body.style.overflow='';
    if(srOpener)srOpener.focus({preventScroll:true});
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a.car');
    if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var id=new URL(a.href,location.href).searchParams.get('c');
    var car=CARS.filter(function(c){return c.id===id})[0];
    if(!car||!car.photos.length)return;
    e.preventDefault();openShowroom(car,a);
  });

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

    var specs=[['Year',car.year],['Mileage',fmtMiles(car)],['Gearbox',car.gearbox],['Engine',car.engine],['Power',car.power],['Drive',car.drive],['Colour',car.colour],['Spec',car.spec]]
      .filter(function(s){return s[1]});
    var msg='Hello Big Motors, I am interested in the '+car.year+' '+car.make+' '+car.model+'.';
    if(/^https?:/.test(location.href))msg+=' '+location.href;
    $('panel').innerHTML=
      '<div><div class="kicker">'+esc(car.make)+'</div><h1>'+esc(car.model)+'</h1><p class="sub">'+car.year+' · '+esc(car.sub)+'</p></div>'+
      '<div class="poa"><small>Price</small>On request</div>'+
      '<dl class="spec-list">'+specs.map(function(s){return '<div><dt>'+s[0]+'</dt><dd>'+esc(s[1])+'</dd></div>'}).join('')+'</dl>'+
      '<a class="btn red nitro" href="https://wa.me/'+WA+'?text='+encodeURIComponent(msg)+'" target="_blank" rel="noopener"><span>Enquire on WhatsApp</span> <span class="arr">→</span></a>'+
      '<p class="fine">Viewing in Dubai by appointment</p>';
    $('about').innerHTML=
      '<div><div class="kicker">About this car</div><p class="lead">'+esc(car.about)+'</p>'+
      (car.note?'<div class="note"><b>Please note</b>'+esc(car.note)+'</div>':'')+'</div>'+
      '<ul class="points">'+car.points.map(function(p){return '<li><span>'+esc(p)+'</span></li>'}).join('')+'</ul>';

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
      return '<button type="button" data-i="'+i+'" aria-label="Photo '+(i+1)+'"><img src="'+carImg(car,i,true)+'" alt="" loading="lazy"></button>';
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

  var hud=$('hud'),hudFill=$('hud-fill'),hudSpeed=$('hud-speed'),hudNitro=$('hud-nitro'),shownKmh=0;
  var ticker=$('ticker'),tickX=0;

  function frame(){
    var y=scrollY,dy=Math.abs(y-lastY);lastY=y;
    vel+=(dy-vel)*.12;
    mouseBoost*=.96;
    if(!reduce){
      if(ctx&&heroOn)drawStreaks(1+Math.min(vel,60)*.12+mouseBoost*2.5);
      if(hud){
        var kmh=Math.min(320,Math.round(vel*9));
        shownKmh+=(kmh-shownKmh)*.2;
        hudSpeed.textContent=('00'+Math.round(shownKmh)).slice(-3);
        hudFill.style.strokeDasharray=(shownKmh/320*75).toFixed(1)+' 100';
        hud.classList.toggle('on',y>innerHeight*.4);
        var max=root.scrollHeight-innerHeight;
        hudNitro.style.width=(max>0?y/max*100:0).toFixed(1)+'%';
      }
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
