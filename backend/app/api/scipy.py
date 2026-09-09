from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
from scipy import stats
from scipy.optimize import minimize
from scipy.interpolate import interp1d

router = APIRouter()

# Ejercicio 1
@router.get("/api/metricas-atencion")
def metricas():
    tiempos = np.array([12, 15, 18, 20, 11, 25, 19, 17, 14, 21])
    media = float(np.mean(tiempos))
    desv = float(np.std(tiempos, ddof=1))
    return {
        "media": round(media, 2),
        "desviacion": round(desv, 2),
        "interpretacion": "Variabilidad significativa" if desv > 4 else "Estable"
    }

# Ejercicio 2
class OptimizacionInput(BaseModel):
    restriccion_capacidad: float

@router.post("/api/optimizacion")
def optimizar(data: OptimizacionInput):
    def costo(x):
        return 80*x[0] + 50*x[1] + 10*(x[0]-3)**2
    
    restriccion = {'type': 'ineq', 'fun': lambda x: 10*x[0] + 5*x[1] - data.restriccion_capacidad}
    res = minimize(costo, x0=[2, 4], bounds=[(0,10), (0,10)], constraints=[restriccion])
    return {
        "recurso_a": round(float(res.x[0]), 2),
        "recurso_b": round(float(res.x[1]), 2),
        "costo_optimo": round(float(res.fun), 2)
    }

# Ejercicio 3
@router.get("/api/reportes/interpolacion")
def interpolacion():
    meses_num = np.array([1, 3, 4, 6])
    ventas = np.array([12000, 14500, 15000, 18000])
    f = interp1d(meses_num, ventas, kind='linear')
    
    return {
        "meses": ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
        "ventas": [12000, int(f(2)), 14500, 15000, int(f(5)), 18000],
        "es_estimado": [False, True, False, False, True, False]
    }