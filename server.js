const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mr15admin';

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ---------- Armazenamento ----------
// Se existir DATABASE_URL (Postgres do Railway), usa o banco.
// Senão, salva num arquivo JSON (em DATA_DIR, ex.: um Volume do Railway).
let store;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  });
  store = {
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS confirmacoes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    },
    async add(nome) {
      const { rows } = await pool.query(
        'SELECT id FROM confirmacoes WHERE LOWER(nome) = LOWER($1)', [nome]);
      if (rows.length) return { duplicado: true };
      await pool.query('INSERT INTO confirmacoes (nome) VALUES ($1)', [nome]);
      return { duplicado: false };
    },
    async list() {
      const { rows } = await pool.query(
        'SELECT id, nome, criado_em FROM confirmacoes ORDER BY criado_em ASC');
      return rows;
    },
    async remove(id) {
      await pool.query('DELETE FROM confirmacoes WHERE id = $1', [id]);
    },
  };
} else {
  const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
  const file = path.join(dir, 'confirmacoes.json');
  const read = () => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
  };
  const write = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
  store = {
    async init() { fs.mkdirSync(dir, { recursive: true }); },
    async add(nome) {
      const data = read();
      if (data.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return { duplicado: true };
      const id = data.reduce((m, c) => Math.max(m, c.id), 0) + 1;
      data.push({ id, nome, criado_em: new Date().toISOString() });
      write(data);
      return { duplicado: false };
    },
    async list() { return read(); },
    async remove(id) { write(read().filter((c) => c.id !== Number(id))); },
  };
}

// ---------- Autenticação simples do painel ----------
const token = crypto.createHash('sha256').update('mr15:' + ADMIN_PASSWORD).digest('hex');
const isAdmin = (req) => {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').some((c) => c.trim() === `admin=${token}`);
};

// ---------- Rotas ----------
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', index: 'index.html' }));

// Tudo é um documento só: /confirmar e /presentes entregam o mesmo index.html, que abre direto na tela correspondente
app.get(['/confirmar', '/presentes'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/confirmar', async (req, res) => {
  const nome = String((req.body && req.body.nome) || '').replace(/\s+/g, ' ').trim();
  if (nome.length < 2 || nome.length > 120) {
    return res.status(400).json({ ok: false, erro: 'Digite seu nome completo.' });
  }
  try {
    const r = await store.add(nome);
    res.json({ ok: true, duplicado: r.duplicado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, erro: 'Não foi possível confirmar agora. Tente novamente.' });
  }
});

app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return res.sendFile(path.join(__dirname, 'views', 'login.html'));
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.post('/admin/login', (req, res) => {
  if (req.body.senha === ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `admin=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.redirect('/admin');
  }
  res.redirect('/admin?erro=1');
});

app.post('/admin/sair', (req, res) => {
  res.setHeader('Set-Cookie', 'admin=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/admin');
});

app.get('/api/confirmacoes', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ erro: 'não autorizado' });
  res.json(await store.list());
});

app.delete('/api/confirmacoes/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ erro: 'não autorizado' });
  await store.remove(req.params.id);
  res.json({ ok: true });
});

app.get('/api/confirmacoes.csv', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).send('não autorizado');
  const rows = await store.list();
  const csv = '﻿Nome;Data\n' + rows.map((r) =>
    `"${r.nome.replace(/"/g, '""')}";${new Date(r.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="confirmacoes-mr15.csv"');
  res.send(csv);
});

store.init().then(() => {
  app.listen(PORT, () => console.log(`Convite MR 15 rodando na porta ${PORT}`));
}).catch((e) => { console.error('Erro ao iniciar armazenamento:', e); process.exit(1); });
