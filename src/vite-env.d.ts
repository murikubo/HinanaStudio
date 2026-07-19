/// <reference types="vite/client" />
interface Window {
  hinana?: {
    platform: string;
    saveProject(data: string): Promise<string | null>;
    saveProjectAs(data: string): Promise<string | null>;
    newProject(): Promise<boolean>;
    openProject(): Promise<{ path: string; data: string } | null>;
    getFilePath(file: File): string;
    toFileUrl(path: string): string;
    relinkFile(kind: string): Promise<string | null>;
    exportVideo(project: unknown): Promise<string | null>;
    cancelExport(): Promise<boolean>;
    onExportProgress(callback: (progress: number) => void): () => void;
    onExportEncoder(callback: (encoder: string) => void): () => void;
    onShowAbout(callback: () => void): () => void;
  };
}
