'use client';

import React, { useRef, useState } from 'react';
import { AIMessage } from '@/services/aiAssistantService';

interface AIAssistantMessageProps {
  message: AIMessage;
}

export function AIAssistantMessage({ message }: AIAssistantMessageProps) {
  const isUser = message.role === 'USER';
  const isSystem = message.role === 'SYSTEM';
  const contentRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Manejar el copiado de código
  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Manejar clic en el contenedor (event delegation)
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Buscar si se hizo clic en el botón de copiar o alguno de sus hijos
    const copyButton = target.closest('.copy-code-btn');
    if (copyButton) {
      e.preventDefault();
      e.stopPropagation();
      const codeIndex = copyButton.getAttribute('data-code-index') || '0';
      // Buscar el elemento pre correspondiente
      const preElement = contentRef.current?.querySelector(`pre[data-code-content="${codeIndex}"]`);
      if (preElement) {
        const code = preElement.textContent || '';
        handleCopyCode(code, parseInt(codeIndex));
      }
    }
  };

  // Formatear el contenido con markdown completo
  const formatContent = (content: string) => {
    // Primero, proteger los bloques de código
    // Regex más flexible: acepta con o sin salto de línea después del lenguaje
    const codeBlocks: string[] = [];
    let codeIndex = 0;
    let formatted = content.replace(/```(\w*)\s*([\s\S]*?)```/g, (_, lang, code) => {
      const index = codeBlocks.length;
      const trimmedCode = code.trim();
      const escapedCode = escapeHtml(trimmedCode);
      const langLabel = lang ? `<span class="text-[10px] text-gray-500 uppercase">${lang}</span>` : '';
      const currentCodeIndex = codeIndex++;
      
      codeBlocks.push(`<div class="code-block-wrapper relative group mt-2 mb-2"><div class="flex items-center justify-between bg-black/60 px-3 py-1.5 rounded-t-lg border border-b-0 border-white/10">${langLabel}<button data-code-index="${currentCodeIndex}" class="copy-code-btn flex items-center gap-1 text-[10px] text-gray-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-white/5" title="Copiar código"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>Copiar</span></button></div><pre class="bg-black/40 p-3 rounded-b-lg overflow-x-auto text-xs font-mono border border-t-0 border-white/10" data-code-content="${currentCodeIndex}"><code>${escapedCode}</code></pre></div>`);
      return `__CODE_BLOCK_${index}__`;
    });

    // Código inline (antes de otras transformaciones)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">$1</code>');

    // Headers (### > ## > #)
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-emerald-400 mt-4 mb-2">$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-emerald-300 mt-4 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-emerald-200 mt-4 mb-2">$1</h1>');

    // Negritas y cursivas
    formatted = formatted.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Listas numeradas (1. 2. 3. etc)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4 mb-1" data-num="$1"><span class="text-emerald-400 mr-2">$1.</span>$2</li>');
    
    // Listas con guiones
    formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 mb-1 flex items-start"><span class="text-emerald-400 mr-2">•</span><span>$1</span></li>');

    // Envolver listas consecutivas en contenedores
    formatted = formatted.replace(/(<li[^>]*data-num[^>]*>[\s\S]*?<\/li>\n?)+/g, '<ol class="list-none mb-3 space-y-1">$&</ol>');
    formatted = formatted.replace(/(<li class="ml-4 mb-1 flex[^>]*>[\s\S]*?<\/li>\n?)+/g, '<ul class="list-none mb-3 space-y-1">$&</ul>');

    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-emerald-400 underline hover:text-emerald-300">$1</a>');

    // Líneas horizontales
    formatted = formatted.replace(/^---$/gm, '<hr class="border-white/10 my-3"/>');

    // Blockquotes
    formatted = formatted.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-2 border-emerald-500 pl-3 italic text-gray-300 my-2">$1</blockquote>');

    // Restaurar bloques de código
    codeBlocks.forEach((block, index) => {
      formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block);
    });

    // Saltos de línea (pero no después de elementos de bloque)
    formatted = formatted.replace(/(?<!(>|<\/h[123]>|<\/li>|<\/ul>|<\/ol>|<\/pre>|<\/blockquote>|<hr[^>]*>))\n/g, '<br/>');
    
    // Limpiar saltos de línea excesivos
    formatted = formatted.replace(/(<br\/>){3,}/g, '<br/><br/>');
    formatted = formatted.replace(/<br\/>\s*(<[huo])/g, '$1');
    formatted = formatted.replace(/(<\/[huo][l123]?>)\s*<br\/>/g, '$1');

    return formatted;
  };

  // Escapar HTML para bloques de código
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-cultivo-dark/80 text-gray-100 rounded-bl-sm border border-white/5'
        }`}
      >
        {/* Imágenes adjuntas */}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Imagen ${index + 1}`}
                className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Contenido del mensaje */}
        <div
          ref={contentRef}
          onClick={handleContentClick}
          className={`text-sm leading-relaxed break-words prose-sm ${
            isUser ? '' : 'prose-invert'
          }`}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        
        {/* Toast de copiado */}
        {copiedIndex !== null && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              ¡Código copiado!
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-2 ${
            isUser ? 'text-emerald-200' : 'text-gray-500'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
