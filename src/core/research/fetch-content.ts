// Gerçek uygulamada fetch ile sayfa içeriği çekilebilir.
export async function fetchPageContent(url: string): Promise<string> {
  // Mock içerik
  return `Sayfa içeriği: ${url}`;
}
