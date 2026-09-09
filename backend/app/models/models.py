from sqlalchemy import Column, Integer, String, Text, Boolean, Numeric, Date, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database.connection import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    rol = Column(String(30), nullable=False, default='usuario')
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(200))
    telefono = Column(String(50))
    empresa = Column(String(200))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Comentario(Base):
    __tablename__ = "comentarios"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="SET NULL"))
    contenido = Column(Text, nullable=False)
    canal = Column(String(30), default='web')
    estado = Column(String(30), default='pendiente')
    categoria = Column(String(50))
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    procesado = Column(Boolean, default=False)

class AnalisisNLP(Base):
    __tablename__ = "analisis_nlp"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comentario_id = Column(Integer, ForeignKey("comentarios.id", ondelete="CASCADE"), nullable=False)
    idioma = Column(String(20), default='es')
    cantidad_palabras = Column(Integer, default=0)
    palabras_limpias = Column(JSON)
    palabras_frecuentes = Column(JSON)
    categoria_detectada = Column(String(100))
    confianza = Column(Numeric(5, 4))
    fecha_analisis = Column(DateTime(timezone=True), server_default=func.now())

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TiemposAtencion(Base):
    __tablename__ = "tiempos_atencion"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="SET NULL"))
    comentario_id = Column(Integer, ForeignKey("comentarios.id", ondelete="SET NULL"))
    tiempo_minutos = Column(Numeric(10, 2), nullable=False)
    fecha = Column(Date, nullable=False, server_default=func.current_date())
    operador = Column(String(150))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MetricasEstadisticas(Base):
    __tablename__ = "metricas_estadisticas"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    cantidad_registros = Column(Integer, nullable=False)
    media = Column(Numeric(12, 4))
    mediana = Column(Numeric(12, 4))
    desviacion_estandar = Column(Numeric(12, 4))
    minimo = Column(Numeric(12, 4))
    maximo = Column(Numeric(12, 4))
    percentil_25 = Column(Numeric(12, 4))
    percentil_75 = Column(Numeric(12, 4))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Optimizacion(Base):
    __tablename__ = "optimizaciones"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text)
    parametros_entrada = Column(JSON, nullable=False)
    resultado = Column(JSON)
    costo_inicial = Column(Numeric(14, 4))
    costo_optimizado = Column(Numeric(14, 4))
    estado = Column(String(30), default='pendiente')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Auditoria(Base):
    __tablename__ = "auditoria"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    accion = Column(String(100), nullable=False)
    tabla = Column(String(100))
    registro_id = Column(Integer)
    detalles = Column(JSON)
    ip = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now())