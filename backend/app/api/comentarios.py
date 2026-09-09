from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db
from pydantic import BaseModel
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
    texto: str | None = None
    canal: str = "web"

@router.get("/")
def listar_comentarios(db: Session = Depends(get_db)):
    try:
        sql = text("SELECT id, cliente_id, contenido, canal FROM comentarios ORDER BY id DESC;")
        resultados = db.execute(sql).fetchall()
        comentarios = [
            {
                "id": r[0],
                "cliente_id": r[1],
                "contenido": r[2],
                "canal": r[3]
            } 
            for r in resultados
        ]
        return comentarios
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar: {str(e)}")

@router.post("/")
def crear_comentario(comentario: ComentarioCreate, db: Session = Depends(get_db)):
    texto_a_guardar = comentario.contenido or comentario.texto
    if not texto_a_guardar:
        raise HTTPException(status_code=422, detail="El contenido o texto del comentario es obligatorio")

    try:
        # 1. Guardar directamente en la tabla comentarios de Supabase
        sql_insert = text("""
            INSERT INTO comentarios (cliente_id, contenido, canal) 
            VALUES (:cliente_id, :contenido, :canal) 
            RETURNING id, cliente_id, contenido, canal;
        """)
        
        res = db.execute(sql_insert, {
            "cliente_id": comentario.cliente_id,
            "contenido": texto_a_guardar,
            "canal": comentario.canal
        }).fetchone()
        db.commit()

        comentario_id = res[0]
        db_comentario = {
            "id": res[0],
            "cliente_id": res[1],
            "contenido": res[2],
            "canal": res[3]
        }

        # 2. Procesar automáticamente con NLTK
        try:
            tokens = word_tokenize(texto_a_guardar.lower(), language="spanish")
        except Exception:
            tokens = texto_a_guardar.lower().split()

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

        # 3. Guardar el resultado en analisis_nlp
        try:
            db.execute(
                text("""
                    INSERT INTO analisis_nlp (comentario_id, idioma, cantidad_palabras, palabras_limpias, palabras_frecuentes, categoria_detectada) 
                    VALUES (:c_id, :idio, :cant, :limp, :frec, :cat)
                """),
                {
                    "c_id": comentario_id, 
                    "idio": "es", 
                    "cant": len(tokens), 
                    "limp": json.dumps(limpios), 
                    "frec": json.dumps(palabras_frec), 
                    "cat": categoria
                }
            )
            db.commit()
        except Exception:
            db.rollback()

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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el comentario: {str(e)}")

@router.delete("/{id}")
def eliminar_comentario(id: int, db: Session = Depends(get_db)):
    try:
        sql = text("DELETE FROM comentarios WHERE id = :id RETURNING id;")
        resultado = db.execute(sql, {"id": id}).fetchone()
        db.commit()
        if not resultado:
            raise HTTPException(status_code=404, detail="Comentario no encontrado")
        return {"mensaje": f"Comentario con id {id} eliminado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))