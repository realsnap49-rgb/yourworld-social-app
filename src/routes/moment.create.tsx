import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  X,
  RefreshCw,
  Zap,
  ZapOff,
  Music,
  Image as ImageIcon,
  Moon,
  Grid3X3,
  Timer,
  Download,
  Star,
  ChevronRight,
  Camera,
  Check,
  Lock,
  Users,
  Globe2,
  MessageCircle,
  Heart,
  Archive,
  MapPin,
  Share2,
  RotateCcw,
  ZoomIn,
  Type,
  Pencil,
  Smile,
  Crop,
  Undo2,
  Redo2,
  Sun,
  Contrast,
  Palette,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { useMoments } from "@/lib/moment-store";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

type CameraFacing = "user" | "environment";

type TextLayer = {
  id: number;
  text: string;
  x: number; // %
  y: number; // %
  size: number;
  rotation: number;
  color: string;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const FULL_RECT: Rect = {
  x: 0,
  y: 0,
  w: 1,
  h: 1,
};

const clamp01 = (v: number) =>
  Math.min(1, Math.max(0, v));

/** Moments are published in chunks of at most this many seconds. */
const MAX_PART_SECONDS = 20;

/** Reads the duration of a video url (0 when unknown). */
const readVideoDuration = (
  url: string
) =>
  new Promise<number>(
    (resolve) => {
      const probe =
        document.createElement(
          "video"
        );
      probe.preload = "metadata";
      probe.muted = true;
      const done = (v: number) =>
        resolve(
          Number.isFinite(v) &&
          v > 0
            ? v
            : 0
        );
      probe.onloadedmetadata = () =>
        done(probe.duration);
      probe.onerror = () => done(0);
      probe.src = url;
    }
  );

/** Splits a duration into consecutive parts of at most MAX_PART_SECONDS. */
export const splitIntoParts = (
  duration: number
) => {
  if (
    !duration ||
    duration <= MAX_PART_SECONDS
  ) {
    return [
      {
        start: 0,
        end: duration || 0,
      },
    ];
  }
  const count = Math.ceil(
    duration / MAX_PART_SECONDS
  );
  return Array.from(
    { length: count },
    (_, i) => ({
      start: i * MAX_PART_SECONDS,
      end: Math.min(
        duration,
        (i + 1) * MAX_PART_SECONDS
      ),
    })
  );
};
type CaptureMode = "photo" | "video";
type Audience =
  | "everyone"
  | "followers"
  | "close_friends"
  | "only_me";

type FilterName =
  | "normal"
  | "vivid"
  | "warm"
  | "cool"
  | "mono"
  | "dramatic"
  | "fade"
  | "dream";

type CropRatio =
  | "original"
  | "9:16"
  | "4:5"
  | "1:1";

const FILTERS: Record<
  FilterName,
  {
    name: string;
    css: string;
  }
> = {
  normal: {
    name: "Normal",
    css: "",
  },
  vivid: {
    name: "Vivid",
    css: "saturate(1.45) contrast(1.08)",
  },
  warm: {
    name: "Warm",
    css: "sepia(.16) saturate(1.25) hue-rotate(-8deg)",
  },
  cool: {
    name: "Cool",
    css: "saturate(.95) hue-rotate(12deg) contrast(1.05)",
  },
  mono: {
    name: "Mono",
    css: "grayscale(1) contrast(1.1)",
  },
  dramatic: {
    name: "Drama",
    css: "contrast(1.35) saturate(1.15)",
  },
  fade: {
    name: "Fade",
    css: "contrast(.9) saturate(.8) brightness(1.08)",
  },
  dream: {
    name: "Dream",
    css: "brightness(1.08) saturate(1.15) contrast(.92)",
  },
};

export function MomentCreatePage() {
  const navigate = useNavigate();
  const { addMoment } = useMoments();

  // =====================================================
  // CAMERA REFS
  // =====================================================

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const recordedChunksRef =
    useRef<Blob[]>([]);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const audioInputRef =
    useRef<HTMLInputElement>(null);

  const drawingCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const pinchStartDistance =
    useRef<number | null>(null);

  // =====================================================
  // CAMERA STATE
  // =====================================================

  const [facingMode, setFacingMode] =
    useState<CameraFacing>("user");

  const [captureMode, setCaptureMode] =
    useState<CaptureMode>("photo");

  const [cameraReady, setCameraReady] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [isFlashOn, setIsFlashOn] =
    useState(false);

  const [isGridOn, setIsGridOn] =
    useState(false);

  const [isNightMode, setIsNightMode] =
    useState(false);

  const [zoom, setZoom] =
    useState(1);

  const [maxZoom, setMaxZoom] =
    useState(1);

  const [timerSeconds, setTimerSeconds] =
    useState<number | null>(null);

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [qualityLabel, setQualityLabel] =
    useState("AUTO");

  const [cameraResolution, setCameraResolution] =
    useState("");

  // =====================================================
  // MEDIA
  // =====================================================

  const [step, setStep] =
    useState<0 | 1 | 2>(0);

  const [mediaUrl, setMediaUrl] =
    useState<string | null>(null);

  const [mediaBlob, setMediaBlob] =
    useState<Blob | null>(null);

  const [isVideo, setIsVideo] =
    useState(false);

  // =====================================================
  // EDITOR
  // =====================================================

  const [selectedFilter, setSelectedFilter] =
    useState<FilterName>("normal");

  const [brightness, setBrightness] =
    useState(100);

  const [contrast, setContrast] =
    useState(100);

  const [saturation, setSaturation] =
    useState(100);

  const [cropRatio, setCropRatio] =
    useState<CropRatio>("original");

  const [rotation, setRotation] =
    useState(0);

  const [videoSpeed, setVideoSpeed] =
    useState(1);

  const [videoMuted, setVideoMuted] =
    useState(false);

  const [selectedAudio, setSelectedAudio] =
    useState<string | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [audioDuration, setAudioDuration] =
    useState(0);

  const [audioStart, setAudioStart] =
    useState(0);

  const [audioEnd, setAudioEnd] =
    useState(0);

  const [audioVolume, setAudioVolume] =
    useState(0.8);

  const [audioPlaying, setAudioPlaying] =
    useState(false);

  const [showMusicPanel, setShowMusicPanel] =
    useState(false);

  const previewAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const [caption, setCaption] =
    useState("");

  // =====================================================
  // TEXT
  // =====================================================

  const [overlayText, setOverlayText] =
    useState("");

  const [showTextInput, setShowTextInput] =
    useState(false);

  const [textColor, setTextColor] =
    useState("#ffffff");

  const [textSize, setTextSize] =
    useState(28);

  const [textX, setTextX] =
    useState(50);

  const [textY, setTextY] =
    useState(45);

  const [textLayers, setTextLayers] =
    useState<TextLayer[]>([]);

  const [activeTextId, setActiveTextId] =
    useState<number | null>(null);

  const frameRef =
    useRef<HTMLDivElement>(null);

  const updateActiveText = (
    patch: Partial<TextLayer>
  ) =>
    setTextLayers((items) =>
      items.map((item) =>
        item.id === activeTextId
          ? { ...item, ...patch }
          : item
      )
    );

  // =====================================================
  // FREE CROP
  // =====================================================

  const [cropRect, setCropRect] =
    useState<Rect>(FULL_RECT);

  const [cropMode, setCropMode] =
    useState(false);

  const [cropDraft, setCropDraft] =
    useState<Rect>(FULL_RECT);

  const cropStyle =
    (): React.CSSProperties => ({
      left: `${(-cropRect.x / cropRect.w) * 100}%`,
      top: `${(-cropRect.y / cropRect.h) * 100}%`,
      width: `${100 / cropRect.w}%`,
      height: `${100 / cropRect.h}%`,
    });

  // =====================================================
  // STICKERS
  // =====================================================

  const [stickers, setStickers] =
    useState<
      {
        id: number;
        emoji: string;
        x: number;
        y: number;
        size: number;
      }[]
    >([]);

  // =====================================================
  // DRAWING
  // =====================================================

  const [drawMode, setDrawMode] =
    useState(false);

  const [drawColor, setDrawColor] =
    useState("#ffffff");

  const [drawSize, setDrawSize] =
    useState(6);

  const drawingHistory =
    useRef<ImageData[]>([]);

  const drawingHistoryIndex =
    useRef(-1);

  const isDrawing =
    useRef(false);

  // =====================================================
  // SHARE
  // =====================================================

  const [audience, setAudience] =
    useState<Audience>("everyone");

  const [durationHours, setDurationHours] =
    useState<12 | 24>(12);

  const [allowPoll, setAllowPoll] =
    useState(false);

  const [screenshotAlert, setScreenshotAlert] =
    useState(true);

  const [allowDownloads, setAllowDownloads] =
    useState(true);

  const [saveToArchive, setSaveToArchive] =
    useState(true);

  const [allowReplies, setAllowReplies] =
    useState(true);

  const [allowReactions, setAllowReactions] =
    useState(true);

  const [showLocation, setShowLocation] =
    useState(false);

  const [allowSharing, setAllowSharing] =
    useState(true);

  // =====================================================
  // CAMERA CAPABILITIES
  // =====================================================

  const getVideoTrack = () => {
    return (
      streamRef.current
        ?.getVideoTracks()[0] || null
    );
  };

  const getCapabilities = () => {
    const track = getVideoTrack();

    if (!track) return null;

    try {
      if (
        typeof track.getCapabilities !==
        "function"
      ) {
        return null;
      }

      return track.getCapabilities() as MediaTrackCapabilities & {
        zoom?: {
          min?: number;
          max?: number;
          step?: number;
        };
      };
    } catch {
      return null;
    }
  };

  // =====================================================
  // START CAMERA
  // =====================================================

  const startCamera = async () => {
    setCameraReady(false);
    setCameraError("");

    try {
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera is not supported by this browser."
        );
      }

      const requests: MediaStreamConstraints[] =
        [
          {
            video: {
              facingMode,
              width: {
                ideal: 3840,
              },
              height: {
                ideal: 2160,
              },
              frameRate: {
                ideal: 60,
                max: 60,
              },
            },
            audio: true,
          },

          {
            video: {
              facingMode,
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
              frameRate: {
                ideal: 60,
                max: 60,
              },
            },
            audio: true,
          },

          {
            video: {
              facingMode,
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
            audio: true,
          },
        ];

      let stream: MediaStream | null =
        null;

      for (const constraints of requests) {
        try {
          stream =
            await navigator.mediaDevices.getUserMedia(
              constraints
            );

          if (stream) break;
        } catch {
          continue;
        }
      }

      if (!stream) {
        throw new Error(
          "Camera permission denied or camera unavailable."
        );
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current
          .play()
          .catch(() => {});
      }

      const track =
        stream.getVideoTracks()[0];

      const settings =
        track.getSettings();

      const width =
        settings.width || 0;

      const height =
        settings.height || 0;

      if (width && height) {
        setCameraResolution(
          `${width} × ${height}`
        );

        if (
          width >= 3840 ||
          height >= 2160
        ) {
          setQualityLabel("4K");
        } else if (
          width >= 1920 ||
          height >= 1080
        ) {
          setQualityLabel("1080P");
        } else if (
          width >= 1280 ||
          height >= 720
        ) {
          setQualityLabel("HD");
        } else {
          setQualityLabel("AUTO");
        }
      }

      const capabilities =
        getCapabilities();

      const zoomCapability =
        capabilities?.zoom;

      if (
        zoomCapability &&
        typeof zoomCapability ===
          "object"
      ) {
        const z =
          zoomCapability as {
            min?: number;
            max?: number;
          };

        setMaxZoom(z.max || 1);
        setZoom(z.min || 1);
      } else {
        setMaxZoom(1);
        setZoom(1);
      }

      setCameraReady(true);
    } catch (error) {
      console.error(error);

      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to start camera."
      );
    }
  };

  useEffect(() => {
    if (step !== 0) return;

    startCamera();

    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    };
  }, [facingMode, step]);

  // =====================================================
  // ZOOM
  // =====================================================

  const applyZoom = async (
    value: number
  ) => {
    const track = getVideoTrack();

    if (!track) return;

    const capabilities =
      getCapabilities();

    if (!capabilities?.zoom) return;

    try {
      const z =
        capabilities.zoom as {
          min?: number;
          max?: number;
        };

      const min = z.min || 1;
      const max = z.max || 1;

      const next = Math.max(
        min,
        Math.min(max, value)
      );

      await track.applyConstraints({
        advanced: [
          {
            zoom: next,
          } as MediaTrackConstraintSet,
        ],
      });

      setZoom(next);
    } catch {
      // Device does not support zoom.
    }
  };

  const getTouchDistance = (
    touches: React.TouchList
  ) => {
    if (touches.length < 2) return null;

    const a = touches[0];
    const b = touches[1];

    const dx =
      a.clientX - b.clientX;

    const dy =
      a.clientY - b.clientY;

    return Math.sqrt(
      dx * dx + dy * dy
    );
  };

  const handlePinchStart = (
    event: React.TouchEvent
  ) => {
    const distance =
      getTouchDistance(
        event.touches
      );

    if (distance) {
      pinchStartDistance.current =
        distance;
    }
  };

  const handlePinchMove = (
    event: React.TouchEvent
  ) => {
    const current =
      getTouchDistance(
        event.touches
      );

    if (
      !current ||
      !pinchStartDistance.current
    ) {
      return;
    }

    const difference =
      current -
      pinchStartDistance.current;

    applyZoom(
      zoom + difference / 180
    );

    pinchStartDistance.current =
      current;
  };

  const handlePinchEnd = () => {
    pinchStartDistance.current =
      null;
  };

  // =====================================================
  // FLASH
  // =====================================================

  const toggleFlash = async () => {
    const track = getVideoTrack();

    if (!track) return;

    const capabilities =
      getCapabilities();

    if (
      !capabilities ||
      !("torch" in capabilities)
    ) {
      return;
    }

    try {
      await track.applyConstraints({
        advanced: [
          {
            torch: !isFlashOn,
          } as MediaTrackConstraintSet,
        ],
      });

      setIsFlashOn(
        (value) => !value
      );
    } catch {
      console.log(
        "Torch unavailable"
      );
    }
  };

  // =====================================================
  // PHOTO
  // =====================================================

  const performPhotoCapture = () => {
    const video =
      videoRef.current;

    if (!video) return;

    const width =
      video.videoWidth || 1920;

    const height =
      video.videoHeight || 1080;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const url =
          URL.createObjectURL(blob);

        setMediaBlob(blob);
        setMediaUrl(url);
        setIsVideo(false);
        resetEditor();
        setStep(1);
      },
      "image/jpeg",
      0.98
    );
  };

  const capturePhoto = () => {
    if (timerRunning) return;

    if (!timerSeconds) {
      performPhotoCapture();
      return;
    }

    setTimerRunning(true);

    window.setTimeout(() => {
      performPhotoCapture();
      setTimerRunning(false);
    }, timerSeconds * 1000);
  };

  // =====================================================
  // VIDEO RECORDING
  // =====================================================

  const getMimeType = () => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    return (
      types.find((type) =>
        MediaRecorder.isTypeSupported(
          type
        )
      ) || ""
    );
  };

  const startRecording = () => {
    const stream =
      streamRef.current;

    if (
      !stream ||
      isRecording
    ) {
      return;
    }

    try {
      recordedChunksRef.current =
        [];

      const mimeType =
        getMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond:
              18_000_000,
          })
        : new MediaRecorder(
            stream
          );

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data.size > 0
        ) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob =
          new Blob(
            recordedChunksRef.current,
            {
              type:
                mimeType ||
                "video/webm",
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        setMediaBlob(blob);
        setMediaUrl(url);
        setIsVideo(true);
        resetEditor();
        setStep(1);
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current =
        recorder;

      recorder.start(200);

      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (error) {
      console.error(
        "Recording failed",
        error
      );
    }
  };

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (!recorder) return;

    if (
      recorder.state !==
      "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);
  };

  useEffect(() => {
    if (!isRecording) return;

    const interval =
      window.setInterval(() => {
        setRecordingSeconds(
          (seconds) =>
            seconds + 1
        );
      }, 1000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [isRecording]);

  const handleShutter = () => {
    if (
      captureMode === "photo"
    ) {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  // =====================================================
  // GALLERY
  // =====================================================

  const handleMediaUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      ) &&
      !file.type.startsWith(
        "video/"
      )
    ) {
      return;
    }

    const url =
      URL.createObjectURL(file);

    setMediaBlob(file);
    setMediaUrl(url);
    setIsVideo(
      file.type.startsWith(
        "video/"
      )
    );

    resetEditor();
    setStep(1);

    event.target.value = "";
  };

  // =====================================================
  // AUDIO
  // =====================================================

  const handleAudioUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const url =
      URL.createObjectURL(file);

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    setAudioUrl(url);
    setSelectedAudio(
      file.name.replace(
        /\.[^.]+$/,
        ""
      )
    );
    setAudioDuration(0);
    setAudioStart(0);
    setAudioEnd(0);
    setShowMusicPanel(true);

    // probe real duration so the trimmer can show the full track
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const dur =
        Number.isFinite(
          probe.duration
        ) && probe.duration > 0
          ? probe.duration
          : 0;
      setAudioDuration(dur);
      setAudioStart(0);
      setAudioEnd(
        Math.min(dur, 30) || dur
      );
    };

    event.target.value = "";
  };

  const removeAudio = () => {
    if (audioUrl)
      URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSelectedAudio(null);
    setAudioDuration(0);
    setAudioStart(0);
    setAudioEnd(0);
    setAudioPlaying(false);
    setShowMusicPanel(false);
  };

  const toggleAudioPreview = () => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (el.paused) {
      el.currentTime = audioStart;
      el.volume = audioVolume;
      void el.play().catch(() => {});
      setAudioPlaying(true);
    } else {
      el.pause();
      setAudioPlaying(false);
    }
  };

  // =====================================================
  // EDITOR RESET
  // =====================================================

  const resetEditor = () => {
    setSelectedFilter("normal");
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setCropRatio("original");
    setRotation(0);
    setVideoSpeed(1);
    setVideoMuted(false);
    setOverlayText("");
    setCaption("");
    setStickers([]);
    setDrawMode(false);
    setTextLayers([]);
    setActiveTextId(null);
    setCropRect(FULL_RECT);
    setCropDraft(FULL_RECT);
    setCropMode(false);

    clearDrawing();
  };

  // =====================================================
  // FILTER STYLE
  // =====================================================

  const getMediaStyle =
    (): React.CSSProperties => {
      const filter =
        FILTERS[selectedFilter]
          .css;

      return {
        filter: `${filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
        transform: `rotate(${rotation}deg)`,
        transition:
          "filter .15s ease, transform .2s ease",
      };
    };

  // =====================================================
  // CROP
  // =====================================================

  const cropClass = () => {
    switch (cropRatio) {
      case "9:16":
        return "aspect-[9/16]";

      case "4:5":
        return "aspect-[4/5]";

      case "1:1":
        return "aspect-square";

      default:
        return "w-full h-full";
    }
  };

  // =====================================================
  // ROTATE
  // =====================================================

  const rotateMedia = () => {
    setRotation(
      (value) =>
        (value + 90) % 360
    );
  };

  // =====================================================
  // TEXT
  // =====================================================

  const addText = () => {
    setShowTextInput(true);
    setCropMode(false);

    const layer: TextLayer = {
      id: Date.now(),
      text: "YourWorld",
      x: 50,
      y: 45,
      size: 28,
      rotation: 0,
      color: textColor,
    };

    setTextLayers((items) => [
      ...items,
      layer,
    ]);

    setActiveTextId(layer.id);
    setOverlayText(layer.text);
  };

  // =====================================================
  // STICKERS
  // =====================================================

  const addSticker = (
    emoji: string
  ) => {
    setStickers((items) => [
      ...items,
      {
        id: Date.now(),
        emoji,
        x: 50,
        y: 55,
        size: 55,
      },
    ]);
  };

  const removeSticker = (
    id: number
  ) => {
    setStickers((items) =>
      items.filter(
        (item) =>
          item.id !== id
      )
    );
  };

  // =====================================================
  // DRAWING
  // =====================================================

  const setupDrawingCanvas = () => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const parent =
      canvas.parentElement;

    if (!parent) return;

    canvas.width =
      parent.clientWidth;

    canvas.height =
      parent.clientHeight;

    clearDrawing();
  };

  const saveDrawingState = () => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const data =
      ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    drawingHistory.current =
      drawingHistory.current.slice(
        0,
        drawingHistoryIndex.current +
          1
      );

    drawingHistory.current.push(
      data
    );

    drawingHistoryIndex.current =
      drawingHistory.current.length -
      1;
  };

  const clearDrawing = () => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawingHistory.current = [];
    drawingHistoryIndex.current =
      -1;
  };

  const getPointerPosition = (
    event:
      | React.MouseEvent
      | React.TouchEvent
  ) => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    const clientX =
      "touches" in event
        ? event.touches[0]?.clientX
        : event.clientX;

    const clientY =
      "touches" in event
        ? event.touches[0]?.clientY
        : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    event:
      | React.MouseEvent
      | React.TouchEvent
  ) => {
    if (!drawMode) return;

    event.preventDefault();

    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const position =
      getPointerPosition(event);

    ctx.beginPath();

    ctx.moveTo(
      position.x,
      position.y
    );

    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle =
      drawColor;

    isDrawing.current = true;
  };

  const draw = (
    event:
      | React.MouseEvent
      | React.TouchEvent
  ) => {
    if (
      !drawMode ||
      !isDrawing.current
    ) {
      return;
    }

    event.preventDefault();

    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const position =
      getPointerPosition(event);

    ctx.lineTo(
      position.x,
      position.y
    );

    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current)
      return;

    isDrawing.current = false;

    saveDrawingState();
  };

  const undoDrawing = () => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    if (
      drawingHistoryIndex.current <=
      0
    ) {
      clearDrawing();
      return;
    }

    drawingHistoryIndex.current--;

    const data =
      drawingHistory.current[
        drawingHistoryIndex.current
      ];

    ctx.putImageData(
      data,
      0,
      0
    );
  };

  const redoDrawing = () => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    if (
      drawingHistoryIndex.current >=
      drawingHistory.current.length -
        1
    ) {
      return;
    }

    drawingHistoryIndex.current++;

    const data =
      drawingHistory.current[
        drawingHistoryIndex.current
      ];

    ctx.putImageData(
      data,
      0,
      0
    );
  };

  useEffect(() => {
    if (step !== 1) return;

    const timer =
      window.setTimeout(() => {
        setupDrawingCanvas();
      }, 100);

    return () =>
      window.clearTimeout(
        timer
      );
  }, [step]);

  // =====================================================
  // VIDEO EFFECTS
  // =====================================================

  useEffect(() => {
    const video =
      document.querySelector(
        "video[data-editor-video]"
      ) as HTMLVideoElement | null;

    if (!video || !isVideo) return;

    video.playbackRate =
      videoSpeed;

    video.muted =
      videoMuted;
  }, [
    videoSpeed,
    videoMuted,
    isVideo,
    mediaUrl,
  ]);

  // =====================================================
  // DOWNLOAD PHOTO
  // =====================================================

  const downloadPhotoWithEdits =
    async () => {
      if (
        !mediaUrl ||
        !mediaBlob ||
        isVideo
      ) {
        return;
      }

      const image =
        new Image();

      image.src = mediaUrl;

      await new Promise<void>(
        (resolve) => {
          image.onload = () =>
            resolve();
        }
      );

      const canvas =
        document.createElement(
          "canvas"
        );

      const sx =
        cropRect.x *
        image.naturalWidth;

      const sy =
        cropRect.y *
        image.naturalHeight;

      const sw =
        cropRect.w *
        image.naturalWidth;

      const sh =
        cropRect.h *
        image.naturalHeight;

      canvas.width = sw;

      canvas.height = sh;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) return;

      ctx.save();

      ctx.translate(
        canvas.width / 2,
        canvas.height / 2
      );

      ctx.rotate(
        (rotation * Math.PI) /
          180
      );

      let filter =
        FILTERS[selectedFilter]
          .css;

      ctx.filter = `${filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      ctx.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      );

      ctx.restore();

      const link =
        document.createElement(
          "a"
        );

      link.href =
        canvas.toDataURL(
          "image/jpeg",
          0.98
        );

      link.download = `yourworld-moment-${Date.now()}.jpg`;

      link.click();
    };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const handleDownload =
    async () => {
      if (!mediaUrl) return;

      if (!isVideo) {
        await downloadPhotoWithEdits();
        return;
      }

      const link =
        document.createElement(
          "a"
        );

      link.href = mediaUrl;

      link.download = `yourworld-moment-${Date.now()}.webm`;

      link.click();
    };

  // =====================================================
  // RETAKE
  // =====================================================

  const retake = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(
        mediaUrl
      );
    }

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    setMediaUrl(null);
    setMediaBlob(null);
    setIsVideo(false);
    setSelectedAudio(null);
    setAudioUrl(null);

    resetEditor();

    setStep(0);
  };

  // =====================================================
  // PUBLISH
  // =====================================================

  const handlePublish = async () => {
    if (!mediaUrl) return;

    const createdAt =
      new Date();

    const expiresAt =
      new Date(
        createdAt.getTime() +
          durationHours *
            60 *
            60 *
            1000
      );

    const newId = (suffix: number) =>
      typeof crypto !==
        "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${suffix}`;

    // Editing is finished at this point — now cut long videos into
    // consecutive parts of at most 20 seconds (60s -> 20 + 20 + 20).
    const parts = isVideo
      ? splitIntoParts(
          await readVideoDuration(
            mediaUrl
          )
        )
      : [{ start: 0, end: 0 }];

    const base = {
      mediaUrl,

      mediaType: isVideo
        ? "video"
        : "image",

      caption:
        caption ||
        textLayers[0]?.text ||
        overlayText,

      audio:
        selectedAudio,

      privacy:
        audience,

      durationHours,

      createdAt:
        createdAt.toISOString(),

      expiresAt:
        expiresAt.toISOString(),

      filter:
        selectedFilter,

      brightness,

      contrast,

      saturation,

      cropRatio,

      rotation,

      videoSpeed,

      allowPoll,

      screenshotAlert,

      allowDownloads,

      saveToArchive,

      allowReplies,

      allowReactions,

      showLocation,

      allowSharing,
    };

    const newMoments = parts.map(
      (part, index) => ({
        ...base,
        id: newId(index),
        trim: isVideo
          ? {
              start: part.start,
              end: part.end,
            }
          : undefined,
        partIndex: index + 1,
        partCount: parts.length,
        caption:
          parts.length > 1
            ? `${base.caption ? `${base.caption} ` : ""}(${index + 1}/${parts.length})`
            : base.caption,
      })
    );

    const existing =
      JSON.parse(
        localStorage.getItem(
          "yw_moments"
        ) || "[]"
      );

    localStorage.setItem(
      "yw_moments",
      JSON.stringify([
        ...newMoments,
        ...existing,
      ])
    );

    // Publish each part into the live moments feed, oldest part first.
    for (const part of newMoments) {
      addMoment({
        kind: isVideo
          ? "video"
          : "photo",
        media: mediaUrl,
        mediaType: part.mediaType,
        text: part.caption ?? "",
        textBg: "",
        music:
          selectedAudio ?? undefined,
        stickers: [],
        trim: part.trim,
        mentions: [],
        privacy:
          audience ===
          "close_friends"
            ? "close"
            : audience === "only_me"
              ? "onlyme"
              : audience,
        duration: durationHours,
        effect: "none",
        ai: {},
        allowDownload:
          allowDownloads,
        screenshotAlert,
        poll: null,
      });
    }

    navigate({
      to: "/moment",
    });
  };

  // =====================================================
  // CAMERA SCREEN
  // =====================================================

  if (step === 0) {
    return (
      <div
        className="relative w-full h-screen bg-black text-white overflow-hidden select-none"
        onTouchStart={
          handlePinchStart
        }
        onTouchMove={
          handlePinchMove
        }
        onTouchEnd={
          handlePinchEnd
        }
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={
            handleMediaUpload
          }
        />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            facingMode === "user"
              ? "scale-x-[-1]"
              : ""
          }`}
          style={{
            filter: isNightMode
              ? "brightness(1.2) contrast(1.1)"
              : undefined,
          }}
        />

        {/* GRID */}

        {isGridOn && (
          <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 pointer-events-none">
            {Array.from({
              length: 9,
            }).map((_, i) => (
              <div
                key={i}
                className="border border-white/25"
              />
            ))}
          </div>
        )}

        {/* ERROR */}

        {cameraError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/70">
            <div className="bg-zinc-900 rounded-3xl p-7 text-center max-w-sm">
              <Camera
                size={45}
                className="mx-auto mb-4"
              />

              <h2 className="text-xl font-bold mb-2">
                Camera unavailable
              </h2>

              <p className="text-sm text-zinc-400 mb-5">
                {cameraError}
              </p>

              <button
                onClick={startCamera}
                className="bg-white text-black rounded-full px-7 py-3 font-bold"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* RECORDING */}

        {isRecording && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 bg-black/65 backdrop-blur-xl rounded-full px-5 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />

            <span className="font-semibold">
              {Math.floor(
                recordingSeconds / 60
              )
                .toString()
                .padStart(2, "0")}
              :
              {(recordingSeconds % 60)
                .toString()
                .padStart(2, "0")}
            </span>
          </div>
        )}

        {/* TIMER */}

        {timerRunning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-7xl font-black">
              📸
            </div>
          </div>
        )}

        {/* TOP */}

        <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-5 flex justify-between items-center">
          <button
            onClick={() =>
              navigate({
                to: "..",
              })
            }
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
          >
            <X size={25} />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-black/45 backdrop-blur-xl rounded-full px-3 py-1.5 text-xs font-bold">
              {qualityLabel}
            </div>

            {cameraReady && (
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
            )}
          </div>
        </div>

        {/* RIGHT TOOLS */}

        <div className="absolute right-3 top-20 z-30 flex flex-col gap-1.5 bg-black/35 backdrop-blur-xl p-1.5 rounded-2xl">
          <button
            onClick={() =>
              setFacingMode(
                (value) =>
                  value === "user"
                    ? "environment"
                    : "user"
              )
            }
            className="w-7 h-7 flex items-center justify-center"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={toggleFlash}
            className="w-7 h-7 flex items-center justify-center"
          >
            {isFlashOn ? (
              <Zap className="text-yellow-300" size={16} />
            ) : (
              <ZapOff size={16} />
            )}
          </button>

          <button
            onClick={() =>
              applyZoom(
                zoom >= maxZoom
                  ? 1
                  : zoom + 0.5
              )
            }
            className="w-7 h-7 text-[10px] font-bold"
          >
            {zoom.toFixed(1)}x
          </button>

          <button
            onClick={() =>
              setIsGridOn(
                (value) => !value
              )
            }
            className="w-7 h-7 flex items-center justify-center"
          >
            <Grid3X3
              size={16}
              className={
                isGridOn
                  ? "text-pink-400"
                  : ""
              }
            />
          </button>

          <button
            onClick={() =>
              setTimerSeconds(
                (value) =>
                  value === null
                    ? 3
                    : value === 3
                    ? 10
                    : null
              )
            }
            className="w-7 h-7 flex items-center justify-center"
          >
            <Timer
              size={16}
              className={
                timerSeconds
                  ? "text-green-400"
                  : ""
              }
            />
          </button>

          <button
            onClick={() =>
              setIsNightMode(
                (value) => !value
              )
            }
            className="w-7 h-7 flex items-center justify-center"
          >
            <Moon
              size={16}
              className={
                isNightMode
                  ? "text-blue-400"
                  : ""
              }
            />
          </button>
        </div>

        {/* BOTTOM CAMERA */}

        <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-24 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex justify-center mb-5">
            <div className="flex gap-4 bg-black/45 backdrop-blur-xl px-4 py-1 rounded-full text-[11px]">
              <button
                onClick={() =>
                  setCaptureMode(
                    "photo"
                  )
                }
                className={
                  captureMode ===
                  "photo"
                    ? "font-bold"
                    : "text-white/45"
                }
              >
                PHOTO
              </button>

              <button
                onClick={() =>
                  setCaptureMode(
                    "video"
                  )
                }
                className={
                  captureMode ===
                  "video"
                    ? "font-bold"
                    : "text-white/45"
                }
              >
                VIDEO
              </button>
            </div>
          </div>

          <div className="flex items-center justify-around px-7">
            <button
              onClick={() =>
                imageInputRef.current?.click()
              }
              className="w-14 h-14 rounded-2xl bg-black/50 backdrop-blur-xl flex items-center justify-center"
            >
              <ImageIcon size={25} />
            </button>

            <button
              onClick={handleShutter}
              className={`w-24 h-24 rounded-full border-[5px] ${
                isRecording
                  ? "border-red-500"
                  : "border-white"
              } p-1`}
            >
              <div
                className={`w-full h-full ${
                  isRecording
                    ? "bg-red-500 rounded-2xl scale-75"
                    : "bg-white rounded-full"
                }`}
              />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center">
              <ZoomIn size={20} />
              <span className="text-[9px]">
                {zoom.toFixed(1)}x
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-white/50 mt-4">
            {captureMode ===
            "photo"
              ? "Tap to capture"
              : "Tap to start / stop"}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // EDITOR SCREEN
  // =====================================================

  if (step === 1) {
    return (
      <div className="relative w-full h-screen bg-black text-white overflow-hidden select-none">
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={
            handleAudioUpload
          }
        />

        {/* MEDIA */}

        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={frameRef}
            className={`relative ${
              cropRatio ===
              "original"
                ? "w-full h-full"
                : `${cropClass()} w-full max-w-full`
            }`}
          >
            {mediaUrl &&
              (isVideo ? (
                <video
                  data-editor-video
                  src={mediaUrl}
                  autoPlay
                  loop
                  playsInline
                  muted={videoMuted}
                  className="absolute object-cover"
                  style={{
                    ...cropStyle(),
                    ...getMediaStyle(),
                  }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Moment"
                  className="absolute object-cover"
                  style={{
                    ...cropStyle(),
                    ...getMediaStyle(),
                  }}
                />
              ))}

            {/* DRAWING */}

            <canvas
              ref={drawingCanvasRef}
              className={`absolute inset-0 w-full h-full z-20 ${
                drawMode
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              }`}
              onMouseDown={
                startDrawing
              }
              onMouseMove={draw}
              onMouseUp={
                stopDrawing
              }
              onMouseLeave={
                stopDrawing
              }
              onTouchStart={
                startDrawing
              }
              onTouchMove={draw}
              onTouchEnd={
                stopDrawing
              }
            />

            {/* TEXT LAYERS */}

            {textLayers.map(
              (layer) => (
                <TextLayerView
                  key={layer.id}
                  layer={layer}
                  active={
                    layer.id ===
                    activeTextId
                  }
                  frameRef={
                    frameRef
                  }
                  locked={
                    drawMode ||
                    cropMode
                  }
                  onSelect={() => {
                    setActiveTextId(
                      layer.id
                    );
                    setOverlayText(
                      layer.text
                    );
                    setTextColor(
                      layer.color
                    );
                    setTextSize(
                      layer.size
                    );
                    setShowTextInput(
                      true
                    );
                  }}
                  onChange={(
                    patch
                  ) =>
                    setTextLayers(
                      (items) =>
                        items.map(
                          (item) =>
                            item.id ===
                            layer.id
                              ? {
                                  ...item,
                                  ...patch,
                                }
                              : item
                        )
                    )
                  }
                  onRemove={() => {
                    setTextLayers(
                      (items) =>
                        items.filter(
                          (item) =>
                            item.id !==
                            layer.id
                        )
                    );
                    setActiveTextId(
                      null
                    );
                  }}
                />
              )
            )}

            {/* STICKERS */}

            {stickers.map(
              (sticker) => (
                <button
                  key={sticker.id}
                  onDoubleClick={() =>
                    removeSticker(
                      sticker.id
                    )
                  }
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    fontSize: `${sticker.size}px`,
                  }}
                >
                  {sticker.emoji}
                </button>
              )
            )}

            {/* FREE CROP OVERLAY */}

            {cropMode && (
              <CropOverlay
                rect={cropDraft}
                onChange={
                  setCropDraft
                }
                frameRef={frameRef}
              />
            )}
          </div>
        </div>

        {/* DARK GRADIENT */}

        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 to-transparent z-40 pointer-events-none" />

        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 to-transparent z-40 pointer-events-none" />

        {/* TOP */}

        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <button
            onClick={retake}
            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center"
          >
            <X />
          </button>

          <div className="flex gap-2">
            {isVideo && (
              <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl text-xs font-bold">
                VIDEO
              </div>
            )}
          </div>
        </div>

        {/* EDITOR TOOLS */}

        <div className="absolute right-3 top-20 z-50 flex flex-col gap-2">
          <EditorTool
            icon={<Type />}
            label="Text"
            active={showTextInput}
            onClick={addText}
          />

          <EditorTool
            icon={<Smile />}
            label="Sticker"
            onClick={() =>
              addSticker("❤️")
            }
          />

          <EditorTool
            icon={<Pencil />}
            label="Draw"
            active={drawMode}
            onClick={() =>
              setDrawMode(
                (value) => !value
              )
            }
          />

          <EditorTool
            icon={<Crop />}
            label="Crop"
            active={cropMode}
            onClick={() => {
              setShowTextInput(
                false
              );
              setDrawMode(false);
              setCropDraft(
                cropRect
              );
              setCropMode(
                (value) => !value
              );
            }}
          />

          <EditorTool
            icon={<RotateCcw />}
            label="Rotate"
            onClick={rotateMedia}
          />

          <EditorTool
            icon={<Music />}
            label="Music"
            active={showMusicPanel}
            onClick={() => {
              if (audioUrl) {
                setShowMusicPanel(
                  (v) => !v
                );
              } else {
                audioInputRef.current?.click();
              }
            }}
          />


          <EditorTool
            icon={<Download />}
            label="Save"
            onClick={
              handleDownload
            }
          />
        </div>

        {/* TEXT PANEL */}

        {showTextInput && (
          <div className="absolute top-20 left-4 right-20 z-[60] bg-black/80 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
            <input
              autoFocus
              value={overlayText}
              onChange={(e) => {
                setOverlayText(
                  e.target.value
                );
                updateActiveText({
                  text: e.target
                    .value,
                });
              }}
              placeholder="Write text..."
              className="w-full bg-white/10 rounded-xl px-4 py-3 outline-none"
            />

            <div className="flex items-center gap-2 mt-3">
              {[
                "#ffffff",
                "#ff3b81",
                "#00e5ff",
                "#ffd400",
                "#55ff66",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setTextColor(
                      color
                    );
                    updateActiveText(
                      { color }
                    );
                  }}
                  className="w-8 h-8 rounded-full border-2 border-white/50"
                  style={{
                    backgroundColor:
                      color,
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min="18"
              max="120"
              value={textSize}
              onChange={(e) => {
                const size =
                  Number(
                    e.target.value
                  );
                setTextSize(size);
                updateActiveText({
                  size,
                });
              }}
              className="w-full mt-3"
            />

            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                type="range"
                min="10"
                max="90"
                value={textX}
                onChange={(e) => {
                  setTextX(
                    Number(
                      e.target.value
                    )
                  );
                  updateActiveText({
                    x: Number(
                      e.target
                        .value
                    ),
                  });
                }}
              />

              <input
                type="range"
                min="10"
                max="90"
                value={textY}
                onChange={(e) => {
                  setTextY(
                    Number(
                      e.target.value
                    )
                  );
                  updateActiveText({
                    y: Number(
                      e.target
                        .value
                    ),
                  });
                }}
              />
            </div>

            <div className="mt-3">
              <p className="text-[10px] text-white/50 mb-1">
                Rotate
              </p>

              <input
                type="range"
                min="-180"
                max="180"
                value={
                  textLayers.find(
                    (item) =>
                      item.id ===
                      activeTextId
                  )?.rotation ?? 0
                }
                onChange={(e) =>
                  updateActiveText({
                    rotation:
                      Number(
                        e.target
                          .value
                      ),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={addText}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-bold"
              >
                Add text
              </button>

              <button
                onClick={() =>
                  setShowTextInput(
                    false
                  )
                }
                className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* CROP PANEL */}

        {cropMode && (
          <div className="absolute bottom-8 left-4 right-4 z-[70] bg-black/85 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
            <p className="text-[11px] text-white/60 mb-3">
              Drag the corners to crop freely
            </p>

            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
              {(
                [
                  "original",
                  "9:16",
                  "4:5",
                  "1:1",
                ] as CropRatio[]
              ).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() =>
                    setCropRatio(
                      ratio
                    )
                  }
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                    cropRatio ===
                    ratio
                      ? "bg-white text-black"
                      : "bg-white/10"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCropDraft(
                    FULL_RECT
                  );
                  setCropRect(
                    FULL_RECT
                  );
                }}
                className="px-4 py-3 rounded-2xl bg-white/10 text-xs font-bold"
              >
                Reset
              </button>

              <button
                onClick={() => {
                  setCropDraft(
                    cropRect
                  );
                  setCropMode(
                    false
                  );
                }}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setCropRect(
                    cropDraft
                  );
                  setCropMode(
                    false
                  );
                }}
                className="flex-1 py-3 rounded-2xl bg-white text-black text-xs font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* DRAW PANEL */}

        {drawMode && (
          <div className="absolute top-20 left-4 z-[60] bg-black/80 backdrop-blur-xl rounded-3xl p-4">
            <div className="flex gap-2 mb-3">
              {[
                "#ffffff",
                "#ff0055",
                "#00e5ff",
                "#ffd400",
                "#55ff55",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    setDrawColor(
                      color
                    )
                  }
                  className="w-8 h-8 rounded-full border border-white/50"
                  style={{
                    backgroundColor:
                      color,
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min="2"
              max="25"
              value={drawSize}
              onChange={(e) =>
                setDrawSize(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={
                  undoDrawing
                }
                className="p-2 bg-white/10 rounded-xl"
              >
                <Undo2 />
              </button>

              <button
                onClick={
                  redoDrawing
                }
                className="p-2 bg-white/10 rounded-xl"
              >
                <Redo2 />
              </button>

              <button
                onClick={
                  clearDrawing
                }
                className="px-3 bg-white/10 rounded-xl text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* STICKER PANEL */}

        <div className="absolute bottom-32 left-4 right-4 z-50 flex gap-2 overflow-x-auto pb-2">
          {[
            "❤️",
            "😂",
            "🔥",
            "😍",
            "😎",
            "🥳",
            "👏",
            "💯",
            "⭐",
            "⚡",
          ].map((emoji) => (
            <button
              key={emoji}
              onClick={() =>
                addSticker(
                  emoji
                )
              }
              className="min-w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl text-2xl"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* FILTERS */}

        <div className="absolute bottom-48 left-0 right-0 z-50 overflow-x-auto px-4">
          <div className="flex gap-3">
            {(
              Object.keys(
                FILTERS
              ) as FilterName[]
            ).map((filter) => (
              <button
                key={filter}
                onClick={() =>
                  setSelectedFilter(
                    filter
                  )
                }
                className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold backdrop-blur-xl ${
                  selectedFilter ===
                  filter
                    ? "bg-white text-black"
                    : "bg-black/60"
                }`}
              >
                {FILTERS[filter].name}
              </button>
            ))}
          </div>
        </div>

        {/* ADJUSTMENTS */}

        <div className="absolute bottom-20 left-4 right-4 z-50 flex gap-3 overflow-x-auto">
          <Adjust
            icon={<Sun />}
            value={brightness}
            min={60}
            max={140}
            onChange={
              setBrightness
            }
          />

          <Adjust
            icon={<Contrast />}
            value={contrast}
            min={60}
            max={140}
            onChange={
              setContrast
            }
          />

          <Adjust
            icon={<Palette />}
            value={saturation}
            min={0}
            max={180}
            onChange={
              setSaturation
            }
          />

          {isVideo && (
            <>
              <Adjust
                icon={<Play />}
                value={videoSpeed}
                min={0.5}
                max={2}
                step={0.25}
                onChange={
                  setVideoSpeed
                }
              />

              <button
                onClick={() =>
                  setVideoMuted(
                    (value) =>
                      !value
                  )
                }
                className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl flex items-center justify-center"
              >
                {videoMuted ? (
                  <VolumeX />
                ) : (
                  <Volume2 />
                )}
              </button>
            </>
          )}
        </div>

        {/* AUDIO */}

        {selectedAudio && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/70 backdrop-blur-xl rounded-full px-4 py-2 text-xs flex items-center gap-2">
            <Music size={14} />

            <span className="max-w-36 truncate">
              {selectedAudio}
            </span>
          </div>
        )}

        {/* CAPTION + NEXT */}

        <div className="absolute bottom-4 left-4 right-4 z-[70] flex gap-2">
          <input
            value={caption}
            onChange={(e) =>
              setCaption(
                e.target.value
              )
            }
            placeholder="Add a caption..."
            className="flex-1 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-5 py-4 outline-none text-sm"
          />

          <button
            onClick={() =>
              setStep(2)
            }
            className="px-6 rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-pink-600 font-black flex items-center gap-1"
          >
            Next
            <ChevronRight
              size={20}
            />
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // SHARE SCREEN
  // =====================================================

  return (
    <div className="w-full h-screen bg-[#101010] text-white overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 pt-5 pb-10">
        {/* HEADER */}

        <div className="flex items-center justify-between mb-7">
          <button
            onClick={() =>
              setStep(1)
            }
            className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center"
          >
            <X />
          </button>

          <h1 className="text-lg font-bold">
            Share Moment
          </h1>

          <div className="w-11" />
        </div>

        {/* PREVIEW */}

        {mediaUrl && (
          <div className="relative w-28 h-40 rounded-2xl overflow-hidden mx-auto mb-7">
            {isVideo ? (
              <video
                src={mediaUrl}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={mediaUrl}
                className="w-full h-full object-cover"
                alt="Moment"
              />
            )}
          </div>
        )}

        {/* AUDIENCE */}

        <SectionTitle title="AUDIENCE" />

        <div className="grid grid-cols-2 gap-3 mb-7">
          <AudienceButton
            active={
              audience ===
              "everyone"
            }
            icon={<Globe2 />}
            title="Everyone"
            subtitle="Anyone on YourWorld"
            onClick={() =>
              setAudience(
                "everyone"
              )
            }
          />

          <AudienceButton
            active={
              audience ===
              "followers"
            }
            icon={<Users />}
            title="Followers"
            subtitle="People who follow you"
            onClick={() =>
              setAudience(
                "followers"
              )
            }
          />

          <AudienceButton
            active={
              audience ===
              "close_friends"
            }
            icon={<Star />}
            title="Close Friends"
            subtitle="Your green-list"
            onClick={() =>
              setAudience(
                "close_friends"
              )
            }
          />

          <AudienceButton
            active={
              audience ===
              "only_me"
            }
            icon={<Lock />}
            title="Only Me"
            subtitle="Private"
            onClick={() =>
              setAudience(
                "only_me"
              )
            }
          />
        </div>

        {/* DURATION */}

        <SectionTitle title="DURATION" />

        <div className="grid grid-cols-2 gap-3 mb-7">
          <DurationButton
            active={
              durationHours ===
              12
            }
            title="12 Hours"
            onClick={() =>
              setDurationHours(
                12
              )
            }
          />

          <DurationButton
            active={
              durationHours ===
              24
            }
            title="24 Hours"
            onClick={() =>
              setDurationHours(
                24
              )
            }
          />
        </div>

        {/* SETTINGS */}

        <SectionTitle title="INTERACTION & SAFETY" />

        <div className="space-y-3">
          <SettingRow
            icon={<MessageCircle />}
            title="Add a poll"
            subtitle="Let viewers vote"
            checked={allowPoll}
            onChange={() =>
              setAllowPoll(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<Heart />}
            title="Allow reactions"
            subtitle="Viewers can react"
            checked={allowReactions}
            onChange={() =>
              setAllowReactions(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<MessageCircle />}
            title="Allow replies"
            subtitle="Viewers can reply"
            checked={allowReplies}
            onChange={() =>
              setAllowReplies(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<Zap />}
            title="Screenshot alert"
            subtitle="Best-effort detection"
            checked={
              screenshotAlert
            }
            onChange={() =>
              setScreenshotAlert(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<Download />}
            title="Allow downloads"
            subtitle="Viewers can save"
            checked={
              allowDownloads
            }
            onChange={() =>
              setAllowDownloads(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<Archive />}
            title="Save to archive"
            subtitle="Keep private copy"
            checked={
              saveToArchive
            }
            onChange={() =>
              setSaveToArchive(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<MapPin />}
            title="Show location"
            subtitle="Share location"
            checked={
              showLocation
            }
            onChange={() =>
              setShowLocation(
                (v) => !v
              )
            }
          />

          <SettingRow
            icon={<Share2 />}
            title="Allow sharing"
            subtitle="Let viewers share"
            checked={
              allowSharing
            }
            onChange={() =>
              setAllowSharing(
                (v) => !v
              )
            }
          />
        </div>

        {/* SHARE */}

        <button
          onClick={
            handlePublish
          }
          className="w-full mt-7 py-5 rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-pink-600 font-black text-lg flex items-center justify-center gap-2"
        >
          Share Moment
          <Share2 />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// EDITOR TOOL
// =====================================================

function EditorTool({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-2xl backdrop-blur-xl flex items-center justify-center ${
        active
          ? "bg-white text-black"
          : "bg-black/60 text-white"
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

// =====================================================
// ADJUSTMENT
// =====================================================

function Adjust({
  icon,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (
    value: number
  ) => void;
}) {
  return (
    <div className="min-w-[130px] bg-black/65 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center gap-2">
      {icon}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          onChange(
            Number(
              e.target.value
            )
          )
        }
        className="w-full"
      />
    </div>
  );
}

// =====================================================
// SECTION
// =====================================================

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h2 className="text-xs tracking-widest text-zinc-400 font-bold mb-3">
      {title}
    </h2>
  );
}

// =====================================================
// AUDIENCE
// =====================================================

function AudienceButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-3xl p-4 border ${
        active
          ? "border-pink-500 bg-pink-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex justify-between mb-3">
        <span
          className={
            active
              ? "text-pink-400"
              : "text-zinc-400"
          }
        >
          {icon}
        </span>

        {active && (
          <Check className="text-pink-400" />
        )}
      </div>

      <p className="font-bold text-sm">
        {title}
      </p>

      <p className="text-xs text-zinc-500 mt-1">
        {subtitle}
      </p>
    </button>
  );
}

// =====================================================
// DURATION
// =====================================================

function DurationButton({
  active,
  title,
  onClick,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 rounded-3xl border font-bold ${
        active
          ? "border-pink-500 bg-pink-500/10"
          : "border-white/10 bg-white/5 text-zinc-400"
      }`}
    >
      {title}
    </button>
  );
}

// =====================================================
// SETTING
// =====================================================

function SettingRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full rounded-3xl bg-white/5 border border-white/10 p-4 flex items-center gap-4 text-left"
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-zinc-400">
        {icon}
      </div>

      <div className="flex-1">
        <p className="font-bold text-sm">
          {title}
        </p>

        <p className="text-xs text-zinc-500 mt-1">
          {subtitle}
        </p>
      </div>

      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center ${
          checked
            ? "bg-pink-500"
            : "border border-zinc-600"
        }`}
      >
        {checked && (
          <Check size={17} />
        )}
      </div>
    </button>
  );
}

// =====================================================
// TEXT LAYER (move / resize / rotate)
// =====================================================

function TextLayerView({
  layer,
  active,
  locked,
  frameRef,
  onSelect,
  onChange,
  onRemove,
}: {
  layer: TextLayer;
  active: boolean;
  locked?: boolean;
  frameRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
  onRemove: () => void;
}) {
  const drag = useRef<{
    mode: "move" | "scale";
    startX: number;
    startY: number;
    size: number;
    rotation: number;
    x: number;
    y: number;
  } | null>(null);

  const frameRect = () => frameRef.current?.getBoundingClientRect();

  const centerPx = () => {
    const r = frameRect();
    if (!r) return { cx: 0, cy: 0 };
    return {
      cx: r.left + (layer.x / 100) * r.width,
      cy: r.top + (layer.y / 100) * r.height,
    };
  };

  const start =
    (mode: "move" | "scale") => (e: React.PointerEvent) => {
      if (locked) return;
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      onSelect();
      drag.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        size: layer.size,
        rotation: layer.rotation,
        x: layer.x,
        y: layer.y,
      };
    };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const r = frameRect();
    if (!d || !r) return;

    if (d.mode === "move") {
      onChange({
        x: Math.min(100, Math.max(0, d.x + ((e.clientX - d.startX) / r.width) * 100)),
        y: Math.min(100, Math.max(0, d.y + ((e.clientY - d.startY) / r.height) * 100)),
      });
      return;
    }

    const { cx, cy } = centerPx();
    const startDist = Math.hypot(d.startX - cx, d.startY - cy) || 1;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const startAngle = Math.atan2(d.startY - cy, d.startX - cx);
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);

    onChange({
      size: Math.min(140, Math.max(12, Math.round(d.size * (dist / startDist)))),
      rotation: Math.round(d.rotation + ((angle - startAngle) * 180) / Math.PI),
    });
  };

  const end = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  return (
    <div
      className="absolute z-30"
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        touchAction: "none",
        pointerEvents: locked ? "none" : "auto",
      }}
      onPointerDown={start("move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className={`px-2 py-1 font-black text-center whitespace-nowrap ${
          active ? "border border-dashed border-white/70 rounded-xl" : ""
        }`}
        style={{
          color: layer.color,
          fontSize: `${layer.size}px`,
          textShadow: "0 2px 8px rgba(0,0,0,.7)",
        }}
      >
        {layer.text || " "}
      </div>

      {active && !locked && (
        <>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-black/80 border border-white/20 flex items-center justify-center"
          >
            <X size={14} />
          </button>

          <div
            onPointerDown={start("scale")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center cursor-nwse-resize"
            style={{ touchAction: "none" }}
          >
            <RotateCcw size={13} />
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// FREE CROP OVERLAY
// =====================================================

function CropOverlay({
  rect,
  onChange,
  frameRef,
}: {
  rect: Rect;
  onChange: (r: Rect) => void;
  frameRef: React.RefObject<HTMLDivElement | null>;
}) {
  const drag = useRef<{
    handle: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    rect: Rect;
  } | null>(null);

  const start =
    (handle: "move" | "nw" | "ne" | "sw" | "se") =>
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drag.current = { handle, startX: e.clientX, startY: e.clientY, rect };
    };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const r = frameRef.current?.getBoundingClientRect();
    if (!d || !r) return;

    const dx = (e.clientX - d.startX) / r.width;
    const dy = (e.clientY - d.startY) / r.height;
    const b = d.rect;
    const MIN = 0.1;

    if (d.handle === "move") {
      onChange({
        ...b,
        x: Math.min(1 - b.w, Math.max(0, b.x + dx)),
        y: Math.min(1 - b.h, Math.max(0, b.y + dy)),
      });
      return;
    }

    let x = b.x;
    let y = b.y;
    let w = b.w;
    let h = b.h;
    const right = b.x + b.w;
    const bottom = b.y + b.h;

    if (d.handle === "nw" || d.handle === "sw") {
      x = clamp01(Math.min(right - MIN, b.x + dx));
      w = right - x;
    } else {
      w = Math.max(MIN, Math.min(1 - b.x, b.w + dx));
    }

    if (d.handle === "nw" || d.handle === "ne") {
      y = clamp01(Math.min(bottom - MIN, b.y + dy));
      h = bottom - y;
    } else {
      h = Math.max(MIN, Math.min(1 - b.y, b.h + dy));
    }

    onChange({ x, y, w, h });
  };

  const end = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const handles: Array<["nw" | "ne" | "sw" | "se", string]> = [
    ["nw", "-top-2 -left-2 cursor-nwse-resize"],
    ["ne", "-top-2 -right-2 cursor-nesw-resize"],
    ["sw", "-bottom-2 -left-2 cursor-nesw-resize"],
    ["se", "-bottom-2 -right-2 cursor-nwse-resize"],
  ];

  return (
    <div
      className="absolute inset-0 z-[55]"
      style={{ touchAction: "none" }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute border-2 border-white"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,.45)",
        }}
        onPointerDown={start("move")}
      >
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white/25" />
          ))}
        </div>

        {handles.map(([id, cls]) => (
          <div
            key={id}
            onPointerDown={start(id)}
            className={`absolute w-5 h-5 rounded-full bg-white ${cls}`}
            style={{ touchAction: "none" }}
          />
        ))}
      </div>
    </div>
  );
}
