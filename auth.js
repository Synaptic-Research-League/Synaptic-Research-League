/* Protección de páginas con Supabase: exige sesión y lee el rol real desde la base de datos.
   Uso: <script src="auth.js" data-require="member"></script>  (o "admin" para páginas solo de administración) */
(function(){
  'use strict';
  var URL_='https://ncikqsyqyivdmtvtpidn.supabase.co', KEY_='sb_publishable_Esscr4NHrxRf1Hq0vulvzw_7VoVd5AV';
  var cs=document.currentScript, need=(cs&&cs.dataset.require)||'member';
  var st=document.createElement('style'); st.textContent='html.auth-pending body{visibility:hidden}'; document.head.appendChild(st);
  document.documentElement.classList.add('auth-pending');
  var here=location.pathname.split('/').pop()||'index.html';
  function toLogin(){ location.replace('acceso.html?next='+encodeURIComponent(here)); }
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function qsa(s){ return [].slice.call(document.querySelectorAll(s)); }
  function fail(){ ready(function(){ document.documentElement.classList.remove('auth-pending');
    document.body.innerHTML='<p style="font:16px system-ui;padding:40px;max-width:520px">No pudimos verificar tu sesión. Revisa tu conexión e <a href="acceso.html">inicia sesión de nuevo</a>.</p>'; }); }
  if(!window.supabase){ fail(); return; }
  var sb=window.supabase.createClient(URL_,KEY_);
  window.SRL={sb:sb,user:null,signOut:function(){ return sb.auth.signOut().then(toLogin); }};
  sb.auth.onAuthStateChange(function(ev){ if(ev==='SIGNED_OUT') toLogin(); });
  sb.auth.getSession().then(async function(r){
    var s=r.data&&r.data.session; if(!s){ toLogin(); return; }
    var p=null; try{ p=(await sb.from('profiles').select('nombre,rol').eq('id',s.user.id).maybeSingle()).data; }catch(e){}
    var admin=!!(p&&p.rol==='admin'), nombre=(p&&p.nombre)||s.user.email.split('@')[0];
    SRL.user={id:s.user.id,email:s.user.email,nombre:nombre,rol:admin?'admin':'miembro'};
    if(need==='admin'&&!admin){ location.replace('portal.html'); return; }
    ready(function(){
      var ini=nombre.split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase();}).join('');
      qsa('[data-user-name]').forEach(function(e){e.textContent=nombre;});
      qsa('[data-user-av]').forEach(function(e){e.textContent=ini;});
      qsa('[data-user-role]').forEach(function(e){e.textContent=admin?'Administrador':'Miembro';});
      qsa('[data-logout]').forEach(function(b){b.addEventListener('click',function(){SRL.signOut();});});
      var m=document.getElementById('srl-main');
      if(m){ var x=document.createElement('script'); x.textContent=m.textContent; document.body.appendChild(x); }
      document.documentElement.classList.remove('auth-pending');
    });
  }).catch(fail);
})();
