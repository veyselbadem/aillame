export type VisionInput = {
  id: string;
  file: File;
  url: string;
  uploadedAt: number;
};

export type VisionResult = {
  label: string;
  description: string;
};
