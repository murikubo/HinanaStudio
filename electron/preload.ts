import { contextBridge, ipcRenderer, webUtils } from "electron";
contextBridge.exposeInMainWorld("hinana", {
  platform: process.platform,
  saveProject: (data: string) => ipcRenderer.invoke("project:save", data),
  saveProjectAs: (data: string) => ipcRenderer.invoke("project:save-as", data),
  newProject: () => ipcRenderer.invoke("project:new"),
  openProject: () => ipcRenderer.invoke("project:open"),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  toFileUrl: (filePath: string) =>
    `hinana-media://file/${encodeURIComponent(filePath)}`,
  relinkFile: (kind: string) => ipcRenderer.invoke("asset:relink", kind),
  createProxy: (filePath: string) =>
    ipcRenderer.invoke("asset:create-proxy", filePath),
  exportVideo: (project: unknown) =>
    ipcRenderer.invoke("render:export", project),
  revealFile: (filePath: string) => ipcRenderer.invoke("file:reveal", filePath),
  cancelExport: () => ipcRenderer.invoke("render:cancel"),
  onExportProgress: (callback: (progress: number) => void) => {
    const listener = (_e: unknown, value: number) => callback(value);
    ipcRenderer.on("render:progress", listener);
    return () => ipcRenderer.removeListener("render:progress", listener);
  },
  onExportEncoder: (callback: (encoder: string) => void) => {
    const listener = (_e: unknown, value: string) => callback(value);
    ipcRenderer.on("render:encoder", listener);
    return () => ipcRenderer.removeListener("render:encoder", listener);
  },
  onShowAbout: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("app:show-about", listener);
    return () => ipcRenderer.removeListener("app:show-about", listener);
  },
});
