import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import pomodoroRoutes from './routes/pomodoro.routes.js';

//Servidor
const app = express();
app.set("port", 4000);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/pomodoro", pomodoroRoutes);

app.listen(app.get("port"), () => {});
console.log("Escuchando en ", app.get("port"));