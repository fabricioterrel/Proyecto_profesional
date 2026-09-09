from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
import numpy as np

router = APIRouter(prefix="/api/metricas", tags=["Métricas"])

@router.get("/atencion")
def obtener_metricas_atencion(db: Session = Depends(get_db)):
    # Datos de referencia o consulta a la base de datos de tiempos de atención
    valores = [12.0, 15.0, 18.0, 20.0, 11.0, 25.0, 19.0, 17.0, 14.0, 21.0]
    arr = np.array(valores)
    
    return {
        "cantidad": int(len(arr)),
        "media": round(float(np.mean(arr)), 2),
        "mediana": round(float(np.median(arr)), 2),
        "desviacion_estandar": round(float(np.std(arr, ddof=1)), 2),
        "minimo": float(np.min(arr)),
        "maximo": float(np.max(arr))
    }