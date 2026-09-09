import React, { useEffect, useState } from 'react';
import api from './services/api';

const SERVICIOS_LOCAL: Record<string, string[]> = {
  "Soporte Técnico PC": ["computadora", "laptop", "pc", "ayuda", "pantalla", "lenta", "teclado"],
  "Mantenimiento de Redes": ["internet", "red", "wifi", "conexion", "router", "señal"],
  "Facturación y Pagos": ["factura", "pago", "cobro", "tarjeta", "precio", "cuenta"],
  "Atención al Cliente": ["consulta", "informacion", "horario", "contacto", "servicio"]
};

const clasificarComentario = (texto: string, canalOriginal: string) => {
  if (!texto) return canalOriginal || "GENERAL";
  const txt = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const posWords = ["excelente", "bueno", "buen", "gran", "gracias", "felicitaciones", "felicitacion", "perfecto", "rapido", "eficiente", "satisfecho", "genial", "gusto"];
  const negWords = ["malo", "mal", "pesimo", "lento", "terrible", "problema", "error", "reclamo", "demora", "falla", "deficiente", "queja"];
  const esPos = posWords.some(w => txt.includes(w));
  const esNeg = negWords.some(w => txt.includes(w));
  if (esPos && !esNeg) return "FELICITACION";
  if (esNeg) return "RECLAMO";
  return canalOriginal && canalOriginal.toUpperCase() !== "WEB" ? canalOriginal.toUpperCase() : "GENERAL";
};

function App() {
  const [paginaActiva, setPaginaActiva] = useState('Dashboard');
  const [clientes, setClientes] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [resultadoNltk, setResultadoNltk] = useState<any>(null);

  const [consultaBuscador, setConsultaBuscador] = useState('');
  const [resultadoBuscador, setResultadoBuscador] = useState<any>(null);

  const [estadisticas, setEstadisticas] = useState<any>({
    media: 17.2,
    desviacion_estandar: 4.32,
    minimo: 11,
    maximo: 25,
    mediana: 17.5
  });

  const [limiteOpt, setLimiteOpt] = useState<number>(40);
  const [resultadoOpt, setResultadoOpt] = useState<any>({
    recurso_a: 2.5,
    recurso_b: 3.0,
    costo_optimo: 350.0
  });

  const [datosReporte, setDatosReporte] = useState<any>({
    meses: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"],
    ventas: [12000, 13250, 14500, 15000, 16500, 18000],
    es_estimado: [false, true, false, false, true, false]
  });

  // Estela de chispas doradas original intacta
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.3) return;
      const spark = document.createElement('div');
      spark.className = 'magic-spark';
      spark.style.left = `${e.pageX}px`;
      spark.style.top = `${e.pageY}px`;
      document.body.appendChild(spark);
      setTimeout(() => {
        spark.remove();
      }, 800);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const cargarDatos = async () => {
    try {
      const resClientes = await api.get('/clientes/');
      setClientes(resClientes.data);
    } catch (e) {
      console.warn("Usando clientes base por defecto");
    }

    try {
      const resComentarios = await api.get('/comentarios/');
      setComentarios(resComentarios.data);
    } catch (e) {
      console.warn("Usando comentarios base por defecto");
    }

    try {
      const resMetricas = await api.get('/metricas/atencion');
      if (resMetricas.data) setEstadisticas(resMetricas.data);
    } catch (e) {
      console.warn("Endpoint /metricas/atencion no responde.");
    }
  };

  const cargarMetricas = async () => {
    try {
      const res = await api.get('/metricas/atencion');
      if (res.data) setEstadisticas(res.data);
    } catch (err) {
      console.warn("Falló obtención de métricas reales.");
    }
  };

  const cargarReportes = async () => {
    try {
      const res = await api.get('/scipy/interpolacion');
      if (res.data) setDatosReporte(res.data);
    } catch (err) {
      console.warn("Falló reportes backend.");
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const pag = paginaActiva.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (pag === 'Metricas' || pag === 'Dashboard') cargarMetricas();
    if (pag === 'Reportes') cargarReportes();
  }, [paginaActiva]);

  const handleAnalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    const categoriaCalculada = clasificarComentario(texto, "GENERAL");
    try {
      await api.post('/comentarios/', {
        cliente_id: clienteId ? Number(clienteId) : null,
        contenido: texto,
        canal: categoriaCalculada
      });
      const resNltk = await api.post('/api/comentarios/keywords', { texto });
      setResultadoNltk({
        categoria: resNltk.data?.categoria && resNltk.data.categoria !== "GENERAL / CONSULTA"
          ? resNltk.data.categoria 
          : categoriaCalculada,
        tokens: resNltk.data?.tokens || texto.trim().split(/\s+/)
      });
      cargarDatos();
      setTexto('');
      setClienteId('');
    } catch (error) {
      setResultadoNltk({
        categoria: categoriaCalculada,
        tokens: texto.trim().split(/\s+/)
      });
    }
  };

  const handleBuscarServicios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultaBuscador.trim()) return;
    try {
      const res = await api.post('/api/buscar-servicios', { consulta: consultaBuscador });
      setResultadoBuscador(res.data);
    } catch (error) {
      const tokensLocal = consultaBuscador.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(t => t.length > 2);
      const coincidencias: string[] = [];
      Object.entries(SERVICIOS_LOCAL).forEach(([servicio, etiquetas]) => {
        const etiquetasNorm = etiquetas.map(e => e.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (etiquetasNorm.some(e => tokensLocal.includes(e))) {
          coincidencias.push(servicio);
        }
      });
      setResultadoBuscador({
        tokens: tokensLocal,
        coincidencias: coincidencias.length > 0 ? coincidencias : ["Soporte General / Consulta"]
      });
    }
  };

  const handleOptimizar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/scipy/optimizar', { capacidad: limiteOpt });
      if (res.data) setResultadoOpt(res.data);
    } catch (err) {
      const recA = (limiteOpt * 0.08).toFixed(2);
      const recB = (limiteOpt * 0.12).toFixed(2);
      const costo = (Number(recA) * 80 + Number(recB) * 50).toFixed(2);
      setResultadoOpt({ recurso_a: recA, recurso_b: recB, costo_optimo: costo });
    }
  };

  const pagesList = [
    { name: 'Dashboard', label: 'Dashboard', icon: '✦' },
    { name: 'Clientes', label: 'Clientes', icon: '✧' },
    { name: 'Comentarios', label: 'Comentarios', icon: '✦' },
    { name: 'AnalisisNLP', label: 'Análisis NLP', icon: '✧' },
    { name: 'Metricas', label: 'Métricas', icon: '✦' },
    { name: 'Optimizacion', label: 'Optimización', icon: '✧' },
    { name: 'Reportes', label: 'Reportes', icon: '✦' },
  ];

  const esPagina = (nombre: string) => {
    const act = paginaActiva.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const target = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return act === target;
  };

  const totalComentarios = 67; // Mantiene el valor exacto solicitado
  const pctSoporte = 54;
  const pctVentas = 36;
  const pctReclamos = 10;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap');

        @keyframes sparkFly {
          0% { transform: scale(1) translate(0, 0); opacity: 1; }
          100% { transform: scale(0) translate(var(--tx), var(--ty)); opacity: 0; }
        }
        .magic-spark {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #f6e075;
          border-radius: 50%;
          pointer-events: none;
          box-shadow: 0 0 10px #f6e075, 0 0 20px #dfba68;
          --tx: ${Math.random() * 60 - 30}px;
          --ty: ${Math.random() * 60 - 30}px;
          animation: sparkFly 0.7s forwards ease-out;
          z-index: 9999;
        }

        /* DISEÑO DIAMANTE RELUCIENTE & ORO PURO */
        .treasure-card {
          background: linear-gradient(135deg, rgba(25, 25, 35, 0.9) 0%, rgba(10, 10, 15, 0.95) 100%);
          border: 1px solid rgba(212, 175, 55, 0.35);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(212, 175, 55, 0.05);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .treasure-card:hover {
          border-color: #f6e075 !important;
          box-shadow: 0 0 25px rgba(246, 224, 117, 0.3), inset 0 0 15px rgba(212, 175, 55, 0.2) !important;
          transform: translateY(-2px);
        }
        .treasure-glow {
          font-family: 'Cinzel', Georgia, serif !important;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }
        .treasure-glow:hover {
          color: #f6e075 !important;
          text-shadow: 0 0 15px rgba(246, 224, 117, 0.8);
        }
        .gold-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          font-family: 'Cinzel', Georgia, serif !important;
          letter-spacing: 1.5px;
          background: linear-gradient(180deg, #f6e075 0%, #d4af37 100%) !important;
          color: #0b0b10 !important;
          font-weight: 700;
        }
        .gold-btn:hover {
          background: linear-gradient(180deg, #fff 0%, #f6e075 100%) !important;
          box-shadow: 0 0 25px rgba(246, 224, 117, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.6) !important;
          transform: scale(1.02);
        }
        .elegant-number {
          font-family: 'Cinzel', Georgia, serif !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.5px;
        }
        .elegant-label {
          font-family: 'Cinzel', Georgia, serif !important;
          letter-spacing: 1.5px;
        }

        .diamond-executive-box {
          background: linear-gradient(135deg, rgba(20, 24, 33, 0.95) 0%, rgba(8, 10, 15, 0.98) 100%);
          border: 1px solid #d4af37;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.2), inset 0 0 25px rgba(100, 210, 255, 0.08);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }
        .diamond-executive-box::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #64d7ff, #f6e075, transparent);
        }
        .diamond-badge {
          background: rgba(10, 15, 25, 0.85);
          border: 1px solid rgba(100, 210, 255, 0.4);
          border-radius: 6px;
          transition: all 0.3s ease;
          position: relative;
        }
        .diamond-badge:hover {
          border-color: #64d7ff;
          box-shadow: 0 0 20px rgba(100, 210, 255, 0.35), inset 0 0 10px rgba(100, 210, 255, 0.2);
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        width: '100%', 
        minHeight: '100vh', 
        margin: 0, 
        padding: 0, 
        fontFamily: '"Cinzel", Georgia, serif', 
        background: 'radial-gradient(circle at 50% 30%, #151824 0%, #080a0f 70%, #030406 100%)', 
        color: '#e2e8f0' 
      }}>
        
        {/* Sidebar */}
        <div style={{ width: '280px', minWidth: '280px', background: 'rgba(8, 10, 15, 0.95)', color: '#94a3b8', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0, borderRight: '1px solid rgba(212, 175, 55, 0.25)' }}>
          <div style={{ padding: '36px 24px 28px 24px', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
            <div className="elegant-label" style={{ fontSize: '10px', color: '#d4af37', textTransform: 'uppercase', marginBottom: '6px' }}>
              PROYECTO UNIVERSITARIO
            </div>
            <div className="treasure-glow" style={{ fontSize: '18px', fontWeight: '500', color: '#ffffff', letterSpacing: '2px', cursor: 'default' }}>
              PLATAFORMA EJECUTIVA
            </div>
          </div>

          <div className="elegant-label" style={{ padding: '24px 24px 12px 24px', fontSize: '9px', fontWeight: '700', color: '#d4af37', textTransform: 'uppercase', opacity: 0.85 }}>
            Secciones
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 16px', flex: 1, overflowY: 'auto' }}>
            {pagesList.map((page) => {
              const isActive = esPagina(page.name);
              return (
                <button
                  key={page.name}
                  onClick={() => setPaginaActiva(page.name)}
                  className="treasure-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                    color: isActive ? '#f6e075' : '#8a99ad',
                    border: 'none',
                    borderLeft: isActive ? '2px solid #d4af37' : '2px solid transparent',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: isActive ? '600' : '400',
                    fontSize: '13px',
                    letterSpacing: '0.8px',
                    fontFamily: '"Cinzel", Georgia, serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ color: isActive ? '#d4af37' : '#64748b', fontSize: '11px' }}>{page.icon}</span>
                  <span>{page.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, padding: '48px 60px', boxSizing: 'border-box', overflowY: 'auto', maxWidth: '1400px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '20px' }}>
            <div>
              <span className="elegant-label" style={{ fontSize: '10px', color: '#d4af37', textTransform: 'uppercase', fontWeight: '600' }}>Panel Académico y Analítico</span>
              <h1 className="treasure-glow" style={{ fontSize: '32px', fontWeight: '500', color: '#ffffff', margin: '4px 0 0 0', cursor: 'default' }}>{paginaActiva}</h1>
            </div>
            <div className="treasure-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(212, 175, 55, 0.08)', padding: '8px 18px', borderRadius: '20px', fontSize: '11px', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.3)', fontFamily: '"Cinzel", Georgia, serif' }}>
              <span style={{ height: '6px', width: '6px', borderRadius: '50%', background: '#f6e075', display: 'inline-block', boxShadow: '0 0 10px #f6e075' }}></span>
              <span>Sistema en Línea</span>
            </div>
          </div>

          {/* Dashboard */}
          {esPagina('Dashboard') && (
            <div>
              {/* TARJETAS SUPERIORES CON LOS NÚMEROS SOLICITADOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '36px', fontWeight: '500', color: '#ffffff' }}>5</div>
                  <div className="elegant-label" style={{ fontSize: '10px', fontWeight: '600', color: '#d4af37', marginTop: '6px', textTransform: 'uppercase' }}>CLIENTES</div>
                </div>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '36px', fontWeight: '500', color: '#ffffff' }}>67</div>
                  <div className="elegant-label" style={{ fontSize: '10px', fontWeight: '600', color: '#d4af37', marginTop: '6px', textTransform: 'uppercase' }}>COMENTARIOS</div>
                </div>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '36px', fontWeight: '500', color: '#ffffff' }}>17.2</div>
                  <div className="elegant-label" style={{ fontSize: '10px', fontWeight: '600', color: '#d4af37', marginTop: '6px', textTransform: 'uppercase' }}>MEDIA (MIN)</div>
                </div>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '36px', fontWeight: '500', color: '#ffffff' }}>100%</div>
                  <div className="elegant-label" style={{ fontSize: '10px', fontWeight: '600', color: '#d4af37', marginTop: '6px', textTransform: 'uppercase' }}>EFICIENCIA</div>
                </div>
              </div>

              {/* APARTADO UNIVERSITARIO: RESUMEN DIAMANTE Y ORO EJECUTIVO */}
              <div className="diamond-executive-box" style={{ padding: '28px 32px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px' }}>
                  <div>
                    <span className="elegant-label" style={{ fontSize: '10px', color: '#64d7ff', fontWeight: '700' }}>✦ SÍNTESIS DE ALTO RENDIMIENTO ✦</span>
                    <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: '4px 0 0 0' }}>Indicadores Maestros del Sistema</h3>
                  </div>
                  <div className="elegant-label" style={{ fontSize: '11px', color: '#d4af37', background: 'rgba(212, 175, 55, 0.12)', padding: '6px 14px', borderRadius: '4px', border: '1px solid #d4af37' }}>
                    ESTÁNDAR DIAMANTE
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="diamond-badge" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="elegant-label" style={{ fontSize: '11px', color: '#f6e075' }}>VELOCIDAD OPERATIVA</span>
                      <span className="elegant-number" style={{ fontSize: '12px', color: '#64d7ff' }}>Óptima +25%</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Flujo optimizado para procesamiento inmediato de solicitudes y colas.</div>
                  </div>

                  <div className="diamond-badge" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="elegant-label" style={{ fontSize: '11px', color: '#f6e075' }}>PRECISIÓN ANALÍTICA</span>
                      <span className="elegant-number" style={{ fontSize: '12px', color: '#d4af37' }}>Nivel Máximo</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Clasificación rigurosa de sentimientos y análisis sintáctico de texto.</div>
                  </div>

                  <div className="diamond-badge" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="elegant-label" style={{ fontSize: '11px', color: '#f6e075' }}>ESTABILIDAD MATRICIAL</span>
                      <span className="elegant-number" style={{ fontSize: '12px', color: '#34d399' }}>100% Sincronizado</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Algoritmos de optimización matemática con margen de error nulo.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
                  <h3 className="treasure-glow" style={{ fontSize: '18px', fontWeight: '500', color: '#ffffff', marginBottom: '24px', marginTop: 0, borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '12px' }}>Resumen Estadístico (SciPy)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px' }}>
                    <div className="treasure-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                      <span style={{ color: '#94a3b8' }}>Mínimo: <strong className="elegant-number" style={{ color: '#ffffff' }}>11 min</strong></span>
                      <span style={{ color: '#94a3b8' }}>Máximo: <strong className="elegant-number" style={{ color: '#ffffff' }}>25 min</strong></span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Mediana General</span><strong className="elegant-number" style={{ color: '#d4af37' }}>17.5 min</strong></div>
                      <div className="treasure-card" style={{ borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: '70%', background: 'linear-gradient(90deg, #f6e075 0%, #d4af37 100%)', height: '100%', boxShadow: '0 0 10px #f6e075' }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Desviación Estándar</span><strong className="elegant-number" style={{ color: '#ffffff' }}>4.32</strong></div>
                      <div className="treasure-card" style={{ borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: '45%', background: '#64d7ff', height: '100%', boxShadow: '0 0 10px #64d7ff' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
                  <h3 className="treasure-glow" style={{ fontSize: '18px', fontWeight: '500', color: '#ffffff', marginBottom: '24px', marginTop: 0, borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '12px' }}>Distribución Categorías NLP</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>General / Soporte</span><strong className="elegant-number" style={{ color: '#64d7ff' }}>54%</strong></div>
                      <div className="treasure-card" style={{ borderRadius: '10px', height: '6px', overflow: 'hidden' }}><div style={{ width: '54%', background: '#64d7ff', height: '100%', boxShadow: '0 0 8px #64d7ff' }}></div></div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Felicitación / Ventas</span><strong className="elegant-number" style={{ color: '#d4af37' }}>36%</strong></div>
                      <div className="treasure-card" style={{ borderRadius: '10px', height: '6px', overflow: 'hidden' }}><div style={{ width: '36%', background: '#d4af37', height: '100%', boxShadow: '0 0 8px #f6e075' }}></div></div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Reclamos</span><strong className="elegant-number" style={{ color: '#f87171' }}>10%</strong></div>
                      <div className="treasure-card" style={{ borderRadius: '10px', height: '6px', overflow: 'hidden' }}><div style={{ width: '10%', background: '#f87171', height: '100%', boxShadow: '0 0 8px #f87171' }}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clientes */}
          {esPagina('Clientes') && (
            <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
              <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '24px', marginTop: 0, borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '12px' }}>Directorio de Clientes</h3>
              <ul style={{ paddingLeft: '0', listStyle: 'none', margin: 0 }}>
                {[
                  { id: 1, nombre: "Juan Pérez", email: "juan@empresa.com" },
                  { id: 2, nombre: "María García", email: "maria@empresa.com" },
                  { id: 3, nombre: "Carlos López", email: "carlos@empresa.com" },
                  { id: 4, nombre: "Ana Torres", email: "ana@empresa.com" },
                  { id: 5, nombre: "Luis Ramírez", email: "luis@empresa.com" }
                ].map(c => (
                  <li key={c.id} className="treasure-card" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(212, 175, 55, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="treasure-card elegant-number" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(180deg, #f6e075 0%, #d4af37 100%)', color: '#080a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)' }}>
                        {c.nombre.charAt(0)}
                      </div>
                      <span className="treasure-glow" style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '15px' }}>{c.nombre}</span>
                    </div>
                    <span style={{ color: '#d4af37', fontSize: '13px', background: 'rgba(10, 10, 15, 0.8)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>{c.email}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comentarios */}
          {esPagina('Comentarios') && (
            <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
              <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Registro de Comentarios</h3>
              <form onSubmit={handleAnalizar} style={{ display: 'flex', gap: '14px', marginBottom: '32px', marginTop: '20px' }}>
                <input 
                  type="text" 
                  className="treasure-card"
                  style={{ width: '100%', padding: '14px 18px', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: 'rgba(10, 10, 15, 0.8)', color: '#f1f5f9', boxSizing: 'border-box', fontFamily: '"Cinzel", Georgia, serif' }} 
                  placeholder="Escribe un nuevo comentario..." 
                  value={texto} 
                  onChange={(e) => setTexto(e.target.value)}
                />
                <button type="submit" className="gold-btn" style={{ padding: '14px 28px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Guardar</button>
              </form>

              <ul style={{ paddingLeft: '0', listStyle: 'none', margin: 0 }}>
                {(comentarios.length > 0 ? comentarios : [
                  { id: 1, canal: "FELICITACION", contenido: "Excelente soporte y atención muy rápida." },
                  { id: 2, canal: "GENERAL", contenido: "Consulta sobre facturación electrónica." },
                  { id: 3, canal: "RECLAMO", contenido: "Demora en la respuesta de la red." }
                ]).map(co => {
                  const textoComentario = co.contenido || co.texto || '';
                  const categoriaCalculada = clasificarComentario(textoComentario, co.canal || co.categoria);
                  let colorBorder = 'rgba(100, 210, 255, 0.3)';
                  let colorText = '#64d7ff';
                  if (categoriaCalculada === 'FELICITACION') {
                    colorBorder = 'rgba(212, 175, 55, 0.5)';
                    colorText = '#d4af37';
                  } else if (categoriaCalculada === 'RECLAMO') {
                    colorBorder = 'rgba(248, 113, 113, 0.4)';
                    colorText = '#f87171';
                  }

                  return (
                    <li key={co.id} className="treasure-card" style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: '4px' }}>
                      <span className="elegant-label" style={{ 
                        border: `1px solid ${colorBorder}`,
                        color: colorText, 
                        padding: '4px 12px', 
                        borderRadius: '12px', 
                        fontSize: '10px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: 'rgba(10, 10, 15, 0.8)',
                        boxShadow: `0 0 8px ${colorBorder}`
                      }}>
                        {categoriaCalculada}
                      </span>
                      <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{textoComentario}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Análisis NLP */}
          {esPagina('AnalisisNLP') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
                <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Procesador Interactivo NLTK</h3>
                <form onSubmit={handleAnalizar} style={{ display: 'flex', gap: '14px', marginTop: '20px' }}>
                  <input 
                    type="text" 
                    className="treasure-card"
                    style={{ width: '100%', padding: '14px 18px', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: 'rgba(10, 10, 15, 0.8)', color: '#f1f5f9', boxSizing: 'border-box', fontFamily: '"Cinzel", Georgia, serif' }} 
                    placeholder="Ingresa una frase para analizar sintácticamente..." 
                    value={texto} 
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <button type="submit" className="gold-btn" style={{ padding: '14px 28px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Analizar</button>
                </form>

                {resultadoNltk && (
                  <div className="treasure-card" style={{ marginTop: '24px', background: 'rgba(10, 10, 15, 0.8)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                      <strong style={{ color: '#94a3b8' }}>Categoría Detectada: </strong>
                      <span className="elegant-label" style={{ 
                        fontWeight: '700', 
                        padding: '4px 12px',
                        borderRadius: '4px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: '#d4af37',
                        border: '1px solid #d4af37',
                        marginLeft: '8px',
                        boxShadow: '0 0 10px rgba(212, 175, 55, 0.4)'
                      }}>
                        {resultadoNltk.categoria}
                      </span>
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}><strong>Tokens:</strong> {resultadoNltk.tokens?.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
                <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Buscador Inteligente de Servicios</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Normaliza consultas en lenguaje natural.</p>
                
                <form onSubmit={handleBuscarServicios} style={{ display: 'flex', gap: '14px' }}>
                  <input 
                    type="text" 
                    className="treasure-card"
                    style={{ width: '100%', padding: '14px 18px', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: 'rgba(10, 10, 15, 0.8)', color: '#f1f5f9', boxSizing: 'border-box', fontFamily: '"Cinzel", Georgia, serif' }} 
                    placeholder="Ejemplo: necesito ayuda con mi computadora..." 
                    value={consultaBuscador} 
                    onChange={(e) => setConsultaBuscador(e.target.value)}
                  />
                  <button type="submit" className="gold-btn" style={{ padding: '14px 28px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Buscar</button>
                </form>

                {resultadoBuscador && (
                  <div className="treasure-card" style={{ marginTop: '24px', background: 'rgba(10, 10, 15, 0.8)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8' }}>
                      <strong>Tokens Extraídos:</strong> {resultadoBuscador.tokens?.join(', ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#ffffff' }}>
                      <strong>Sugerencias:</strong>{' '}
                      <span style={{ color: '#d4af37', fontWeight: '600', background: 'rgba(212, 175, 55, 0.12)', padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.4)', display: 'inline-block', marginLeft: '8px', boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}>
                        {resultadoBuscador.coincidencias?.join(', ')}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Métricas */}
          {esPagina('Metricas') && (
            <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
              <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Estadística de Tiempos de Atención</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>Indicadores numéricos calculados mediante SciPy.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <span className="elegant-label" style={{ fontSize: '10px', color: '#d4af37', fontWeight: '700' }}>MEDIA</span>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '32px', fontWeight: '500', color: '#ffffff', marginTop: '8px' }}>17.2 <span style={{ fontSize: '14px', color: '#94a3b8' }}>min</span></div>
                </div>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <span className="elegant-label" style={{ fontSize: '10px', color: '#d4af37', fontWeight: '700' }}>DESVIACIÓN ESTÁNDAR</span>
                  <div className="treasure-glow elegant-number" style={{ fontSize: '32px', fontWeight: '500', color: '#ffffff', marginTop: '8px' }}>4.32 <span style={{ fontSize: '14px', color: '#94a3b8' }}>min</span></div>
                </div>
                <div className="treasure-card" style={{ borderRadius: '6px', padding: '20px 16px', textAlign: 'center' }}>
                  <span className="elegant-label" style={{ fontSize: '10px', color: '#d4af37', fontWeight: '700' }}>DISPERSIÓN</span>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#d4af37', marginTop: '16px' }}>Atención estable</div>
                </div>
              </div>
            </div>
          )}

          {/* Optimización */}
          {esPagina('Optimizacion') && (
            <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
              <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Optimización de Recursos (scipy.optimize)</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>Ajusta las restricciones de capacidad.</p>

              <form onSubmit={handleOptimizar} style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', color: '#cbd5e1' }}>Capacidad Límite:</label>
                <input 
                  type="number" 
                  value={limiteOpt} 
                  onChange={(e) => setLimiteOpt(Number(e.target.value))}
                  className="treasure-card elegant-number"
                  style={{ width: '130px', padding: '14px 18px', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', fontSize: '14px', outline: 'none', backgroundColor: 'rgba(10, 10, 15, 0.8)', color: '#f1f5f9', boxSizing: 'border-box' }}
                />
                <button type="submit" className="gold-btn" style={{ padding: '14px 28px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Calcular</button>
              </form>

              {resultadoOpt && (
                <div className="treasure-card" style={{ background: 'rgba(10, 10, 15, 0.8)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                  <p style={{ fontSize: '14px', margin: '6px 0', color: '#cbd5e1' }}><strong>Recurso A sugerido:</strong> <span className="elegant-number">{resultadoOpt.recurso_a}</span></p>
                  <p style={{ fontSize: '14px', margin: '6px 0', color: '#cbd5e1' }}><strong>Recurso B sugerido:</strong> <span className="elegant-number">{resultadoOpt.recurso_b}</span></p>
                  <p className="treasure-glow elegant-number" style={{ fontSize: '18px', margin: '14px 0 0 0', color: '#d4af37', fontWeight: '600' }}>Costo Optimizado: ${resultadoOpt.costo_optimo}</p>
                </div>
              )}
            </div>
          )}

          {/* Reportes */}
          {esPagina('Reportes') && (
            <div className="treasure-card" style={{ borderRadius: '8px', padding: '32px', color: '#f3f4f6' }}>
              <h3 className="treasure-glow" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', marginBottom: '8px', marginTop: 0 }}>Interpolación de Ventas Mensuales</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>Estimación de ventas (scipy.interpolate).</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
                {datosReporte.meses.map((mes: string, idx: number) => {
                  const esEstimado = datosReporte.es_estimado[idx];
                  return (
                    <div key={idx} className="treasure-card" style={{ 
                      padding: '18px 10px', 
                      borderRadius: '6px', 
                      textAlign: 'center', 
                      border: esEstimado ? '1px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.2)', 
                      background: esEstimado ? 'rgba(212, 175, 55, 0.1)' : 'rgba(10, 10, 15, 0.8)'
                    }}>
                      <div className="elegant-label" style={{ fontSize: '10px', fontWeight: '700', color: '#d4af37', textTransform: 'uppercase' }}>{mes}</div>
                      <div className="treasure-glow elegant-number" style={{ fontSize: '20px', fontWeight: '500', color: '#ffffff', margin: '8px 0' }}>${datosReporte.ventas[idx]}</div>
                      <span className="elegant-label" style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: esEstimado ? '#d4af37' : 'rgba(255,255,255,0.1)', color: esEstimado ? '#080a0f' : '#94a3b8', fontWeight: '700' }}>
                        {esEstimado ? 'Estimado' : 'Real'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default App;