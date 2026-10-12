import { useState, useEffect, useRef } from 'react';
import { Search, Package, ArrowRightLeft, Tag, X, AlertCircle } from 'lucide-react';
import { obterPatrimonioPorCodigo } from '@/services/patrimonios';
import { useNavigate } from 'react-router-dom';
import type { PatrimonioCompleto } from '@/types';

interface ConsultaRapidaModalProps {
  onClose: () => void;
  onSelectEtiqueta?: (patrimonio: PatrimonioCompleto) => void;
  onSelectDetalhes?: (patrimonio: PatrimonioCompleto) => void;
}

export function ConsultaRapidaModal({
  onClose,
  onSelectEtiqueta,
  onSelectDetalhes,
}: ConsultaRapidaModalProps) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [patrimonio, setPatrimonio] = useState<PatrimonioCompleto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = codigo.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);
    setPatrimonio(null);

    try {
      const data = await obterPatrimonioPorCodigo(cleanCode);
      if (!data) {
        setError(`Nenhum patrimônio encontrado com o código "${cleanCode}"`);
      } else {
        setPatrimonio(data);
      }
    } catch {
      setError('Erro ao realizar consulta');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
        onClick={onClose}
      >
        <div
          className="card p-6 w-full max-w-lg animate-slide-up shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <Search size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900">Consulta Rápida</h2>
                <p className="text-xs text-surface-500">
                  Digite o código ou bipe com leitor de código de barras / QR Code
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form de Busca */}
          <form onSubmit={handleBuscar} className="mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className="form-input uppercase font-mono tracking-wider font-semibold text-base py-2.5"
                  placeholder="Ex: PAT-001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !codigo.trim()}
                className="btn btn-primary px-5"
              >
                {loading ? <div className="spinner w-4 h-4" /> : <Search size={18} />}
                Buscar
              </button>
            </div>
          </form>

          {/* Mensagem de Erro */}
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-center gap-2 text-danger-700 text-sm mb-4 animate-slide-up">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resultado Encontrado */}
          {patrimonio && (
            <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 mb-4 animate-slide-up">
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-surface-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary-700 text-lg bg-primary-50 px-2 py-0.5 rounded">
                      {patrimonio.codigo}
                    </span>
                    <span
                      className={`badge ${
                        patrimonio.status === 'ativo' ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {patrimonio.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-surface-900 text-base mt-1.5">
                    {patrimonio.nome}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
                <div>
                  <span className="text-surface-500 block">Categoria:</span>
                  <span className="font-semibold text-surface-800">
                    {patrimonio.categoria?.nome || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500 block">Empresa Atual:</span>
                  <span className="font-semibold text-surface-800">
                    {patrimonio.empresa_atual?.nome || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500 block">Setor Atual:</span>
                  <span className="font-semibold text-surface-800">
                    {patrimonio.setor_atual?.nome || 'Sem setor'}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500 block">Estado:</span>
                  <span className="font-semibold text-surface-800 capitalize">
                    {patrimonio.estado_conservacao}
                  </span>
                </div>
                {patrimonio.responsavel_atual && (
                  <div className="col-span-2">
                    <span className="text-surface-500 block">Responsável Atual:</span>
                    <span className="font-semibold text-surface-800">
                      {patrimonio.responsavel_atual}
                    </span>
                  </div>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-surface-200">
                {onSelectDetalhes && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectDetalhes(patrimonio);
                    }}
                    className="btn btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <Package size={14} /> Detalhes
                  </button>
                )}
                {onSelectEtiqueta && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectEtiqueta(patrimonio);
                    }}
                    className="btn btn-sm btn-secondary flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <Tag size={14} /> Etiqueta QR
                  </button>
                )}
                {patrimonio.status === 'ativo' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/movimentacoes', { state: { preselectPatrimonio: patrimonio } });
                    }}
                    className="btn btn-sm btn-primary flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <ArrowRightLeft size={14} /> Transferir
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dica de Teclado */}
          <div className="flex items-center justify-between text-xs text-surface-400 pt-2">
            <span>Pressione Enter após digitar ou ao bipar com leitor</span>
            <button type="button" onClick={onClose} className="hover:text-surface-700">
              ESC para fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
