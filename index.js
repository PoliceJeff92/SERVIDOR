require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { Queue, Worker, QueueEvents } = require('bullmq');
const DataLoader = require('dataloader');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
// Aumentamos el límite para recibir fotos base64 desde el celular
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- CONEXIONES ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/policia360')
    .then(() => console.log('✅ MongoDB conectado'))
    .catch(err => console.error('❌ Error Mongo:', err));

const redisOptions = { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' };
const redisClient = createClient(redisOptions);
redisClient.connect().catch(err => console.error('❌ Error Redis Client:', err));

const connection = { host: '127.0.0.1', port: 6379 };

// --- DATALOADER (Evitar N+1) ---
const oficialLoader = new DataLoader(async (ids) => {
    return ids.map(id => ({ id, nombre: `Oficial ${id}`, unidad: "Unidad Táctica" }));
});

// --- COLA DE TRABAJOS (BullMQ) ---
const reportQueue = new Queue('Reportes', { connection });
const reportWorker = new Worker('Reportes', async job => {
    await new Promise(r => setTimeout(r, 2000)); 
    return { status: "Procesado", id: job.id };
}, { connection });

// --- ENDPOINTS ---

app.get('/', (req, res) => {
    res.send('🚓 Backend Policía360 Activo y Conectado');
});

// Endpoint para recibir fotos desde el Hook de la cámara
app.post('/upload', (req, res) => {
    console.log("📸 Foto recibida del dispositivo móvil");
    // Aquí procesarías req.body.photo
    res.json({ message: "Evidencia guardada con éxito en el servidor" });
});

app.get('/api/v1/alertas', async (req, res) => {
    const alertas = [
        { id: 1, titulo: "Operativo Centro", oficialId: 101 },
        { id: 2, titulo: "Patrullaje Norte", oficialId: 102 }
    ];
    const result = await Promise.all(alertas.map(async (a) => {
        const oficial = await oficialLoader.load(a.oficialId);
        return { ...a, oficial };
    }));
    res.json(result);
});

// --- INICIO DEL SERVIDOR ---
// IMPORTANTE: '0.0.0.0' permite conexiones externas (como el emulador)
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`📱 Para el emulador Android, usa: http://10.0.2.2:${PORT}`);
});