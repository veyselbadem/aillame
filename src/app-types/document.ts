export type DocumentRecord = {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'epub' | 'image';
  content: string;
  createdAt: number;
};
