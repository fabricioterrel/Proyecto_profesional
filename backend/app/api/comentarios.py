from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db
from app.models.models import Comentario
from pydantic import BaseModel, Field
import json
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import Counter

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)

router = APIRouter(prefix="/api/comentarios", tags=["Comentarios"])

class ComentarioCreate(BaseModel):
    cliente_id: int | None = None
    contenido: str | None = None
    texto: str | None = None  # Soporte por si el frontend manda "texto" en lugar de "contenido"
    canal: str = "web"

@router.get("/")
def listar_comentarios(db: Session = Depends(get_db)):
    return db.query(Comentario).all()

@router.post("/")
def crear_comentario(comentario: ComentarioCreate, db: Session = Depends(get_db)):
    # Unificar si el frontend envió 'contenido' o 'texto'
    texto_a_guardar = comentario.contenido or comentario.texto
    if not texto_a_guardar:
        raise HTTPException(status_code=422, detail="El contenido o texto del comentario es obligatorio")

    # 1. Guardar el comentario principal usando SQLAlchemy
    db_comentario = Comentario(
        cliente_id=comentario.cliente_id,
        contenido=texto_a_guardar,
        canal=comentario.canal
    )
    db.add(db_comentario)
    db.commit()
    db.refresh(db_comentario)

    # 2. Procesar automáticamente con NLTK
    try:
        tokens = word_tokenize(db_comentario.contenido.lower(), language="spanish")
    except Exception:
        tokens = db_comentario.contenido.lower().split()

    try:
        stop = set(stopwords.words("spanish"))
    except Exception:
        stop = set()

    limpios = [t for t in tokens if t.isalpha() and t not in stop]
    frecuencias = Counter(limpios).most_common(1)
    
    palabras_frec = [{"palabra": p, "frecuencia": f} for p, f in frecuencias]
    
    palabras_pos = ["excelente", "rápido", "bueno", "gusto", "gran", "felicitaciones", "felicitacion", "perfecto"]
    palabras_neg = ["malo", "mal", "pesimo", "lento", "terrible", "problema", "error", "reclamo"]
    
    score_pos = sum(1 for w in limpios if w in palabras_pos)
    score_neg = sum(1 for w in limpios if w in palabras_neg)
    
    if score_pos > score_neg:
        categoria = "FELICITACION"
    elif score_neg > score_pos:
        categoria = "RECLAMO"
    else:
        categoria = "GENERAL"

    # 3. Guardar el resultado vinculado en la tabla analisis_nlp
    try:
        db.execute(
            text("""
                INSERT INTO analisis_nlp (comentario_id, idioma, cantidad_palabras, palabras_limpias, palabras_frecuentes, categoria_detectada) 
                VALUES (:c_id, :idio, :cant, :limp, :frec, :cat)
            """),
            {
                "c_id": db_comentario.id, 
                "idio": "es", 
                "cant": len(tokens), 
                "limp": json.dumps(limpios), 
                "frec": json.dumps(palabras_frec), 
                "cat": categoria
            }
        )
        db.commit()
    except Exception as e:
        db.rollback()
        # No matamos la petición si falla el NLP secundario, pero dejamos constancia o pasamos

    return {
        "comentario": db_comentario,
        "analisis_nlp": {
            "idioma": "es",
            "cantidad_palabras": len(tokens),
            "palabras_limpias": limpios,
            "palabras_frecuentes": palabras_frec,
            "categoria_detectada": categoria
        }
    }

@router.delete("/{id}")
def eliminar_comentario(id: int, db: Session = Depends(get_db)):
    comentario = db.query(Comentario).filter(Comentario.id == id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    db.delete(comentario)
    db.commit()
    return {"mensaje": f"Comentario con id {id} eliminado correctamente"}