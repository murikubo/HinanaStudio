import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Scissors,
  MousePointer2,
  Type,
  Image as ImageIcon,
  Music2,
  Film,
  Plus,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreHorizontal,
  Search,
  ZoomIn,
  ZoomOut,
  Magnet,
  ChevronDown,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import appIconUrl from "../HinanaStudioIcon.png";

type Kind = "video" | "image" | "audio" | "text";

function MosaicPreview({
  url,
  kind,
  fit,
  strength,
  width,
  height,
  currentTime,
  playing,
  effect = "mosaic",
}: {
  url: string;
  kind: "video" | "image";
  fit: "contain" | "cover";
  strength: number;
  width: number;
  height: number;
  currentTime: number;
  playing: boolean;
  effect?: "mosaic" | "blur" | "black";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const media =
      kind === "video" ? document.createElement("video") : new Image();
    mediaRef.current = media;
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.playsInline = true;
      media.preload = "auto";
    }
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (effect === "black") {
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const sourceWidth =
        media instanceof HTMLVideoElement
          ? media.videoWidth
          : media.naturalWidth;
      const sourceHeight =
        media instanceof HTMLVideoElement
          ? media.videoHeight
          : media.naturalHeight;
      if (!sourceWidth || !sourceHeight) return;
      const ratio =
        fit === "cover"
          ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
          : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const drawWidth = sourceWidth * ratio;
      const drawHeight = sourceHeight * ratio;
      context.imageSmoothingEnabled = false;
      context.filter = effect === "blur" ? `blur(${strength / 2}px)` : "none";
      context.drawImage(
        media,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    };
    let frame = 0;
    const tick = () => {
      draw();
      if (media instanceof HTMLVideoElement)
        frame = requestAnimationFrame(tick);
    };
    media.addEventListener("loadeddata", tick, { once: true });
    media.addEventListener("load", tick, { once: true });
    media.src = url;
    if (media instanceof HTMLImageElement && media.complete) tick();
    return () => {
      cancelAnimationFrame(frame);
      if (media instanceof HTMLVideoElement) {
        media.pause();
        media.removeAttribute("src");
        media.load();
      }
      mediaRef.current = null;
    };
  }, [url, kind, fit, strength, width, height, effect]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!(media instanceof HTMLVideoElement)) return;
    if (Math.abs(media.currentTime - currentTime) > 0.12)
      media.currentTime = Math.max(0, currentTime);
    if (playing) void media.play().catch(() => {});
    else media.pause();
  }, [currentTime, playing]);

  return (
    <canvas
      ref={canvasRef}
      className="mosaic-content"
      width={Math.max(
        1,
        Math.round(
          effect === "mosaic" ? width / Math.max(2, strength) : width / 2,
        ),
      )}
      height={Math.max(
        1,
        Math.round(
          effect === "mosaic" ? height / Math.max(2, strength) : height / 2,
        ),
      )}
    />
  );
}

type Asset = {
  id: string;
  name: string;
  kind: Kind;
  url: string;
  duration: number;
  size: string;
  color: string;
  path?: string;
  waveform?: number[];
  offline?: boolean;
  proxyPath?: string;
  proxyStatus?: "creating" | "ready" | "failed";
  embeddedData?: string;
  shapeType?: "rectangle" | "ellipse" | "triangle";
  shapeColor?: string;
};
type Clip = {
  id: string;
  assetId?: string;
  kind: Kind;
  name: string;
  start: number;
  duration: number;
  track: number;
  color: string;
  text?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: "gothic" | "serif" | "rounded";
  fontWeight?: "normal" | "bold";
  textWidth?: number;
  textColor?: string;
  bgColor?: string;
  bgOpacity?: number;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowDistance?: number;
  x?: number;
  y?: number;
  volume?: number;
  sourceStart?: number;
  scale?: number;
  rotation?: number;
  zOrder?: number;
  fit?: "contain" | "cover";
  fadeIn?: number;
  fadeOut?: number;
  videoFadeIn?: number;
  videoFadeOut?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  grayscale?: boolean;
  mosaic?: number;
  crop?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    shape: "rectangle" | "ellipse";
  };
  motion?: {
    preset: "custom" | "zoomIn" | "zoomOut" | "panLeft" | "panRight";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    startScale: number;
    endScale: number;
    startRotation: number;
    endRotation: number;
    /** Normalized clip position where motion begins. */
    startProgress?: number;
    /** Normalized clip position where the end pose is reached. */
    endProgress?: number;
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
    path?: { progress: number; x: number; y: number }[];
  };
  mosaicRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
    strength: number;
    shape?: "rectangle" | "ellipse";
    effect?: "mosaic" | "blur" | "black";
    feather?: number;
  };
};
type Track = {
  id: number;
  type: "video" | "text" | "audio";
  name: string;
  visible?: boolean;
  locked?: boolean;
  muted?: boolean;
};
const colors = {
  video: "#5b6cff",
  image: "#26b99a",
  audio: "#d65ca8",
  text: "#f0a847",
};
const initialTracks: Track[] = [
  { id: 0, type: "video", name: "오버레이", visible: true },
  { id: 1, type: "video", name: "비디오", visible: true },
  { id: 2, type: "text", name: "텍스트", visible: true },
  { id: 3, type: "audio", name: "오디오 1", visible: true },
  { id: 4, type: "audio", name: "오디오 2", visible: true },
];
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}:${String(Math.floor((s % 1) * 30)).padStart(2, "0")}`;
const uid = () => Math.random().toString(36).slice(2);
const createShapeImage = (
  shape: NonNullable<Asset["shapeType"]>,
  color: string,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;
  context.fillStyle = color;
  context.beginPath();
  if (shape === "ellipse")
    context.ellipse(256, 256, 220, 220, 0, 0, Math.PI * 2);
  else if (shape === "triangle") {
    context.moveTo(256, 28);
    context.lineTo(484, 472);
    context.lineTo(28, 472);
    context.closePath();
  } else context.roundRect(28, 28, 456, 456, 28);
  context.fill();
  return canvas.toDataURL("image/png");
};

export default function App() {
  const isMac = window.hinana?.platform === "darwin";
  const [assets, setAssets] = useState<Asset[]>([]),
    [clips, setClips] = useState<Clip[]>([]),
    [selected, setSelected] = useState("");
  const [tracks, setTracks] = useState<Track[]>(initialTracks),
    [activeTrack, setActiveTrack] = useState(2);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    clipId?: string;
    trackId?: number;
    assetId?: string;
  } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [rippleEditing, setRippleEditing] = useState(false);
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    width: 1920,
    height: 1080,
    fps: 30,
    exportPreset: "balanced" as "fast" | "balanced" | "quality",
    useProxy: true,
    exportMode: "all" as "all" | "range",
    exportStart: 0,
    exportEnd: 15,
  });
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [motionEdit, setMotionEdit] = useState<"start" | "end" | "path" | null>(
    null,
  );
  const [motionPathDraft, setMotionPathDraft] = useState<{
    clipId: string;
    x: number;
    y: number;
  } | null>(null);
  const [renderEncoder, setRenderEncoder] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [projectName, setProjectName] = useState("새 프로젝트");
  const [time, setTime] = useState(3.2),
    [playing, setPlaying] = useState(false),
    [zoom, setZoom] = useState(1),
    [tab, setTab] = useState<"media" | "text" | "effects" | "audio">("media"),
    [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null),
    raf = useRef<number>(0),
    canvasRef = useRef<HTMLDivElement>(null),
    trackHeadList = useRef<HTMLDivElement>(null),
    copiedClip = useRef<Clip | null>(null);
  const history = useRef<string[]>([]),
    redoHistory = useRef<string[]>([]),
    restoringHistory = useRef(false);
  const mediaEls = useRef(new Map<string, HTMLMediaElement>());
  const assetUrl = (asset: Asset) =>
    settings.useProxy && asset.proxyPath && window.hinana
      ? window.hinana.toFileUrl(asset.proxyPath)
      : asset.url;
  const active = clips.find((c) => c.id === selected),
    activeAsset = assets.find((asset) => asset.id === active?.assetId),
    total = Math.max(15, ...clips.map((c) => c.start + c.duration)),
    px = 75 * zoom;
  const motionState = (clip: Clip) => {
    if (motionPathDraft?.clipId === clip.id)
      return {
        x: motionPathDraft.x,
        y: motionPathDraft.y,
        scale: clip.motion?.endScale ?? clip.scale ?? 100,
        rotation: clip.motion?.endRotation ?? clip.rotation ?? 0,
      };
    if (!clip.motion)
      return {
        x: clip.x ?? 50,
        y: clip.y ?? 50,
        scale: clip.scale ?? 100,
        rotation: clip.rotation ?? 0,
      };
    const startProgress = Math.max(
      0,
      Math.min(0.999, clip.motion.startProgress ?? 0),
    );
    const endProgress = Math.max(
      startProgress + 0.001,
      clip.motion.endProgress ?? 1,
    );
    const clipProgress = (time - clip.start) / Math.max(0.001, clip.duration);
    const linearProgress = Math.max(
      0,
      Math.min(
        1,
        (clipProgress - startProgress) /
          Math.max(0.001, endProgress - startProgress),
      ),
    );
    const progress =
      clip.motion.easing === "easeIn"
        ? linearProgress * linearProgress
        : clip.motion.easing === "easeOut"
          ? 1 - (1 - linearProgress) * (1 - linearProgress)
          : clip.motion.easing === "easeInOut"
            ? linearProgress < 0.5
              ? 2 * linearProgress * linearProgress
              : 1 - Math.pow(-2 * linearProgress + 2, 2) / 2
            : linearProgress;
    const lerp = (start: number, end: number) =>
      start + (end - start) * progress;
    const path = clip.motion.path;
    let pathPosition: { x: number; y: number } | undefined;
    if (path && path.length > 1) {
      const nextIndex = path.findIndex((point) => point.progress >= progress);
      const next = path[nextIndex < 0 ? path.length - 1 : nextIndex];
      const previous =
        path[Math.max(0, (nextIndex < 0 ? path.length : nextIndex) - 1)];
      const segment = Math.max(0.0001, next.progress - previous.progress);
      const local = Math.max(
        0,
        Math.min(1, (progress - previous.progress) / segment),
      );
      pathPosition = {
        x: previous.x + (next.x - previous.x) * local,
        y: previous.y + (next.y - previous.y) * local,
      };
    }
    return {
      x: pathPosition?.x ?? lerp(clip.motion.startX, clip.motion.endX),
      y: pathPosition?.y ?? lerp(clip.motion.startY, clip.motion.endY),
      scale: lerp(clip.motion.startScale, clip.motion.endScale),
      rotation: lerp(clip.motion.startRotation, clip.motion.endRotation),
    };
  };
  const visualOpacity = (clip: Clip) => {
    const local = time - clip.start;
    const fadeIn = Math.max(0, clip.videoFadeIn ?? 0);
    const fadeOut = Math.max(0, clip.videoFadeOut ?? 0);
    const inFactor = fadeIn > 0 ? Math.min(1, Math.max(0, local / fadeIn)) : 1;
    const outFactor =
      fadeOut > 0
        ? Math.min(1, Math.max(0, (clip.duration - local) / fadeOut))
        : 1;
    return (clip.opacity ?? 1) * Math.min(inFactor, outFactor);
  };
  const setMotionPreset = (preset: string) => {
    if (!active || !["video", "image"].includes(active.kind)) return;
    if (preset === "none") {
      setMotionEdit(null);
      setClips((items) =>
        items.map((item) =>
          item.id === active.id ? { ...item, motion: undefined } : item,
        ),
      );
      return;
    }
    const x = active.x ?? 50,
      y = active.y ?? 50,
      scale = active.scale ?? 100,
      rotation = active.rotation ?? 0;
    const motion: NonNullable<Clip["motion"]> = {
      preset: preset as NonNullable<Clip["motion"]>["preset"],
      startX:
        preset === "panRight" ? x - 10 : preset === "panLeft" ? x + 10 : x,
      endX: preset === "panRight" ? x + 10 : preset === "panLeft" ? x - 10 : x,
      startY: y,
      endY: y,
      startScale: preset === "zoomIn" ? scale * 0.85 : scale,
      endScale: preset === "zoomOut" ? scale * 0.85 : scale,
      startRotation: rotation,
      endRotation: rotation,
      startProgress: 0,
      endProgress: 1,
    };
    setClips((items) =>
      items.map((item) => (item.id === active.id ? { ...item, motion } : item)),
    );
  };
  const wrapCaption = (clip: Clip) => {
    const source = clip.text || "";
    const element = canvasRef.current;
    if (!element || !source) return source;
    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) return source;
    const family =
      clip.fontFamily === "serif"
        ? 'Batang, "Apple Myungjo", serif'
        : '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    measure.font = `${clip.fontWeight ?? "bold"} ${clip.fontSize ?? 42}px ${family}`;
    const maxWidth = element.clientWidth * ((clip.textWidth ?? 70) / 100);
    return source
      .split("\n")
      .flatMap((paragraph) => {
        if (!paragraph) return [""];
        const lines: string[] = [];
        let line = "";
        for (const character of Array.from(paragraph)) {
          const next = line + character;
          if (line && measure.measureText(next).width > maxWidth) {
            lines.push(line.trimEnd());
            line = character.trimStart();
          } else line = next;
        }
        lines.push(line);
        return lines;
      })
      .join("\n");
  };
  const restoreSnapshot = (raw: string) => {
    restoringHistory.current = true;
    const s = JSON.parse(raw);
    setClips(s.clips);
    setTracks(s.tracks);
    setSettings(s.settings);
    setTimeout(() => {
      restoringHistory.current = false;
    }, 0);
  };
  const undo = () => {
    if (history.current.length < 2) return;
    const current = history.current.pop()!;
    redoHistory.current.push(current);
    restoreSnapshot(history.current[history.current.length - 1]);
  };
  const redo = () => {
    const next = redoHistory.current.pop();
    if (!next) return;
    history.current.push(next);
    restoreSnapshot(next);
  };
  useEffect(() => {
    if (restoringHistory.current) return;
    const timer = setTimeout(() => {
      const snapshot = JSON.stringify({ clips, tracks, settings });
      if (history.current[history.current.length - 1] !== snapshot) {
        history.current.push(snapshot);
        if (history.current.length > 50) history.current.shift();
        redoHistory.current = [];
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [clips, tracks, settings]);
  const trackLabels = useMemo(() => {
    const counts = { video: 0, text: 0, audio: 0 };
    return tracks.map((t) => {
      counts[t.type]++;
      return {
        ...t,
        code: `${t.type === "video" ? "V" : t.type === "text" ? "T" : "A"}${counts[t.type]}`,
      };
    });
  }, [tracks]);
  const visible = useMemo(
    () =>
      clips
        .filter(
          (c) =>
            time >= c.start &&
            time < c.start + c.duration &&
            tracks.find((t) => t.id === c.track)?.visible !== false,
        )
        .sort((a, b) => a.track - b.track),
    [clips, time, tracks],
  );
  const visualClips = visible
    .filter((c) => c.kind === "video" || c.kind === "image")
    .sort((a, b) => {
      const aIndex = clips.findIndex((clip) => clip.id === a.id);
      const bIndex = clips.findIndex((clip) => clip.id === b.id);
      const aOrder = a.zOrder ?? -a.track * 100_000 + aIndex;
      const bOrder = b.zOrder ?? -b.track * 100_000 + bIndex;
      return aOrder - bOrder;
    });

  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now(),
      startedTime = time;
    const tick = (now: number) => {
      const next = startedTime + (now - startedAt) / 1000;
      if (next >= total) {
        setTime(0);
        setPlaying(false);
        return;
      }
      setTime(next);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);
  useEffect(() => {
    mediaEls.current.forEach((el, id) => {
      const clip = clips.find((c) => c.id === id.replace(/^mosaic-/, ""));
      if (!clip) return;
      const track = tracks.find((t) => t.id === clip.track);
      el.muted = track?.muted === true;
      const inside =
        time >= clip.start &&
        time < clip.start + clip.duration &&
        track?.visible !== false;
      const local = Math.max(0, (clip.sourceStart ?? 0) + time - clip.start);
      const elapsed = Math.max(0, time - clip.start);
      const fadeInGain = clip.fadeIn ? Math.min(1, elapsed / clip.fadeIn) : 1;
      const fadeOutGain = clip.fadeOut
        ? Math.min(1, (clip.duration - elapsed) / clip.fadeOut)
        : 1;
      el.volume = Math.max(
        0,
        Math.min(1, (clip.volume ?? 1) * fadeInGain * fadeOutGain),
      );
      if (!inside) {
        if (!el.paused) el.pause();
        return;
      }
      if (!playing) {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - local) > 0.04) el.currentTime = local;
        return;
      }
      if (el.paused) {
        el.currentTime = local;
        void el.play().catch(() => {});
      }
    });
  }, [time, playing, clips, tracks]);
  useEffect(() => () => assets.forEach((a) => URL.revokeObjectURL(a.url)), []);
  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(""), 2200);
  };
  const addTrack = (
    type = tracks.find((t) => t.id === activeTrack)?.type || "video",
  ) => {
    const id = Math.max(-1, ...tracks.map((t) => t.id)) + 1;
    const index = Math.max(
      0,
      tracks.findIndex((t) => t.id === activeTrack) + 1,
    );
    const track: Track = {
      id,
      type,
      name:
        type === "video"
          ? "비디오 레이어"
          : type === "text"
            ? "자막 레이어"
            : "오디오 레이어",
      visible: true,
    };
    setTracks((v) => [...v.slice(0, index), track, ...v.slice(index)]);
    setActiveTrack(id);
    flash(
      `${type === "video" ? "비디오" : type === "text" ? "텍스트" : "오디오"} 트랙을 추가했습니다`,
    );
  };
  const toggleTrack = (id: number, patch: Partial<Track>) =>
    setTracks((v) => v.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const splitClip = () => {
    const clip = clips.find((c) => c.id === selected);
    if (
      !clip ||
      time <= clip.start + 0.05 ||
      time >= clip.start + clip.duration - 0.05
    ) {
      flash("플레이헤드를 선택한 클립 안에 놓으세요");
      return;
    }
    if (tracks.find((t) => t.id === clip.track)?.locked) {
      flash("잠긴 트랙입니다");
      return;
    }
    const splitOffset = time - clip.start;
    const leftDuration = splitOffset;
    const rightDuration = clip.duration - splitOffset;
    const left: Clip = {
      ...clip,
      duration: leftDuration,
      // A transition at the original end belongs to the right fragment.
      fadeOut: 0,
      videoFadeOut: 0,
    };
    const right: Clip = {
      ...clip,
      id: uid(),
      start: time,
      duration: rightDuration,
      sourceStart:
        clip.kind === "video" || clip.kind === "audio"
          ? (clip.sourceStart ?? 0) + splitOffset
          : clip.sourceStart,
      // A transition at the original beginning belongs to the left fragment.
      fadeIn: 0,
      videoFadeIn: 0,
      name: `${clip.name} (분할)`,
    };
    setClips((v) => v.flatMap((c) => (c.id === clip.id ? [left, right] : [c])));
    setSelected(right.id);
    setSelectedClips([right.id]);
    flash("클립을 분할했습니다");
  };
  const removeTrack = () => {
    if (tracks.length <= 1) {
      flash("최소 한 개의 트랙이 필요합니다");
      return;
    }
    if (clips.some((c) => c.track === activeTrack)) {
      flash("클립이 있는 트랙은 제거할 수 없습니다");
      return;
    }
    const index = tracks.findIndex((t) => t.id === activeTrack);
    setTracks((v) => v.filter((t) => t.id !== activeTrack));
    setActiveTrack(tracks[Math.max(0, index - 1)]?.id ?? tracks[0].id);
    flash("빈 트랙을 제거했습니다");
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,[contenteditable=true]")) return;
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        addTrack();
      } else if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        addTrack("video");
      } else if (e.shiftKey && e.key === "2") {
        e.preventDefault();
        addTrack("text");
      } else if (e.shiftKey && e.key === "3") {
        e.preventDefault();
        addTrack("audio");
      } else if (e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        removeTrack();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "b"
      ) {
        e.preventDefault();
        splitClip();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const clip = clips.find((c) => c.id === selected);
        if (clip) copiedClip.current = { ...clip };
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "v" &&
        copiedClip.current
      ) {
        e.preventDefault();
        const copy = {
          ...copiedClip.current,
          id: uid(),
          start: time,
          name: `${copiedClip.current.name} 복사본`,
        };
        setClips((v) => [...v, copy]);
        setSelected(copy.id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        const ids = selectedClips.length ? selectedClips : [selected];
        const clip = clips.find((c) => c.id === selected);
        if (clip && !tracks.find((t) => t.id === clip.track)?.locked) {
          setClips((v) =>
            v.filter(
              (c) =>
                !ids.includes(c.id) ||
                tracks.find((track) => track.id === c.track)?.locked,
            ),
          );
          setSelected("");
          setSelectedClips([]);
          flash(`${ids.length}개 클립을 제거했습니다`);
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAsset
      ) {
        removeAsset(selectedAsset);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    tracks,
    activeTrack,
    clips,
    selected,
    selectedClips,
    selectedAsset,
    time,
  ]);
  const addFiles = (files: FileList | File[]) => {
    const next = [...files].map((f) => {
      const kind: Kind = f.type.startsWith("video")
        ? "video"
        : f.type.startsWith("image")
          ? "image"
          : f.type.startsWith("audio")
            ? "audio"
            : "image";
      const item = {
        id: uid(),
        name: f.name,
        kind,
        url: URL.createObjectURL(f),
        duration: kind === "image" ? 5 : 8,
        size: `${(f.size / 1048576).toFixed(1)} MB`,
        color: colors[kind],
        path: window.hinana?.getFilePath(f),
      };
      if (kind === "video" || kind === "audio") {
        const probe = document.createElement(kind);
        probe.preload = "metadata";
        probe.src = item.url;
        probe.onloadedmetadata = () => {
          if (Number.isFinite(probe.duration)) {
            setAssets((v) =>
              v.map((a) =>
                a.id === item.id ? { ...a, duration: probe.duration } : a,
              ),
            );
            setClips((v) =>
              v.map((c) =>
                c.assetId === item.id && c.duration === 8
                  ? { ...c, duration: probe.duration }
                  : c,
              ),
            );
          }
        };
      }
      if (kind === "audio") {
        void f
          .arrayBuffer()
          .then(async (buffer) => {
            const context = new AudioContext();
            const decoded = await context.decodeAudioData(buffer);
            const data = decoded.getChannelData(0),
              bars = 120,
              step = Math.max(1, Math.floor(data.length / bars));
            const waveform = Array.from({ length: bars }, (_, i) => {
              let peak = 0;
              for (
                let j = i * step;
                j < Math.min(data.length, (i + 1) * step);
                j++
              )
                peak = Math.max(peak, Math.abs(data[j]));
              return peak;
            });
            await context.close();
            setAssets((v) =>
              v.map((a) => (a.id === item.id ? { ...a, waveform } : a)),
            );
          })
          .catch(() => {});
      }
      return item;
    });
    setAssets((v) => [...v, ...next]);
    flash(`${next.length}개 파일을 가져왔습니다`);
    return next;
  };
  const placeAsset = (a: Asset, track: number, start: number) => {
    const target = tracks.find((t) => t.id === track);
    const type = a.kind === "audio" ? "audio" : "video";
    if (!target || target.type !== type) {
      flash(
        `${type === "audio" ? "오디오" : "영상·사진"} 파일은 ${type === "audio" ? "오디오" : "비디오"} 트랙에 놓아주세요`,
      );
      return;
    }
    if (target.locked) {
      flash("잠긴 트랙에는 클립을 추가할 수 없습니다");
      return;
    }
    const c: Clip = {
      id: uid(),
      assetId: a.id,
      kind: a.kind,
      name: a.name,
      start: Math.max(0, Math.round(start * 10) / 10),
      duration: a.duration,
      track,
      color: a.color,
    };
    setClips((v) => [...v, c]);
    setSelected(c.id);
    setActiveTrack(track);
  };
  const addToTimeline = (a: Asset) => {
    const type = a.kind === "audio" ? "audio" : "video";
    const track = (
      tracks.find((t) => t.id === activeTrack && t.type === type) ||
      tracks.find((t) => t.type === type)
    )?.id;
    if (track === undefined) {
      flash(`${type === "audio" ? "오디오" : "비디오"} 트랙을 먼저 추가하세요`);
      return;
    }
    placeAsset(a, track, time);
  };
  const addShape = (shape: NonNullable<Asset["shapeType"]>) => {
    const track = (
      tracks.find((item) => item.id === activeTrack && item.type === "video") ||
      tracks.find((item) => item.type === "video")
    )?.id;
    if (track === undefined) {
      flash("비디오 트랙을 먼저 추가하세요");
      return;
    }
    const names = { rectangle: "사각형", ellipse: "원", triangle: "삼각형" };
    const color = "#7068ff";
    const embeddedData = createShapeImage(shape, color);
    const asset: Asset = {
      id: uid(),
      name: names[shape],
      kind: "image",
      url: embeddedData,
      embeddedData,
      shapeType: shape,
      shapeColor: color,
      duration: 5,
      size: "도형",
      color: colors.image,
    };
    setAssets((items) => [...items, asset]);
    placeAsset(asset, track, time);
    flash(`${names[shape]}을 추가했습니다`);
  };
  const updateShapeColor = (color: string) => {
    if (!activeAsset?.shapeType) return;
    const embeddedData = createShapeImage(activeAsset.shapeType, color);
    setAssets((items) =>
      items.map((asset) =>
        asset.id === activeAsset.id
          ? { ...asset, shapeColor: color, embeddedData, url: embeddedData }
          : asset,
      ),
    );
  };
  const dropOnTrack = (e: React.DragEvent, track: number) => {
    e.preventDefault();
    e.stopPropagation();
    const row = e.currentTarget.getBoundingClientRect(),
      at = (e.clientX - row.left) / px;
    const assetId = e.dataTransfer.getData("asset");
    if (assetId) {
      const a = assets.find((x) => x.id === assetId);
      if (a) placeAsset(a, track, at);
      return;
    }
    if (e.dataTransfer.files.length) {
      const added = addFiles(e.dataTransfer.files);
      let offset = at;
      added.forEach((a) => {
        const target = tracks.find((t) => t.id === track);
        const type = a.kind === "audio" ? "audio" : "video";
        if (target?.type === type) {
          placeAsset(a, track, offset);
          offset += a.duration;
        }
      });
    }
  };
  const removeClip = (id: string) => {
    setClips((v) => v.filter((c) => c.id !== id));
    if (selected === id) setSelected("");
    setMenu(null);
    flash("클립을 제거했습니다");
  };
  const rippleDeleteClip = (id: string) => {
    setClips((items) => {
      const removed = items.find((item) => item.id === id);
      if (!removed) return items;
      const end = removed.start + removed.duration;
      return items
        .filter((item) => item.id !== id)
        .map((item) =>
          item.track === removed.track && item.start >= end
            ? {
                ...item,
                start: Math.max(removed.start, item.start - removed.duration),
              }
            : item,
        );
    });
    setSelected("");
    setSelectedClips([]);
    setMenu(null);
    flash("클립을 제거하고 뒤쪽 간격을 닫았습니다");
  };
  const moveClipLayer = (id: string, direction: "front" | "back") => {
    setClips((items) => {
      const clip = items.find((item) => item.id === id);
      if (!clip) return items;
      const visual = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.kind === "video" || item.kind === "image")
        .sort((a, b) => {
          const aOrder = a.item.zOrder ?? -a.item.track * 100_000 + a.index;
          const bOrder = b.item.zOrder ?? -b.item.track * 100_000 + b.index;
          return aOrder - bOrder;
        })
        .map(({ item }) => item);
      const reordered = visual.filter((item) => item.id !== id);
      if (direction === "front") reordered.push(clip);
      else reordered.unshift(clip);
      const orders = new Map(
        reordered.map((item, index) => [item.id, index] as const),
      );
      return items.map((item) =>
        orders.has(item.id) ? { ...item, zOrder: orders.get(item.id) } : item,
      );
    });
    setMenu(null);
    flash(
      direction === "front" ? "맨 앞으로 보냈습니다" : "맨 뒤로 보냈습니다",
    );
  };
  const removeAsset = (id: string) => {
    if (clips.some((c) => c.assetId === id)) {
      flash("타임라인에서 사용 중인 미디어는 먼저 클립을 제거하세요");
      setMenu(null);
      return;
    }
    const asset = assets.find((a) => a.id === id);
    if (asset?.url.startsWith("blob:")) URL.revokeObjectURL(asset.url);
    setAssets((v) => v.filter((a) => a.id !== id));
    setSelectedAsset(null);
    setMenu(null);
    flash("내 미디어에서 제거했습니다");
  };
  const removeLayer = (id: number) => {
    if (tracks.length <= 1) {
      flash("최소 한 개의 트랙이 필요합니다");
      setMenu(null);
      return;
    }
    const removed = clips.filter((c) => c.track === id).length;
    setClips((v) => v.filter((c) => c.track !== id));
    setTracks((v) => v.filter((t) => t.id !== id));
    if (activeTrack === id)
      setActiveTrack(tracks.find((t) => t.id !== id)?.id ?? 0);
    setMenu(null);
    flash(
      removed
        ? `레이어와 클립 ${removed}개를 제거했습니다`
        : "레이어를 제거했습니다",
    );
  };
  const update = (patch: Partial<Clip>) =>
    setClips((v) => v.map((c) => (c.id === selected ? { ...c, ...patch } : c)));
  const setMotionRangeBoundary = (kind: "start" | "end") => {
    if (!active?.motion) return;
    const raw = (time - active.start) / Math.max(0.001, active.duration);
    const progress = Math.max(0, Math.min(1, raw));
    setClips((items) =>
      items.map((item) => {
        if (item.id !== active.id || !item.motion) return item;
        return {
          ...item,
          motion: {
            ...item.motion,
            ...(kind === "start"
              ? {
                  startProgress: Math.min(
                    progress,
                    (item.motion.endProgress ?? 1) - 0.001,
                  ),
                }
              : {
                  endProgress: Math.max(
                    progress,
                    (item.motion.startProgress ?? 0) + 0.001,
                  ),
                }),
          },
        };
      }),
    );
    flash(
      `모션 ${kind === "start" ? "시작" : "종료"} 시간을 ${Math.max(0, time - active.start).toFixed(2)}초로 설정했습니다`,
    );
  };
  const addText = () => {
    const track = (
      tracks.find((t) => t.id === activeTrack && t.type === "text") ||
      tracks.find((t) => t.type === "text")
    )?.id;
    if (track === undefined) {
      flash("텍스트 트랙을 먼저 추가하세요");
      return;
    }
    const c: Clip = {
      id: uid(),
      kind: "text",
      name: "새 자막",
      text: "새 자막을 입력하세요",
      start: time,
      duration: 4,
      track,
      color: colors.text,
      opacity: 1,
      fontSize: 42,
      fontFamily: "gothic",
      fontWeight: "bold",
      textWidth: 70,
      textColor: "#ffffff",
      bgColor: "#000000",
      bgOpacity: 0.55,
      x: 50,
      y: 82,
    };
    setClips((v) => [...v, c]);
    setSelected(c.id);
    setActiveTrack(track);
    setTab("text");
  };
  const beginCaptionDrag = (e: React.PointerEvent, clip: Clip) => {
    if (editingCaption === clip.id) return;
    if (e.detail > 1) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(clip.id);
    const canvas = e.currentTarget.parentElement!.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY,
      startX = clip.x ?? 50,
      startY = clip.y ?? 82;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 3)
        moved = true;
      const x = Math.max(
        0,
        Math.min(100, startX + ((ev.clientX - sx) / canvas.width) * 100),
      );
      const y = Math.max(
        0,
        Math.min(100, startY + ((ev.clientY - sy) / canvas.height) * 100),
      );
      setClips((v) => v.map((c) => (c.id === clip.id ? { ...c, x, y } : c)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) (e.currentTarget as HTMLElement).focus();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginCaptionResize = (
    e: React.PointerEvent,
    clip: Clip,
    side: "left" | "right",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(clip.id);
    const canvas = e.currentTarget.closest(".canvas")!.getBoundingClientRect();
    const sx = e.clientX,
      startWidth = clip.textWidth ?? 70,
      startX = clip.x ?? 50;
    const move = (ev: PointerEvent) => {
      const delta = ((ev.clientX - sx) / canvas.width) * 100;
      const signed = side === "right" ? delta : -delta;
      const width = Math.max(10, Math.min(100, startWidth + signed));
      const applied = width - startWidth;
      const x = Math.max(
        0,
        Math.min(100, startX + (side === "right" ? applied / 2 : -applied / 2)),
      );
      setClips((v) =>
        v.map((c) => (c.id === clip.id ? { ...c, textWidth: width, x } : c)),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const insertCaptionText = (text: string) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text.replace(/\r\n?/g, "\n"));
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const beginMediaDrag = (e: React.PointerEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(clip.id);
    setActiveTrack(clip.track);
    if (tracks.find((t) => t.id === clip.track)?.locked) {
      flash("잠긴 트랙입니다");
      return;
    }
    const canvas = e.currentTarget.parentElement!.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY,
      startX =
        clip.motion && motionEdit === "start"
          ? clip.motion.startX
          : clip.motion && motionEdit === "end"
            ? clip.motion.endX
            : (clip.x ?? 50),
      startY =
        clip.motion && motionEdit === "start"
          ? clip.motion.startY
          : clip.motion && motionEdit === "end"
            ? clip.motion.endY
            : (clip.y ?? 50);
    const move = (ev: PointerEvent) => {
      const x = Math.max(
        -50,
        Math.min(150, startX + ((ev.clientX - sx) / canvas.width) * 100),
      );
      const y = Math.max(
        -50,
        Math.min(150, startY + ((ev.clientY - sy) / canvas.height) * 100),
      );
      const dx = x - startX;
      const dy = y - startY;
      setClips((v) =>
        v.map((c) =>
          c.id === clip.id
            ? {
                ...c,
                x: motionEdit && clip.motion ? c.x : x,
                y: motionEdit && clip.motion ? c.y : y,
                motion: clip.motion
                  ? motionEdit === "start"
                    ? {
                        ...clip.motion,
                        preset: "custom",
                        startX: clip.motion.startX + dx,
                        startY: clip.motion.startY + dy,
                      }
                    : motionEdit === "end"
                      ? {
                          ...clip.motion,
                          preset: "custom",
                          endX: clip.motion.endX + dx,
                          endY: clip.motion.endY + dy,
                        }
                      : {
                          ...clip.motion,
                          preset: "custom",
                          startX: clip.motion.startX + dx,
                          endX: clip.motion.endX + dx,
                          startY: clip.motion.startY + dy,
                          endY: clip.motion.endY + dy,
                        }
                  : undefined,
              }
            : c,
        ),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginMediaResize = (e: React.PointerEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = e.currentTarget.closest(".canvas")!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale =
      clip.motion && motionEdit === "start"
        ? clip.motion.startScale
        : clip.motion && motionEdit === "end"
          ? clip.motion.endScale
          : (clip.scale ?? 100);
    const move = (event: PointerEvent) => {
      const delta =
        ((event.clientX - startX + event.clientY - startY) / canvas.width) *
        100;
      const scale = Math.max(5, Math.min(500, startScale + delta));
      setClips((items) =>
        items.map((item) =>
          item.id === clip.id
            ? {
                ...item,
                scale: motionEdit && clip.motion ? item.scale : scale,
                motion: clip.motion
                  ? motionEdit === "start"
                    ? {
                        ...clip.motion,
                        preset: "custom",
                        startScale: Math.max(5, clip.motion.startScale + delta),
                      }
                    : motionEdit === "end"
                      ? {
                          ...clip.motion,
                          preset: "custom",
                          endScale: Math.max(5, clip.motion.endScale + delta),
                        }
                      : {
                          ...clip.motion,
                          preset: "custom",
                          startScale: Math.max(
                            5,
                            clip.motion.startScale + delta,
                          ),
                          endScale: Math.max(5, clip.motion.endScale + delta),
                        }
                  : undefined,
              }
            : item,
        ),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginMotionPathDraw = (e: React.PointerEvent, clip: Clip) => {
    if (!clip.motion) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!canvas) return;
    const initialPose = motionState(clip);
    const pointerStartX = ((e.clientX - canvas.left) / canvas.width) * 100;
    const pointerStartY = ((e.clientY - canvas.top) / canvas.height) * 100;
    const grabOffsetX = initialPose.x - pointerStartX;
    const grabOffsetY = initialPose.y - pointerStartY;
    const points: { x: number; y: number }[] = [];
    const addPoint = (clientX: number, clientY: number) => {
      const point = {
        x: Math.max(
          -50,
          Math.min(
            150,
            ((clientX - canvas.left) / canvas.width) * 100 + grabOffsetX,
          ),
        ),
        y: Math.max(
          -50,
          Math.min(
            150,
            ((clientY - canvas.top) / canvas.height) * 100 + grabOffsetY,
          ),
        ),
      };
      setMotionPathDraft({ clipId: clip.id, ...point });
      const last = points[points.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.8) return;
      points.push(point);
      const sampled =
        points.length <= 40
          ? points
          : points.filter((_, index) => index % 2 === 0);
      const path = sampled.map((item, index) => ({
        ...item,
        progress: sampled.length === 1 ? 0 : index / (sampled.length - 1),
      }));
      setClips((items) =>
        items.map((item) =>
          item.id === clip.id && item.motion
            ? {
                ...item,
                motion: {
                  ...item.motion,
                  preset: "custom",
                  path,
                  startX: path[0].x,
                  startY: path[0].y,
                  endX: path[path.length - 1].x,
                  endY: path[path.length - 1].y,
                },
              }
            : item,
        ),
      );
    };
    addPoint(e.clientX, e.clientY);
    const move = (event: PointerEvent) =>
      addPoint(event.clientX, event.clientY);
    const up = () => {
      const endProgress = clip.motion?.endProgress ?? 1;
      setTime(
        Math.min(
          clip.start + clip.duration - 0.001,
          clip.start + clip.duration * endProgress,
        ),
      );
      setMotionPathDraft(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginCropEdit = (
    e: React.PointerEvent,
    clip: Clip,
    mode: "move" | "left" | "right" | "top" | "bottom",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!clip.crop) return;
    const canvas = e.currentTarget.closest(".canvas")!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...clip.crop };
    const move = (event: PointerEvent) => {
      const dx = ((event.clientX - startX) / canvas.width) * 100;
      const dy = ((event.clientY - startY) / canvas.height) * 100;
      const next = { ...start };
      if (mode === "left")
        next.left = Math.max(0, Math.min(90 - start.right, start.left + dx));
      if (mode === "right")
        next.right = Math.max(0, Math.min(90 - start.left, start.right - dx));
      if (mode === "top")
        next.top = Math.max(0, Math.min(90 - start.bottom, start.top + dy));
      if (mode === "bottom")
        next.bottom = Math.max(0, Math.min(90 - start.top, start.bottom - dy));
      if (mode === "move") {
        const width = 100 - start.left - start.right;
        const height = 100 - start.top - start.bottom;
        next.left = Math.max(0, Math.min(100 - width, start.left + dx));
        next.right = 100 - width - next.left;
        next.top = Math.max(0, Math.min(100 - height, start.top + dy));
        next.bottom = 100 - height - next.top;
      }
      setClips((items) =>
        items.map((item) =>
          item.id === clip.id ? { ...item, crop: next } : item,
        ),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginRegionEdit = (
    e: React.PointerEvent,
    clip: Clip,
    resize = false,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!clip.mosaicRegion) return;
    const canvas = e.currentTarget.closest(".canvas")!.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY,
      start = { ...clip.mosaicRegion };
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / canvas.width) * 100,
        dy = ((ev.clientY - sy) / canvas.height) * 100;
      const region = resize
        ? {
            ...start,
            width: Math.max(5, Math.min(100 - start.x, start.width + dx)),
            height: Math.max(5, Math.min(100 - start.y, start.height + dy)),
          }
        : {
            ...start,
            x: Math.max(0, Math.min(100 - start.width, start.x + dx)),
            y: Math.max(0, Math.min(100 - start.height, start.y + dy)),
          };
      setClips((v) =>
        v.map((c) => (c.id === clip.id ? { ...c, mosaicRegion: region } : c)),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const beginClipEdit = (
    e: React.PointerEvent,
    clip: Clip,
    mode: "move" | "left" | "right",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.shiftKey && mode === "move") {
      setSelectedClips((ids) =>
        ids.includes(clip.id)
          ? ids.filter((id) => id !== clip.id)
          : [...ids, clip.id],
      );
      setSelected(clip.id);
      return;
    }
    const movingIds =
      mode === "move" && selectedClips.includes(clip.id)
        ? selectedClips
        : [clip.id];
    if (!selectedClips.includes(clip.id)) setSelectedClips([clip.id]);
    setSelected(clip.id);
    setActiveTrack(clip.track);
    if (tracks.find((t) => t.id === clip.track)?.locked) {
      flash("잠긴 트랙입니다");
      return;
    }
    const sx = e.clientX,
      sy = e.clientY,
      start = clip.start,
      duration = clip.duration,
      startIndex = tracks.findIndex((t) => t.id === clip.track);
    const movingStarts = new Map(
      clips
        .filter((item) => movingIds.includes(item.id))
        .map((item) => [item.id, item.start] as const),
    );
    const type =
      clip.kind === "audio" ? "audio" : clip.kind === "text" ? "text" : "video";
    const snap = (value: number) => {
      const points = [
        0,
        time,
        ...clips
          .filter((c) => c.id !== clip.id)
          .flatMap((c) => [c.start, c.start + c.duration]),
      ];
      const near = points.find((p) => Math.abs(p - value) < 0.12);
      setSnapGuide(near ?? null);
      return near ?? value;
    };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / px;
      if (mode === "move") {
        const proposed =
          tracks[
            Math.max(
              0,
              Math.min(
                tracks.length - 1,
                startIndex + Math.round((ev.clientY - sy) / 65),
              ),
            )
          ];
        const nextTrack =
          proposed?.type === type && !proposed.locked
            ? proposed.id
            : clip.track;
        const snappedStart = Math.max(0, snap(start + dx));
        const appliedDx = snappedStart - start;
        setClips((v) =>
          v.map((c) => {
            if (!movingIds.includes(c.id)) return c;
            return {
              ...c,
              start: Math.max(
                0,
                (movingStarts.get(c.id) ?? c.start) + appliedDx,
              ),
              track: c.id === clip.id ? nextTrack : c.track,
            };
          }),
        );
      } else if (mode === "left") {
        const next = Math.min(
          start + duration - 0.2,
          Math.max(0, snap(start + dx)),
        );
        setClips((v) =>
          v.map((c) =>
            c.id === clip.id
              ? {
                  ...c,
                  start: next,
                  duration: duration + (start - next),
                  sourceStart: Math.max(
                    0,
                    (clip.sourceStart ?? 0) + (next - start),
                  ),
                }
              : c,
          ),
        );
      } else {
        const nextDuration = Math.max(0.2, snap(start + duration + dx) - start);
        const durationDelta = nextDuration - duration;
        setClips((v) =>
          v.map((c) =>
            c.id === clip.id
              ? { ...c, duration: nextDuration }
              : rippleEditing &&
                  c.track === clip.track &&
                  c.start >= start + duration
                ? { ...c, start: Math.max(0, c.start + durationDelta) }
                : c,
          ),
        );
      }
    };
    const up = () => {
      setSnapGuide(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const save = async () => {
    const data = JSON.stringify(
      {
        version: 4,
        clips,
        tracks,
        settings,
        assets: assets.map(({ url: _url, ...a }) => a),
      },
      null,
      2,
    );
    if (window.hinana) {
      const p = await window.hinana.saveProject(data);
      if (p) {
        setProjectName(
          p
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.hinana$/i, "") || "새 프로젝트",
        );
        flash("프로젝트를 저장했습니다");
      }
    } else {
      localStorage.setItem("hinana-project", data);
      flash("브라우저에 임시 저장했습니다");
    }
  };
  const saveAs = async () => {
    if (!window.hinana) return save();
    const data = JSON.stringify(
      {
        version: 4,
        clips,
        tracks,
        settings,
        assets: assets.map(({ url: _url, ...a }) => a),
      },
      null,
      2,
    );
    const p = await window.hinana.saveProjectAs(data);
    if (p) {
      setProjectName(
        p
          .split(/[\\/]/)
          .pop()
          ?.replace(/\.hinana$/i, "") || "새 프로젝트",
      );
      flash("다른 이름으로 저장했습니다");
    }
    setShowProjectMenu(false);
  };
  const createNewProject = async () => {
    if (
      (clips.length || assets.length) &&
      !window.confirm("현재 작업을 닫고 새 프로젝트를 만드시겠습니까?")
    )
      return;
    assets.forEach(
      (a) => a.url.startsWith("blob:") && URL.revokeObjectURL(a.url),
    );
    setClips([]);
    setAssets([]);
    setTracks(initialTracks);
    setSettings({
      width: 1920,
      height: 1080,
      fps: 30,
      exportPreset: "balanced",
      useProxy: true,
      exportMode: "all",
      exportStart: 0,
      exportEnd: 15,
    });
    setSelected("");
    setTime(0);
    setProjectName("새 프로젝트");
    setShowProjectMenu(false);
    localStorage.removeItem("hinana-autosave");
    await window.hinana?.newProject();
  };
  useEffect(() => {
    const saveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        void save();
      }
    };
    window.addEventListener("keydown", saveShortcut, { capture: true });
    return () =>
      window.removeEventListener("keydown", saveShortcut, { capture: true });
  }, [clips, tracks, settings, assets]);
  const relinkAsset = async (asset: Asset) => {
    const path = await window.hinana?.relinkFile(asset.kind);
    if (!path || !window.hinana) return;
    setAssets((v) =>
      v.map((a) =>
        a.id === asset.id
          ? { ...a, path, url: window.hinana!.toFileUrl(path), offline: false }
          : a,
      ),
    );
    flash("원본 파일을 다시 연결했습니다");
  };
  const createProxy = async (asset: Asset) => {
    if (!window.hinana || asset.kind !== "video" || !asset.path) return;
    setAssets((items) =>
      items.map((item) =>
        item.id === asset.id ? { ...item, proxyStatus: "creating" } : item,
      ),
    );
    try {
      const proxyPath = await window.hinana.createProxy(asset.path);
      setAssets((items) =>
        items.map((item) =>
          item.id === asset.id
            ? { ...item, proxyPath, proxyStatus: "ready" }
            : item,
        ),
      );
      flash("편집용 프록시를 만들었습니다");
    } catch (error) {
      console.error("Proxy creation failed", error);
      setAssets((items) =>
        items.map((item) =>
          item.id === asset.id ? { ...item, proxyStatus: "failed" } : item,
        ),
      );
      flash("프록시 생성에 실패했습니다");
    }
  };
  const open = async () => {
    try {
      let data: string | undefined;
      let openedPath: string | undefined;
      if (window.hinana) {
        const opened = await window.hinana.openProject();
        data = opened?.data;
        openedPath = opened?.path;
      } else data = localStorage.getItem("hinana-project") || undefined;
      if (!data) return;
      const normalized = data.replace(/^\uFEFF/, "").trim();
      const project = JSON.parse(normalized);
      if (!project || typeof project !== "object")
        throw new Error("프로젝트 구조가 올바르지 않습니다");
      const nextClips = Array.isArray(project.clips) ? project.clips : [];
      const nextTracks =
        Array.isArray(project.tracks) && project.tracks.length
          ? project.tracks
          : initialTracks;
      const nextAssets = Array.isArray(project.assets)
          ? project.assets.map((a: Asset) => {
            let url = a.embeddedData ?? "";
            if (a.path && window.hinana) {
              try {
                url = window.hinana.toFileUrl(String(a.path));
              } catch {
                url = "";
              }
            }
            return { ...a, url, offline: !url };
          })
        : [];
      setClips(nextClips);
      setTracks(nextTracks);
      setAssets(nextAssets);
      const offlineCount = nextAssets.filter((a: Asset) => a.offline).length;
      if (
        project.settings &&
        Number(project.settings.width) &&
        Number(project.settings.height)
      )
        setSettings(project.settings);
      setSelected("");
      if (openedPath)
        setProjectName(
          openedPath
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.hinana$/i, "") || "새 프로젝트",
        );
      flash(
        offlineCount
          ? `프로젝트를 열었습니다 · 미디어 ${offlineCount}개를 다시 연결해 주세요`
          : "프로젝트를 열었습니다",
      );
    } catch (error) {
      console.error("Project open failed", error);
      flash(
        `프로젝트 파일을 읽을 수 없습니다${error instanceof Error ? `: ${error.message}` : ""}`,
      );
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        localStorage.setItem(
          "hinana-autosave",
          JSON.stringify({
            version: 4,
            clips,
            tracks,
            settings,
            assets: assets.map(({ url: _url, ...a }) => a),
          }),
        ),
      800,
    );
    return () => window.clearTimeout(timer);
  }, [clips, tracks, settings, assets]);
  useEffect(() => {
    const saved = localStorage.getItem("hinana-autosave");
    if (!saved) return;
    try {
      const project = JSON.parse(saved);
      if (project.version !== 4) {
        localStorage.removeItem("hinana-autosave");
        return;
      }
      if (project.clips?.length) setClips(project.clips);
      if (project.tracks?.length) setTracks(project.tracks);
      if (project.settings) setSettings(project.settings);
      if (project.assets)
        setAssets(
          project.assets.map((a: Asset) => ({
            ...a,
            url:
              a.embeddedData ??
              (a.path && window.hinana ? window.hinana.toFileUrl(a.path) : ""),
          })),
        );
    } catch {
      localStorage.removeItem("hinana-autosave");
    }
  }, []);
  useEffect(() => window.hinana?.onExportProgress(setRenderProgress), []);
  useEffect(() => window.hinana?.onExportEncoder(setRenderEncoder), []);
  useEffect(() => window.hinana?.onShowAbout(() => setShowAbout(true)), []);
  useEffect(() => {
    const close = (e: KeyboardEvent) =>
      e.key === "Escape" && setShowAbout(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const exportVideo = async () => {
    if (!window.hinana) {
      flash("영상 내보내기는 데스크톱 앱에서 사용할 수 있습니다");
      return;
    }
    if (
      assets.some(
        (a) =>
          clips.some((c) => c.assetId === a.id) &&
          !a.path &&
          !a.embeddedData,
      )
    ) {
      flash("원본 경로가 없는 미디어가 있습니다. 다시 가져와 주세요");
      return;
    }
    setRenderProgress(0);
    setRenderEncoder("인코더 감지 중");
    try {
      const output = await window.hinana.exportVideo({
        clips: clips.map((c) =>
          c.kind === "text"
            ? {
                ...c,
                renderText: wrapCaption(c),
                previewCanvasWidth: canvasRef.current?.clientWidth || 960,
              }
            : c,
        ),
        tracks,
        settings,
        assets: assets.map(({ url: _url, waveform: _wave, ...a }) => a),
      });
      if (output) {
        setLastExportPath(output);
        flash("MP4 내보내기를 완료했습니다");
      }
    } catch (error) {
      flash(
        `내보내기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      );
    } finally {
      setRenderProgress(null);
    }
  };
  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };
  return (
    <div
      className={`app ${isMac ? "macos" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={drop}
      onPointerDown={(e) => {
        if (menu) setMenu(null);
        const target = e.target as HTMLElement;
        if (!target.closest(".project-trigger")) setShowProjectMenu(false);
        if (
          !target.closest(
            ".media-object,.caption,.clip,.asset,.inspector,.library,aside,.toolrow",
          )
        ) {
          setSelected("");
          setSelectedAsset(null);
          setEditingCaption(null);
        }
      }}
    >
      <header>
        <div className="brand">
          <div className="logo">
            <img src={appIconUrl} alt="" />
          </div>
          <b>HINANA</b>
          <span>STUDIO</span>
        </div>
        <div
          className="project project-trigger"
          onClick={() => setShowProjectMenu((v) => !v)}
        >
          {projectName} <ChevronDown size={14} />
          <small>저장됨</small>
          {showProjectMenu && (
            <div className="project-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={createNewProject}>새 프로젝트</button>
              <button onClick={() => void save()}>
                저장 <span>{isMac ? "⌘S" : "Ctrl+S"}</span>
              </button>
              <button onClick={() => void saveAs()}>다른 이름으로 저장</button>
            </div>
          )}
        </div>
        <div className="head-actions">
          <div className="project-settings">
            <input
              aria-label="가로 해상도"
              type="number"
              value={settings.width}
              onChange={(e) =>
                setSettings((s) => ({ ...s, width: +e.target.value }))
              }
            />
            <span>×</span>
            <input
              aria-label="세로 해상도"
              type="number"
              value={settings.height}
              onChange={(e) =>
                setSettings((s) => ({ ...s, height: +e.target.value }))
              }
            />
            <select
              aria-label="프레임 속도"
              value={settings.fps}
              onChange={(e) =>
                setSettings((s) => ({ ...s, fps: +e.target.value }))
              }
            >
              <option value="24">24fps</option>
              <option value="30">30fps</option>
              <option value="60">60fps</option>
            </select>
            <select
              className="export-preset"
              aria-label="내보내기 품질"
              title="내보내기 품질"
              value={settings.exportPreset ?? "balanced"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  exportPreset: e.target.value as
                    "fast" | "balanced" | "quality",
                }))
              }
            >
              <option value="fast">빠르게</option>
              <option value="balanced">균형</option>
              <option value="quality">고화질</option>
            </select>
            <button
              className={`proxy-toggle ${settings.useProxy ? "active" : ""}`}
              title="미리보기에서 편집용 프록시 사용"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  useProxy: !current.useProxy,
                }))
              }
            >
              프록시
            </button>
            <select
              className="export-range-mode"
              aria-label="내보내기 범위"
              value={settings.exportMode ?? "all"}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  exportMode: e.target.value as "all" | "range",
                  exportEnd: Math.max(current.exportEnd ?? 0, total),
                }))
              }
            >
              <option value="all">전체 출력</option>
              <option value="range">구간 출력</option>
            </select>
            {settings.exportMode === "range" && (
              <>
                <input
                  aria-label="출력 시작 초"
                  title="출력 시작(초)"
                  type="number"
                  min="0"
                  step="0.1"
                  value={settings.exportStart ?? 0}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      exportStart: Math.max(0, +e.target.value),
                    }))
                  }
                />
                <input
                  aria-label="출력 종료 초"
                  title="출력 종료(초)"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={settings.exportEnd ?? total}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      exportEnd: Math.max(0.1, +e.target.value),
                    }))
                  }
                />
              </>
            )}
          </div>
          <button title="실행 취소" onClick={undo}>
            <Undo2 />
          </button>
          <button title="다시 실행" onClick={redo}>
            <Redo2 />
          </button>
          <i />
          <button onClick={open}>
            <FolderOpen /> 열기
          </button>
          <button onClick={save}>
            <Save /> 저장
          </button>
          <button className="export" onClick={exportVideo}>
            <Download /> 내보내기
          </button>
          {lastExportPath && (
            <button
              title="마지막 내보내기 파일 위치 열기"
              onClick={() => void window.hinana?.revealFile(lastExportPath)}
            >
              <FolderOpen /> 결과
            </button>
          )}
        </div>
      </header>
      <main>
        <aside className="rail">
          <button
            className={tab === "media" ? "on" : ""}
            onClick={() => setTab("media")}
          >
            <Film />
            <span>미디어</span>
          </button>
          <button
            className={tab === "text" ? "on" : ""}
            onClick={() => setTab("text")}
          >
            <Type />
            <span>텍스트</span>
          </button>
          <button
            className={tab === "effects" ? "on" : ""}
            onClick={() => setTab("effects")}
          >
            <Sparkles />
            <span>효과</span>
          </button>
          <button
            className={tab === "audio" ? "on" : ""}
            onClick={() => setTab("audio")}
          >
            <Volume2 />
            <span>오디오</span>
          </button>
          <button className="info-menu" onClick={() => setShowAbout(true)}>
            <Info />
            <span>정보</span>
          </button>
        </aside>
        <section className="library">
          <div className="panel-title">
            <h2>
              {tab === "media"
                ? "내 미디어"
                : tab === "text"
                  ? "텍스트"
                  : tab === "effects"
                    ? "효과"
                    : "오디오"}
            </h2>
            <MoreHorizontal />
          </div>
          {tab === "media" ? (
            <>
              <div className="search">
                <Search size={15} />
                <input placeholder="미디어 검색" />
              </div>
              <button className="import" onClick={() => input.current?.click()}>
                <Upload size={17} /> 미디어 가져오기
              </button>
              <input
                ref={input}
                hidden
                multiple
                type="file"
                accept="video/*,image/*,audio/*"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <div className="assets">
                {assets.length === 0 ? (
                  <div className="empty">
                    <div>
                      <Upload />
                    </div>
                    <b>미디어를 여기에 놓으세요</b>
                    <span>영상, 사진, 오디오 파일</span>
                    <small>데모 클립은 이미 타임라인에 있습니다</small>
                  </div>
                ) : (
                  assets.map((a) => (
                    <button
                      className={`asset ${selectedAsset === a.id ? "selected" : ""} ${a.offline ? "offline" : ""}`}
                      key={a.id}
                      onClick={() => {
                        setSelectedAsset(a.id);
                        setSelected("");
                      }}
                      onDoubleClick={() => addToTimeline(a)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedAsset(a.id);
                        setMenu({ x: e.clientX, y: e.clientY, assetId: a.id });
                      }}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("asset", a.id)}
                    >
                      <div className={`thumb ${a.kind}`}>
                        {a.kind === "video" ? (
                          <Film />
                        ) : a.kind === "image" ? (
                          <ImageIcon />
                        ) : (
                          <Music2 />
                        )}
                      </div>
                      <div>
                        <b>{a.name}</b>
                        <span>
                          {a.offline
                            ? "오프라인 · 폴더 버튼으로 재연결"
                            : `${a.kind.toUpperCase()} · ${a.size}`}
                        </span>
                      </div>
                      {a.kind === "video" && (
                        <span
                          className={`proxy-button ${a.proxyStatus ?? ""}`}
                          aria-disabled={a.proxyStatus === "creating" || !a.path}
                          title="편집용 저해상도 프록시 생성"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (a.proxyStatus !== "creating" && a.path)
                              void createProxy(a);
                          }}
                        >
                          {a.proxyStatus === "creating"
                            ? "생성 중"
                            : a.proxyPath
                              ? "프록시"
                              : "P"}
                        </span>
                      )}
                      <FolderOpen
                        className="relink"
                        size={14}
                        onClick={(e) => {
                          e.stopPropagation();
                          void relinkAsset(a);
                        }}
                      />
                      <Plus size={16} onClick={() => addToTimeline(a)} />
                    </button>
                  ))
                )}
              </div>
            </>
          ) : tab === "text" ? (
            <div className="text-tools">
              <button className="add-text" onClick={addText}>
                <Plus /> 자막 추가
              </button>
            </div>
          ) : tab === "effects" ? (
            <div className="effects-panel">
              <h3>도형</h3>
              <div className="shape-buttons">
                <button onClick={() => addShape("rectangle")}>■ 사각형</button>
                <button onClick={() => addShape("ellipse")}>● 원</button>
                <button onClick={() => addShape("triangle")}>▲ 삼각형</button>
              </div>
              {activeAsset?.shapeType && (
                <label className="shape-color">
                  도형 색상
                  <input
                    type="color"
                    value={activeAsset.shapeColor ?? "#7068ff"}
                    onChange={(event) => updateShapeColor(event.target.value)}
                  />
                </label>
              )}
              <div className="divider" />
              <p>영상·이미지 클립을 선택한 뒤 효과를 조절하세요.</p>
              <button
                onClick={() =>
                  active && update({ grayscale: !active.grayscale })
                }
                className={active?.grayscale ? "effect-on" : ""}
              >
                흑백
              </button>
              <label>
                밝기 <em>{Math.round((active?.brightness ?? 1) * 100)}%</em>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step=".01"
                value={active?.brightness ?? 1}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onChange={(e) => update({ brightness: +e.target.value })}
              />
              <label>
                대비 <em>{Math.round((active?.contrast ?? 1) * 100)}%</em>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step=".01"
                value={active?.contrast ?? 1}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onChange={(e) => update({ contrast: +e.target.value })}
              />
              <label>
                채도 <em>{Math.round((active?.saturation ?? 1) * 100)}%</em>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step=".01"
                value={active?.saturation ?? 1}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onChange={(e) => update({ saturation: +e.target.value })}
              />
              <label>
                블러 <em>{(active?.blur ?? 0).toFixed(1)}</em>
              </label>
              <input
                type="range"
                min="0"
                max="12"
                step=".5"
                value={active?.blur ?? 0}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onChange={(e) => update({ blur: +e.target.value })}
              />
              <label>
                모자이크{" "}
                <em>
                  {active?.mosaic && active.mosaic > 1
                    ? `${Math.round(active.mosaic)}단계`
                    : "꺼짐"}
                </em>
              </label>
              <input
                type="range"
                min="1"
                max="32"
                step="1"
                value={active?.mosaic ?? 1}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onChange={(e) => update({ mosaic: +e.target.value })}
              />
              <div className="mask-heading">
                <b>자르기</b>
                <span>원본을 훼손하지 않는 비파괴 자르기</span>
              </div>
              <button
                className={active?.crop ? "effect-on" : ""}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onClick={() =>
                  update({
                    crop: active?.crop
                      ? undefined
                      : {
                          left: 0,
                          top: 0,
                          right: 0,
                          bottom: 0,
                          shape: "rectangle",
                        },
                  })
                }
              >
                {active?.crop ? "자르기 해제" : "자르기 적용"}
              </button>
              {active?.crop && (
                <>
                  <label>자르기 모양</label>
                  <select
                    className="mask-select"
                    value={active.crop.shape}
                    onChange={(e) =>
                      update({
                        crop: {
                          ...active.crop!,
                          shape: e.target.value as "rectangle" | "ellipse",
                        },
                      })
                    }
                  >
                    <option value="rectangle">사각형</option>
                    <option value="ellipse">원·타원형</option>
                  </select>
                  {(["left", "right", "top", "bottom"] as const).map((side) => (
                    <div key={side}>
                      <label>
                        {
                          {
                            left: "왼쪽",
                            right: "오른쪽",
                            top: "위",
                            bottom: "아래",
                          }[side]
                        }
                        <em>{active.crop![side]}%</em>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="1"
                        value={active.crop![side]}
                        onChange={(e) =>
                          update({
                            crop: {
                              ...active.crop!,
                              [side]: +e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              )}
              <div className="mask-heading">
                <b>영상 마스킹</b>
                <span>미리보기에서 이동·크기 조절</span>
              </div>
              <button
                className={active?.mosaicRegion ? "effect-on" : ""}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onClick={() =>
                  update({
                    mosaicRegion: active?.mosaicRegion
                      ? undefined
                      : {
                          x: 35,
                          y: 35,
                          width: 30,
                          height: 30,
                          strength: 12,
                          shape: "rectangle",
                          effect: "mosaic",
                          feather: 0,
                        },
                  })
                }
              >
                {active?.mosaicRegion
                  ? "모자이크 마스크 제거"
                  : "모자이크 마스크 추가"}
              </button>
              {active?.mosaicRegion && (
                <>
                  <label>마스크 모양</label>
                  <select
                    className="mask-select"
                    value={active.mosaicRegion.shape ?? "rectangle"}
                    onChange={(e) =>
                      update({
                        mosaicRegion: {
                          ...active.mosaicRegion!,
                          shape: e.target.value as "rectangle" | "ellipse",
                        },
                      })
                    }
                  >
                    <option value="rectangle">사각형</option>
                    <option value="ellipse">타원형</option>
                  </select>
                  <label>마스크 효과</label>
                  <select
                    className="mask-select"
                    value={active.mosaicRegion.effect ?? "mosaic"}
                    onChange={(e) =>
                      update({
                        mosaicRegion: {
                          ...active.mosaicRegion!,
                          effect: e.target.value as "mosaic" | "blur" | "black",
                        },
                      })
                    }
                  >
                    <option value="mosaic">모자이크</option>
                    <option value="blur">블러</option>
                    <option value="black">검게 가리기</option>
                  </select>
                  <label>
                    마스크 효과 강도 <em>{active.mosaicRegion.strength}단계</em>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="32"
                    step="1"
                    value={active.mosaicRegion.strength}
                    onChange={(e) =>
                      update({
                        mosaicRegion: {
                          ...active.mosaicRegion!,
                          strength: +e.target.value,
                        },
                      })
                    }
                  />
                  <label>
                    경계 부드러움 <em>{active.mosaicRegion.feather ?? 0}</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={active.mosaicRegion.feather ?? 0}
                    onChange={(e) =>
                      update({
                        mosaicRegion: {
                          ...active.mosaicRegion!,
                          feather: +e.target.value,
                        },
                      })
                    }
                  />
                </>
              )}
              <button
                onClick={() =>
                  update({
                    grayscale: false,
                    brightness: 1,
                    contrast: 1,
                    saturation: 1,
                    blur: 0,
                    mosaic: 1,
                    mosaicRegion: undefined,
                  })
                }
              >
                효과 초기화
              </button>
            </div>
          ) : (
            <div className="audio-panel">
              <button
                className="import"
                onClick={() => {
                  setTab("media");
                  window.setTimeout(() => input.current?.click(), 0);
                }}
              >
                <Upload /> 음원 가져오기
              </button>
              <p>오디오 보관함</p>
              {assets
                .filter((a) => a.kind === "audio")
                .map((a) => (
                  <button
                    className="asset"
                    key={a.id}
                    onDoubleClick={() => addToTimeline(a)}
                  >
                    <div className="thumb audio">
                      <Music2 />
                    </div>
                    <div>
                      <b>{a.name}</b>
                      <span>{a.size}</span>
                    </div>
                    <Plus onClick={() => addToTimeline(a)} />
                  </button>
                ))}
              {active?.kind === "audio" && (
                <div className="audio-quick">
                  <label>
                    선택 클립 볼륨{" "}
                    <em>{Math.round((active.volume ?? 1) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.volume ?? 1}
                    onChange={(e) => update({ volume: +e.target.value })}
                  />
                  <div className="row">
                    <input
                      type="number"
                      min="0"
                      step=".1"
                      value={active.fadeIn ?? 0}
                      onChange={(e) => update({ fadeIn: +e.target.value })}
                    />
                    <input
                      type="number"
                      min="0"
                      step=".1"
                      value={active.fadeOut ?? 0}
                      onChange={(e) => update({ fadeOut: +e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        <section className="workspace">
          <div className="viewer">
            <div className="canvas" ref={canvasRef}>
              {visualClips.length === 0 && (
                <div className="placeholder">
                  <div className="sun" />
                  <div className="skyline" />
                  <span>미디어를 추가하면 여기에 표시됩니다</span>
                </div>
              )}
              {visualClips.map((c, visualOrder) => {
                const a = assets.find((x) => x.id === c.assetId);
                if (!a) return null;
                const animated = motionState(c);
                return (
                  <div
                    className={`media-object ${selected === c.id ? "selected" : ""} ${selected === c.id && motionEdit && c.motion ? "motion-editing" : ""} ${selected && selected !== c.id ? "interaction-disabled" : ""}`}
                    key={c.id}
                    onPointerDown={(e) => beginMediaDrag(e, c)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelected(c.id);
                      setMenu({ x: e.clientX, y: e.clientY, clipId: c.id });
                    }}
                    style={{
                      zIndex: visualOrder + 1,
                      left: `${animated.x}%`,
                      top: `${animated.y}%`,
                      opacity: visualOpacity(c),
                      filter: `brightness(${c.brightness ?? 1}) contrast(${c.contrast ?? 1}) saturate(${c.grayscale ? 0 : (c.saturation ?? 1)}) blur(${c.blur ?? 0}px)`,
                      transform: `translate(-50%, -50%) rotate(${animated.rotation}deg) scale(${animated.scale / 100})`,
                      clipPath: c.crop
                        ? c.crop.shape === "ellipse"
                          ? `ellipse(${Math.max(5, 50 - (c.crop.left + c.crop.right) / 2)}% ${Math.max(5, 50 - (c.crop.top + c.crop.bottom) / 2)}% at ${50 + (c.crop.left - c.crop.right) / 2}% ${50 + (c.crop.top - c.crop.bottom) / 2}%)`
                          : `inset(${c.crop.top}% ${c.crop.right}% ${c.crop.bottom}% ${c.crop.left}%)`
                        : undefined,
                    }}
                  >
                    {c.kind === "video" ? (
                      <video
                        className="media-content"
                        style={{
                          objectFit: c.fit ?? "contain",
                          opacity: c.mosaic && c.mosaic > 1 ? 0 : 1,
                        }}
                        ref={(el) => {
                          if (el) mediaEls.current.set(c.id, el);
                          else mediaEls.current.delete(c.id);
                        }}
                        src={assetUrl(a)}
                        playsInline
                      />
                    ) : (
                      <img
                        className="media-content"
                        style={{
                          objectFit: c.fit ?? "contain",
                          opacity: c.mosaic && c.mosaic > 1 ? 0 : 1,
                        }}
                        src={assetUrl(a)}
                      />
                    )}
                    {c.mosaic && c.mosaic > 1 && (
                      <div className="full-mosaic">
                        <MosaicPreview
                          url={assetUrl(a)}
                          kind={c.kind as "video" | "image"}
                          fit={c.fit ?? "contain"}
                          strength={c.mosaic}
                          width={settings.width}
                          height={settings.height}
                          currentTime={Math.max(
                            0,
                            time - c.start + (c.sourceStart ?? 0),
                          )}
                          playing={playing}
                        />
                      </div>
                    )}
                    {c.mosaicRegion && (
                      <div
                        className={`mosaic-region ${selected === c.id ? "selected" : ""}`}
                        style={{
                          left: `${c.mosaicRegion.x}%`,
                          top: `${c.mosaicRegion.y}%`,
                          width: `${c.mosaicRegion.width}%`,
                          height: `${c.mosaicRegion.height}%`,
                          borderRadius:
                            c.mosaicRegion.shape === "ellipse" ? "50%" : 0,
                          maskImage:
                            (c.mosaicRegion.feather ?? 0) > 0
                              ? c.mosaicRegion.shape === "ellipse"
                                ? `radial-gradient(ellipse, #000 ${100 - Math.min(40, (c.mosaicRegion.feather ?? 0) * 2)}%, transparent 100%)`
                                : `linear-gradient(to right, transparent, #000 ${Math.min(40, (c.mosaicRegion.feather ?? 0) * 2)}%, #000 ${100 - Math.min(40, (c.mosaicRegion.feather ?? 0) * 2)}%, transparent)`
                              : undefined,
                        }}
                        onPointerDown={(e) => beginRegionEdit(e, c)}
                      >
                        <div
                          className="mosaic-source"
                          style={{
                            left: `${(-c.mosaicRegion.x * 100) / c.mosaicRegion.width}%`,
                            top: `${(-c.mosaicRegion.y * 100) / c.mosaicRegion.height}%`,
                            width: `${10000 / c.mosaicRegion.width}%`,
                            height: `${10000 / c.mosaicRegion.height}%`,
                          }}
                        >
                          <MosaicPreview
                            url={assetUrl(a)}
                            kind={c.kind as "video" | "image"}
                            fit={c.fit ?? "contain"}
                            strength={c.mosaicRegion.strength}
                            effect={c.mosaicRegion.effect ?? "mosaic"}
                            width={settings.width}
                            height={settings.height}
                            currentTime={Math.max(
                              0,
                              time - c.start + (c.sourceStart ?? 0),
                            )}
                            playing={playing}
                          />
                        </div>
                        {selected === c.id && (
                          <i
                            className="mosaic-resize"
                            onPointerDown={(e) => beginRegionEdit(e, c, true)}
                          />
                        )}
                      </div>
                    )}
                    {selected === c.id && c.crop && (
                      <div
                        className={`crop-editor ${c.crop.shape}`}
                        style={{
                          left: `${c.crop.left}%`,
                          top: `${c.crop.top}%`,
                          right: `${c.crop.right}%`,
                          bottom: `${c.crop.bottom}%`,
                        }}
                      >
                        <i
                          className="crop-move"
                          title="자르기 영역 이동"
                          onPointerDown={(e) => beginCropEdit(e, c, "move")}
                        />
                        {(["left", "right", "top", "bottom"] as const).map(
                          (side) => (
                            <i
                              key={side}
                              className={`crop-handle ${side}`}
                              onPointerDown={(e) => beginCropEdit(e, c, side)}
                            />
                          ),
                        )}
                      </div>
                    )}
                    {selected === c.id && motionEdit && c.motion && (
                      <div
                        className="motion-drag-surface"
                        title={
                          motionEdit === "path"
                            ? "이동 경로 그리기"
                            : "드래그하여 모션 위치 조절"
                        }
                        onPointerDown={(e) =>
                          motionEdit === "path"
                            ? beginMotionPathDraw(e, c)
                            : beginMediaDrag(e, c)
                        }
                      >
                        <span>
                          {motionEdit === "start"
                            ? "시작 위치 편집"
                            : motionEdit === "path"
                              ? "마우스로 이동 경로 그리기"
                              : "현재 프레임 도착 위치 편집"}
                        </span>
                      </div>
                    )}
                    {selected === c.id && (
                      <i
                        className="media-resize"
                        style={{
                          right: `${c.crop?.right ?? 0}%`,
                          bottom: `${c.crop?.bottom ?? 0}%`,
                        }}
                        onPointerDown={(e) => beginMediaResize(e, c)}
                      />
                    )}
                  </div>
                );
              })}
              {active?.motion && ["video", "image"].includes(active.kind) && (
                <svg
                  className="motion-path-guide"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polyline
                    points={(active.motion.path?.length
                      ? active.motion.path
                      : [
                          {
                            progress: 0,
                            x: active.motion.startX,
                            y: active.motion.startY,
                          },
                          {
                            progress: 1,
                            x: active.motion.endX,
                            y: active.motion.endY,
                          },
                        ]
                    )
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                  />
                  {(active.motion.path?.length
                    ? active.motion.path
                    : [
                        { progress: 0, x: active.motion.startX, y: active.motion.startY },
                        { progress: 1, x: active.motion.endX, y: active.motion.endY },
                      ]
                  ).map((point, index) => (
                    <circle
                      key={`${point.progress}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={index === 0 || index === (active.motion?.path?.length ?? 2) - 1 ? 0.8 : 0.45}
                    />
                  ))}
                </svg>
              )}
              {visible
                .filter((c) => c.kind === "text")
                .map((c) => (
                  <div
                    key={c.id}
                    className={`caption ${selected === c.id ? "editing" : ""}`}
                    contentEditable={editingCaption === c.id}
                    suppressContentEditableWarning
                    title="드래그로 이동 · 더블클릭으로 편집"
                    onPointerDown={(e) => beginCaptionDrag(e, c)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelected(c.id);
                      setEditingCaption(c.id);
                      requestAnimationFrame(() => e.currentTarget.focus());
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        insertCaptionText("\n");
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      insertCaptionText(e.clipboardData.getData("text/plain"));
                    }}
                    onFocus={() => setSelected(c.id)}
                    onBlur={(e) => {
                      const value = e.currentTarget.innerText
                        .replace(/\r\n?/g, "\n")
                        .replace(/\n{3,}/g, "\n\n")
                        .trimEnd();
                      setClips((v) =>
                        v.map((x) =>
                          x.id === c.id
                            ? { ...x, text: value, name: value }
                            : x,
                        ),
                      );
                      setEditingCaption(null);
                    }}
                    style={{
                      left: `${c.x ?? 50}%`,
                      top: `${c.y ?? 82}%`,
                      width: `${c.textWidth ?? 70}%`,
                      maxWidth: "none",
                      bottom: "auto",
                      transform: "translate(-50%, -50%)",
                      opacity: c.opacity,
                      fontSize: c.fontSize,
                      fontFamily:
                        c.fontFamily === "serif"
                          ? 'Batang, "Apple Myungjo", serif'
                          : c.fontFamily === "rounded"
                            ? '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
                            : '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
                      fontWeight: c.fontWeight ?? "bold",
                      color: c.textColor,
                      background: "transparent",
                    }}
                  >
                    <span
                      className="caption-visual"
                      style={{
                        background: `color-mix(in srgb, ${c.bgColor} ${(c.bgOpacity || 0) * 100}%, transparent)`,
                        WebkitTextStroke: `${c.outlineWidth ?? 0}px ${c.outlineColor ?? "#000000"}`,
                        textShadow:
                          (c.shadowDistance ?? 0) > 0
                            ? `${c.shadowDistance}px ${c.shadowDistance}px ${Math.max(1, (c.shadowDistance ?? 0) * 0.6)}px color-mix(in srgb, ${c.shadowColor ?? "#000000"} ${(c.shadowOpacity ?? 0.7) * 100}%, transparent)`
                            : "none",
                      }}
                    >
                      {editingCaption === c.id ? c.text : wrapCaption(c)}
                    </span>
                    {selected === c.id && editingCaption !== c.id && (
                      <>
                        <i
                          contentEditable={false}
                          className="caption-resize left"
                          onPointerDown={(e) =>
                            beginCaptionResize(e, c, "left")
                          }
                        />
                        <i
                          contentEditable={false}
                          className="caption-resize right"
                          onPointerDown={(e) =>
                            beginCaptionResize(e, c, "right")
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
              {clips
                .filter((c) => c.kind === "audio" && c.assetId)
                .map((c) => {
                  const a = assets.find((x) => x.id === c.assetId);
                  return a ? (
                    <audio
                      key={c.id}
                      ref={(el) => {
                        if (el) mediaEls.current.set(c.id, el);
                        else mediaEls.current.delete(c.id);
                      }}
                      src={a.url}
                    />
                  ) : null;
                })}
            </div>
          </div>
          <div className="transport">
            <button onClick={() => setTime(0)}>
              <SkipBack />
            </button>
            <button className="play" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause /> : <Play />}
            </button>
            <span>{fmt(time)}</span>
            <i>/</i>
            <span className="dim">{fmt(total)}</span>
            <div className="spacer" />
            <button>
              <Volume2 />
            </button>
            <button>
              맞춤 <ChevronDown />
            </button>
          </div>
        </section>
        <aside className="inspector">
          <div className="panel-title">
            <h2>속성</h2>
            <MoreHorizontal />
          </div>
          {active ? (
            <>
              <div className="clip-name">
                <span style={{ background: active.color }} />
                {active.name}
              </div>
              {active.kind === "text" && (
                <>
                  <label>텍스트</label>
                  <textarea
                    value={active.text}
                    onChange={(e) =>
                      update({ text: e.target.value, name: e.target.value })
                    }
                  />
                  <div className="row">
                    <div>
                      <label>가로 위치 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(active.x ?? 50)}
                        onChange={(e) => update({ x: +e.target.value })}
                      />
                    </div>
                    <div>
                      <label>세로 위치 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(active.y ?? 82)}
                        onChange={(e) => update({ y: +e.target.value })}
                      />
                    </div>
                  </div>
                  <label>
                    자막 폭 <em>{Math.round(active.textWidth ?? 70)}%</em>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={active.textWidth ?? 70}
                    onChange={(e) => update({ textWidth: +e.target.value })}
                  />
                  <div className="row">
                    <div>
                      <label>글자 크기</label>
                      <input
                        type="number"
                        value={active.fontSize}
                        onChange={(e) => update({ fontSize: +e.target.value })}
                      />
                    </div>
                    <div>
                      <label>글자색</label>
                      <input
                        className="color"
                        type="color"
                        value={active.textColor}
                        onChange={(e) => update({ textColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div>
                      <label>폰트</label>
                      <select
                        className="property-select"
                        value={active.fontFamily ?? "gothic"}
                        onChange={(e) =>
                          update({
                            fontFamily: e.target.value as Clip["fontFamily"],
                          })
                        }
                      >
                        <option value="gothic">고딕</option>
                        <option value="serif">명조</option>
                        <option value="rounded">둥근 고딕</option>
                      </select>
                    </div>
                    <div>
                      <label>굵기</label>
                      <select
                        className="property-select"
                        value={active.fontWeight ?? "bold"}
                        onChange={(e) =>
                          update({
                            fontWeight: e.target.value as Clip["fontWeight"],
                          })
                        }
                      >
                        <option value="normal">보통</option>
                        <option value="bold">굵게</option>
                      </select>
                    </div>
                  </div>
                  <label>
                    텍스트 투명도{" "}
                    <em>{Math.round((active.opacity || 0) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.opacity}
                    onChange={(e) => update({ opacity: +e.target.value })}
                  />
                  <div className="divider" />
                  <h3>테두리와 그림자</h3>
                  <div className="row">
                    <div>
                      <label>테두리색</label>
                      <input
                        className="color"
                        type="color"
                        value={active.outlineColor ?? "#000000"}
                        onChange={(e) =>
                          update({ outlineColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label>테두리 두께</label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="1"
                        value={active.outlineWidth ?? 0}
                        onChange={(e) =>
                          update({ outlineWidth: Math.max(0, +e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div>
                      <label>그림자색</label>
                      <input
                        className="color"
                        type="color"
                        value={active.shadowColor ?? "#000000"}
                        onChange={(e) =>
                          update({ shadowColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label>그림자 거리</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={active.shadowDistance ?? 0}
                        onChange={(e) =>
                          update({
                            shadowDistance: Math.max(0, +e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <label>
                    그림자 투명도{" "}
                    <em>{Math.round((active.shadowOpacity ?? 0.7) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.shadowOpacity ?? 0.7}
                    onChange={(e) => update({ shadowOpacity: +e.target.value })}
                  />
                  <div className="divider" />
                  <h3>자막 배경</h3>
                  <div className="row">
                    <div>
                      <label>배경색</label>
                      <input
                        className="color wide"
                        type="color"
                        value={active.bgColor}
                        onChange={(e) => update({ bgColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <label>
                    배경 투명도{" "}
                    <em>{Math.round((active.bgOpacity || 0) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.bgOpacity}
                    onChange={(e) => update({ bgOpacity: +e.target.value })}
                  />
                </>
              )}
              {active.kind === "audio" && (
                <>
                  <h3>오디오</h3>
                  <label>
                    클립 볼륨
                    <em>{Math.round((active.volume ?? 1) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.volume ?? 1}
                    onChange={(e) => update({ volume: +e.target.value })}
                  />
                  <div className="row">
                    <div>
                      <label>페이드 인 (초)</label>
                      <input
                        type="number"
                        min="0"
                        step=".1"
                        value={active.fadeIn ?? 0}
                        onChange={(e) =>
                          update({ fadeIn: Math.max(0, +e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label>페이드 아웃 (초)</label>
                      <input
                        type="number"
                        min="0"
                        step=".1"
                        value={active.fadeOut ?? 0}
                        onChange={(e) =>
                          update({ fadeOut: Math.max(0, +e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              {(active.kind === "video" || active.kind === "image") && (
                <>
                  <h3>화면 배치</h3>
                  <div className="row">
                    <div>
                      <label>가로 위치 (%)</label>
                      <input
                        type="number"
                        value={Math.round(active.x ?? 50)}
                        onChange={(e) => update({ x: +e.target.value })}
                      />
                    </div>
                    <div>
                      <label>세로 위치 (%)</label>
                      <input
                        type="number"
                        value={Math.round(active.y ?? 50)}
                        onChange={(e) => update({ y: +e.target.value })}
                      />
                    </div>
                  </div>
                  <label>
                    크기 <em>{Math.round(active.scale ?? 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={active.scale ?? 100}
                    onChange={(e) => update({ scale: +e.target.value })}
                  />
                  <label>
                    회전 <em>{Math.round(active.rotation ?? 0)}°</em>
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={active.rotation ?? 0}
                    onChange={(e) => update({ rotation: +e.target.value })}
                  />
                  <label>
                    투명도 <em>{Math.round((active.opacity ?? 1) * 100)}%</em>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={active.opacity ?? 1}
                    onChange={(e) => update({ opacity: +e.target.value })}
                  />
                  <h3>영상 전환</h3>
                  <div className="row">
                    <div>
                      <label>페이드 인 (초)</label>
                      <input
                        type="number"
                        min="0"
                        max={active.duration}
                        step="0.1"
                        value={active.videoFadeIn ?? 0}
                        onChange={(e) =>
                          update({
                            videoFadeIn: Math.min(
                              active.duration,
                              Math.max(0, +e.target.value),
                            ),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label>페이드 아웃 (초)</label>
                      <input
                        type="number"
                        min="0"
                        max={active.duration}
                        step="0.1"
                        value={active.videoFadeOut ?? 0}
                        onChange={(e) =>
                          update({
                            videoFadeOut: Math.min(
                              active.duration,
                              Math.max(0, +e.target.value),
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="fit-buttons">
                    <button onClick={() => update({ fit: "contain" })}>
                      화면 맞춤
                    </button>
                    <button onClick={() => update({ fit: "cover" })}>
                      화면 채우기
                    </button>
                    <button
                      onClick={() =>
                        update({ x: 50, y: 50, scale: 100, rotation: 0 })
                      }
                    >
                      초기화
                    </button>
                  </div>
                  <div className="divider" />
                  <h3>모션</h3>
                  <label>모션 프리셋</label>
                  <select
                    className="property-select motion-select"
                    value={active.motion?.preset ?? "none"}
                    onChange={(e) => setMotionPreset(e.target.value)}
                  >
                    <option value="none">없음</option>
                    <option value="zoomIn">천천히 확대</option>
                    <option value="zoomOut">천천히 축소</option>
                    <option value="panLeft">왼쪽으로 이동</option>
                    <option value="panRight">오른쪽으로 이동</option>
                    <option value="custom">사용자 지정</option>
                  </select>
                  {active.motion && (
                    <>
                      <div className="motion-edit-buttons">
                        <button
                          className={motionEdit === "start" ? "active" : ""}
                          onClick={() => {
                            setMotionEdit("start");
                            setTime(active.start);
                          }}
                        >
                          시작 프레임 편집
                        </button>
                        <button
                          className={motionEdit === "end" ? "active" : ""}
                          onClick={() => {
                            const pose = motionState(active);
                            const endProgress = Math.max(
                              0.001,
                              Math.min(
                                1,
                                (time - active.start) /
                                  Math.max(0.001, active.duration),
                              ),
                            );
                            setClips((items) =>
                              items.map((item) =>
                                item.id === active.id && item.motion
                                  ? {
                                      ...item,
                                      motion: {
                                        ...item.motion,
                                        preset: "custom",
                                        endX: pose.x,
                                        endY: pose.y,
                                        endScale: pose.scale,
                                        endRotation: pose.rotation,
                                        endProgress,
                                      },
                                    }
                                  : item,
                              ),
                            );
                            setMotionEdit("end");
                          }}
                        >
                          현재 프레임 도착점
                        </button>
                        <button
                          className={motionEdit === null ? "active" : ""}
                          onClick={() => setMotionEdit(null)}
                        >
                          전체 모션 이동
                        </button>
                        <button
                          className={motionEdit === "path" ? "active" : ""}
                          onClick={() => setMotionEdit("path")}
                        >
                          경로 직접 그리기
                        </button>
                        <button
                          className="motion-time-button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setMotionRangeBoundary("start")}
                        >
                          시작 설정 ·{" "}
                          {(
                            (active.motion.startProgress ?? 0) * active.duration
                          ).toFixed(2)}
                          초
                        </button>
                        <button
                          className="motion-time-button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setMotionRangeBoundary("end")}
                        >
                          종료 설정 ·{" "}
                          {(
                            (active.motion.endProgress ?? 1) * active.duration
                          ).toFixed(2)}
                          초
                        </button>
                      </div>
                      <p className="motion-edit-hint">
                        ‘경로 직접 그리기’를 누르고 미리보기에서 U자나 곡선을
                        드래그하세요. 재생 헤드를 옮겨 시작·종료 프레임을 각각
                        지정하면 그 구간에서만 움직입니다.
                      </p>
                      <label>가속 방식</label>
                      <select
                        className="property-select motion-select"
                        value={active.motion.easing ?? "linear"}
                        onChange={(e) =>
                          update({
                            motion: {
                              ...active.motion!,
                              easing: e.target.value as NonNullable<
                                Clip["motion"]
                              >["easing"],
                            },
                          })
                        }
                      >
                        <option value="linear">일정한 속도</option>
                        <option value="easeIn">천천히 시작</option>
                        <option value="easeOut">천천히 멈춤</option>
                        <option value="easeInOut">부드럽게 시작·종료</option>
                      </select>
                      {(
                        [
                          ["startX", "시작 X"],
                          ["endX", "종료 X"],
                          ["startY", "시작 Y"],
                          ["endY", "종료 Y"],
                          ["startScale", "시작 크기"],
                          ["endScale", "종료 크기"],
                          ["startRotation", "시작 회전"],
                          ["endRotation", "종료 회전"],
                        ] as const
                      ).map(([key, label]) => (
                        <div className="motion-field" key={key}>
                          <label>{label}</label>
                          <input
                            type="number"
                            value={Math.round(active.motion![key] * 100) / 100}
                            onChange={(e) =>
                              update({
                                motion: {
                                  ...active.motion!,
                                  preset: "custom",
                                  [key]: +e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
              <div className="divider" />
              <h3>클립</h3>
              <div className="row">
                <div>
                  <label>시작</label>
                  <input
                    type="number"
                    step=".1"
                    value={active.start}
                    onChange={(e) => update({ start: +e.target.value })}
                  />
                </div>
                <div>
                  <label>길이</label>
                  <input
                    type="number"
                    step=".1"
                    value={active.duration}
                    onChange={(e) => update({ duration: +e.target.value })}
                  />
                </div>
              </div>
              <button
                className="delete"
                onClick={() => {
                  setClips((v) => v.filter((c) => c.id !== selected));
                  setSelected("");
                }}
              >
                클립 삭제
              </button>
            </>
          ) : (
            <div className="no-select">타임라인에서 클립을 선택하세요</div>
          )}
        </aside>
      </main>
      <section className="timeline">
        <div className="toolrow">
          <div className="tools">
            <button className="active">
              <MousePointer2 />
            </button>
            <button
              title={`플레이헤드에서 분할 · ${isMac ? "⌘B" : "Ctrl+B"}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={splitClip}
            >
              <Scissors />
            </button>
            <button
              className={rippleEditing ? "active" : ""}
              title="리플 트림: 뒤쪽 클립을 함께 이동"
              onClick={() => setRippleEditing((value) => !value)}
            >
              <Magnet /> 리플
            </button>
            <button onClick={addText}>
              <Type />
            </button>
            <button
              title="영상 트랙 추가 · Shift+1"
              onClick={() => addTrack("video")}
            >
              <Film /> V+
            </button>
            <button
              title="자막 트랙 추가 · Shift+2"
              onClick={() => addTrack("text")}
            >
              <Type /> T+
            </button>
            <button
              title="오디오 트랙 추가 · Shift+3"
              onClick={() => addTrack("audio")}
            >
              <Music2 /> A+
            </button>
            <button title="Shift+Backspace" onClick={removeTrack}>
              − 트랙
            </button>
          </div>
          <span className="timecode">{fmt(time)}</span>
          <span className="shortcut">
            Shift+1 영상 · Shift+2 자막 · Shift+3 오디오
          </span>
          <div className="spacer" />
          <ZoomOut />
          <input
            type="range"
            min=".6"
            max="1.8"
            step=".1"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
          />
          <ZoomIn />
        </div>
        <div className="timeline-body">
          <div className="trackheads">
            <div className="ruler-space" />
            <div className="trackheads-list" ref={trackHeadList}>
              {trackLabels.map((x) => (
                <div
                  className={`trackhead ${activeTrack === x.id ? "active" : ""}`}
                  key={x.id}
                  onClick={() => setActiveTrack(x.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, trackId: x.id });
                  }}
                >
                  <b>{x.code}</b>
                  <span>{x.name}</span>
                  {x.type === "audio" ? (
                    <button
                      className="track-toggle"
                      title={x.muted ? "음소거 해제" : "음소거"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrack(x.id, { muted: !x.muted });
                      }}
                    >
                      {x.muted ? <VolumeX /> : <Volume2 />}
                    </button>
                  ) : (
                    <button
                      className="track-toggle"
                      title={x.visible === false ? "표시" : "숨기기"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrack(x.id, { visible: x.visible === false });
                      }}
                    >
                      {x.visible === false ? <EyeOff /> : <Eye />}
                    </button>
                  )}
                  {x.type === "video" && (
                    <button
                      className="track-toggle"
                      title={x.muted ? "원본 소리 켜기" : "원본 소리 끄기"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrack(x.id, { muted: !x.muted });
                      }}
                    >
                      {x.muted ? <VolumeX /> : <Volume2 />}
                    </button>
                  )}
                  <button
                    className="track-toggle"
                    title={x.locked ? "잠금 해제" : "잠금"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrack(x.id, { locked: !x.locked });
                    }}
                  >
                    {x.locked ? <Lock /> : <Unlock />}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div
            className="scroll"
            onScroll={(e) => {
              if (trackHeadList.current)
                trackHeadList.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
            }}
          >
            <div
              className="tracks"
              style={{ width: Math.max(1100, total * px + 100) }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setTime(Math.max(0, (e.clientX - r.left) / px));
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="ruler">
                {Array.from({ length: Math.ceil(total) + 1 }, (_, i) => (
                  <span key={i} style={{ left: i * px }}>
                    {fmt(i).slice(0, 5)}
                  </span>
                ))}
              </div>
              {snapGuide !== null && (
                <i className="snap-guide" style={{ left: snapGuide * px }} />
              )}
              {tracks.map(({ id: track }) => (
                <div
                  className={`track ${activeTrack === track ? "active" : ""}`}
                  key={track}
                  onClick={() => setActiveTrack(track)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("drag-over");
                  }}
                  onDragLeave={(e) =>
                    e.currentTarget.classList.remove("drag-over")
                  }
                  onDrop={(e) => {
                    e.currentTarget.classList.remove("drag-over");
                    dropOnTrack(e, track);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, trackId: track });
                  }}
                >
                  {clips
                    .filter((c) => c.track === track)
                    .map((c) => (
                      <div
                        key={c.id}
                        className={`clip ${c.kind} ${selected === c.id || selectedClips.includes(c.id) ? "selected" : ""}`}
                        style={{
                          left: c.start * px,
                          width: Math.max(45, c.duration * px),
                          background: c.color,
                        }}
                        onPointerDown={(e) => beginClipEdit(e, c, "move")}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenu({
                            x: e.clientX,
                            y: e.clientY,
                            clipId: c.id,
                            trackId: track,
                          });
                        }}
                      >
                        {(c.kind === "audio"
                          ? (c.fadeIn ?? 0)
                          : (c.videoFadeIn ?? 0)) > 0 && (
                          <i
                            className="transition-zone fade-in"
                            style={{
                              width: `${Math.min(
                                100,
                                ((c.kind === "audio"
                                  ? (c.fadeIn ?? 0)
                                  : (c.videoFadeIn ?? 0)) /
                                  c.duration) *
                                  100,
                              )}%`,
                            }}
                          />
                        )}
                        {(c.kind === "audio"
                          ? (c.fadeOut ?? 0)
                          : (c.videoFadeOut ?? 0)) > 0 && (
                          <i
                            className="transition-zone fade-out"
                            style={{
                              width: `${Math.min(
                                100,
                                ((c.kind === "audio"
                                  ? (c.fadeOut ?? 0)
                                  : (c.videoFadeOut ?? 0)) /
                                  c.duration) *
                                  100,
                              )}%`,
                            }}
                          />
                        )}
                        <i
                          className="trim left"
                          onPointerDown={(e) => beginClipEdit(e, c, "left")}
                        />
                        <span>
                          {c.kind === "audio" ? (
                            <Music2 />
                          ) : c.kind === "text" ? (
                            <Type />
                          ) : c.kind === "image" ? (
                            <ImageIcon />
                          ) : (
                            <Film />
                          )}
                        </span>
                        <b>{c.name}</b>
                        {c.kind === "audio" &&
                          (() => {
                            const peaks = assets.find(
                              (a) => a.id === c.assetId,
                            )?.waveform;
                            return peaks ? (
                              <svg
                                className="wave-svg"
                                viewBox="0 0 120 30"
                                preserveAspectRatio="none"
                              >
                                <polyline
                                  points={peaks
                                    .map((p, i) => `${i},${15 - p * 14}`)
                                    .join(" ")}
                                />
                                <polyline
                                  points={peaks
                                    .map((p, i) => `${i},${15 + p * 14}`)
                                    .join(" ")}
                                />
                              </svg>
                            ) : (
                              <i className="wave" />
                            );
                          })()}
                        <i
                          className="trim right"
                          onPointerDown={(e) => beginClipEdit(e, c, "right")}
                        />
                      </div>
                    ))}
                </div>
              ))}
              <div
                className="playhead"
                style={{ transform: `translateX(${time * px}px)` }}
              >
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>
      {menu && (
        <div
          className="context-menu"
          style={{
            left: Math.min(menu.x, innerWidth - 190),
            top: Math.min(menu.y, innerHeight - 110),
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menu.clipId && (
            <>
              {["video", "image"].includes(
                clips.find((clip) => clip.id === menu.clipId)?.kind ?? "",
              ) && (
                <>
                  <button onClick={() => moveClipLayer(menu.clipId!, "front")}>
                    맨 앞으로 보내기
                  </button>
                  <button onClick={() => moveClipLayer(menu.clipId!, "back")}>
                    맨 뒤로 보내기
                  </button>
                </>
              )}
              <button onClick={() => removeClip(menu.clipId!)}>
                클립 제거 <span>Delete</span>
              </button>
              <button onClick={() => rippleDeleteClip(menu.clipId!)}>
                리플 삭제 <span>간격 닫기</span>
              </button>
            </>
          )}
          {menu.assetId && (
            <button
              className="danger"
              onClick={() => removeAsset(menu.assetId!)}
            >
              내 미디어에서 제거 <span>Delete</span>
            </button>
          )}
          {menu.trackId !== undefined && (
            <button
              className="danger"
              onClick={() => removeLayer(menu.trackId!)}
            >
              레이어 제거 {menu.clipId && <span>클립 포함</span>}
            </button>
          )}
        </div>
      )}
      {renderProgress !== null && (
        <div className="render-overlay">
          <div className="render-dialog">
            <h3>MP4 렌더링 중</h3>
            <p className="encoder">{renderEncoder}</p>
            <div className="progress">
              <i style={{ width: `${renderProgress}%` }} />
            </div>
            <p>{Math.round(renderProgress)}%</p>
            <button
              onClick={async () => {
                await window.hinana?.cancelExport();
                setRenderProgress(null);
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
      {showAbout && (
        <div
          className="about-overlay"
          onPointerDown={() => setShowAbout(false)}
        >
          <div
            className="about-dialog"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="about-close"
              aria-label="닫기"
              onClick={() => setShowAbout(false)}
            >
              <X />
            </button>
            <div className="about-logo">
              <img src={appIconUrl} alt="HINANA STUDIO" />
            </div>
            <h2>HINANA STUDIO</h2>
            <p>영상과 이야기를 자유롭게 편집하는 데스크톱 스튜디오</p>
            <dl>
              <div>
                <dt>프로그램 명</dt>
                <dd>HINANA STUDIO</dd>
              </div>
              <div>
                <dt>개발/제작자</dt>
                <dd>
                  비나래
                  <a
                    className="about-github"
                    href="https://github.com/murikubo"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </dd>
              </div>
              <div>
                <dt>버전</dt>
                <dd>Ver. 1.0.0 Beta 1</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
