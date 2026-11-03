(function(){
  var sb=supabase.createClient(SB_URL,SB_KEY);
  var BUCKET='bigmotors',PUB=SB_URL+'/storage/v1/object/public/'+BUCKET+'/';
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pathOf(u){return u&&u.indexOf(PUB)===0?decodeURIComponent(u.slice(PUB.length)):null}
  function slug(s){return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'')}

  var VIEWS=['login-view','reset-view','denied-view','list-view','edit-view'];
  function show(id){VIEWS.forEach(function(v){$(v).hidden=v!==id});scrollTo(0,0)}
  var toastT;
  function toast(text,err){var t=$('toast');t.textContent=text;t.className='toast'+(err?' err':'');t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},err?6000:2600)}
  function msg(el,text,kind){el.textContent=text||'';el.className='msg'+(kind?' '+kind:'')}
  function busy(btn,on){btn.disabled=on}

  var cars=[],me=null;

  // ---------- Auth ----------
  sb.auth.onAuthStateChange(function(event,session){
    // Supabase advises not to await other calls inside this callback
    setTimeout(function(){
      if(event==='PASSWORD_RECOVERY'){show('reset-view');return}
      route(session);
    },0);
  });

  function route(session){
    if(!session){me=null;$('who').hidden=true;show('login-view');return}
    me=(session.user.email||'').toLowerCase();
    $('who-email').textContent=me;$('who').hidden=false;
    if(!$('edit-view').hidden||!$('reset-view').hidden)return;
    sb.rpc('bm_is_admin').then(function(r){
      if(r.error||!r.data){show('denied-view');return}
      show('list-view');loadCars();loadAdmins();
    });
  }

  var loginForm=$('login-form');
  loginForm.addEventListener('submit',function(e){
    e.preventDefault();
    var btn=loginForm.querySelector('button');busy(btn,true);msg($('login-msg'),'Signing in…');
    sb.auth.signInWithPassword({email:loginForm.email.value.trim(),password:loginForm.password.value}).then(function(r){
      busy(btn,false);
      if(r.error)msg($('login-msg'),r.error.message==='Invalid login credentials'?'Wrong email or password.':r.error.message,'err');
      else msg($('login-msg'),'');
    });
  });
  $('forgot').addEventListener('click',function(){
    var email=loginForm.email.value.trim();
    if(!email){msg($('login-msg'),'Type your email above first.','err');loginForm.email.focus();return}
    sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}).then(function(r){
      msg($('login-msg'),r.error?r.error.message:'If that email has an account, a reset link is on its way.',r.error?'err':'ok');
    });
  });
  $('signup').addEventListener('click',function(){
    var email=loginForm.email.value.trim(),pw=loginForm.password.value;
    if(!email||pw.length<8){msg($('login-msg'),'Enter your email and a password of at least 8 characters, then press this again.','err');return}
    sb.auth.signUp({email:email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}}).then(function(r){
      if(r.error)msg($('login-msg'),r.error.message,'err');
      else if(!r.data.session)msg($('login-msg'),'Check your email to confirm the account, then sign in here.','ok');
    });
  });
  $('reset-form').addEventListener('submit',function(e){
    e.preventDefault();
    sb.auth.updateUser({password:e.target.password.value}).then(function(r){
      if(r.error){msg($('reset-msg'),r.error.message,'err');return}
      toast('Password saved');$('reset-view').hidden=true;
      sb.auth.getSession().then(function(s){route(s.data.session)});
    });
  });
  $('sign-out').addEventListener('click',function(){
    if(dirty&&!confirm('You have unsaved changes. Sign out anyway?'))return;
    discardUploads();dirty=false;sb.auth.signOut();
  });

  // ---------- Car list ----------
  function loadCars(){
    return sb.from('bm_cars').select('*').order('sort_order').order('year',{ascending:false}).then(function(r){
      if(r.error){toast('Could not load cars: '+r.error.message,true);return}
      cars=r.data;renderList();
    });
  }
  function mileage(c){return c.km!=null?c.km.toLocaleString('en-US')+' km':c.mi!=null?c.mi.toLocaleString('en-US')+' mi':'—'}
  function renderList(){
    var live=cars.filter(function(c){return c.published&&c.photos.length}).length;
    $('count').textContent=cars.length+' cars · '+live+' on the website';
    $('car-rows').innerHTML=cars.map(function(c,i){
      var p=c.photos[c.cover]||c.photos[0];
      return '<tr class="'+(c.published?'':'off')+'" data-id="'+esc(c.id)+'">'+
        '<td><div class="order"><button type="button" data-move="-1" aria-label="Move up"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-move="1" aria-label="Move down"'+(i===cars.length-1?' disabled':'')+'>▼</button></div></td>'+
        '<td>'+(p?'<img class="thumb" src="'+esc(p.sm||p.src)+'" alt="">':'<div class="thumb"></div>')+'</td>'+
        '<td class="name"><b>'+esc(c.year+' '+c.make+' '+c.model)+'</b><span>'+esc(c.sub)+'</span></td>'+
        '<td class="mono">'+mileage(c)+'</td>'+
        '<td class="mono">'+(c.price!=null?'AED '+Number(c.price).toLocaleString('en-US'):'—')+'</td>'+
        '<td class="mono">'+c.photos.length+(c.photos.length?'':' <small>(hidden)</small>')+'</td>'+
        '<td><label class="switch" title="Show on website"><input type="checkbox" data-pub'+(c.published?' checked':'')+' aria-label="Show '+esc(c.make+' '+c.model)+' on the website"><span></span></label></td>'+
        '<td><button class="btn ghost sm" type="button" data-edit>Edit</button></td></tr>';
    }).join('')||'<tr><td colspan="8" class="muted">No cars yet. Add the first one.</td></tr>';
  }
  $('car-rows').addEventListener('click',function(e){
    var tr=e.target.closest('tr[data-id]');if(!tr)return;
    var i=cars.findIndex(function(c){return c.id===tr.dataset.id});
    if(e.target.closest('[data-edit]'))openEditor(cars[i]);
    var mv=e.target.closest('[data-move]');
    if(mv)move(i,+mv.dataset.move);
  });
  $('car-rows').addEventListener('change',function(e){
    if(!e.target.matches('[data-pub]'))return;
    var id=e.target.closest('tr').dataset.id,on=e.target.checked;
    sb.from('bm_cars').update({published:on}).eq('id',id).then(function(r){
      if(r.error){toast(r.error.message,true);e.target.checked=!on;return}
      cars.find(function(c){return c.id===id}).published=on;renderList();
      toast(on?'Now showing on the website':'Hidden from the website');
    });
  });
  function move(i,d){
    var j=i+d;if(j<0||j>=cars.length)return;
    var t=cars[i];cars[i]=cars[j];cars[j]=t;
    var ups=[];
    cars.forEach(function(c,k){var o=(k+1)*10;if(c.sort_order!==o){c.sort_order=o;ups.push(sb.from('bm_cars').update({sort_order:o}).eq('id',c.id))}});
    renderList();
    Promise.all(ups).then(function(rs){var bad=rs.filter(function(r){return r.error});if(bad.length){toast('Could not save the new order',true);loadCars()}});
  }
  $('add-car').addEventListener('click',function(){openEditor(null)});

  // ---------- Admins ----------
  function loadAdmins(){
    sb.from('bm_admins').select('email').order('created_at').then(function(r){
      if(r.error)return;
      $('admin-list').innerHTML=r.data.map(function(a){
        var self=a.email===me;
        return '<li><span>'+esc(a.email)+(self?' <small>(you)</small>':'')+'</span>'+(self?'':'<button class="link" type="button" data-remove="'+esc(a.email)+'">Remove</button>')+'</li>';
      }).join('');
    });
  }
  $('admin-list').addEventListener('click',function(e){
    var b=e.target.closest('[data-remove]');if(!b)return;
    if(!confirm('Remove '+b.dataset.remove+' as an admin?'))return;
    sb.from('bm_admins').delete().eq('email',b.dataset.remove).then(function(r){if(r.error)toast(r.error.message,true);else{toast('Admin removed');loadAdmins()}});
  });
  $('admin-form').addEventListener('submit',function(e){
    e.preventDefault();
    var email=e.target.email.value.trim().toLowerCase();
    sb.from('bm_admins').insert({email:email}).then(function(r){
      if(r.error){toast(r.error.code==='23505'?'Already an admin':r.error.message,true);return}
      e.target.reset();toast('Admin added. They can now sign in with that email.');loadAdmins();
    });
  });

  // ---------- Editor ----------
  var form=$('car-form'),editing=null,photos=[],cover=0,origPaths=[],sessionUploads=[],dirty=false;
  var FIELDS=['make','model','year','sub','gearbox','engine','power','drive','colour','spec','about','note'];

  function openEditor(car){
    editing=car;dirty=false;sessionUploads=[];
    form.reset();
    $('edit-title').textContent=car?car.year+' '+car.make+' '+car.model:'New car';
    FIELDS.forEach(function(f){form[f].value=car&&car[f]!=null?car[f]:''});
    form.points.value=car?(car.points||[]).join('\n'):'';
    form.price.value=car&&car.price!=null?car.price:'';
    form.mileage.value=car?(car.km!=null?car.km:car.mi!=null?car.mi:''):'';
    form.unit.value=car&&car.km==null&&car.mi!=null?'mi':'km';
    form.slug.value=car?car.id:'';form.slug.readOnly=!!car;
    form.published.checked=car?car.published:true;
    photos=car?car.photos.map(function(p){var q={src:p.src,sm:p.sm};if(p.fx!=null){q.fx=p.fx;q.fy=p.fy}return q}):[];
    cover=car?car.cover:0;
    origPaths=collectPaths(photos);
    $('danger').hidden=!car;
    form.querySelectorAll('[aria-invalid]').forEach(function(el){el.removeAttribute('aria-invalid')});
    msg($('upload-msg'),'');
    renderPhotos();show('edit-view');
  }
  function collectPaths(list){var out=[];list.forEach(function(p){[p.src,p.sm].forEach(function(u){var x=pathOf(u);if(x)out.push(x)})});return out}

  form.addEventListener('input',function(e){
    dirty=true;
    if(!editing&&(e.target.name==='make'||e.target.name==='model'||e.target.name==='year')&&!form.slug.dataset.touched)
      form.slug.value=slug([form.year.value,form.make.value,form.model.value].join(' '));
    if(e.target.name==='slug')form.slug.dataset.touched='1';
  });
  addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue=''}});

  function renderPhotos(){
    if(cover>=photos.length)cover=0;
    $('photo-count').textContent=photos.length?'('+photos.length+')':'';
    $('photos').innerHTML=photos.map(function(p,i){
      return '<div class="ph'+(i===cover?' cover':'')+'" data-i="'+i+'"><img src="'+esc(p.sm||p.src)+'" alt="Photo '+(i+1)+'" loading="lazy" style="'+carPos(p)+'">'+(i===cover?'<span class="badge">Cover</span>':'')+(p.fx!=null?'<span class="badge crop">Cropped</span>':'')+
        '<div class="ph-tools"><button type="button" data-act="left" aria-label="Move left"'+(i===0?' disabled':'')+'>◀</button>'+
        '<button type="button" data-act="cover" aria-label="Make cover"'+(i===cover?' disabled':'')+'>★</button>'+
        '<button type="button" data-act="crop" aria-label="Adjust crop" title="Adjust crop">✥</button>'+
        '<button type="button" data-act="zoom" aria-label="Zoom in and add as a new photo" title="Zoom in and add as a new photo">⊕</button>'+
        '<button type="button" data-act="fx" aria-label="Blur background and vignette" title="Blur background and vignette">◐</button>'+
        '<button type="button" data-act="right" aria-label="Move right"'+(i===photos.length-1?' disabled':'')+'>▶</button>'+
        '<button type="button" class="del" data-act="del" aria-label="Remove photo">✕</button></div></div>';
    }).join('');
  }
  $('photos').addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    var i=+b.closest('.ph').dataset.i,act=b.dataset.act,c=photos[cover];
    if(act==='crop'){openCrop(i);return}
    if(act==='zoom'){openZoom(i);return}
    if(act==='fx'){openFx(i);return}
    if(act==='cover')cover=i;
    else if(act==='del'){photos.splice(i,1);if(i===cover)cover=0;else cover=photos.indexOf(c)}
    else{var j=i+(act==='left'?-1:1),t=photos[i];photos[i]=photos[j];photos[j]=t;cover=photos.indexOf(c)}
    dirty=true;renderPhotos();
  });

  // ---------- Crop focus: which part of a photo stays visible where the site crops it ----------
  var cropI=-1,cfx=50,cfy=50,cropDrag=false;
  var cropArea=$('crop-area'),cropImg=$('crop-img'),cropDot=$('crop-dot'),cropPrev=$('crop-preview');
  function openCrop(i){
    var p=photos[i];cropI=i;
    cfx=p.fx!=null?p.fx:50;cfy=p.fy!=null?p.fy:50;
    cropImg.src=p.src;cropPrev.src=p.sm||p.src;
    drawCrop();$('crop-modal').hidden=false;cropArea.focus();
  }
  function drawCrop(){
    cropDot.style.left=cfx+'%';cropDot.style.top=cfy+'%';
    cropPrev.style.objectPosition=cfx+'% '+cfy+'%';
    $('crop-val').textContent=Math.round(cfx)+'% across, '+Math.round(cfy)+'% down';
  }
  function cropAt(e){
    var r=cropImg.getBoundingClientRect();
    cfx=Math.round(Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)));
    cfy=Math.round(Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100)));
    drawCrop();
  }
  cropArea.addEventListener('pointerdown',function(e){cropDrag=true;cropArea.setPointerCapture(e.pointerId);cropAt(e)});
  cropArea.addEventListener('pointermove',function(e){if(cropDrag)cropAt(e)});
  cropArea.addEventListener('pointerup',function(){cropDrag=false});
  cropArea.addEventListener('keydown',function(e){
    var k={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[e.key];
    if(!k)return;e.preventDefault();
    cfx=Math.min(100,Math.max(0,cfx+k[0]));cfy=Math.min(100,Math.max(0,cfy+k[1]));drawCrop();
  });
  function closeCrop(){$('crop-modal').hidden=true;cropI=-1}
  $('crop-reset').addEventListener('click',function(){cfx=50;cfy=50;drawCrop()});
  $('crop-cancel').addEventListener('click',closeCrop);
  $('crop-apply').addEventListener('click',function(){
    var p=photos[cropI];
    if(cfx===50&&cfy===50){delete p.fx;delete p.fy}else{p.fx=cfx;p.fy=cfy}
    dirty=true;closeCrop();renderPhotos();
    msg($('upload-msg'),'Crop updated. Remember to save.','ok');
  });
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('crop-modal').hidden)closeCrop()});

  // Resize in the browser before upload: 1600px for the gallery, 640px for cards
  function loadBitmap(file){
    if(window.createImageBitmap)return createImageBitmap(file,{imageOrientation:'from-image'}).catch(function(){return viaImg(file)});
    return viaImg(file);
  }
  function viaImg(file){return new Promise(function(res,rej){var img=new Image();img.onload=function(){res(img)};img.onerror=rej;img.src=URL.createObjectURL(file)})}
  function toJpeg(bmp,max,q){
    var w=bmp.width,h=bmp.height,k=Math.min(1,max/w);
    var c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    return new Promise(function(res){c.toBlob(res,'image/jpeg',q)});
  }
  // ---------- Zoom: frame a detail of a photo and add it to the gallery as a new photo ----------
  var zI=-1,zImg=new Image(),zScale=1,zBase=1,zX=0,zY=0,zDrag=null,zFW=0,zFH=0;
  var zFrame=$('zoom-frame'),zView=$('zoom-img'),zRange=$('zoom-range');
  zImg.crossOrigin='anonymous';
  function openZoom(i){
    zI=i;$('zoom-modal').hidden=false;$('zoom-add').disabled=true;
    msg($('zoom-msg'),'Loading the full-size photo…');
    zImg.onload=function(){
      zView.src=zImg.src;
      zFW=zFrame.clientWidth;zFH=zFrame.clientHeight;
      zBase=Math.max(zFW/zImg.naturalWidth,zFH/zImg.naturalHeight);
      zRange.value=1.5;setZoom(1.5,zFW/2,zFH/2,true);
      $('zoom-add').disabled=false;msg($('zoom-msg'),'');
    };
    zImg.onerror=function(){msg($('zoom-msg'),'Could not load this photo.','err')};
    zImg.src=photos[i].src;
  }
  function clampPan(){
    var w=zImg.naturalWidth*zScale,h=zImg.naturalHeight*zScale;
    zX=Math.min(0,Math.max(zFW-w,zX));zY=Math.min(0,Math.max(zFH-h,zY));
  }
  function drawZoom(){
    zView.style.width=(zImg.naturalWidth*zScale)+'px';
    zView.style.transform='translate('+zX+'px,'+zY+'px)';
    $('zoom-val').textContent=(zScale/zBase).toFixed(1)+'×';
  }
  // Zoom around a point in the frame (cx, cy) so that point stays under the cursor
  function setZoom(z,cx,cy,center){
    var old=zScale,next=zBase*z;
    if(center){zScale=next;zX=(zFW-zImg.naturalWidth*next)/2;zY=(zFH-zImg.naturalHeight*next)/2}
    else{zX=cx-(cx-zX)*next/old;zY=cy-(cy-zY)*next/old;zScale=next}
    clampPan();drawZoom();
  }
  zRange.addEventListener('input',function(){setZoom(+zRange.value,zFW/2,zFH/2)});
  zFrame.addEventListener('wheel',function(e){
    e.preventDefault();
    var r=zFrame.getBoundingClientRect(),z=Math.min(5,Math.max(1,(zScale/zBase)*(e.deltaY<0?1.1:1/1.1)));
    zRange.value=z;setZoom(z,e.clientX-r.left,e.clientY-r.top);
  },{passive:false});
  zFrame.addEventListener('pointerdown',function(e){zDrag={x:e.clientX-zX,y:e.clientY-zY};zFrame.setPointerCapture(e.pointerId)});
  zFrame.addEventListener('pointermove',function(e){if(!zDrag)return;zX=e.clientX-zDrag.x;zY=e.clientY-zDrag.y;clampPan();drawZoom()});
  zFrame.addEventListener('pointerup',function(){zDrag=null});
  zFrame.addEventListener('keydown',function(e){
    var k={ArrowLeft:[20,0],ArrowRight:[-20,0],ArrowUp:[0,20],ArrowDown:[0,-20]}[e.key];
    if(e.key==='+'||e.key==='='){zRange.value=Math.min(5,+zRange.value+.25);setZoom(+zRange.value,zFW/2,zFH/2);return}
    if(e.key==='-'){zRange.value=Math.max(1,+zRange.value-.25);setZoom(+zRange.value,zFW/2,zFH/2);return}
    if(!k)return;e.preventDefault();zX+=k[0];zY+=k[1];clampPan();drawZoom();
  });
  function closeZoom(){$('zoom-modal').hidden=true;zI=-1;zView.removeAttribute('src')}
  $('zoom-cancel').addEventListener('click',closeZoom);
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('zoom-modal').hidden)closeZoom()});
  function cutJpeg(sx,sy,sw,sh,outW,q){
    var c=document.createElement('canvas');c.width=Math.round(outW);c.height=Math.round(outW*sh/sw);
    var g=c.getContext('2d');g.imageSmoothingQuality='high';
    g.drawImage(zImg,sx,sy,sw,sh,0,0,c.width,c.height);
    return new Promise(function(res,rej){try{c.toBlob(function(b){b?res(b):rej(new Error('empty'))},'image/jpeg',q)}catch(err){rej(err)}});
  }
  $('zoom-add').addEventListener('click',function(){
    var sx=-zX/zScale,sy=-zY/zScale,sw=zFW/zScale,sh=zFH/zScale;
    var outW=Math.max(640,Math.min(1600,sw*1.5));
    var btn=$('zoom-add');busy(btn,true);msg($('zoom-msg'),'Saving the zoomed photo…');
    var base='cars/'+(form.slug.value||'new')+'/zoom-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
    Promise.all([cutJpeg(sx,sy,sw,sh,outW,.85),cutJpeg(sx,sy,sw,sh,640,.8)]).then(function(b){
      return Promise.all([put(base+'.jpg',b[0]),put(base+'-sm.jpg',b[1])]);
    }).then(function(urls){
      var at=zI+1,c=photos[cover];
      photos.splice(at,0,{src:urls[0],sm:urls[1]});cover=photos.indexOf(c);
      dirty=true;busy(btn,false);closeZoom();renderPhotos();
      msg($('upload-msg'),'Zoomed photo added after photo '+at+'. Remember to save.','ok');
    },function(err){
      busy(btn,false);console.error(err);
      msg($('zoom-msg'),'Could not save the zoomed photo. '+(err&&err.name==='SecurityError'?'The browser blocked reading this image; open the admin from the website, not a local file.':(err&&err.message)||''),'err');
    });
  });

  // ---------- Effects: background blur (lens-style, sharp around a focus point) and vignette ----------
  var fxI=-1,fxImg=new Image(),fxSet={x:50,y:55,size:32,blur:12,vig:35},fxQueued=false;
  var fxCanvas=$('fx-canvas'),FX_DEFAULT={size:32,blur:12,vig:35};
  fxImg.crossOrigin='anonymous';
  var canFilter=(function(){var g=document.createElement('canvas').getContext('2d');g.filter='blur(2px)';return g.filter==='blur(2px)'})();
  function makeCanvas(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function blurInto(g,img,w,h,px){
    if(canFilter){
      g.filter='blur('+px+'px)';
      g.drawImage(img,-px*2,-px*2,w+px*4,h+px*4); // overscan so the edges don't fade to transparent
      g.filter='none';return;
    }
    // Safari has no canvas filter: blur by scaling down and back up in steps
    var s=Math.max(2,px/1.5),sw=Math.max(1,Math.round(w/s)),sh=Math.max(1,Math.round(h/s));
    var t=makeCanvas(sw,sh),tg=t.getContext('2d');tg.imageSmoothingQuality='high';tg.drawImage(img,0,0,sw,sh);
    g.imageSmoothingQuality='high';g.drawImage(t,0,0,w,h);
  }
  // Fill an ellipse-shaped radial gradient centred on (cx,cy); ry follows the photo's shape
  function radial(g,cx,cy,w,h,r0,r1,stops){
    g.save();g.translate(cx,cy);g.scale(1,h/w);
    var gr=g.createRadialGradient(0,0,r0,0,0,r1);
    stops.forEach(function(s){gr.addColorStop(s[0],s[1])});
    g.fillStyle=gr;g.fillRect(-w*3,-w*3,w*6,w*6);g.restore();
  }
  function fxRender(img,w){
    var h=Math.round(w*img.naturalHeight/img.naturalWidth),c=makeCanvas(w,h),g=c.getContext('2d');
    g.drawImage(img,0,0,w,h);
    var px=fxSet.blur*w/1000; // scale with output size so the preview matches the saved photo
    if(px>0.3){
      var b=makeCanvas(w,h),bg=b.getContext('2d');
      blurInto(bg,img,w,h,px);
      var r=fxSet.size/100*w*0.5;
      bg.globalCompositeOperation='destination-in';
      radial(bg,fxSet.x/100*w,fxSet.y/100*h,w,h,r,r*2.2,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,1)']]);
      g.drawImage(b,0,0);
    }
    if(fxSet.vig>0)radial(g,w/2,h/2,w,h,w*0.32,w*0.74,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,'+(fxSet.vig/100*0.85).toFixed(3)+')']]);
    return c;
  }
  function fxDraw(){
    fxQueued=false;
    if(!fxImg.naturalWidth)return;
    var w=Math.min(fxImg.naturalWidth,Math.round(fxCanvas.parentNode.clientWidth*Math.min(devicePixelRatio||1,2)));
    var out=fxRender(fxImg,w);
    fxCanvas.width=out.width;fxCanvas.height=out.height;fxCanvas.getContext('2d').drawImage(out,0,0);
    $('fx-blur-v').textContent=fxSet.blur?fxSet.blur:'Off';
    $('fx-size-v').textContent=fxSet.size+'%';
    $('fx-vig-v').textContent=fxSet.vig?fxSet.vig+'%':'Off';
  }
  function fxQueue(){if(!fxQueued){fxQueued=true;requestAnimationFrame(fxDraw)}}
  function fxSync(){$('fx-blur').value=fxSet.blur;$('fx-size').value=fxSet.size;$('fx-vig').value=fxSet.vig}
  function openFx(i){
    var p=photos[i];fxI=i;
    fxSet={x:p.fx!=null?p.fx:50,y:p.fy!=null?p.fy:55,size:FX_DEFAULT.size,blur:FX_DEFAULT.blur,vig:FX_DEFAULT.vig};
    fxSync();$('fx-modal').hidden=false;
    $('fx-new').disabled=$('fx-replace').disabled=true;msg($('fx-msg'),'Loading the full-size photo…');
    fxImg.onload=function(){msg($('fx-msg'),'');$('fx-new').disabled=$('fx-replace').disabled=false;fxDraw()};
    fxImg.onerror=function(){msg($('fx-msg'),'Could not load this photo.','err')};
    fxImg.src=p.src;
  }
  [['fx-blur','blur'],['fx-size','size'],['fx-vig','vig']].forEach(function(k){
    $(k[0]).addEventListener('input',function(e){fxSet[k[1]]=+e.target.value;fxQueue()});
  });
  var fxDrag=false;
  function fxAt(e){
    var r=fxCanvas.getBoundingClientRect();
    fxSet.x=Math.round(Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)));
    fxSet.y=Math.round(Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100)));
    fxQueue();
  }
  fxCanvas.addEventListener('pointerdown',function(e){fxDrag=true;fxCanvas.setPointerCapture(e.pointerId);fxAt(e)});
  fxCanvas.addEventListener('pointermove',function(e){if(fxDrag)fxAt(e)});
  fxCanvas.addEventListener('pointerup',function(){fxDrag=false});
  $('fx-reset').addEventListener('click',function(){fxSet.size=FX_DEFAULT.size;fxSet.blur=FX_DEFAULT.blur;fxSet.vig=FX_DEFAULT.vig;fxSync();fxQueue()});
  function closeFx(){$('fx-modal').hidden=true;fxI=-1}
  $('fx-cancel').addEventListener('click',closeFx);
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('fx-modal').hidden)closeFx()});
  addEventListener('resize',function(){if(!$('fx-modal').hidden)fxQueue()});
  function canvasJpeg(c,q){return new Promise(function(res,rej){try{c.toBlob(function(b){b?res(b):rej(new Error('empty'))},'image/jpeg',q)}catch(err){rej(err)}})}
  function fxSave(asNew){
    var btns=[$('fx-new'),$('fx-replace')];btns.forEach(function(b){busy(b,true)});
    msg($('fx-msg'),'Saving the edited photo…');
    var big=fxRender(fxImg,Math.min(1600,fxImg.naturalWidth)),small=fxRender(fxImg,Math.min(640,fxImg.naturalWidth));
    var base='cars/'+(form.slug.value||'new')+'/fx-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
    Promise.all([canvasJpeg(big,.86),canvasJpeg(small,.8)]).then(function(b){
      return Promise.all([put(base+'.jpg',b[0]),put(base+'-sm.jpg',b[1])]);
    }).then(function(urls){
      var old=photos[fxI],p={src:urls[0],sm:urls[1]};
      if(old.fx!=null){p.fx=old.fx;p.fy=old.fy}
      var c=photos[cover];
      if(asNew){photos.splice(fxI+1,0,p);cover=photos.indexOf(c)}
      else{photos[fxI]=p;if(old===c)c=p;cover=photos.indexOf(c)}
      dirty=true;btns.forEach(function(b){busy(b,false)});closeFx();renderPhotos();
      msg($('upload-msg'),(asNew?'Edited photo added.':'Photo replaced.')+' Remember to save.','ok');
    },function(err){
      btns.forEach(function(b){busy(b,false)});console.error(err);
      msg($('fx-msg'),'Could not save the edited photo. '+(err&&err.name==='SecurityError'?'The browser blocked reading this image; open the admin from the website, not a local file.':(err&&err.message)||''),'err');
    });
  }
  $('fx-new').addEventListener('click',function(){fxSave(true)});
  $('fx-replace').addEventListener('click',function(){fxSave(false)});

  function put(path,blob){
    return sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false}).then(function(r){
      if(r.error)throw r.error;
      sessionUploads.push(path);
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    });
  }
  $('upload').addEventListener('change',function(e){
    var files=[].slice.call(e.target.files);e.target.value='';
    if(!files.length)return;
    var folder='cars/'+(form.slug.value||'new')+'/',done=0,failed=0;
    msg($('upload-msg'),'Uploading 0 of '+files.length+'…');
    files.reduce(function(chain,file){
      return chain.then(function(){
        return loadBitmap(file).then(function(bmp){
          var base=folder+Date.now()+'-'+Math.random().toString(36).slice(2,7);
          return Promise.all([toJpeg(bmp,1600,.82),toJpeg(bmp,640,.78)]).then(function(b){
            return Promise.all([put(base+'.jpg',b[0]),put(base+'-sm.jpg',b[1])]);
          });
        }).then(function(urls){photos.push({src:urls[0],sm:urls[1]});dirty=true;renderPhotos()},function(err){failed++;console.error(err)})
        .then(function(){done++;msg($('upload-msg'),'Uploading '+done+' of '+files.length+'…')});
      });
    },Promise.resolve()).then(function(){
      msg($('upload-msg'),failed?failed+' photo(s) could not be uploaded. Use JPEG, PNG or WebP under 5 MB.':'Uploaded. Remember to save.',failed?'err':'ok');
    });
  });

  function removePaths(paths){if(paths.length)return sb.storage.from(BUCKET).remove(paths);return Promise.resolve()}
  function discardUploads(){var p=sessionUploads;sessionUploads=[];return removePaths(p)}
  function leave(){
    if(dirty&&!confirm('Discard your changes to this car?'))return;
    discardUploads();dirty=false;editing=null;show('list-view');loadCars();
  }
  $('back').addEventListener('click',leave);
  $('cancel').addEventListener('click',leave);

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var bad=null;
    ['make','model','year'].forEach(function(f){var ok=form[f].value.trim()!=='';form[f].setAttribute('aria-invalid',String(!ok));if(!ok&&!bad)bad=form[f]});
    var year=+form.year.value;
    if(!bad&&(year<1885||year>2100)){bad=form.year;form.year.setAttribute('aria-invalid','true')}
    var id=editing?editing.id:slug(form.slug.value||[form.year.value,form.make.value,form.model.value].join(' '));
    if(!bad&&!id){bad=form.slug}
    if(bad){toast('Please fill in the highlighted fields',true);bad.focus();return}
    if(!editing&&cars.some(function(c){return c.id===id})){toast('Another car already uses the web address "'+id+'". Change it below.',true);form.slug.focus();return}
    if(form.published.checked&&!photos.length&&!confirm('This car has no photos, so it will stay hidden on the website until you add some. Save anyway?'))return;
    var miles=form.mileage.value===''?null:Math.round(+form.mileage.value);
    var row={
      make:form.make.value.trim(),model:form.model.value.trim(),year:year,
      sub:form.sub.value.trim(),gearbox:form.gearbox.value.trim(),engine:form.engine.value.trim(),power:form.power.value.trim(),
      drive:form.drive.value.trim(),colour:form.colour.value.trim(),spec:form.spec.value.trim(),
      about:form.about.value.trim(),note:form.note.value.trim(),
      points:form.points.value.split('\n').map(function(s){return s.trim()}).filter(Boolean),
      price:form.price.value===''?null:+form.price.value,
      km:form.unit.value==='km'?miles:null,mi:form.unit.value==='mi'?miles:null,
      photos:photos,cover:Math.min(cover,Math.max(photos.length-1,0)),published:form.published.checked
    };
    var btn=$('save');busy(btn,true);
    var q;
    if(editing)q=sb.from('bm_cars').update(row).eq('id',id);
    else{
      row.id=id;
      row.sort_order=cars.reduce(function(m,c){return Math.max(m,c.sort_order)},0)+10;
      q=sb.from('bm_cars').insert(row);
    }
    q.then(function(r){
      busy(btn,false);
      if(r.error){toast('Not saved: '+r.error.message,true);return}
      var keep=collectPaths(photos);
      removePaths(origPaths.filter(function(p){return keep.indexOf(p)<0}));
      sessionUploads=[];dirty=false;editing=null;
      toast('Saved. The website shows it right away.');
      show('list-view');loadCars();
    });
  });

  $('delete').addEventListener('click',function(){
    if(!editing)return;
    var name=editing.year+' '+editing.make+' '+editing.model;
    if(!confirm('Delete the '+name+'?\n\nIt will be removed from the website, along with any photos uploaded here. This cannot be undone.'))return;
    var id=editing.id,paths=origPaths.concat(sessionUploads);
    sb.from('bm_cars').delete().eq('id',id).then(function(r){
      if(r.error){toast(r.error.message,true);return}
      removePaths(paths);sessionUploads=[];dirty=false;editing=null;
      toast(name+' deleted');show('list-view');loadCars();
    });
  });
})();
