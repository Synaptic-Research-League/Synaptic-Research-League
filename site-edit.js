/* Editor del sitio público.
   - Los cambios se guardan en Supabase (tabla site_content) y se cachean en este navegador.
   - Solo un administrador autenticado puede activar el modo edición (?edit=1).
   - El contenido guardado se sanea antes de publicarse para evitar inyección de scripts. */
(function(){
  'use strict';
  var KEY='srl_site_edits_v1', TABLE='site_content';
  var TEXT_SEL=[
    'main h1','main h2','main h3','main .eyebrow','main .hero-lead','main .sec-intro',
    'main .lead','main .person-badge','main .person-role','main .person-bio','main .person-tags li',
    'main .step h3','main .step p','main .route h3','main .route>p','main .route li','main .route-note',
    'main .result-kicker','main .result-who','main .metric-label','main .result-foot',
    'main .pub-head h3','main .pub-title b','main .pub-title small','main .pub-journal',
    'main .contact-note','main .form-foot .form-note',
    'footer .foot-statement p','footer .foot-brand p','footer .foot-col h3','footer .foot-col li',
    'footer .foot-legal span','header .nav-link','header .nav-btn'
  ].join(',');
  var IMG_SEL='main img';

  var data={text:{},images:{}};
  var editing=false, currentImg=null;

  function readLocal(){
    try{
      var o=JSON.parse(localStorage.getItem(KEY));
      if(o&&typeof o==='object'){
        data.text=o.text||{}; data.images=o.images||{};
      }
    }catch(e){}
  }
  function writeLocal(){
    try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}
  }
  function textEls(){ return [].slice.call(document.querySelectorAll(TEXT_SEL)); }
  function imgEls(){ return [].slice.call(document.querySelectorAll(IMG_SEL)); }
  function safeImage(v){
    return typeof v==='string'&&(/^data:image\//i.test(v)||/^https:\/\//i.test(v))?v:'';
  }
  function apply(){
    textEls().forEach(function(el,i){
      var v=data.text['t'+i];
      if(typeof v==='string') el.innerHTML=sanitize(v);
    });
    imgEls().forEach(function(el,i){
      var v=safeImage(data.images['i'+i]);
      if(v) el.src=v;
    });
  }

  /* Sanea el HTML editable: solo formato en línea, sin scripts ni atributos peligrosos. */
  function sanitize(html){
    var allowed={B:1,I:1,EM:1,STRONG:1,BR:1,SPAN:1,SMALL:1,SUP:1,SUB:1,MARK:1};
    var box=document.createElement('div');
    box.innerHTML=html;
    [].slice.call(box.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,svg')).forEach(function(n){ n.remove(); });
    [].slice.call(box.querySelectorAll('*')).forEach(function(n){
      [].slice.call(n.attributes).forEach(function(a){
        if(a.name!=='class'||!(n.className||'').split(/\s+/).every(function(c){return /^[a-z0-9_-]+$/i.test(c);})) n.removeAttribute(a.name);
      });
      if(!allowed[n.tagName]){
        while(n.firstChild) n.parentNode.insertBefore(n.firstChild,n);
        n.parentNode.removeChild(n);
      }
    });
    return box.innerHTML;
  }

  function loadRemote(){
    if(!(window.SRL&&window.SRL.sb)) return;
    window.SRL.sb.from(TABLE).select('key,value').then(function(r){
      if(r.error||!Array.isArray(r.data)) return;
      var changed=false;
      r.data.forEach(function(row){
        if(!row||typeof row.key!=='string') return;
        if(/^t\d+$/.test(row.key)){ data.text[row.key]=row.value; changed=true; }
        else if(/^i\d+$/.test(row.key)){ data.images[row.key]=safeImage(row.value); changed=true; }
      });
      if(changed){ apply(); writeLocal(); }
    }).catch(function(){});
  }

  function collect(){
    textEls().forEach(function(el,i){
      var v=sanitize(el.innerHTML);
      if(v!==el.innerHTML) el.innerHTML=v;
      data.text['t'+i]=v;
    });
  }

  function save(){
    collect();
    writeLocal();
    if(!(window.SRL&&window.SRL.sb)){ status('Guardado en este navegador.'); return; }
    var rows=[];
    Object.keys(data.text).forEach(function(k){ rows.push({key:k,value:data.text[k]}); });
    Object.keys(data.images).forEach(function(k){ if(safeImage(data.images[k])) rows.push({key:k,value:data.images[k]}); });
    if(!rows.length){ status('No hay cambios que guardar.'); return; }
    status('Guardando…');
    window.SRL.sb.from(TABLE).upsert(rows,{onConflict:'key'}).then(function(r){
      if(r.error){ status('No se pudo publicar. Revisa la política de site_content.'); return; }
      status('Publicado para todos los visitantes.');
    }).catch(function(){ status('No se pudo publicar. Revisa tu conexión.'); });
  }

  function status(msg){
    var el=document.getElementById('srlEditStatus');
    if(el) el.textContent=msg;
  }

  function restore(){
    if(!confirm('¿Restablecer todo el contenido editado del sitio? Esta acción no se puede deshacer.')) return;
    try{localStorage.removeItem(KEY);}catch(e){}
    data={text:{},images:{}};
    if(window.SRL&&window.SRL.sb){
      window.SRL.sb.from(TABLE).delete().neq('key','').then(function(){ location.reload(); }).catch(function(){ location.reload(); });
    }else{
      location.reload();
    }
  }

  function enable(){
    if(editing) return;
    editing=true;
    document.body.classList.add('editing');
    textEls().forEach(function(el,i){
      el.setAttribute('contenteditable','true');
      el.setAttribute('spellcheck','false');
      el.setAttribute('data-edit-key','t'+i);
    });
    imgEls().forEach(function(el,i){
      el.setAttribute('data-editable-img','true');
      el.addEventListener('click',function(ev){
        if(!editing) return;
        ev.preventDefault();
        currentImg=el;
        var input=document.getElementById('srlImgInput');
        if(input){ input.value=''; input.click(); }
      });
    });
    var bar=document.getElementById('srlEditBar');
    if(bar) bar.classList.add('on');
    status('Haz clic en un texto para editarlo o en una imagen para reemplazarla.');
  }

  function init(){
    readLocal();
    apply();
    loadRemote();

    if(!document.getElementById('srlEditBar')){
      var bar=document.createElement('div');
      bar.className='edit-bar';
      bar.id='srlEditBar';
      bar.setAttribute('role','region');
      bar.setAttribute('aria-label','Editor del sitio');
      bar.innerHTML='<b>Modo edición</b><small id="srlEditStatus"></small>'+
        '<button class="btn" type="button" data-edit-save>Guardar y publicar</button>'+
        '<button class="btn l" type="button" data-edit-reset>Restablecer</button>'+
        '<button class="btn l" type="button" data-edit-exit>Salir</button>';
      document.body.appendChild(bar);
      var input=document.createElement('input');
      input.type='file'; input.accept='image/*'; input.id='srlImgInput'; input.hidden=true;
      document.body.appendChild(input);

      bar.querySelector('[data-edit-save]').addEventListener('click',save);
      bar.querySelector('[data-edit-reset]').addEventListener('click',restore);
      bar.querySelector('[data-edit-exit]').addEventListener('click',function(){
        try{localStorage.removeItem('srl_edit');}catch(e){}
        location.href=location.pathname;
      });
      input.addEventListener('change',function(){
        var file=input.files&&input.files[0];
        if(!file||!currentImg) return;
        var reader=new FileReader();
        reader.onload=function(){
          var img=new Image();
          img.onload=function(){
            var max=1200, w=img.width, h=img.height;
            if(w>max){ h=Math.round(h*max/w); w=max; }
            var c=document.createElement('canvas'); c.width=w; c.height=h;
            c.getContext('2d').drawImage(img,0,0,w,h);
            var url=c.toDataURL('image/jpeg',.82);
            var key=currentImg.getAttribute('data-edit-key-img')||'i'+imgEls().indexOf(currentImg);
            currentImg.setAttribute('data-edit-key-img',key);
            data.images[key]=url;
            currentImg.src=url;
            status('Imagen lista. Pulsa «Guardar y publicar».');
          };
          img.src=reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function maybeEnable(){
      var wantsEdit=/[?&]edit=1/.test(location.search);
      var user=window.SRL_SITE;
      if(wantsEdit&&user&&user.rol==='admin') enable();
      else if(wantsEdit&&user&&user.rol!=='admin') status('Solo un administrador puede editar el sitio.');
    }
    if(window.SRL_SITE!==undefined) maybeEnable();
    document.addEventListener('srl:session',function(){ maybeEnable(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
