import unicodedata
from fastapi import APIRouter
from pydantic import BaseModel
from collections import Counter
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

router = APIRouter()

class TextoInput(BaseModel):
    texto: str

class BusquedaInput(BaseModel):
    consulta: str

def quitar_tildes(texto: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )

SERVICIOS_DB = {
    "Soporte Técnico PC": ["computadora", "laptop", "pc", "ayuda", "pantalla", "lenta", "teclado", "equipo", "ordenador"],
    "Mantenimiento de Redes": ["internet", "red", "wifi", "conexion", "router", "senal", "cable", "modem"],
    "Facturación y Pagos": ["factura", "pago", "cobro", "tarjeta", "precio", "cuenta", "boleta", "saldo"],
    "Atención al Cliente": ["consulta", "informacion", "horario", "contacto", "servicio", "duda"]
}

PALABRAS_POSITIVAS = {"excelente", "bueno", "buen", "gran", "gracias", "felicitaciones", "felicitacion", "perfecto", "rapido", "eficiente", "mejores", "satisfecho", "genial", "gusto"}
PALABRAS_NEGATIVAS = {"malo", "mal", "pesimo", "lento", "terrible", "problema", "error", "reclamo", "demora", "falla", "deficiente", "queja"}

@router.post("/api/comentarios/keywords")
def keywords(data: TextoInput):
    texto_limpio_tildes = quitar_tildes(data.texto.lower())
    
    try:
        tokens = word_tokenize(texto_limpio_tildes, language="spanish")
    except Exception:
        tokens = texto_limpio_tildes.split()

    try:
        stop = set(stopwords.words("spanish"))
    except Exception:
        stop = set()

    limpios = [t for t in tokens if t.isalpha() and t not in stop]
    
    score_pos = sum(1 for p in limpios if p in PALABRAS_POSITIVAS)
    score_neg = sum(1 for p in limpios if p in PALABRAS_NEGATIVAS)
    
    if score_pos > score_neg:
        categoria = "FELICITACION"
    elif score_neg > score_pos:
        categoria = "RECLAMO"
    else:
        categoria = "GENERAL"

    return {
        "keywords": [item[0] for item in Counter(limpios).most_common(10)],
        "categoria": categoria,
        "tokens": limpios if limpios else tokens
    }

@router.post("/api/buscar-servicios")
def buscar_servicios(data: BusquedaInput):
    consulta_norm = quitar_tildes(data.consulta.lower())
    
    try:
        tokens = word_tokenize(consulta_norm, language="spanish")
    except Exception:
        tokens = consulta_norm.split()

    limpios = [t for t in tokens if t.isalpha()]

    coincidencias = []
    for servicio, etiquetas in SERVICIOS_DB.items():
        etiquetas_norm = [quitar_tildes(e) for e in etiquetas]
        if any(token in etiquetas_norm for token in limpios):
            coincidencias.append(servicio)

    return {
        "tokens": limpios,
        "coincidencias": coincidencias if coincidencias else ["Soporte General / Consulta"]
    }