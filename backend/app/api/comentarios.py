from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db
from app.models.models import Comentario
from pydantic import BaseModel
import json
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import Counter

router = APIRouter(prefix="/api/comentarios", tags=["Comentarios"])

class ComentarioCreate(BaseModel):
    cliente_id: int | None = None
    contenido: str
    canal: str = "web"

@router.get("/")
def listar_comentarios(db: Session = Depends(get_db)):
    return db.query(Comentario).all()

@router.post("/")
def crear_comentario(comentario: ComentarioCreate, db: Session = Depends(get_db)):
    # 1. Guardar el comentario principal
    db_comentario = Comentario(**comentario.model_dump())
    db.add(db_comentario)
    db.commit()
    db.refresh(db_comentario)

    # 2. Procesar automáticamente con NLTK
    tokens = word_tokenize(db_comentario.contenido.lower(), language="spanish")
    stop = set(stopwords.words("spanish"))
    limpios = [t for t in tokens if t.isalpha() and t not in stop]
    frecuencias = Counter(limpios).most_common(1)
    
    palabras_frec = [{"palabra": p, "frecuencia": f} for p, f in frecuencias]
    categoria = "FELICITACION" if any(w in limpios for w in ["excelente", "rápido", "bueno", "gusto", "gran"]) else "GENERAL"

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
        raise HTTPException(status_code=500, detail=f"Error al registrar el análisis NLP: {str(e)}")

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