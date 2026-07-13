# SOM Platform

Plataforma web para entrenar y visualizar **Mapas Auto-Organizados (SOM)** — una red neuronal no supervisada para clustering y análisis de datos multidimensionales.

> Proyecto de portafolio que abarca diseño de arquitectura, desarrollo full-stack, machine learning aplicado e infraestructura cloud en AWS.

---

## Demo

🌐 **Frontend:** https://d11cabgsgixi0d.cloudfront.net

---

## ¿Qué es un SOM?

Un Mapa Auto-Organizado (Self-Organizing Map) es una red neuronal no supervisada que transforma datos de alta dimensionalidad en una representación visual bidimensional. Es especialmente útil para:

- Descubrir patrones y segmentos ocultos en datasets complejos
- Visualizar relaciones entre variables en un mapa de calor interactivo
- Clasificar nuevos registros encontrando la neurona más cercana (BMU)

---

## Características principales

### Gestión de datos
- Carga de datasets en formato CSV con detección automática de tipos (continuo / discreto)
- Normalización automática min-max con soporte para variables categóricas
- Pipeline de procesamiento asíncrono con estado en tiempo real

### Entrenamiento SOM
- Configuración completa de parámetros (topología, alpha, omega, ciclos)
- Motor de entrenamiento en C/C++ ejecutado desde worker Python
- Monitoreo del entrenamiento con progreso en tiempo real

### Visualizador interactivo
- Mapa hexagonal renderizado en Canvas nativo (hasta 1600 neuronas)
- Heatmap por dimensión con 8 paletas de color intercambiables (Jet, Viridis, Plasma, etc.)
- Zoom y pan fluido con límite mínimo de hexágono funcional
- Hover y selección de neuronas con desnormalización de valores
- Clasificación de registros por distancia euclidiana en el frontend
- Pizarra de dibujo libre con capas, herramientas tipo paint y coordenadas del mundo

### Infraestructura
- Arquitectura de adaptadores para cambiar entre local y AWS solo con variables de entorno
- CI/CD automático con GitHub Actions separado por carpeta del monorepo
- Estrategia de cache diferenciado en CloudFront (assets 1 año, index.html no-cache)

---

## Stack tecnológico

### Frontend
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)
![Zustand](https://img.shields.io/badge/Zustand-state-orange)
![Canvas API](https://img.shields.io/badge/Canvas_API-native-black)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)

### Worker
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)
![Pandas](https://img.shields.io/badge/Pandas-data-150458?logo=pandas)
![NumPy](https://img.shields.io/badge/NumPy-math-013243?logo=numpy)
![Boto3](https://img.shields.io/badge/Boto3-AWS_SDK-FF9900?logo=amazonaws)

### Infraestructura AWS
![S3](https://img.shields.io/badge/S3-storage-569A31?logo=amazons3)
![SQS](https://img.shields.io/badge/SQS-queue-FF4F00?logo=amazonsqs)
![RDS](https://img.shields.io/badge/RDS-PostgreSQL-527FFF?logo=amazonrds)
![Elastic Beanstalk](https://img.shields.io/badge/Elastic_Beanstalk-backend-FF9900?logo=amazonaws)
![CloudFront](https://img.shields.io/badge/CloudFront-CDN-8C4FFF?logo=amazonaws)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=githubactions)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                      Usuario                            │
└──────────────┬──────────────────────┬───────────────────┘
               │ HTTPS                │ HTTPS
               ▼                      ▼
   ┌─────────────────┐    ┌─────────────────────┐
   │  CloudFront      │    │  CloudFront          │
   │  (Frontend)      │    │  (Backend proxy)     │
   └────────┬────────┘    └──────────┬──────────┘
            │                        │ HTTP
            ▼                        ▼
   ┌─────────────────┐    ┌─────────────────────┐
   │  S3             │    │  Elastic Beanstalk   │
   │  React SPA      │    │  Node.js API         │
   └─────────────────┘    └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼
               ┌─────────────────┐   ┌─────────────────┐
               │  RDS PostgreSQL │   │  SQS Queue      │
               └─────────────────┘   └────────┬────────┘
                                              │ poll
                                              ▼
                                   ┌─────────────────────┐
                                   │  Worker Python       │
                                   │  (on-premise)        │
                                   │  normalización +     │
                                   │  entrenamiento SOM   │
                                   └──────────┬──────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │  S3                  │
                                   │  archivos del        │
                                   │  proyecto            │
                                   └─────────────────────┘
```

### Decisiones de arquitectura destacadas

**Adaptadores de storage y cola** — El sistema usa interfaces abstractas (`IFileStorageProvider`, `IQueueProvider`) con implementaciones intercambiables. Cambiar de desarrollo local (filesystem + Redis) a producción AWS (S3 + SQS) es solo cambiar `STORAGE_DRIVER` y `QUEUE_DRIVER` en el `.env`.

**Worker on-premise** — El entrenamiento SOM puede tardar varios minutos en datasets grandes. En vez de Lambda (límite de 15 min y cold starts) o EC2 dedicada (costo fijo), el worker corre en hardware propio conectado a AWS via SQS/S3. La cola actúa como buffer desacoplando el backend del cómputo pesado.

**Canvas nativo en 3 capas** — El visualizador usa tres canvas apilados: heatmap (redibuja al cambiar dimensión), interacción (hover/selección, redibuja frecuente) y pizarra (dibujo libre). Separar las capas evita redibujar 1600 hexágonos en cada movimiento del mouse.

**CloudFront como proxy HTTPS** — Beanstalk Single Instance no soporta HTTPS nativo sin load balancer. En vez de agregar costo con un ALB, se usa CloudFront como proxy que termina SSL y reenvía por HTTP internamente.

---

## Estructura del monorepo

```
som-platform/
├── backend/                    # Express + TypeScript
│   ├── src/
│   │   ├── modules/            # Auth, Projects, Datasets, TrainingJobs
│   │   ├── queue/              # Adaptadores Redis/SQS
│   │   └── storage/            # Adaptadores Local/S3
│   └── prisma/                 # Schema y migraciones
│
├── frontend/                   # React + Vite
│   └── src/
│       ├── components/
│       │   └── training/
│       │       └── SomCanvas/  # Visualizador hexagonal + pizarra
│       └── pages/
│
├── worker/                     # Python 3.12
│   └── src/
│       ├── services/           # Normalización, entrenamiento
│       ├── queue/              # Consumidores Redis/SQS
│       └── storage/            # Adaptadores Local/S3
│
└── .github/workflows/
    ├── deploy-backend.yml      # CI/CD → Elastic Beanstalk
    └── deploy-frontend.yml     # CI/CD → S3 + CloudFront
```

---

## Correr en local

### Requisitos
- Node.js 20+
- Python 3.12+
- Docker y Docker Compose
- PostgreSQL (vía Docker)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/dbarraza/som-platform.git
cd som-platform

# Levantar servicios locales (PostgreSQL + Redis)
docker compose up -d

# Backend
cd backend
cp .env.example .env        # configurar variables
npm install
npx prisma migrate deploy
npm run dev

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev

# Worker (nueva terminal)
cd worker
pip install -r requirements.txt
python src/main.py
```

La aplicación estará disponible en `http://localhost:5173`

---

## CI/CD

Dos workflows independientes activados por path filters:

| Cambios en | Workflow | Destino |
|------------|----------|---------|
| `backend/**` | deploy-backend.yml | Elastic Beanstalk |
| `frontend/**` | deploy-frontend.yml | S3 + CloudFront |
| `worker/**` | — | Sin deploy (on-premise) |

El frontend usa **cache busting** estándar:
- Assets JS/CSS (con hash): `cache-control: max-age=31536000, immutable`
- `index.html`: `cache-control: no-cache`
- Invalidación CloudFront solo en `/index.html`

---

## Fases del proyecto

El proyecto se desarrolló en fases incrementales verificables:

| Fase | Descripción |
|------|-------------|
| 1-6 | Auth, Projects, Datasets, TrainingJobs (backend + frontend) |
| 7 | Pipeline de normalización on-premise con SQS/S3 |
| 8-10 | Worker Python, entrenamiento SOM, UI de dataset |
| 11 | Layout del visualizador con datos reales |
| 12 | Mapa hexagonal: renderizado, interacción, clasificación, zoom/pan, pizarra |
| 13 | Infraestructura AWS + CI/CD |

---

## Autor

**Diego Barraza**
- GitHub: [@dbarraza](https://github.com/dbarraza)

---

*Desarrollado como proyecto de portafolio — 2026*
