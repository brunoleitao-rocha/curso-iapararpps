// Funções compartilhadas por todas as páginas
(function () {
  var cfg = window.IARPPS_CONFIG || {};
  var configurado = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("SEU-PROJETO") < 0 && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("COLE-AQUI") < 0;

  var sb = configurado ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  function baseUrl() {
    return location.href.replace(/[^/]*([?#].*)?$/, "");
  }

  // Chama a função do servidor (admin-usuarios). As mensagens dela já vêm em português.
  async function chamarFuncao(acao, dados) {
    var r = await sb.functions.invoke("admin-usuarios", { body: Object.assign({ acao: acao }, dados || {}) });
    if (r.error) {
      var e = new Error(r.error.message);
      try { var j = await r.error.context.json(); if (j && j.error) { e = new Error(j.error); e.pt = true; } } catch (x) {}
      throw e;
    }
    return r.data;
  }

  function precisaTrocar(sessao) {
    return !!(sessao && sessao.user && sessao.user.app_metadata && sessao.user.app_metadata.must_change_password);
  }

  var WHATSAPP = "5585981476918";
  function linkWhatsApp(email) {
    return "https://wa.me/" + WHATSAPP + "?text=" +
      encodeURIComponent("Oi, gostaria de resetar a minha senha, o meu email cadastrado é: " + (email || ""));
  }

  function traduzErro(err) {
    if (err && err.pt) return err.message;
    var m = ((err && (err.message || err.error_description)) || String(err || "")).toLowerCase();
    if (m.indexOf("invalid login credentials") >= 0) return "E-mail ou senha incorretos.";
    if (m.indexOf("email not confirmed") >= 0) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    if (m.indexOf("email_nao_autorizado") >= 0 || m.indexOf("database error saving new user") >= 0)
      return "Este e-mail não está na lista de participantes autorizados. Fale com o facilitador.";
    if (m.indexOf("already registered") >= 0 || m.indexOf("already been registered") >= 0)
      return "Este e-mail já tem cadastro. Use Entrar ou Esqueci a minha senha.";
    if (m.indexOf("at least") >= 0 && m.indexOf("password") >= 0) return "A senha precisa ter pelo menos 6 caracteres.";
    if (m.indexOf("different from the old") >= 0 || m.indexOf("should be different") >= 0) return "A nova senha precisa ser diferente da anterior.";
    if (m.indexOf("rate limit") >= 0 || m.indexOf("for security purposes") >= 0) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    if (m.indexOf("unable to validate email") >= 0 || m.indexOf("invalid format") >= 0) return "Digite um e-mail válido.";
    if (m.indexOf("failed to fetch") >= 0 || m.indexOf("network") >= 0) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    if (m.indexOf("acesso negado") >= 0) return "Você não tem permissão de administrador.";
    return "Algo deu errado: " + ((err && err.message) || err) + ".";
  }

  function mostrar(el, tipo, texto) {
    if (!el) return;
    el.className = "msg " + tipo;
    el.textContent = texto;
    el.hidden = !texto;
  }

  function avisoConfig(container) {
    container.innerHTML =
      '<div class="center-state"><h2>Falta configurar o Supabase</h2>' +
      "<p>Abra o arquivo <strong>js/config.js</strong> e preencha a URL e a chave anon do seu projeto. O passo a passo está no arquivo LEIAME.md.</p></div>";
  }

  async function sessaoAtual() {
    if (!sb) return null;
    var r = await sb.auth.getSession();
    return r.data.session;
  }

  async function ehAdmin() {
    if (!sb) return false;
    var r = await sb.rpc("is_admin");
    return !r.error && r.data === true;
  }

  async function sair() {
    if (sb) await sb.auth.signOut();
    location.href = "index.html";
  }

  function alternarSenha(root) {
    (root || document).querySelectorAll(".pw button").forEach(function (b) {
      b.addEventListener("click", function () {
        var inp = b.parentNode.querySelector("input");
        var mostrarSenha = inp.type === "password";
        inp.type = mostrarSenha ? "text" : "password";
        b.textContent = mostrarSenha ? "Ocultar" : "Mostrar";
        b.setAttribute("aria-pressed", mostrarSenha ? "true" : "false");
      });
    });
  }

  // Abas e botões de copiar da página do curso
  function iniciarCurso() {
    var tabs = [].slice.call(document.querySelectorAll(".tab"));
    var panels = [].slice.call(document.querySelectorAll(".panel"));
    var ids = panels.map(function (p) { return p.id; });
    function show(id, scroll) {
      if (ids.indexOf(id) < 0) id = "inicio";
      panels.forEach(function (p) { p.hidden = p.id !== id; });
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.tab === id ? "true" : "false"); });
      try { localStorage.setItem("iarpps-tab", id); } catch (e) {}
      if (scroll) window.scrollTo(0, 0);
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.tab, true); }); });
    document.querySelectorAll("[data-goto]").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.goto, true); }); });
    function fromHash() {
      var h = (location.hash || "").slice(1); if (!h) return false;
      var el = document.getElementById(h); if (!el) return false;
      var panel = el.closest(".panel"); if (!panel) return false;
      show(panel.id, false); if (el !== panel) setTimeout(function () { el.scrollIntoView(); }, 0); return true;
    }
    if (!fromHash()) { var s = null; try { s = localStorage.getItem("iarpps-tab"); } catch (e) {} show(s || "inicio", false); }
    window.addEventListener("hashchange", fromHash);
    document.querySelectorAll(".copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var box = btn.parentNode, txt = "";
        box.childNodes.forEach(function (n) { if (n.nodeType === 3) txt += n.textContent; });
        txt = txt.trim();
        function done() { btn.textContent = "Copiado"; setTimeout(function () { btn.textContent = "Copiar"; }, 1600); }
        function fallback() { var r = document.createRange(); r.selectNodeContents(box); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selecionado"; }
        try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
      });
    });
  }

  window.IARPPS = {
    sb: sb, configurado: !!configurado, baseUrl: baseUrl, chamarFuncao: chamarFuncao,
    precisaTrocar: precisaTrocar, linkWhatsApp: linkWhatsApp, traduzErro: traduzErro, mostrar: mostrar,
    avisoConfig: avisoConfig, sessaoAtual: sessaoAtual, ehAdmin: ehAdmin, sair: sair,
    alternarSenha: alternarSenha, iniciarCurso: iniciarCurso
  };
})();
