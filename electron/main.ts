import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  protocol,
} from "electron";
import { existsSync, promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  spawn,
  spawnSync,
  ChildProcessWithoutNullStreams,
} from "child_process";
const ffmpegPath = require("ffmpeg-static") as string;
let renderProcess: ChildProcessWithoutNullStreams | null = null;
let renderCancelled = false;
let currentProjectPath: string | null = null;

// Set this before Electron creates the default macOS application menu.
app.setName("HINANA STUDIO");
app.setAppUserModelId("studio.hinana.HinanaStudio");

const getAppIconPath = () => {
  const candidates = [
    path.join(process.resourcesPath, "HinanaStudioIcon.png"),
    path.join(app.getAppPath(), "HinanaStudioIcon.png"),
  ];
  return candidates.find(existsSync);
};

const installMacMenu = (win: BrowserWindow) => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "HINANA STUDIO",
      submenu: [
        {
          label: "HINANA STUDIO 정보",
          click: () => win.webContents.send("app:show-about"),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "HINANA STUDIO 종료" },
      ],
    },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: "hinana-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

// Chromium cache directories can remain locked after a dev window is restarted
// on Windows. Keep only disposable caches process-local; project/session data
// continues to use Electron's normal persistent userData directory.
if (!app.isPackaged) {
  app.commandLine.appendSwitch(
    "disk-cache-dir",
    path.join(os.tmpdir(), "HinanaStudio", `cache-${process.pid}`),
  );
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
}

const createWindow = () => {
  const icon = getAppIconPath();
  const win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#101114",
    ...(icon ? { icon } : {}),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 16, y: 20 } }
      : {
          titleBarOverlay: {
            color: "#101114",
            symbolColor: "#a6a6ad",
            height: 36,
          },
        }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.platform === "darwin") installMacMenu(win);
  const devUrl =
    process.env.VITE_DEV_SERVER_URL ||
    (app.isPackaged ? "" : "http://localhost:5173");
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
};

ipcMain.handle("project:save", async (_event, data: string) => {
  if (!currentProjectPath) {
    const result = await dialog.showSaveDialog({
      title: "프로젝트 저장",
      defaultPath: "새 프로젝트.hinana",
      filters: [{ name: "Hinana 프로젝트", extensions: ["hinana"] }],
    });
    if (result.canceled || !result.filePath) return null;
    currentProjectPath = result.filePath;
  }
  await fs.writeFile(currentProjectPath, data, "utf8");
  return currentProjectPath;
});
ipcMain.handle("project:save-as", async (_event, data: string) => {
  const result = await dialog.showSaveDialog({
    title: "다른 이름으로 저장",
    defaultPath: currentProjectPath || "새 프로젝트.hinana",
    filters: [{ name: "Hinana 프로젝트", extensions: ["hinana"] }],
  });
  if (result.canceled || !result.filePath) return null;
  currentProjectPath = result.filePath;
  await fs.writeFile(currentProjectPath, data, "utf8");
  return currentProjectPath;
});
ipcMain.handle("project:new", () => {
  currentProjectPath = null;
  return true;
});
ipcMain.handle("project:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "프로젝트 열기",
    filters: [{ name: "Hinana 프로젝트", extensions: ["hinana"] }],
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  currentProjectPath = result.filePaths[0];
  return {
    path: result.filePaths[0],
    data: await fs.readFile(result.filePaths[0], "utf8"),
  };
});
ipcMain.handle("asset:relink", async (_event, kind: string) => {
  const filters =
    kind === "audio"
      ? [
          {
            name: "오디오",
            extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"],
          },
        ]
      : kind === "video"
        ? [{ name: "영상", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }]
        : [
            {
              name: "이미지",
              extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
            },
          ];
  const result = await dialog.showOpenDialog({
    title: "원본 파일 다시 연결",
    filters,
    properties: ["openFile"],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("render:export", async (event, project: any) => {
  if (renderProcess) throw new Error("이미 렌더링 중입니다.");
  const result = await dialog.showSaveDialog({
    title: "영상 내보내기",
    defaultPath: "Hinana 영상.mp4",
    filters: [{ name: "MP4 영상", extensions: ["mp4"] }],
  });
  if (result.canceled || !result.filePath) return null;
  renderCancelled = false;
  const renderTempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "hinana-render-"),
  );
  const { width = 1920, height = 1080, fps = 30 } = project.settings || {};
  const exportPreset: "fast" | "balanced" | "quality" =
    project.settings?.exportPreset || "balanced";
  const presetLabel =
    exportPreset === "fast"
      ? "빠르게"
      : exportPreset === "quality"
        ? "고화질"
        : "균형";
  const baseMbps =
    exportPreset === "fast" ? 8 : exportPreset === "quality" ? 20 : 12;
  const resolutionFactor = Math.max(
    0.75,
    Math.min(4, (width * height) / (1920 * 1080)),
  );
  const targetMbps = Math.round(baseMbps * resolutionFactor);
  const targetBitrate = `${targetMbps}M`;
  const maxBitrate = `${Math.round(targetMbps * 1.5)}M`;
  const bufferSize = `${targetMbps * 2}M`;
  const assets = new Map<string, any>(
    project.assets.map((a: any) => [a.id, a]),
  );
  const mediaClips = project.clips.filter(
    (c: any) => c.assetId && assets.get(c.assetId)?.path,
  );
  const videoHasAudio = new Map<string, boolean>();
  mediaClips
    .filter((c: any) => c.kind === "video")
    .forEach((clip: any) => {
      const asset: any = assets.get(clip.assetId);
      if (!videoHasAudio.has(asset.path)) {
        const probe = spawnSync(
          ffmpegPath,
          ["-hide_banner", "-i", asset.path],
          { encoding: "utf8", windowsHide: true },
        );
        videoHasAudio.set(
          asset.path,
          /Stream #.*Audio:/i.test(probe.stderr || ""),
        );
      }
    });
  const args: string[] = [],
    filters: string[] = [];
  mediaClips.forEach((clip: any) => {
    const asset: any = assets.get(clip.assetId);
    if (clip.kind === "image")
      args.push(
        "-f",
        "image2",
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-t",
        String(clip.duration),
        "-i",
        asset.path,
      );
    else args.push("-i", asset.path);
  });
  const total = Math.max(
    1,
    ...project.clips.map((c: any) => c.start + c.duration),
  );
  filters.push(
    `color=c=0x181a20:s=${width}x${height}:r=${fps}:d=${total}[base0]`,
  );
  let base = "base0",
    visualIndex = 0;
  mediaClips.forEach((clip: any, i: number) => {
    if (clip.kind !== "video" && clip.kind !== "image") return;
    const scale = Math.max(0.01, (clip.scale ?? 100) / 100),
      opacity = clip.opacity ?? 1;
    const sourceStart = clip.sourceStart ?? 0;
    const prep = `v${i}`,
      next = `base${++visualIndex}`;
    const fitFilter =
      clip.fit === "cover"
        ? `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
        : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
    const effectFilter = `eq=brightness=${(clip.brightness ?? 1) - 1}:contrast=${clip.contrast ?? 1}:saturation=${clip.grayscale ? 0 : (clip.saturation ?? 1)}${clip.blur ? `,gblur=sigma=${clip.blur}` : ""}`;
    const mosaicFilter =
      clip.mosaic && clip.mosaic > 1
        ? `,scale=${Math.max(1, Math.round(width / clip.mosaic))}:${Math.max(1, Math.round(height / clip.mosaic))}:flags=neighbor,scale=${width}:${height}:flags=neighbor`
        : "";
    const raw = `raw${i}`,
      composited = `comp${i}`;
    filters.push(
      `[${i}:v]trim=start=${sourceStart}:duration=${clip.duration},setpts=PTS-STARTPTS+${clip.start}/TB,format=rgba,${fitFilter},${effectFilter}${mosaicFilter}[${raw}]`,
    );
    if (clip.mosaicRegion) {
      const r = clip.mosaicRegion,
        rw = Math.max(2, Math.round((width * r.width) / 100)),
        rh = Math.max(2, Math.round((height * r.height) / 100)),
        rx = Math.round((width * r.x) / 100),
        ry = Math.round((height * r.y) / 100),
        strength = Math.max(2, r.strength || 12);
      filters.push(`[${raw}]split=2[clean${i}][region${i}]`);
      const effectLabel = `maskeffect${i}`;
      if (r.effect === "blur")
        filters.push(
          `[region${i}]crop=${rw}:${rh}:${rx}:${ry},gblur=sigma=${strength}[${effectLabel}]`,
        );
      else if (r.effect === "black")
        filters.push(
          `[region${i}]crop=${rw}:${rh}:${rx}:${ry},drawbox=c=black:t=fill[${effectLabel}]`,
        );
      else
        filters.push(
          `[region${i}]crop=${rw}:${rh}:${rx}:${ry},scale=${Math.max(1, Math.round(rw / strength))}:${Math.max(1, Math.round(rh / strength))}:flags=neighbor,scale=${rw}:${rh}:flags=neighbor[${effectLabel}]`,
        );
      const feather = Math.max(0, Number(r.feather || 0));
      if (r.shape === "ellipse" || feather > 0) {
        const ellipse =
          "((X-W/2)*(X-W/2))/((W/2)*(W/2))+((Y-H/2)*(Y-H/2))/((H/2)*(H/2))";
        const alpha =
          r.shape === "ellipse"
            ? feather > 0
              ? `clip((1-sqrt(${ellipse}))*min(W,H)*255/${feather * 2},0,255)`
              : `if(lte(${ellipse},1),255,0)`
            : `clip(min(min(X,W-1-X),min(Y,H-1-Y))*255/${Math.max(1, feather)},0,255)`;
        filters.push(
          `nullsrc=s=${rw}x${rh},format=gray,geq=lum='${alpha}'[mask${i}]`,
        );
        filters.push(`[${effectLabel}][mask${i}]alphamerge[pixelmask${i}]`);
        filters.push(
          `[clean${i}][pixelmask${i}]overlay=${rx}:${ry}[${composited}]`,
        );
      } else {
        filters.push(
          `[clean${i}][${effectLabel}]overlay=${rx}:${ry}[${composited}]`,
        );
      }
    }
    const maskedSource = clip.mosaicRegion ? composited : raw;
    let sourceLabel = maskedSource;
    if (clip.crop) {
      const crop = clip.crop;
      const cropLabel = `crop${i}`;
      const cropFilter = `crop=iw*${Math.max(0.1, 1 - (crop.left + crop.right) / 100)}:ih*${Math.max(0.1, 1 - (crop.top + crop.bottom) / 100)}:iw*${crop.left / 100}:ih*${crop.top / 100}`;
      if (crop.shape === "ellipse") {
        const ellipse =
          "((X-W/2)*(X-W/2))/((W/2)*(W/2))+((Y-H/2)*(Y-H/2))/((H/2)*(H/2))";
        filters.push(
          `[${maskedSource}]${cropFilter},format=rgba,geq=a='if(lte(${ellipse},1),255,0)'[${cropLabel}]`,
        );
      } else {
        filters.push(`[${maskedSource}]${cropFilter}[${cropLabel}]`);
      }
      sourceLabel = cropLabel;
    }
    const motion = clip.motion;
    const motionEndProgress = Math.max(
      0.001,
      Math.min(1, motion?.endProgress ?? 1),
    );
    // The prepared stream starts at clip.start, so progress cannot be negative
    // while it is visible. Keeping a single min() avoids nested comma escaping
    // differences between FFmpeg builds on Windows and macOS.
    const motionProgress = `min(1\\,(t-${clip.start})/${Math.max(0.001, clip.duration * motionEndProgress)})`;
    const scaleExpression = motion
      ? `${motion.startScale / 100}+${(motion.endScale - motion.startScale) / 100}*${motionProgress}`
      : String(scale);
    const rotationExpression = motion
      ? `${motion.startRotation}+${motion.endRotation - motion.startRotation}*${motionProgress}`
      : String(clip.rotation ?? 0);
    filters.push(
      `[${sourceLabel}]scale=w='iw*(${scaleExpression})':h='ih*(${scaleExpression})':eval=frame,colorchannelmixer=aa=${opacity}${rotationExpression !== "0" ? `,rotate='(${rotationExpression})*PI/180':c=none:${motion ? "ow=hypot(iw\,ih):oh=ow" : "ow=rotw(iw):oh=roth(ih)"}` : ""}[${prep}]`,
    );
    const xPercent = motion
        ? `${motion.startX / 100}+${(motion.endX - motion.startX) / 100}*${motionProgress}`
        : String((clip.x ?? 50) / 100),
      yPercent = motion
        ? `${motion.startY / 100}+${(motion.endY - motion.startY) / 100}*${motionProgress}`
        : String((clip.y ?? 50) / 100),
      x = `W*(${xPercent})-w/2`,
      y = `H*(${yPercent})-h/2`;
    filters.push(
      `[${base}][${prep}]overlay=x='${x}':y='${y}':enable='between(t,${clip.start},${clip.start + clip.duration})'[${next}]`,
    );
    base = next;
  });
  const drawtextHelp = spawnSync(
    ffmpegPath,
    ["-hide_banner", "-h", "filter=drawtext"],
    { encoding: "utf8", windowsHide: true },
  );
  const supportsTextAlign =
    `${drawtextHelp.stdout || ""}\n${drawtextHelp.stderr || ""}`.includes(
      "text_align",
    );
  let textIndex = 0;
  const textClips = project.clips.filter((c: any) => c.kind === "text");
  for (const clip of textClips) {
    const next = `text${++textIndex}`;
    const maxChars = Math.max(
      1,
      Math.floor(
        (960 * ((clip.textWidth ?? 70) / 100)) / ((clip.fontSize || 42) * 0.95),
      ),
    );
    const wrapped =
      typeof clip.renderText === "string"
        ? clip.renderText
        : String(clip.text || "")
            .split("\n")
            .flatMap((paragraph: string) => {
              if (!paragraph) return [""];
              const lines: string[] = [];
              let rest = paragraph;
              while (rest.length > maxChars) {
                let cut = rest.lastIndexOf(" ", maxChars);
                if (cut < Math.floor(maxChars * 0.5)) cut = maxChars;
                lines.push(rest.slice(0, cut).trimEnd());
                rest = rest.slice(cut).trimStart();
              }
              lines.push(rest);
              return lines;
            })
            .join("\n");
    const textFile = path.join(renderTempDir, `caption-${textIndex}.txt`);
    await fs.writeFile(textFile, wrapped, "utf8");
    const escapedTextFile = textFile
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'");
    const bg =
      (clip.bgColor || "#000000").replace("#", "0x") +
      "@" +
      (clip.bgOpacity ?? 0);
    const isSerif = clip.fontFamily === "serif";
    const isBold = clip.fontWeight !== "normal";
    const koreanFont =
      process.platform === "darwin"
        ? isSerif
          ? "/System/Library/Fonts/AppleMyungjo.ttf"
          : "/System/Library/Fonts/AppleSDGothicNeo.ttc"
        : isSerif
          ? "C\\:/Windows/Fonts/batang.ttc"
          : isBold
            ? "C\\:/Windows/Fonts/malgunbd.ttf"
            : "C\\:/Windows/Fonts/malgun.ttf";
    const fontScale = width / Math.max(1, clip.previewCanvasWidth || 960);
    const fontSize = Math.max(1, (clip.fontSize || 42) * fontScale);
    const border = Math.max(1, 10 * fontScale);
    const outlineWidth = Math.max(0, (clip.outlineWidth || 0) * fontScale);
    const shadowDistance = Math.max(0, (clip.shadowDistance || 0) * fontScale);
    const outlineColor = (clip.outlineColor || "#000000").replace("#", "0x");
    const shadowColor =
      (clip.shadowColor || "#000000").replace("#", "0x") +
      `@${clip.shadowOpacity ?? 0.7}`;
    filters.push(
      `[${base}]drawtext=fontfile='${koreanFont}':textfile='${escapedTextFile}':fontcolor=${clip.textColor || "white"}@${clip.opacity ?? 1}:fontsize=${fontSize}:line_spacing=${fontSize * 0.25}${supportsTextAlign ? ":text_align=C" : ""}:borderw=${outlineWidth}:bordercolor=${outlineColor}:shadowx=${shadowDistance}:shadowy=${shadowDistance}:shadowcolor=${shadowColor}:box=1:boxcolor=${bg}:boxborderw=${border}:x=w*${(clip.x ?? 50) / 100}-text_w/2:y=h*${(clip.y ?? 82) / 100}-text_h/2:enable='between(t,${clip.start},${clip.start + clip.duration})'[${next}]`,
    );
    base = next;
  }
  const audioLabels: string[] = [];
  mediaClips.forEach((clip: any, i: number) => {
    const track = project.tracks.find((t: any) => t.id === clip.track);
    const asset: any = assets.get(clip.assetId);
    if (
      (clip.kind !== "audio" &&
        !(clip.kind === "video" && videoHasAudio.get(asset.path))) ||
      track?.muted
    )
      return;
    const label = `a${i}`,
      delay = Math.round(clip.start * 1000),
      sourceStart = clip.sourceStart ?? 0;
    filters.push(
      `[${i}:a]atrim=start=${sourceStart}:duration=${clip.duration},asetpts=PTS-STARTPTS,volume=${clip.volume ?? 1}${clip.fadeIn ? `,afade=t=in:st=0:d=${clip.fadeIn}` : ""}${clip.fadeOut ? `,afade=t=out:st=${Math.max(0, clip.duration - clip.fadeOut)}:d=${clip.fadeOut}` : ""},adelay=${delay}|${delay}[${label}]`,
    );
    audioLabels.push(`[${label}]`);
  });
  if (audioLabels.length)
    filters.push(
      `${audioLabels.join("")}amix=inputs=${audioLabels.length}:normalize=0:duration=longest[aout]`,
    );
  args.push("-filter_complex", filters.join(";"), "-map", `[${base}]`);
  if (audioLabels.length) args.push("-map", "[aout]");
  const encoderList =
    spawnSync(ffmpegPath, ["-hide_banner", "-encoders"], {
      encoding: "utf8",
      windowsHide: true,
    }).stdout || "";
  type Encoder = { label: string; options: string[] };
  const candidates: Encoder[] = [];
  if (
    process.platform === "darwin" &&
    encoderList.includes("h264_videotoolbox")
  )
    candidates.push({
      label: `Apple VideoToolbox · ${presetLabel}`,
      options: [
        "-c:v",
        "h264_videotoolbox",
        "-b:v",
        targetBitrate,
        "-maxrate",
        maxBitrate,
        "-bufsize",
        bufferSize,
        "-realtime",
        exportPreset === "quality" ? "0" : "1",
        "-allow_sw",
        "1",
      ],
    });
  if (process.platform === "win32") {
    if (encoderList.includes("h264_nvenc"))
      candidates.push({
        label: `NVIDIA NVENC · ${presetLabel}`,
        options: [
          "-c:v",
          "h264_nvenc",
          "-preset",
          exportPreset === "fast"
            ? "p1"
            : exportPreset === "quality"
              ? "p6"
              : "p4",
          "-rc",
          "vbr",
          "-b:v",
          targetBitrate,
          "-maxrate",
          maxBitrate,
          "-bufsize",
          bufferSize,
        ],
      });
    if (encoderList.includes("h264_qsv"))
      candidates.push({
        label: `Intel Quick Sync · ${presetLabel}`,
        options: [
          "-c:v",
          "h264_qsv",
          "-preset",
          exportPreset === "fast"
            ? "veryfast"
            : exportPreset === "quality"
              ? "slow"
              : "medium",
          "-b:v",
          targetBitrate,
        ],
      });
    if (encoderList.includes("h264_amf"))
      candidates.push({
        label: `AMD AMF · ${presetLabel}`,
        options: [
          "-c:v",
          "h264_amf",
          "-quality",
          exportPreset === "fast"
            ? "speed"
            : exportPreset === "quality"
              ? "quality"
              : "balanced",
          "-rc",
          "vbr_peak",
          "-b:v",
          targetBitrate,
          "-maxrate",
          maxBitrate,
        ],
      });
  }
  if (encoderList.includes("libx264"))
    candidates.push({
      label: `CPU (libx264) · ${presetLabel}`,
      options: [
        "-c:v",
        "libx264",
        "-preset",
        exportPreset === "fast"
          ? "ultrafast"
          : exportPreset === "quality"
            ? "slow"
            : "medium",
        "-b:v",
        targetBitrate,
        "-maxrate",
        maxBitrate,
        "-bufsize",
        bufferSize,
      ],
    });
  if (encoderList.includes("libopenh264"))
    candidates.push({
      label: `CPU (OpenH264) · ${presetLabel}`,
      options: ["-c:v", "libopenh264", "-b:v", targetBitrate],
    });
  if (encoderList.includes("mpeg4"))
    candidates.push({
      label: `MP4 호환 모드 (MPEG-4) · ${presetLabel}`,
      options: ["-c:v", "mpeg4", "-b:v", targetBitrate],
    });
  const tail = [
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    ...(audioLabels.length ? ["-c:a", "aac", "-b:a", "192k"] : []),
    "-t",
    String(total),
    "-progress",
    "pipe:2",
    "-nostats",
    "-y",
    result.filePath,
  ];
  let lastEncoderError = "";
  const runEncoder = (encoder: Encoder) =>
    new Promise<boolean>((resolve, reject) => {
      event.sender.send("render:encoder", encoder.label);
      const child = spawn(ffmpegPath, [...args, ...encoder.options, ...tail], {
        windowsHide: true,
      });
      renderProcess = child;
      let errorText = "";
      let progressBuffer = "";
      let receivedProgress = false;
      let startupTimedOut = false;
      const startupTimer = encoder.label.includes("VideoToolbox")
        ? setTimeout(() => {
            if (receivedProgress || child.exitCode !== null) return;
            startupTimedOut = true;
            console.warn(
              "VideoToolbox가 20초 동안 첫 프레임을 출력하지 않아 CPU 인코더로 전환합니다.",
            );
            child.kill();
          }, 20_000)
        : null;
      const clearStartupTimer = () => {
        if (startupTimer) clearTimeout(startupTimer);
      };
      child.stderr.on("data", (chunk) => {
        const text = String(chunk);
        errorText = (errorText + text).slice(-8000);
        progressBuffer += text;
        const lines = progressBuffer.split(/\r?\n/);
        progressBuffer = lines.pop() || "";
        for (const line of lines) {
          const microseconds = /^(?:out_time_us|out_time_ms)=(\d+)$/.exec(line);
          const clock = /^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(line);
          const seconds = microseconds
            ? Number(microseconds[1]) / 1_000_000
            : clock
              ? +clock[1] * 3600 + +clock[2] * 60 + +clock[3]
              : null;
          if (seconds !== null && seconds > 0) {
            receivedProgress = true;
            clearStartupTimer();
            event.sender.send(
              "render:progress",
              Math.min(99.9, (seconds / total) * 100),
            );
          }
        }
      });
      child.on("error", (error) => {
        clearStartupTimer();
        reject(error);
      });
      child.on("exit", (code) => {
        clearStartupTimer();
        renderProcess = null;
        if (renderCancelled)
          return reject(new Error("렌더링이 취소되었습니다"));
        if (code === 0) resolve(true);
        else {
          lastEncoderError = startupTimedOut
            ? "VideoToolbox가 첫 프레임 생성 시간 제한을 초과했습니다."
            : errorText.trim();
          console.warn(`${encoder.label} 실패, 다음 인코더로 전환`, errorText);
          resolve(false);
        }
      });
    });
  try {
    for (const encoder of candidates) {
      if (await runEncoder(encoder)) return result.filePath;
      event.sender.send("render:progress", 0);
    }
    const detail = lastEncoderError.split(/\r?\n/).slice(-12).join("\n");
    throw new Error(
      detail
        ? `모든 비디오 인코더가 실패했습니다.\n${detail}`
        : "이 FFmpeg 빌드에서 사용할 수 있는 비디오 인코더를 찾지 못했습니다.",
    );
  } finally {
    await fs
      .rm(renderTempDir, { recursive: true, force: true })
      .catch(() => {});
  }
});
ipcMain.handle("render:cancel", () => {
  renderCancelled = true;
  if (renderProcess) {
    renderProcess.kill();
    renderProcess = null;
    return true;
  }
  return false;
});
app.whenReady().then(() => {
  const icon = getAppIconPath();
  if (process.platform === "darwin" && icon) app.dock?.setIcon(icon);
  protocol.handle("hinana-media", async (request) => {
    try {
      const encoded = new URL(request.url).pathname.slice(1);
      const filePath = decodeURIComponent(encoded);
      const stat = await fs.stat(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
      };
      const type = contentTypes[extension] || "application/octet-stream";
      const range = request.headers.get("range");
      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2]
            ? Math.min(Number(match[2]), stat.size - 1)
            : stat.size - 1;
          const length = Math.max(0, end - start + 1);
          const handle = await fs.open(filePath, "r");
          try {
            const buffer = Buffer.alloc(length);
            await handle.read(buffer, 0, length, start);
            return new Response(buffer as any, {
              status: 206,
              headers: {
                "Content-Type": type,
                "Content-Length": String(length),
                "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-store",
              },
            });
          } finally {
            await handle.close();
          }
        }
      }
      const data = await fs.readFile(filePath);
      return new Response(data as any, {
        status: 200,
        headers: {
          "Content-Type": type,
          "Content-Length": String(stat.size),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("Media protocol error", error);
      return new Response("Media file not found", { status: 404 });
    }
  });
  createWindow();
  app.on(
    "activate",
    () => BrowserWindow.getAllWindows().length === 0 && createWindow(),
  );
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
