// filename: server.js

import express from 'express';
import lodash from 'lodash';
import { join, dirname } from 'path';
import { Low, JSONFile } from 'lowdb';
import { fileURLToPath } from 'url';

class LowWithLodash extends Low {
  chain = lodash.chain(this).get('data');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new LowWithLodash(adapter);

await db.read();
db.data ||= {}; // Banco de dados flexível para qualquer coleção

const app = express();
app.use(express.json());

// Middleware para verificar se a coleção existe
app.use('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  await db.read();
  db.data[collection] ||= []; // Cria a coleção se não existir
  next();
});

// Rota GET - Lista todos os itens de uma coleção
app.get('/:collection', async (req, res) => {
  const { collection } = req.params;
  res.json(db.data[collection]);
});

// Rota GET - Obter um item específico por ID dentro de uma coleção
app.get('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const item = db.chain
    .get(collection)
    .find({ id: Number(id) })
    .value();
  if (!item) return res.status(404).json({ message: 'Item não encontrado' });
  res.json(item);
});

// Rota POST - Criar um novo item dentro de uma coleção
app.post('/:collection', async (req, res) => {
  const { collection } = req.params;
  const newItem = { id: Date.now(), ...req.body };
  db.data[collection].push(newItem);
  await db.write();
  res.status(201).json(newItem);
});

// Rota PUT - Atualizar um item pelo ID dentro de uma coleção
app.put('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const index = db.data[collection].findIndex((item) => item.id === Number(id));
  if (index === -1)
    return res.status(404).json({ message: 'Item não encontrado' });

  db.data[collection][index] = { ...db.data[collection][index], ...req.body };
  await db.write();
  res.json(db.data[collection][index]);
});

// Rota DELETE - Remover um item pelo ID dentro de uma coleção
app.delete('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const index = db.data[collection].findIndex((item) => item.id === Number(id));
  if (index === -1)
    return res.status(404).json({ message: 'Item não encontrado' });

  db.data[collection].splice(index, 1);
  await db.write();
  res.json({ message: 'Item deletado com sucesso' });
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`)
);
