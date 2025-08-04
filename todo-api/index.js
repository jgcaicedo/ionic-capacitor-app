const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir recursos en desarrollo (CSP permisivo)
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src *; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-eval' 'unsafe-inline' *;");
  next();
});

app.use(cors());
app.use(bodyParser.json());

// Memoria temporal para tareas
let tasks = [];

// GET /tasks - listar todas las tareas
app.get('/tasks', (req, res) => {
  res.json({ success: true, tasks });
});

// POST /tasks - crear nueva tarea
app.post('/tasks', (req, res) => {
  const { title, description, isCompleted, updatedAt, isSynced } = req.body;
  const newTask = {
    id: uuidv4(),
    title,
    description: description || '',
    isCompleted: !!isCompleted,
    createdAt: new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
    isSynced: !!isSynced
  };
  tasks.push(newTask);
  res.json({ success: true, task: newTask });
});

// PUT /tasks/:id - actualizar tarea
app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, isCompleted, updatedAt, isSynced } = req.body;
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Task not found' });
  tasks[idx] = {
    ...tasks[idx],
    title: title ?? tasks[idx].title,
    description: description ?? tasks[idx].description,
    isCompleted: isCompleted ?? tasks[idx].isCompleted,
    updatedAt: updatedAt || new Date().toISOString(),
    isSynced: isSynced ?? tasks[idx].isSynced
  };
  res.json({ success: true, task: tasks[idx] });
});

// DELETE /tasks/:id - eliminar tarea
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Task not found' });
  const deleted = tasks.splice(idx, 1)[0];
  res.json({ success: true, task: deleted });
});

// Sincronización: recibir tareas no sincronizadas
app.post('/tasks/sync', (req, res) => {
  const { tasks: clientTasks } = req.body;
  let updated = [];
  clientTasks.forEach(clientTask => {
    const idx = tasks.findIndex(t => t.id === clientTask.id);
    if (idx === -1) {
      tasks.push({ ...clientTask, isSynced: true });
      updated.push(clientTask);
    } else {
      // Si la tarea del cliente es más reciente, actualiza
      if (new Date(clientTask.updatedAt) > new Date(tasks[idx].updatedAt)) {
        tasks[idx] = { ...clientTask, isSynced: true };
        updated.push(clientTask);
      }
    }
  });
  res.json({ success: true, updated });
});

app.listen(PORT, '192.168.1.6', () => {
  console.log(`Todo API running on http://192.168.1.6:${PORT}`);
});
