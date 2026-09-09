import React, { useState } from 'react';

export const Optimizacion: React.FC = () => {
  const [limite, setLimite] = useState<number>(40);
  const [resultado, setResultado] = useState<any>(null);

  const calcularOptimizacion = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/optimizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restriccion_capacidad: limite })
      });
      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Ejercicio 2 — Optimización de Recursos (SciPy)</h2>
      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium">Restricción de Capacidad:</label>
        <input 
          type="number" 
          value={limite} 
          onChange={(e) => setLimite(Number(e.target.value))}
          className="border rounded px-3 py-1 text-sm w-32"
        />
        <button 
          onClick={calcularOptimizacion} 
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Optimizar
        </button>
      </div>

      {resultado && (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-2 mt-4 text-sm">
          <p><strong>Recurso A Recomendado:</strong> {resultado.recurso_a}</p>
          <p><strong>Recurso B Recomendado:</strong> {resultado.recurso_b}</p>
          <p className="text-emerald-600 font-bold">Costo Mínimo Optimizado: ${resultado.costo_optimo}</p>
        </div>
      )}
    </div>
  );
};

export default Optimizacion;