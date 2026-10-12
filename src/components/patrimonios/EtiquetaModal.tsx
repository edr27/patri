import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Copy, Check, X, Shield, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { PatrimonioCompleto } from '@/types';

interface EtiquetaModalProps {
  patrimonio: PatrimonioCompleto;
  onClose: () => void;
}

export function EtiquetaModal({ patrimonio, onClose }: EtiquetaModalProps) {
  const [formato, setFormato] = useState<'padrao' | 'compacta'>('padrao');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const qrValue = JSON.stringify({
    codigo: patrimonio.codigo,
    nome: patrimonio.nome,
    empresa: patrimonio.empresa_atual?.nome || 'Sistema',
    setor: patrimonio.setor_atual?.nome || '',
    id: patrimonio.id,
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(patrimonio.codigo);
      setCopied(true);
      toast.success(`Código ${patrimonio.codigo} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o código');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `etiqueta-${patrimonio.codigo}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success('QR Code baixado com sucesso!');
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="card p-6 w-full max-w-xl animate-slide-up shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-100 no-print">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <Tag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900">Etiqueta Patrimonial</h2>
                <p className="text-xs text-surface-500">QR Code e identificação física do ativo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Opções de formato */}
          <div className="flex items-center justify-between mb-4 no-print bg-surface-50 p-2.5 rounded-lg border border-surface-200">
            <span className="text-xs font-medium text-surface-700">Tamanho da Etiqueta:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormato('padrao')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  formato === 'padrao'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                }`}
              >
                Padrão (90×50 mm)
              </button>
              <button
                type="button"
                onClick={() => setFormato('compacta')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  formato === 'compacta'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                }`}
              >
                Compacta (60×35 mm)
              </button>
            </div>
          </div>

          {/* Preview da Etiqueta (Visível na tela e Área de Impressão) */}
          <div className="flex justify-center my-4">
            <div
              ref={printRef}
              className={`print-area bg-white border-2 border-surface-900 rounded-lg p-4 text-surface-900 shadow-sm transition-all ${
                formato === 'padrao' ? 'w-[420px]' : 'w-[320px]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {/* Cabeçalho da Empresa */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-surface-900">
                <div className="flex items-center gap-1.5">
                  <Shield size={16} className="text-surface-900 fill-surface-900" />
                  <span className="font-extrabold text-xs tracking-wider uppercase">
                    {patrimonio.empresa_atual?.nome || 'PATRICONTROL'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-semibold text-surface-600">
                  Controle Patrimonial
                </span>
              </div>

              {/* Corpo: QR Code + Detalhes */}
              <div className="flex items-center gap-3">
                {/* QR Code */}
                <div className="bg-white p-1.5 border border-surface-300 rounded flex-shrink-0">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={qrValue}
                    size={formato === 'padrao' ? 96 : 72}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-surface-500 uppercase font-semibold tracking-wide">
                    Código do Ativo
                  </div>
                  <div className="font-mono text-xl font-black text-surface-900 tracking-tight leading-none mb-1">
                    {patrimonio.codigo}
                  </div>
                  <div className="font-bold text-xs text-surface-900 truncate">
                    {patrimonio.nome}
                  </div>
                  <div className="text-[11px] text-surface-600 truncate">
                    {patrimonio.categoria?.nome || 'Geral'}
                    {patrimonio.marca ? ` · ${patrimonio.marca}` : ''}
                  </div>
                  {patrimonio.setor_atual?.nome && (
                    <div className="text-[10px] text-surface-700 font-medium truncate mt-0.5">
                      Setor: {patrimonio.setor_atual.nome}
                    </div>
                  )}
                  {patrimonio.numero_serie && (
                    <div className="text-[9px] font-mono text-surface-500 truncate">
                      S/N: {patrimonio.numero_serie}
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé da Etiqueta */}
              <div className="mt-2.5 pt-1.5 border-t border-surface-300 flex items-center justify-between text-[8px] text-surface-500">
                <span>NÃO REMOVER ESTA ETIQUETA</span>
                <span>ID: {patrimonio.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* Dica de Utilização */}
          <p className="text-xs text-surface-500 text-center mb-6 no-print">
            Compatível com impressoras térmicas (Zebra, Elgin, Argox) e impressoras a laser convencionais.
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-surface-100 no-print">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn btn-sm btn-secondary flex items-center gap-1.5"
                title="Copiar código para a área de transferência"
              >
                {copied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar Código'}
              </button>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="btn btn-sm btn-secondary flex items-center gap-1.5"
                title="Baixar imagem do QR Code em alta resolução"
              >
                <Download size={14} /> Baixar QR
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-sm btn-secondary">
                Fechar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-sm btn-primary flex items-center gap-1.5"
              >
                <Printer size={16} /> Imprimir Etiqueta
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
