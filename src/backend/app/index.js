import express from 'express';
import morgan from 'morgan';
import database from './database.js';


//Servidor
const app = express();
app.set("port", 4000);
app.listen(app.get("port"), () => {});
console.log("Escuchando en ", app.get("port"));

app.use(morgan("dev"))

app.get("/usuarios/:nomUser/:pass", async (req, res) => {
    const nomUser = req.params.nomUser;
    const pass = req.params.pass;

    const connection = await database.getConnection();

    const result = await connection.query("SELECT * FROM L_USUARIOS WHERE USUARIO = ?", [nomUser]);

    if(!result || result.length === 0){
        return res.status(404).json({ 
            message: "Usuario o Contraseña no válida",
            error: true 
        });
    }

    const usuario = result[0];
    if(usuario.PASSWORD !== pass) {
       return res.status(404).json({ 
            message: "Usuario o Contraseña no válida",
            error: true 
        }); 
    }

    res.status(200).json({
        message: "OK",
        user: usuario,
        error: false
    });
})