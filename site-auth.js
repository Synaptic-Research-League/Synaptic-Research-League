/* Sesión pública: muestra el perfil y los accesos de admin sin exigir inicio de sesión.
   La clave publicable de Supabase es segura en el cliente; los permisos reales los aplica RLS.
   Se vuelve a leer la sesión al volver con el botón «atrás» (página restaurada desde caché),
   al volver a la pestaña y cuando Supabase avisa de un inicio o cierre de sesión. */
(function(){
  'use strict';
  var URL_='https://ncikqsyqyivdmtvtpidn.supabase.co', KEY_='sb_publishable_Esscr4NHrxRf1Hq0vulvzw_7VoVd5AV';
  window.SRL_SITE=null;

  function announce(user){
    window.SRL_SITE=user;
    if(window.SRL) window.SRL.user=user;
    document.dispatchEvent(new CustomEvent('srl:session',{detail:user}));
  }

  if(!window.supabase){ announce(null); return; }
  var sb=window.supabase.createClient(URL_,KEY_);
  window.SRL={
    sb:sb,
    user:null,
    signOut:function(){
      return sb.auth.signOut().then(function(){
        announce(null);
      });
    }
  };

  var busy=false;
  async function refresh(){
    if(busy) return; busy=true;
    try{
      var r=await sb.auth.getSession();
      var session=r.data&&r.data.session;
      if(!session){ announce(null); return; }
      var perfil=null;
      try{
        perfil=(await sb.from('profiles').select('nombre,rol').eq('id',session.user.id).maybeSingle()).data;
      }catch(e){}
      var nombre=(perfil&&perfil.nombre)||session.user.email.split('@')[0];
      var admin=!!(perfil&&perfil.rol==='admin');
      announce({id:session.user.id,email:session.user.email,nombre:nombre,rol:admin?'admin':'miembro'});
    }catch(e){
      announce(null);
    }finally{ busy=false; }
  }

  refresh();

  /* Volver con «atrás»: el navegador puede mostrar la página tal como estaba, sin ejecutar scripts */
  window.addEventListener('pageshow',function(e){ if(e.persisted) refresh(); });
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) refresh(); });
  /* Inicio o cierre de sesión en otra pestaña o página */
  sb.auth.onAuthStateChange(function(ev){
    if(ev==='SIGNED_IN'||ev==='SIGNED_OUT'||ev==='USER_UPDATED'){ setTimeout(refresh,0); }
  });
})();
