import os
import joblib
import numpy as np

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket
from sklearn.cluster import MiniBatchKMeans
from src.routes.auth_routes import app as auth_router

    
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELOS_DIR = os.path.join(BASE_DIR, "src", "userModel")
WEIGHT = 18


os.makedirs(MODELOS_DIR, exist_ok=True)

baseModel = joblib.load(os.path.join(BASE_DIR, "src", "model", "pomodoro.plk"))

def getUserModel(userID: str):
    return joblib.load(os.path.join(MODELOS_DIR, f"{userID}_pomodoro.plk"))

def createUserModel(userID: str):
    joblib.dump(baseModel, os.path.join(MODELOS_DIR, f"{userID}_pomodoro.plk"))
    return getUserModel(userID)
    
def getCentroides(userID: str):
    return getUserModel(userID).cluster_centers_

def loadUserModel(userID: str):
    if os.path.exists(os.path.join(MODELOS_DIR, f"{userID}_pomodoro.plk")):
        return getUserModel(userID)
    else:
        return createUserModel(userID)


@app.post("/api/fin_sesion/{userID}")
async def updateModel (userID: str, pomodoro: int, totalTime: int, estresNvl: int):
    model = loadUserModel(userID)
    print(model._counts)
    
    model._counts[estresNvl] = WEIGHT 
    model.partial_fit(np.array([[pomodoro, totalTime]]))
    
    print(model.cluster_centers_)
    print(model._counts)
    
    joblib.dump(model, os.path.join(MODELOS_DIR, f"{userID}_pomodoro.plk"))
    
    return {"clusters: ": model.cluster_centers_.tolist()}

@app.get("/api/get_clusters/{userID}")
async def getClusters(userID: str):
    model = loadUserModel(userID)
    return {"clusters: ": model.cluster_centers_.tolist()}
    


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