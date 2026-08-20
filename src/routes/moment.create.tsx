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
      file.name
    );

    event.target.value = "";
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

      canvas.width =
        image.naturalWidth;

      canvas.height =
        image.naturalHeight;

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

  const handlePublish = () => {
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

    const id =
      typeof crypto !==
        "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString();

    const newMoment = {
      id,

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

    const existing =
      JSON.parse(
        localStorage.getItem(
          "yw_moments"
        ) || "[]"
      );

    localStorage.setItem(
      "yw_moments",
      JSON.stringify([
        newMoment,
        ...existing,
      ])
    );

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

        <div className="absolute right-3 top-20 z-30 flex flex-col gap-2 bg-black/35 backdrop-blur-xl p-2 rounded-3xl">
          <button
            onClick={() =>
              setFacingMode(
                (value) =>
                  value === "user"
                    ? "environment"
                    : "user"
              )
            }
            className="w-11 h-11 flex items-center justify-center"
          >
            <RefreshCw size={22} />
          </button>

          <button
            onClick={toggleFlash}
            className="w-11 h-11 flex items-center justify-center"
          >
            {isFlashOn ? (
              <Zap className="text-yellow-300" />
            ) : (
              <ZapOff />
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
            className="w-11 h-11 text-xs font-bold"
          >
            {zoom.toFixed(1)}x
          </button>

          <button
            onClick={() =>
              setIsGridOn(
                (value) => !value
              )
            }
            className="w-11 h-11 flex items-center justify-center"
          >
            <Grid3X3
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
            className="w-11 h-11 flex items-center justify-center"
          >
            <Timer
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
            className="w-11 h-11 flex items-center justify-center"
          >
            <Moon
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
            <div className="flex gap-7 bg-black/45 backdrop-blur-xl px-6 py-2.5 rounded-full">
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
          </div>

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
            onClick={() =>
              setCropRatio(
                (value) =>
                  value ===
                  "original"
                    ? "9:16"
                    : value ===
                      "9:16"
                    ? "4:5"
                    : value ===
                      "4:5"
                    ? "1:1"
                    : "original"
              )
            }
          />

          <EditorTool
            icon={<RotateCcw />}
            label="Rotate"
            onClick={rotateMedia}
          />

          <EditorTool
            icon={<Music />}
            label="Music"
            onClick={() =>
              audioInputRef.current?.click()
            }
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
              onChange={(e) =>
                setOverlayText(
                  e.target.value
                )
              }
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
                  onClick={() =>
                    setTextColor(
                      color
                    )
                  }
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
              max="60"
              value={textSize}
              onChange={(e) =>
                setTextSize(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full mt-3"
            />

            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                type="range"
                min="10"
                max="90"
                value={textX}
                onChange={(e) =>
                  setTextX(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <input
                type="range"
                min="10"
                max="90"
                value={textY}
                onChange={(e) =>
                  setTextY(
                    Number(
                      e.target.value
                    )
                  )
                }
              />
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
