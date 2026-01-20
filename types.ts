export interface SOPStep {
  id: string;
  imageUrl: string | null;
  description: string;
  isAnalyzing: boolean;
}

export interface SOPDocument {
  title: string;
  designer: string;
  date: string;
  version: string;
  model: string;
}

export type ImageUploadHandler = (file: File, stepId: string) => Promise<void>;
export type StepActionHandler = (stepId: string) => void;
export type StepUpdateHandler = (stepId: string, updates: Partial<SOPStep>) => void;