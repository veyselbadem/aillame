import React from 'react';

interface Props {
  query: string;
  isSearching: boolean;
  hasResults: boolean;
}

export function WorkspaceSearchEmptyState({ query, isSearching, hasResults }: Props) {
  if (isSearching) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <p>Arama yapılıyor...</p>
      </div>
    );
  }

  if (query && !hasResults) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <p>"{query}" için güvenli arama sonucu bulunamadı.</p>
        <p className="mt-2 text-xs">Arama sadece izin verilen indekslenmiş dosyalarda ve temizlenmiş snippet'lerle yapılır.</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <p>Workspace içinde aramak için yukarıdaki kutuya metin girin.</p>
        <p className="mt-2 text-xs">Bu panel yalnızca arama önizlemesi içindir. Sonuçlar Nano/Chat yapay zeka bağlamına eklenmez.</p>
      </div>
    );
  }

  return null;
}
