export interface SOPStep {
  id: string;
  imageUrl: string | null;
  description: string;
  isAnalyzing: boolean;
}

export interface PartInfo {
  id: string;
  partNumber: string;
  partName: string;
  partDescription: string;
  quantity: string;
}

export interface SOPDocument {
  title: string;
  designer: string;
  date: string;
  version: string;
  model: string;
  projectName: string;
  pm: string;
  productLine: string;
  parts: PartInfo[];
}

export type ImageUploadHandler = (file: File, stepId: string) => Promise<void>;
export type StepActionHandler = (stepId: string) => void;
export type StepUpdateHandler = (stepId: string, updates: Partial<SOPStep>) => void;