66# Adaptive Pomodoro (TFM)

Aplicación de Pomodoro adaptativo: personaliza la duración de las sesiones de trabajo por usuario y estado de ánimo mediante clustering (ML).

## Estructura del proyecto

```
src/
├── API/       # Servicio Python (FastAPI) de clustering/ML — puerto 8000
├── backend/   # API Node.js/Express + MySQL — puerto 4000
└── frontend/AdaptivePomodoroApp/  # App React Native (Expo)
```

Las tres partes son independientes y deben arrancarse por separado, en este orden: **base de datos → API (ML) → backend → frontend**.

## Requisitos previos

- Node.js LTS + npm
- Python 3.13 (o similar)
- MySQL Server en local (o accesible)
- Expo CLI (se instala con `npx`, no hace falta instalación global)

## 1. Base de datos (MySQL)

Crea la base de datos y ejecuta los scripts de `src/backend/scripts_bbdd/` **en este orden** (respetan las claves foráneas):

```sql
CREATE DATABASE adaptivepomodoro;
```

1. `L_USUARIOS.sql`
2. `L_ESTADO_ANIMO.sql`
3. `DDL_L_ESTADO_ANIMO.sql` (datos semilla de los estados de ánimo)
4. `M_TIEMPOS.sql`
5. `M_POMODORO.sql`

## 2. API de Machine Learning (Python / FastAPI)

```bash
cd src/API
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Genera el modelo base (una sola vez, o cuando quieras regenerarlo desde cero):

```bash
python init.py
```

Arranca el servicio:

```bash
uvicorn main:app --reload --port 8000
```

## 3. Backend (Node.js / Express)

```bash
cd src/backend
npm install
```

Copia `.env.example` a `.env` y rellena tus credenciales de MySQL:

```
HOST=localhost
DATABASE=adaptivepomodoro
USER=root
PASSWORD=
JWT_SECRET=
ML_API_URL=http://localhost:8000
```

Arranca el servidor en modo desarrollo:

```bash
npm run dev
```

Queda escuchando en `http://localhost:4000`.

## 4. Frontend (Expo / React Native)

```bash
cd src/frontend/AdaptivePomodoroApp
npm install
npx expo start --web
```

Esto abre la app en `http://localhost:8081`. También puedes escanear el QR con Expo Go para probarla en un dispositivo físico, o pulsar `a`/`i` en la terminal de Expo para emulador Android/simulador iOS.

> El emulador de Android no resuelve `localhost` hacia el host: la app ya usa `10.0.2.2` automáticamente en ese caso (ver `lib/api.ts`).

## Notas

- El backend necesita que la API de ML (`src/API`) esté levantada para poder recomendar duraciones — si no, esas llamadas fallarán.
- Los modelos entrenados por usuario se guardan en `src/API/src/userModel/`.
