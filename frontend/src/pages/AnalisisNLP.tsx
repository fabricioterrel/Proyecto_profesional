import React, { useState } from 'react';

export const AnalisisNLP: React.FC = () => {
  const [texto, setTexto] = useState<string>("El servicio fue rápido y el equipo brindó una excelente atención");
  const [keywords, setKeywords] = useState<string[]>([]);

  const analizarComentario = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/comentarios/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto })
      });
      const data = await res.json();
      setKeywords(data.keywords);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Ejercicio 4 — Análisis NLTK de Comentarios</h2>
      <textarea 
        value={texto} 
        onChange={(e) => setTexto(e.target.value)}
        className="w-full border p-2 text-sm rounded h-24"
      />
      <button 
        onClick={analizarComentario} 
        className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
      >
        Extraer Términos Frecuentes
      </button>

      {keywords.length > 0 && (
        <div className="p-4 bg-purple-50 rounded border border-purple-100">
          <p className="text-xs font-bold text-purple-700 uppercase mb-2">Palabras Clave Identificadas:</p>
          <div className="flex gap-2 flex-wrap">
            {keywords.map((kw, i) => (
              <span key={i} className="bg-white border text-purple-900 px-2.5 py-1 rounded-full text-xs font-semibold">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalisisNLP;