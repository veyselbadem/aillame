import type { ResearchResult } from '@apptypes/research';

interface ChatResearchResultProps {
  result: ResearchResult;
}

export default function ChatResearchResult({ result }: ChatResearchResultProps) {
  return (
    <div className="bg-blue-50 border rounded p-4 mt-4">
      <div className="font-bold mb-2">Araştırma Özeti</div>
      <div className="mb-2 text-gray-800">{result.summary}</div>
      <div className="font-semibold mt-2 mb-1">Kaynaklar:</div>
      <ul className="list-disc pl-6">
        {result.sources.map((src) => (
          <li key={src.url}>
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
              {src.title}
            </a>
            <span className="ml-2 text-gray-600">{src.snippet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
