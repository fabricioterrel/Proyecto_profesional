from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import traceback
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db
from app.api.scipy import router as scipy_router
from app.api.clientes import router as clientes_router
from app.api.comentarios import router as comentarios_router
from app.api.metricas import router as metricas_router
from app.api.nltk import router as nltk_router

import nltk
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')

app = FastAPI()

# Configuración de CORS actualizada para permitir tu frontend local y el de Vercel
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"],  # Permite conexiones desde cualquier origen (ideal para producción con Vercel)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Se incluye el router después de crear la instancia de FastAPI
app.include_router(scipy_router)
app.include_router(clientes_router)
app.include_router(comentarios_router)
app.include_router(metricas_router)
app.include_router(nltk_router)

@app.get("/api/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT version();")).fetchone()
        return {"estado": "Conexión exitosa a Supabase", "version": result[0]}
    except Exception as e:
        return {"estado": "Error de conexión", "detalles": str(e), "trace": traceback.format_exc()}