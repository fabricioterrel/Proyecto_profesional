from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db
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

# --- NUEVO: Endpoint para GUARDAR el comentario en Supabase ---
@router.post("/api/comentarios")
def crear_comentario(data: TextoInput, db: Session = Depends(get_db)):
    try:
        # Analizar categoría automáticamente con tu misma lógica NLTK
        try:
            tokens = word_tokenize(data.texto.lower(), language="spanish")
        except Exception:
            tokens = data.texto.lower().split()

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

        # Insertar directamente en la base de datos de Supabase
        sql = text("INSERT INTO comentarios (contenido, categoria) VALUES (:contenido, :categoria) RETURNING id, contenido, categoria;")
        result = db.execute(sql, {"contenido": data.texto, "categoria": categoria}).fetchone()
        db.commit()
        
        return {
            "mensaje": "Comentario guardado con éxito",
            "comentario": {
                "id": result[0],
                "contenido": result[1],
                "categoria": result[2]
            }
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

# --- NUEVO: Endpoint para OBTENER todos los comentarios de la base de datos ---
@router.get("/api/comentarios")
def obtener_comentarios(db: Session = Depends(get_db)):
    try:
        sql = text("SELECT id, contenido, categoria FROM comentarios ORDER BY id DESC;")
        resultados = db.execute(sql).fetchall()
        comentarios = [{"id": r[0], "contenido": r[1], "categoria": r[2]} for r in resultados]
        return {"comentarios": comentarios}
    except Exception as e:
        return {"comentarios": [], "error": str(e)}

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

    coincidencias = []
    for servicio, etiquetas in SERVICIOS_DB.items():
        if any(token in etiquetas for token in limpios):
            coincidencias.append(servicio)

    return {
        "tokens": limpios,
        "coincidencias": coincidencias if coincidencias else ["Soporte General / Consulta"]
    }