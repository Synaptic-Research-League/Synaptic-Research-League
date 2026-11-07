/* Sesión pública: muestra el perfil y los accesos de admin sin exigir inicio de sesión.
   La clave publicable de Supabase es segura en el cliente; los permisos reales los aplica RLS. */
(function(){
  'use strict';
  var URL_='https://ncikqsyqyivdmtvtpidn.supabase.co', KEY_='sb_publishable_Esscr4NHrxRf1Hq0vulvzw_7VoVd5AV';
  window.SRL_SITE=null;

  function announce(user){
    window.SRL_SITE=user;
    document.dispatchEvent(new CustomEvent('srl:session',{detail:user}));
  }

  if(!window.supabase){ announce(null); return; }
  var sb=window.supabase.createClient(URL_,KEY_);
  window.SRL={
    sb:sb,
    user:null,
    signOut:function(){
      return sb.auth.signOut().then(function(){
        window.SRL_SITE=null;
        announce(null);
      });
    }
  };

  sb.auth.getSession().then(async function(r){
    var session=r.data&&r.data.session;
    if(!session){ announce(null); return; }
    var perfil=null;
    try{
      perfil=(await sb.from('profiles').select('nombre,rol').eq('id',session.user.id).maybeSingle()).data;
    }catch(e){}
    var nombre=(perfil&&perfil.nombre)||session.user.email.split('@')[0];
    var admin=!!(perfil&&perfil.rol==='admin');
    var user={id:session.user.id,email:session.user.email,nombre:nombre,rol:admin?'admin':'miembro'};
    window.SRL.user=user;
    announce(user);
  }).catch(function(){ announce(null); });
})();
