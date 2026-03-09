require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { Queue, Worker, QueueEvents } = require('bullmq');
const DataLoader = require('dataloader');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- CONEXIONES ---
// Conexión a MongoDB (Requisito A)
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/policia360')
    .then(() => console.log('✅ MongoDB conectado'))
    .catch(err => console.error('❌ Error Mongo:', err));

// Configuración unificada de Redis (Requisito B y D)
const redisOptions = { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' };
const redisClient = createClient(redisOptions);
redisClient.connect().catch(err => console.error('❌ Error Redis Client:', err));

const connection = { host: '127.0.0.1', port: 6379 };

// --- MODELOS (Requisito A) ---
const Alerta = mongoose.model('Alerta', new mongoose.Schema({ 
    titulo: String, 
    tipo: String, 
    oficialId: Number 
}));

// --- REQUISITO B: CACHÉ CON REDIS ---
const cacheMiddleware = async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
            console.log('⚡ Sirviendo desde caché (Redis)');
            return res.json(JSON.parse(cachedData));
        }
        next();
    } catch (err) {
        next();
    }
};

// --- REQUISITO C: PREVENCIÓN N+1 (DATALOADER) ---
const oficialLoader = new DataLoader(async (ids) => {
    console.log(`[DataLoader] Batching: Consultando ${ids.length} oficiales a la vez`);
    // Simulación de consulta por lote (Batching)
    return ids.map(id => ({ id, nombre: `Oficial ${id}`, unidad: "GOE/DINOES" }));
});

// --- REQUISITO D: COLA DE TRABAJOS (JOB QUEUE) ---
const reportQueue = new Queue('Reportes', { connection });

// Worker para procesar tareas en segundo plano
const reportWorker = new Worker('Reportes', async job => {
    console.log(`🛠️ Procesando tarea: ${job.name} (ID: ${job.id})`);
    // Simulación de tarea pesada (Requisito D)
    await new Promise(r => setTimeout(r, 5000)); 
    return { status: "Completado", file: `reporte_${job.id}.pdf` };
}, { connection });

// Monitoreo de resultados de la cola
const queueEvents = new QueueEvents('Reportes', { connection });
queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`✅ Tarea ${jobId} finalizada con éxito:`, returnvalue);
});

// --- ENDPOINTS ---

// Ruta raíz para evitar el error "No se puede obtener /"
app.get('/', (req, res) => {
    res.send('🚓 Backend Policía360 Activo');
});

// A, B y C: API + Caché + DataLoader
app.get('/api/v1/alertas', cacheMiddleware, async (req, res) => {
    try {
        // En una app real, aquí harías: const alertas = await Alerta.find();
        const alertas = [
            { id: 1, titulo: "Operativo Sector La Marín", oficialId: 101 },
            { id: 2, titulo: "Alerta de Seguridad - Cumbayá", oficialId: 102 }
        ];

        // Resolución de relaciones sin N+1 (Requisito C)
        const result = await Promise.all(alertas.map(async (a) => {
            const oficial = await oficialLoader.load(a.oficialId);
            return { ...a, oficial };
        }));

        // Guardar en caché con tiempo de vida (TTL) de 60 segundos
        await redisClient.setEx(`cache:${req.originalUrl}`, 60, JSON.stringify(result));
        
        res.json({ source: 'database', data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// D: Encolar trabajo y verificar estado
app.post('/api/v1/reportes', async (req, res) => {
    const { tipo } = req.body;
    const job = await reportQueue.add('GenerarReporte', { tipo: tipo || "General" });
    res.json({ jobId: job.id, status: "Encolado", mensaje: "El reporte se está procesando en segundo plano" });
});

app.get('/api/v1/reportes/:id', async (req, res) => {
    const job = await reportQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "No encontrado" });
    
    const state = await job.getState();
    res.json({ id: job.id, estado: state, resultado: job.returnvalue });
});

// E: Lazy-loading / Paginación
app.get('/api/v1/historial', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Demostración de reducción de payload (Requisito E)
    res.json({
        metadata: {
            info: "Lazy-loading mediante paginación",
            pagina_actual: page,
            limite: limit
        },
        data: [] // Aquí se aplicaría Alerta.find().skip(skip).limit(limit)
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Policía360 corriendo en http://localhost:${PORT}`);
});