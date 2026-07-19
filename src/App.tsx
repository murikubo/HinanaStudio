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
}: {
  url: string;
  kind: "video" | "image";
  fit: "contain" | "cover";
  strength: number;
  width: number;
  height: number;
  currentTime: number;
  playing: boolean;
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
      const sourceWidth =
        media instanceof HTMLVideoElement
          ? media.videoWidth
          : media.naturalWidth;
      const sourceHeight =
        media instanceof HTMLVideoElement
          ? media.videoHeight
          : media.naturalHeight;
      if (!sourceWidth || !sourceHeight) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const ratio =
        fit === "cover"
          ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
          : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const drawWidth = sourceWidth * ratio;
      const drawHeight = sourceHeight * ratio;
      context.imageSmoothingEnabled = false;
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
  }, [url, kind, fit, strength, width, height]);

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
      width={Math.max(1, Math.round(width / Math.max(2, strength)))}
      height={Math.max(1, Math.round(height / Math.max(2, strength)))}
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
  x?: number;
  y?: number;
  volume?: number;
  sourceStart?: number;
  scale?: number;
  rotation?: number;
  fit?: "contain" | "cover";
  fadeIn?: number;
  fadeOut?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  grayscale?: boolean;
  mosaic?: number;
  mosaicRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
    strength: number;
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
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    width: 1920,
    height: 1080,
    fps: 30,
  });
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
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
  const active = clips.find((c) => c.id === selected),
    total = Math.max(15, ...clips.map((c) => c.start + c.duration)),
    px = 75 * zoom;
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
    .sort((a, b) => b.track - a.track);

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
    const left = { ...clip, duration: time - clip.start };
    const right = {
      ...clip,
      id: uid(),
      start: time,
      duration: clip.start + clip.duration - time,
      sourceStart: (clip.sourceStart ?? 0) + (time - clip.start),
      name: `${clip.name} (분할)`,
    };
    setClips((v) => v.flatMap((c) => (c.id === clip.id ? [left, right] : [c])));
    setSelected(right.id);
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
        const clip = clips.find((c) => c.id === selected);
        if (clip && !tracks.find((t) => t.id === clip.track)?.locked) {
          setClips((v) => v.filter((c) => c.id !== selected));
          setSelected("");
          flash("클립을 제거했습니다");
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
  }, [tracks, activeTrack, clips, selected, selectedAsset, time]);
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
      startX = clip.x ?? 50,
      startY = clip.y ?? 50;
    const move = (ev: PointerEvent) => {
      const x = Math.max(
        -50,
        Math.min(150, startX + ((ev.clientX - sx) / canvas.width) * 100),
      );
      const y = Math.max(
        -50,
        Math.min(150, startY + ((ev.clientY - sy) / canvas.height) * 100),
      );
      setClips((v) => v.map((c) => (c.id === clip.id ? { ...c, x, y } : c)));
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
        setClips((v) =>
          v.map((c) =>
            c.id === clip.id
              ? { ...c, start: Math.max(0, snap(start + dx)), track: nextTrack }
              : c,
          ),
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
      } else
        setClips((v) =>
          v.map((c) =>
            c.id === clip.id
              ? {
                  ...c,
                  duration: Math.max(0.2, snap(start + duration + dx) - start),
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
    setSettings({ width: 1920, height: 1080, fps: 30 });
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
            let url = "";
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
            url: a.path && window.hinana ? window.hinana.toFileUrl(a.path) : "",
          })),
        );
    } catch {
      localStorage.removeItem("hinana-autosave");
    }
  }, []);
  useEffect(() => window.hinana?.onExportProgress(setRenderProgress), []);
  useEffect(() => window.hinana?.onExportEncoder(setRenderEncoder), []);
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
    if (assets.some((a) => clips.some((c) => c.assetId === a.id) && !a.path)) {
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
      if (output) flash("MP4 내보내기를 완료했습니다");
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
            ".media-object,.caption,.clip,.asset,.inspector,.library,aside",
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
              <button
                className={active?.mosaicRegion ? "effect-on" : ""}
                disabled={!active || !["video", "image"].includes(active.kind)}
                onClick={() =>
                  update({
                    mosaicRegion: active?.mosaicRegion
                      ? undefined
                      : { x: 35, y: 35, width: 30, height: 30, strength: 12 },
                  })
                }
              >
                {active?.mosaicRegion
                  ? "부분 모자이크 제거"
                  : "부분 모자이크 추가"}
              </button>
              {active?.mosaicRegion && (
                <>
                  <label>
                    부분 모자이크 강도{" "}
                    <em>{active.mosaicRegion.strength}단계</em>
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
              {visualClips.map((c) => {
                const a = assets.find((x) => x.id === c.assetId);
                if (!a) return null;
                return (
                  <div
                    className={`media-object ${selected === c.id ? "selected" : ""}`}
                    key={c.id}
                    onPointerDown={(e) => beginMediaDrag(e, c)}
                    style={{
                      zIndex: 10 - c.track,
                      left: `${c.x ?? 50}%`,
                      top: `${c.y ?? 50}%`,
                      opacity: c.opacity ?? 1,
                      filter: `brightness(${c.brightness ?? 1}) contrast(${c.contrast ?? 1}) saturate(${c.grayscale ? 0 : (c.saturation ?? 1)}) blur(${c.blur ?? 0}px)`,
                      transform: `translate(-50%, -50%) rotate(${c.rotation ?? 0}deg) scale(${(c.scale ?? 100) / 100})`,
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
                        src={a.url}
                        playsInline
                      />
                    ) : (
                      <img
                        className="media-content"
                        style={{
                          objectFit: c.fit ?? "contain",
                          opacity: c.mosaic && c.mosaic > 1 ? 0 : 1,
                        }}
                        src={a.url}
                      />
                    )}
                    {c.mosaic && c.mosaic > 1 && (
                      <div className="full-mosaic">
                        <MosaicPreview
                          url={a.url}
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
                        className="mosaic-region"
                        style={{
                          left: `${c.mosaicRegion.x}%`,
                          top: `${c.mosaicRegion.y}%`,
                          width: `${c.mosaicRegion.width}%`,
                          height: `${c.mosaicRegion.height}%`,
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
                            url={a.url}
                            kind={c.kind as "video" | "image"}
                            fit={c.fit ?? "contain"}
                            strength={c.mosaicRegion.strength}
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
                  </div>
                );
              })}
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
            <button title="플레이헤드에서 분할" onClick={splitClip}>
              <Scissors />
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
                        className={`clip ${c.kind} ${selected === c.id ? "selected" : ""}`}
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
            <button onClick={() => removeClip(menu.clipId!)}>
              클립 제거 <span>Delete</span>
            </button>
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
                <dd>비나래</dd>
              </div>
              <div>
                <dt>버전</dt>
                <dd>Ver. 1.0.0 Alpha</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
