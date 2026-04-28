from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket
from src.routes.auth_routes import app as auth_router

class Time(BaseModel):
    name: str
    time: float
    
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers['X-Custom-Header'] = 'Custom Value'
    return response 

@app.on_event("startup")
async def startup_event():
    print("Se esta iniciando la aplicacion...")
    
@app.on_event("shutdown")
async def shutdown_event():
    print("Se esta cerrando la aplicacion...")
    
@app.get("/")
async def read_root():
    return {"message": "Hello World!"}

@app.post("/items")
async def create_item(item: Time):
    return {"item": item, "name": item.name, "time": item.time}

connected_clients = []
@app.websocket("/ws/data")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        connected_clients.remove(websocket)