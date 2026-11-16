// Formulário de confirmação de presença (usado no convite e na página /confirmar)
(function () {
  const form = document.getElementById('form');
  if (!form) return;
  const nome = document.getElementById('nome');
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'msg';
    msg.textContent = '';
    const valor = nome.value.trim();
    if (valor.length < 2) {
      msg.className = 'msg erro';
      msg.textContent = 'Digite seu nome completo.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      const r = await fetch('/api/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: valor })
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.erro || 'Erro');
      msg.textContent = data.duplicado
        ? 'Sua presença já estava confirmada 💙'
        : 'Presença confirmada! Te espero lá 💙';
      nome.value = '';
      btn.textContent = 'Confirmado ✓';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Confirmar presença'; }, 2500);
    } catch (err) {
      msg.className = 'msg erro';
      msg.textContent = err.message || 'Não foi possível confirmar. Tente novamente.';
      btn.disabled = false;
      btn.textContent = 'Confirmar presença';
    }
  });
})();
