import React, { useEffect, useState } from 'react';

interface MetricasData {
  media: number;
  desviacion: number;
  interpretacion: string;
}

export const Metricas: React.FC = () => {
  const [data, setData] = useState<MetricasData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/metricas-atencion')
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Ejercicio 1 — Estadística de Tiempos de Atención</h2>
      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Media de Tiempo</p>
            <p className="text-2xl font-bold text-blue-900">{data.media} min</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Desviación Estándar</p>
            <p className="text-2xl font-bold text-purple-900">{data.desviacion} min</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-sm text-emerald-600 font-medium">Variabilidad</p>
            <p className="text-sm font-semibold text-emerald-900 mt-1">{data.interpretacion}</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Cargando métricas desde FastAPI...</p>
      )}
    </div>
  );
};

export default Metricas;