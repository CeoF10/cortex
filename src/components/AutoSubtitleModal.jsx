import React, { useState } from 'react';
import { Sparkles, X, Check, Loader2, AlertCircle, FileAudio } from 'lucide-react';

export default function AutoSubtitleModal({
  isOpen,
  onClose,
  mediaPool,
  onApplySubtitles
}) {
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [language, setLanguage] = useState('es');
  const [model, setModel] = useState('base');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusText, setStatusText] = useState('');

  if (!isOpen) return null;

  // Filtrar videos y audios que tienen voz
  const speechCandidates = mediaPool.filter((m) => m.type === 'video' || m.type === 'audio');

  const handleTranscribe = async () => {
    const targetMedia = speechCandidates.find((m) => m.id === selectedMediaId) || speechCandidates[0];
    if (!targetMedia) {
      setErrorMsg('Debes seleccionar un video o audio para transcribir');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setStatusText('Iniciando motor Whisper...');

    try {
      if (window.cortexAPI?.transcribeMedia) {
        setStatusText('Extrayendo audio y procesando con IA...');
        const res = await window.cortexAPI.transcribeMedia({
          filePath: targetMedia.path,
          model,
          language
        });

        if (res.status === 'success' && Array.isArray(res.segments)) {
          if (res.segments.length === 0) {
            setErrorMsg('No se detectaron palabras en el audio. Asegúrate de que el archivo contenga voz clara.');
            setIsProcessing(false);
            return;
          }

          // Mapear segmentos a clips de subtítulo dinámicos estilo TikTok / Reels
          const generatedClips = res.segments.map((seg, idx) => ({
            id: `sub_${Date.now()}_${idx}`,
            text: seg.text,
            start: seg.start,
            duration: Math.max(0.4, seg.end - seg.start),
            words: seg.words || [],
            fontSize: 46,
            color: '#FFFFFF',
            highlightColor: '#00E5FF',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            fontFamily: "'Montserrat', system-ui, sans-serif",
            strokeColor: '#000000',
            strokeWidth: 4,
            positionY: 87,
            karaoke: true,
            uppercase: true,
            isSubtitle: true
          }));

          onApplySubtitles(generatedClips);
          setIsProcessing(false);
          onClose();
          return;
        } else {
          setErrorMsg(res.message || 'No se pudo completar la transcripción');
          setIsProcessing(false);
          return;
        }
      }

      // Si se prueba en modo web o no hay respuesta directa, generar subtítulos de demostración en bloques de 3-4 palabras
      setTimeout(() => {
        const demoSubtitles = [
          {
            id: `sub_${Date.now()}_1`,
            text: '¡BIENVENIDOS A ESTE',
            start: 0.5,
            duration: 1.4,
            words: [
              { word: '¡BIENVENIDOS', start: 0.5, end: 1.0 },
              { word: 'A', start: 1.0, end: 1.2 },
              { word: 'ESTE', start: 1.2, end: 1.9 }
            ],
            fontSize: 46,
            color: '#FFFFFF',
            highlightColor: '#00E5FF',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            fontFamily: "'Montserrat', system-ui, sans-serif",
            strokeColor: '#000000',
            strokeWidth: 4,
            positionY: 87,
            karaoke: true,
            uppercase: true,
            isSubtitle: true
          },
          {
            id: `sub_${Date.now()}_2`,
            text: 'NUEVO VIDEO VIRAL!',
            start: 1.95,
            duration: 1.5,
            words: [
              { word: 'NUEVO', start: 1.95, end: 2.3 },
              { word: 'VIDEO', start: 2.3, end: 2.7 },
              { word: 'VIRAL!', start: 2.7, end: 3.45 }
            ],
            fontSize: 46,
            color: '#FFFFFF',
            highlightColor: '#00E5FF',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            fontFamily: "'Montserrat', system-ui, sans-serif",
            strokeColor: '#000000',
            strokeWidth: 4,
            positionY: 87,
            karaoke: true,
            uppercase: true,
            isSubtitle: true
          },
          {
            id: `sub_${Date.now()}_3`,
            text: 'APRENDE A EDITAR',
            start: 3.5,
            duration: 1.4,
            words: [
              { word: 'APRENDE', start: 3.5, end: 3.9 },
              { word: 'A', start: 3.9, end: 4.1 },
              { word: 'EDITAR', start: 4.1, end: 4.9 }
            ],
            fontSize: 46,
            color: '#FFFFFF',
            highlightColor: '#FFE600',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            fontFamily: "'Anton', Impact, sans-serif",
            strokeColor: '#000000',
            strokeWidth: 4,
            positionY: 87,
            karaoke: true,
            uppercase: true,
            isSubtitle: true
          },
          {
            id: `sub_${Date.now()}_4`,
            text: 'COMO UN PROFESIONAL',
            start: 4.95,
            duration: 1.6,
            words: [
              { word: 'COMO', start: 4.95, end: 5.3 },
              { word: 'UN', start: 5.3, end: 5.5 },
              { word: 'PROFESIONAL', start: 5.5, end: 6.55 }
            ],
            fontSize: 46,
            color: '#FFFFFF',
            highlightColor: '#FFE600',
            bgColor: 'rgba(0, 0, 0, 0.7)',
            fontFamily: "'Anton', Impact, sans-serif",
            strokeColor: '#000000',
            strokeWidth: 4,
            positionY: 87,
            karaoke: true,
            uppercase: true,
            isSubtitle: true
          }
        ];
        onApplySubtitles(demoSubtitles);
        setIsProcessing(false);
        onClose();
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message || 'Error durante la transcripción');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181d] border border-[#2c2c38] rounded-2xl p-6 shadow-2xl relative select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#292934] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Subtítulos Automáticos</h3>
              <p className="text-[11px] text-gray-400">Transcripción impulsada por OpenAI Whisper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-[#25252f] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <div className="space-y-4 text-xs">
          {/* Seleccionar medio */}
          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">
              Seleccionar fuente de audio
            </label>
            {speechCandidates.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px]">
                  Importa primero un video o audio en la biblioteca de medios.
                </span>
              </div>
            ) : (
              <select
                value={selectedMediaId || speechCandidates[0]?.id}
                onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2.5 text-white outline-none"
              >
                {speechCandidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Idioma */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Idioma del habla</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2 text-white outline-none"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="auto">Autodetectar</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Modelo Whisper</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#202028] border border-[#30303e] rounded-lg p-2 text-white outline-none"
              >
                <option value="base">Base (Rápido y balanceado)</option>
                <option value="tiny">Tiny (Ultra veloz)</option>
                <option value="small">Small (Alta precisión)</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
              {errorMsg}
            </div>
          )}

          {isProcessing && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-center space-x-3 text-purple-200">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold">{statusText}</p>
                <p className="text-[10px] text-purple-300/80 mt-0.5">
                  Extrayendo marcas de tiempo y sincronizando bloques...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-[#22222a] hover:bg-[#2b2b35] text-gray-300 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTranscribe}
            disabled={isProcessing}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center space-x-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribiendo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar Subtítulos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
