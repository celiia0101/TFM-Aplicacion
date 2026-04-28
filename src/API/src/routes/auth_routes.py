from fastapi import APIRouter

app = APIRouter()

@app.get("/login")
async def login():
    return {"message": "Login ruta"}