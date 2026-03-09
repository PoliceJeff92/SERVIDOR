Proyecto Policía360 - Backend Intermediario (Ecuador)

Este proyecto es un backend desarrollado en Node.js diseñado para la gestión de alertas y reportes institucionales de la Policía Nacional. Implementa técnicas avanzadas de optimización de rendimiento, manejo de caché y procesamiento asíncrono.

🚀 Actividades Desarrolladas

El proyecto cumple con los siguientes requisitos técnicos:

Actividad A: API REST Base -> Endpoints de lectura para alertas y oficiales vinculados a MongoDB.

Actividad B: Caché con Redis -> Implementación de middleware para almacenamiento en caché con un TTL de 60 segundos.

Actividad C: Prevención de N+1 -> Uso de DataLoader para optimizar consultas por lote (batching) de oficiales.

Actividad D: Cola de Trabajos (Job Queue) -> Procesamiento asíncrono de reportes pesados mediante BullMQ.

Actividad E: Lazy-loading / Paginación -> Reducción de payload mediante la carga diferida de datos.

🛠️ Requisitos Previos

Asegúrate de tener instalados los siguientes servicios en tu máquina local:

Node.js (Versión 16 o superior)

MongoDB Community Server

Redis for Windows o servicio de Redis activo.

📦 Instalación

Clona este repositorio.

Abre la carpeta SERVIDOR en tu terminal.

Instala las dependencias:

npm install


Crea un archivo .env en la raíz con el siguiente contenido:

PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/policia360
REDIS_URL=redis://127.0.0.1:6379


🏃 Ejecución

Para iniciar el servidor en modo desarrollo:

node index.js


🧪 Pruebas de Endpoints (Evidencias)

1. Alertas (Actividades A, B y C)

URL: GET http://localhost:3000/api/v1/alertas

Nota: La primera consulta hará batching con DataLoader. La segunda será servida desde el caché de Redis.

2. Generación de Reportes (Actividad D)

URL: POST http://localhost:3000/api/v1/reportes

Body (JSON): ```json
{ "tipo": "Estadística Delictiva" }