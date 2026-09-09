import React, { useEffect, useState } from 'react';

interface ReporteData {
  meses: string[];
  ventas: number[];
  es_estimado: boolean[];
}

export const Reportes: React.FC = () => {
  const [data, setData] = useState<ReporteData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/reportes/interpolacion')
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Ejercicio 3 — Interpolación de Ventas Mensuales</h2>
      
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {data.meses.map((mes, idx) => (
            <div key={idx} className={`p-3 rounded-lg border text-center ${data.es_estimado[idx] ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 font-bold uppercase">{mes}</p>
              <p className="text-lg font-extrabold text-gray-800 mt-1">${data.ventas[idx]}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${data.es_estimado[idx] ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
                {data.es_estimado[idx] ? 'Estimado' : 'Real'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Cargando reporte de estimaciones...</p>
      )}
    </div>
  );
};

export default Reportes;