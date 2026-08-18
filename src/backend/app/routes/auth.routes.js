import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database.js';

const router = Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
    const { usuario, nombreUsuario, password } = req.body;

    if (!usuario || !nombreUsuario || !password) {
        return res.status(400).json({ error: true, message: 'Usuario, nombre de usuario y contraseña son obligatorios' });
    }

    try {
        const [existing] = await pool.query('SELECT ID_USER FROM L_USUARIOS WHERE USUARIO = ?', [usuario]);
        if (existing.length > 0) {
            return res.status(409).json({ error: true, message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await pool.query(
            'INSERT INTO L_USUARIOS (USUARIO, NOMBRE_USUARIO, PASSWORD) VALUES (?, ?, ?)',
            [usuario, nombreUsuario, hashedPassword]
        );

        const user = { id: result.insertId, usuario, nombreUsuario };
        const token = jwt.sign({ id: user.id, usuario: user.usuario }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({ error: false, user, token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: true, message: 'Error al registrar el usuario' });
    }
});

router.post('/login', async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ error: true, message: 'Usuario y contraseña son obligatorios' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM L_USUARIOS WHERE USUARIO = ?', [usuario]);
        if (rows.length === 0) {
            return res.status(401).json({ error: true, message: 'Usuario o contraseña no válida' });
        }

        const userRow = rows[0];
        const passwordMatches = await bcrypt.compare(password, userRow.PASSWORD);
        if (!passwordMatches) {
            return res.status(401).json({ error: true, message: 'Usuario o contraseña no válida' });
        }

        const user = { id: userRow.ID_USER, usuario: userRow.USUARIO, nombreUsuario: userRow.NOMBRE_USUARIO };
        const token = jwt.sign({ id: user.id, usuario: user.usuario }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({ error: false, user, token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: true, message: 'Error al iniciar sesión' });
    }
});

export default router;
