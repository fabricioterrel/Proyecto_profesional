from fastapi import APIRouter
from pydantic import BaseModel
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import Counter

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)

router = APIRouter()

class TextoInput(BaseModel):
    texto: str

# Modelo para la búsqueda inteligente de servicios
class BusquedaInput(BaseModel):
    consulta: str

# Base de datos léxica para etiquetado de servicios
SERVICIOS_DB = {
    "Soporte Técnico PC": ["computadora", "laptop", "pc", "ayuda", "pantalla", "lenta", "teclado"],
    "Mantenimiento de Redes": ["internet", "red", "wifi", "conexion", "router", "señal"],
    "Facturación y Pagos": ["factura", "pago", "cobro", "tarjeta", "precio", "cuenta"],
    "Atención al Cliente": ["consulta", "informacion", "horario", "contacto", "servicio"]
}

PALABRAS_POSITIVAS = {"excelente", "bueno", "buen", "gran", "gracias", "felicitaciones", "felicitacion", "perfecto", "rapido", "eficiente", "mejores", "satisfecho", "genial", "gusto"}
PALABRAS_NEGATIVAS = {"malo", "mal", "pesimo", "pésimo", "lento", "terrible", "problema", "error", "reclamo", "demora", "falla", "deficiente", "queja"}

@router.post("/api/comentarios/keywords")
def keywords(data: TextoInput):
    try:
        tokens = word_tokenize(data.texto.lower(), language="spanish")
    except Exception:
        tokens = data.texto.lower().split()

    try:
        stop = set(stopwords.words("spanish"))
    except Exception:
        stop = set()

    limpios = [t for t in tokens if t.isalpha() and t not in stop]
    frecuentes = [item[0] for item in Counter(limpios).most_common(10)]
    
    score_pos = sum(1 for p in limpios if p in PALABRAS_POSITIVAS)
    score_neg = sum(1 for p in limpios if p in PALABRAS_NEGATIVAS)
    
    if score_pos > score_neg:
        categoria = "FELICITACION"
    elif score_neg > score_pos:
        categoria = "RECLAMO"
    else:
        categoria = "GENERAL"

    return {
        "keywords": frecuentes,
        "categoria": categoria,
        "tokens": limpios if limpios else tokens
    }

# --- EJERCICIO 6: Buscador inteligente de servicios ---
@router.post("/api/buscar-servicios")
def buscar_servicios(data: BusquedaInput):
    try:
        tokens = word_tokenize(data.consulta.lower(), language="spanish")
    except Exception:
        tokens = data.consulta.lower().split()

    limpios = [t.lower() for t in tokens if t.isalpha()]

    # Comparación de tokens normalizados con etiquetas de servicios
    coincidencias = []
    for servicio, etiquetas in SERVICIOS_DB.items():
        if any(token in etiquetas for token in limpios):
            coincidencias.append(servicio)

    return {
        "tokens": limpios,
        "coincidencias": coincidencias if coincidencias else ["Soporte General / Consulta"]
    }