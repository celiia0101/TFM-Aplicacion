import express from "express"

// Se crea la instancia
const app = express()

app.get("/", (req, res) =>{
    res.send("<h1>Hola desde mi app</h1>")
} );

app.get("/usuarios", (req, res) => {
    const usuarios = [
        {
            id: 1,
            nombre: "Ana"
        },
        {
            id:2,
            nombre: "Juan"
        }
    ];

    res.json(usuarios)
});

app.get("/usuarios/:id", (req,res) => {
    const userId = req.params.id

    console.log(userId)
})

const PORT = 3001
app.listen(PORT, () => {
    console.log(`Escuchando en http://localhost:3001`)
});