from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Cliente
from pydantic import BaseModel

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])

class ClienteCreate(BaseModel):
    nombre: str
    email: str | None = None
    telefono: str | None = None
    empresa: str | None = None

class ClienteUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    telefono: str | None = None
    empresa: str | None = None
    activo: bool | None = None

@router.get("/")
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(Cliente).all()

@router.get("/{id}")
def obtener_cliente(id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.post("/")
def crear_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    db_cliente = Cliente(**cliente.model_dump())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.put("/{id}")
def actualizar_cliente(id: int, cliente_data: ClienteUpdate, db: Session = Depends(get_db)):
    db_cliente = db.query(Cliente).filter(Cliente.id == id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    update_data = cliente_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cliente, key, value)
        
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.delete("/{id}")
def eliminar_cliente(id: int, db: Session = Depends(get_db)):
    db_cliente = db.query(Cliente).filter(Cliente.id == id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(db_cliente)
    db.commit()
    return {"mensaje": f"Cliente con id {id} eliminado correctamente"}