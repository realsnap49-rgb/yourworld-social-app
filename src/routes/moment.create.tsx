import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Video,
  Check,
  Lock,
  Users,
  Globe2,
  UserRound,
  MessageCircle,
  Heart,
  Archive,
  MapPin,
  Share2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

type CameraFacing = "user" | "environment";
type CaptureMode = "photo" | "video";
type Audience = "everyone" | "followers" | "close_friends" | "only_me";

export function MomentCreatePage() {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const pinchStartDistance = useRef<number | null>(null);

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const [facingMode, setFacingMode] =
    useState<CameraFacing>("user");

  const [captureMode, setCaptureMode] =
    useState<CaptureMode>("photo");

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isGridOn, setIsGridOn] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  const [timerSeconds, setTimerSeconds] =
    useState<number | null>(null);

  const [qualityLabel, setQualityLabel] =
    useState("Auto");

  const [cameraResolution, setCameraResolution] =
    useState("");

  // --------------------------------------------------
  // MEDIA / EDITOR
  // --------------------------------------------------

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [mediaUrl, setMediaUrl] =
    useState<string | null>(null);

  const [mediaBlob, setMediaBlob] =
    useState<Blob | null>(null);

  const [isVideo, setIsVideo] = useState(false);

  const [selectedAudio, setSelectedAudio] =
    useState<string | null>(null);

  const [caption, setCaption] = useState("");

  const [overlayText, setOverlayText] =
    useState("");

  const [showTextInput, setShowTextInput] =
    useState(false);

  const [textPos, setTextPos] =
    useState({ x: 60, y: 220 });

  const [isDraggingText, setIsDraggingText] =
    useState(false);

  const [dragOffset, setDragOffset] =
    useState({ x: 0, y: 0 });

  // --------------------------------------------------
  // SHARE / PRIVACY
  // --------------------------------------------------

  const [audience, setAudience] =
    useState<Audience>("everyone");

  // 12 HOURS DEFAULT
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

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  const [timerRunning, setTimerRunning] =
    useState(false);

  // --------------------------------------------------
  // CAMERA CAPABILITIES
  // --------------------------------------------------

  const getVideoTrack = () => {
    const stream = streamRef.current;

    if (!stream) return null;

    return stream.getVideoTracks()[0] || null;
  };

  const getCameraCapabilities = () => {
    const track = getVideoTrack();

    if (!track) return null;

    if (!("getCapabilities" in track)) {
      return null;
    }

    try {
      return (
        track as MediaStreamTrack & {
          getCapabilities: () => MediaTrackCapabilities;
        }
      ).getCapabilities();
    } catch {
      return null;
    }
  };

  // --------------------------------------------------
  // START CAMERA
  // --------------------------------------------------

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

      /*
       * We try high-quality camera settings first.
       * If the device cannot provide them, we progressively
       * fall back instead of crashing.
       */

      const requests: MediaStreamConstraints[] = [
        {
          video: {
            facingMode,
            width: { ideal: 7680 },
            height: { ideal: 4320 },
          },
          audio: true,
        },
        {
          video: {
            facingMode,
            width: { ideal: 3840 },
            height: { ideal: 2160 },
          },
          audio: true,
        },
        {
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true,
        },
        {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        },
      ];

      let stream: MediaStream | null = null;

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
          "Unable to access camera. Please allow camera permission."
        );
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];

      const settings = track.getSettings();

      const width = settings.width || 0;
      const height = settings.height || 0;

      if (width && height) {
        setCameraResolution(`${width} × ${height}`);

        if (width >= 7680 || height >= 4320) {
          setQualityLabel("8K");
        } else if (width >= 3840 || height >= 2160) {
          setQualityLabel("4K");
        } else if (width >= 1920 || height >= 1080) {
          setQualityLabel("1080p");
        } else {
          setQualityLabel("HD");
        }
      }

      const capabilities = getCameraCapabilities();

      if (capabilities?.zoom) {
        const capabilityZoom = capabilities.zoom as {
          min?: number;
          max?: number;
          step?: number;
        };

        setMaxZoom(capabilityZoom.max || 1);

        const initialZoom = capabilityZoom.min || 1;

        setZoom(initialZoom);
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
          : "Camera could not be started."
      );
    }
  };

  // --------------------------------------------------
  // CAMERA EFFECT
  // --------------------------------------------------

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

  // --------------------------------------------------
  // APPLY ZOOM
  // --------------------------------------------------

  const applyZoom = async (value: number) => {
    const track = getVideoTrack();

    if (!track) return;

    const capabilities = getCameraCapabilities();

    if (!capabilities?.zoom) return;

    try {
      const zoomCapabilities = capabilities.zoom as {
        min?: number;
        max?: number;
      };

      const min = zoomCapabilities.min || 1;
      const max = zoomCapabilities.max || 1;

      const nextZoom = Math.min(
        max,
        Math.max(min, value)
      );

      await track.applyConstraints({
        advanced: [
          {
            zoom: nextZoom,
          } as MediaTrackConstraintSet,
        ],
      });

      setZoom(nextZoom);
    } catch (error) {
      console.log("Zoom not supported", error);
    }
  };

  // --------------------------------------------------
  // PINCH ZOOM
  // --------------------------------------------------

  const getTouchDistance = (
    touches: React.TouchList
  ) => {
    if (touches.length < 2) return null;

    const first = touches[0];
    const second = touches[1];

    const dx = first.clientX - second.clientX;
    const dy = first.clientY - second.clientY;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePinchStart = (
    event: React.TouchEvent
  ) => {
    const distance = getTouchDistance(
      event.touches
    );

    if (distance) {
      pinchStartDistance.current = distance;
    }
  };

  const handlePinchMove = (
    event: React.TouchEvent
  ) => {
    const currentDistance = getTouchDistance(
      event.touches
    );

    if (
      !currentDistance ||
      !pinchStartDistance.current
    ) {
      return;
    }

    const difference =
      currentDistance -
      pinchStartDistance.current;

    const nextZoom =
      zoom + difference / 200;

    applyZoom(nextZoom);

    pinchStartDistance.current =
      currentDistance;
  };

  const handlePinchEnd = () => {
    pinchStartDistance.current = null;
  };

  // --------------------------------------------------
  // TAP TO FOCUS
  // --------------------------------------------------

  const handleFocus = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const track = getVideoTrack();

    if (!track) return;

    const capabilities = getCameraCapabilities();

    if (!capabilities) return;

    const x =
      event.nativeEvent.offsetX /
      event.currentTarget.clientWidth;

    const y =
      event.nativeEvent.offsetY /
      event.currentTarget.clientHeight;

    try {
      const constraints: MediaTrackConstraints =
        {
          advanced: [
            {
              focusMode: "single-shot",
              pointsOfInterest: [{ x, y }],
            } as MediaTrackConstraintSet,
          ],
        };

      await track.applyConstraints(
        constraints
      );
    } catch {
      // Browser/device does not support manual focus.
    }
  };

  // --------------------------------------------------
  // FLASH / TORCH
  // --------------------------------------------------

  const toggleFlash = async () => {
    const track = getVideoTrack();

    if (!track) return;

    const capabilities =
      getCameraCapabilities();

    const hasTorch =
      capabilities &&
      "torch" in capabilities;

    if (!hasTorch) {
      setIsFlashOn((value) => !value);
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

      setIsFlashOn((value) => !value);
    } catch (error) {
      console.log("Torch unavailable", error);
    }
  };

  // --------------------------------------------------
  // CAPTURE PHOTO
  // --------------------------------------------------

  const performPhotoCapture = () => {
    const video = videoRef.current;

    if (!video) return;

    const width =
      video.videoWidth || 1920;

    const height =
      video.videoHeight || 1080;

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    /*
     * Front camera images need mirroring to feel
     * natural like a selfie camera.
     */

    if (facingMode === "user") {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(
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
        setStep(1);
      },
      "image/jpeg",
      0.95
    );
  };

  // --------------------------------------------------
  // TIMER CAPTURE
  // --------------------------------------------------

  const capturePhoto = () => {
    if (timerRunning) return;

    if (!timerSeconds) {
      performPhotoCapture();
      return;
    }

    setTimerRunning(true);

    setTimeout(() => {
      performPhotoCapture();
      setTimerRunning(false);
    }, timerSeconds * 1000);
  };

  // --------------------------------------------------
  // VIDEO RECORDING
  // --------------------------------------------------

  const getSupportedMimeType = () => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    return (
      types.find((type) =>
        MediaRecorder.isTypeSupported(type)
      ) || ""
    );
  };

  const startRecording = () => {
    const stream = streamRef.current;

    if (!stream || isRecording) return;

    try {
      recordedChunksRef.current = [];

      const mimeType =
        getSupportedMimeType();

      const recorder =
        mimeType
          ? new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: 20_000_000,
            })
          : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(
          recordedChunksRef.current,
          {
            type:
              mimeType || "video/webm",
          }
        );

        const url =
          URL.createObjectURL(blob);

        setMediaBlob(blob);
        setMediaUrl(url);
        setIsVideo(true);
        setStep(1);

        setRecordingSeconds(0);
      };

      mediaRecorderRef.current = recorder;

      recorder.start(250);

      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (error) {
      console.error(
        "Recording error",
        error
      );
    }
  };

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (!recorder) return;

    if (
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);
  };

  // --------------------------------------------------
  // RECORDING TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(
      () => {
        setRecordingSeconds(
          (seconds) => seconds + 1
        );
      },
      1000
    );

    return () =>
      window.clearInterval(interval);
  }, [isRecording]);

  // --------------------------------------------------
  // CAMERA SHUTTER
  // --------------------------------------------------

  const handleShutter = () => {
    if (captureMode === "photo") {
      capturePhoto();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --------------------------------------------------
  // GALLERY
  // --------------------------------------------------

  const handleMediaUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      return;
    }

    const url =
      URL.createObjectURL(file);

    setMediaBlob(file);
    setMediaUrl(url);
    setIsVideo(
      file.type.startsWith("video/")
    );
    setStep(1);
  };

  // --------------------------------------------------
  // AUDIO
  // --------------------------------------------------

  const handleAudioUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setSelectedAudio(file.name);
  };

  // --------------------------------------------------
  // DOWNLOAD
  // --------------------------------------------------

  const handleDownload = () => {
    if (!mediaUrl) return;

    const link =
      document.createElement("a");

    link.href = mediaUrl;

    link.download =
      `yourworld-moment-${Date.now()}.${isVideo ? "webm" : "jpg"}`;

    document.body.appendChild(link);

    link.click();

    link.remove();
  };

  // --------------------------------------------------
  // TEXT DRAGGING
  // --------------------------------------------------

  const handleTextStart = (
    event:
      | React.TouchEvent
      | React.MouseEvent
  ) => {
    setIsDraggingText(true);

    const clientX =
      "touches" in event
        ? event.touches[0].clientX
        : event.clientX;

    const clientY =
      "touches" in event
        ? event.touches[0].clientY
        : event.clientY;

    setDragOffset({
      x: clientX - textPos.x,
      y: clientY - textPos.y,
    });
  };

  const handleTextMove = (
    event:
      | React.TouchEvent
      | React.MouseEvent
  ) => {
    if (!isDraggingText) return;

    const clientX =
      "touches" in event
        ? event.touches[0].clientX
        : event.clientX;

    const clientY =
      "touches" in event
        ? event.touches[0].clientY
        : event.clientY;

    setTextPos({
      x: clientX - dragOffset.x,
      y: clientY - dragOffset.y,
    });
  };

  const handleTextEnd = () => {
    setIsDraggingText(false);
  };

  // --------------------------------------------------
  // RESET MEDIA
  // --------------------------------------------------

  const retake = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }

    setMediaUrl(null);
    setMediaBlob(null);
    setIsVideo(false);
    setOverlayText("");
    setCaption("");
    setSelectedAudio(null);

    setStep(0);
  };

  // --------------------------------------------------
  // TEMPORARY LOCAL PUBLISH
  // --------------------------------------------------
  //
  // IMPORTANT:
  // This will be replaced by Supabase in the next step.
  //

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

    const newMoment = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

      mediaUrl,

      mediaType:
        isVideo
          ? "video"
          : "image",

      caption:
        caption || overlayText,

      audio:
        selectedAudio,

      privacy:
        audience,

      durationHours,

      createdAt:
        createdAt.toISOString(),

      expiresAt:
        expiresAt.toISOString(),

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

  // --------------------------------------------------
  // UI HELPERS
  // --------------------------------------------------

  const audienceLabel = {
    everyone: "Everyone",
    followers: "Followers",
    close_friends: "Close Friends",
    only_me: "Only Me",
  }[audience];

  const audienceIcon = {
    everyone: <Globe2 size={20} />,
    followers: <Users size={20} />,
    close_friends: <Star size={20} />,
    only_me: <Lock size={20} />,
  }[audience];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div
      className="relative w-full h-screen bg-black text-white overflow-hidden select-none font-sans"
      onMouseMove={
        step === 1
          ? handleTextMove
          : undefined
      }
      onMouseUp={handleTextEnd}
      onTouchMove={
        step === 1
          ? handleTextMove
          : undefined
      }
      onTouchEnd={handleTextEnd}
    >
      {/* ------------------------------------------ */}
      {/* FILE INPUTS */}
      {/* ------------------------------------------ */}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaUpload}
      />

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />

      {/* ========================================== */}
      {/* CAMERA */}
      {/* ========================================== */}

      {step === 0 && (
        <div
          className="relative w-full h-full bg-black overflow-hidden"
          onTouchStart={handlePinchStart}
          onTouchMove={handlePinchMove}
          onTouchEnd={handlePinchEnd}
          onClick={handleFocus}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${
              facingMode === "user"
                ? "scale-x-[-1]"
                : ""
            } ${
              isNightMode
                ? "brightness-125 contrast-110"
                : ""
            }`}
          />

          {/* Grid */}
          {isGridOn && (
            <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({
                length: 9,
              }).map((_, index) => (
                <div
                  key={index}
                  className="border border-white/20"
                />
              ))}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />

              <span className="text-sm font-semibold">
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

          {/* Timer countdown */}
          {timerRunning && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="text-8xl font-black drop-shadow-2xl">
                📸
              </div>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 z-50 rounded-3xl bg-black/85 backdrop-blur-xl p-6 text-center">
              <Camera
                size={42}
                className="mx-auto mb-4"
              />

              <p className="text-lg font-semibold mb-2">
                Camera unavailable
              </p>

              <p className="text-sm text-zinc-400 mb-5">
                {cameraError}
              </p>

              <button
                onClick={startCamera}
                className="px-6 py-3 rounded-full bg-white text-black font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-5 flex items-center justify-between">
            <button
              onClick={() =>
                navigate({ to: ".." })
              }
              className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-xl flex items-center justify-center border border-white/10"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-2">
              {cameraResolution && (
                <div className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 text-xs font-semibold">
                  {qualityLabel}
                </div>
              )}

              {cameraReady && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              )}
            </div>
          </div>

          {/* Right tools */}
          <div className="absolute right-3 top-20 z-30 flex flex-col gap-2.5 bg-black/30 backdrop-blur-xl p-2 rounded-3xl border border-white/10">
            <button
              onClick={(event) => {
                event.stopPropagation();

                setFacingMode(
                  (mode) =>
                    mode === "user"
                      ? "environment"
                      : "user"
                );
              }}
              className="w-10 h-10 flex items-center justify-center"
            >
              <RefreshCw size={22} />
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                toggleFlash();
              }}
              className={`w-10 h-10 flex items-center justify-center ${
                isFlashOn
                  ? "text-yellow-300"
                  : ""
              }`}
            >
              {isFlashOn ? (
                <Zap size={22} />
              ) : (
                <ZapOff size={22} />
              )}
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();

                setZoom(
                  zoom >= maxZoom
                    ? 1
                    : Math.min(
                        maxZoom,
                        zoom + 0.5
                      )
                );

                applyZoom(
                  zoom >= maxZoom
                    ? 1
                    : Math.min(
                        maxZoom,
                        zoom + 0.5
                      )
                );
              }}
              className="w-10 h-10 flex items-center justify-center text-xs font-bold"
            >
              {zoom.toFixed(1)}x
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsGridOn(
                  (value) => !value
                );
              }}
              className={`w-10 h-10 flex items-center justify-center ${
                isGridOn
                  ? "text-pink-400"
                  : ""
              }`}
            >
              <Grid3X3 size={21} />
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();

                setTimerSeconds(
                  (value) =>
                    value === null
                      ? 3
                      : value === 3
                      ? 10
                      : null
                );
              }}
              className={`w-10 h-10 flex items-center justify-center relative ${
                timerSeconds
                  ? "text-emerald-400"
                  : ""
              }`}
            >
              <Timer size={21} />

              {timerSeconds && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-emerald-500 text-black rounded-full px-1.5 py-0.5 font-black">
                  {timerSeconds}
                </span>
              )}
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();

                setIsNightMode(
                  (value) => !value
                );
              }}
              className={`w-10 h-10 flex items-center justify-center ${
                isNightMode
                  ? "text-blue-400"
                  : ""
              }`}
            >
              <Moon size={21} />
            </button>
          </div>

          {/* Bottom camera */}
          <div className="absolute bottom-0 left-0 right-0 z-30 pb-7 pt-16 bg-gradient-to-t from-black/75 to-transparent">
            {/* Mode switch */}
            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-5 bg-black/40 backdrop-blur-xl rounded-full px-5 py-2 border border-white/10">
                <button
                  onClick={() =>
                    setCaptureMode("photo")
                  }
                  className={`text-sm font-semibold ${
                    captureMode === "photo"
                      ? "text-white"
                      : "text-white/45"
                  }`}
                >
                  PHOTO
                </button>

                <button
                  onClick={() =>
                    setCaptureMode("video")
                  }
                  className={`text-sm font-semibold ${
                    captureMode === "video"
                      ? "text-white"
                      : "text-white/45"
                  }`}
                >
                  VIDEO
                </button>
              </div>
            </div>

            <div className="flex items-center justify-around px-7">
              {/* Gallery */}
              <button
                onClick={() =>
                  imageInputRef.current?.click()
                }
                className="w-14 h-14 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/15 flex items-center justify-center"
              >
                <ImageIcon size={25} />
              </button>

              {/* Shutter */}
              <button
                onClick={handleShutter}
                className={`relative w-24 h-24 rounded-full border-[5px] ${
                  isRecording
                    ? "border-red-500"
                    : "border-white"
                } p-1 active:scale-90 transition-transform`}
              >
                <div
                  className={`w-full h-full rounded-full ${
                    isRecording
                      ? "bg-red-500 scale-75 rounded-2xl"
                      : "bg-white"
                  } transition-all`}
                />
              </button>

              {/* Camera info */}
              <div className="w-14 h-14 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/15 flex flex-col items-center justify-center">
                <ZoomIn size={19} />

                <span className="text-[9px] mt-0.5">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-white/55 mt-4">
              {captureMode === "photo"
                ? "Tap to capture"
                : "Tap to start / stop recording"}
            </p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDITOR */}
      {/* ========================================== */}

      {step === 1 && (
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Media */}
          {mediaUrl &&
            (isVideo ? (
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Moment preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ))}

          {/* Dark gradient */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10" />

          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 to-transparent z-10 pointer-events-none" />

          {/* Top */}
          <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-5 flex justify-between">
            <button
              onClick={retake}
              className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl flex items-center justify-center"
            >
              <X size={23} />
            </button>

            {isVideo && (
              <div className="px-4 py-2 rounded-full bg-black/55 backdrop-blur-xl text-xs font-semibold">
                VIDEO
              </div>
            )}
          </div>

          {/* Text */}
          {overlayText && (
            <div
              onMouseDown={handleTextStart}
              onTouchStart={handleTextStart}
              style={{
                left: textPos.x,
                top: textPos.y,
              }}
              className="absolute z-30 bg-black/60 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl text-xl font-bold touch-none cursor-move"
            >
              {overlayText}
            </div>
          )}

          {/* Text input */}
          {showTextInput && (
            <div className="absolute top-20 left-4 right-20 z-40">
              <input
                autoFocus
                value={overlayText}
                onChange={(event) =>
                  setOverlayText(
                    event.target.value
                  )
                }
                placeholder="Write something..."
                className="w-full rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 px-4 py-3 text-white outline-none"
              />
            </div>
          )}

          {/* Editor tools */}
          <div className="absolute right-4 top-20 z-30 flex flex-col gap-3">
            <button
              onClick={() =>
                setShowTextInput(
                  (value) => !value
                )
              }
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center font-black"
            >
              Aa
            </button>

            <button
              onClick={() =>
                audioInputRef.current?.click()
              }
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center"
            >
              <Music size={21} />
            </button>

            <button
              onClick={handleDownload}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center"
            >
              <Download size={21} />
            </button>

            <button
              onClick={retake}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center"
            >
              <RotateCcw size={21} />
            </button>
          </div>

          {/* Bottom */}
          <div className="absolute left-4 right-4 bottom-5 z-30">
            {selectedAudio && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-xl px-4 py-2 text-xs">
                <Music size={14} />

                <span className="max-w-40 truncate">
                  {selectedAudio}
                </span>
              </div>
            )}

            <input
              value={caption}
              onChange={(event) =>
                setCaption(
                  event.target.value
                )
              }
              placeholder="Add a caption..."
              className="w-full mb-3 bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 outline-none text-sm"
            />

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-pink-600 text-white font-bold text-base flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight size={21} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PRIVACY / SHARE */}
      {/* ========================================== */}

      {step === 2 && (
        <div className="w-full h-full bg-[#101010] overflow-y-auto">
          <div className="min-h-full px-5 pt-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-7">
              <button
                onClick={() =>
                  setStep(1)
                }
                className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              >
                <X size={22} />
              </button>

              <h1 className="text-lg font-bold">
                Share Moment
              </h1>

              <div className="w-11" />
            </div>

            {/* Preview */}
            {mediaUrl && (
              <div className="relative w-28 h-40 rounded-2xl overflow-hidden mx-auto mb-7 border border-white/10">
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
                    alt="Moment"
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-black/10" />

                {isVideo && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 text-[9px]">
                    VIDEO
                  </div>
                )}
              </div>
            )}

            {/* Audience */}
            <section className="mb-7">
              <h2 className="text-xs tracking-widest text-zinc-400 font-semibold mb-3">
                AUDIENCE
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <AudienceButton
                  active={
                    audience === "everyone"
                  }
                  icon={<Globe2 size={20} />}
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
                    audience === "followers"
                  }
                  icon={<Users size={20} />}
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
                  icon={<Star size={20} />}
                  title="Close Friends"
                  subtitle="Your green-list only"
                  onClick={() =>
                    setAudience(
                      "close_friends"
                    )
                  }
                />

                <AudienceButton
                  active={
                    audience === "only_me"
                  }
                  icon={<Lock size={20} />}
                  title="Only Me"
                  subtitle="Private to you"
                  onClick={() =>
                    setAudience(
                      "only_me"
                    )
                  }
                />
              </div>
            </section>

            {/* Duration */}
            <section className="mb-7">
              <h2 className="text-xs tracking-widest text-zinc-400 font-semibold mb-3">
                DURATION
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <DurationButton
                  active={
                    durationHours === 12
                  }
                  title="12 Hours"
                  onClick={() =>
                    setDurationHours(12)
                  }
                />

                <DurationButton
                  active={
                    durationHours === 24
                  }
                  title="24 Hours"
                  onClick={() =>
                    setDurationHours(24)
                  }
                />
              </div>
            </section>

            {/* Interaction */}
            <section className="mb-7">
              <h2 className="text-xs tracking-widest text-zinc-400 font-semibold mb-3">
                INTERACTION & SAFETY
              </h2>

              <div className="space-y-3">
                <SettingRow
                  icon={<MessageCircle size={23} />}
                  title="Add a poll"
                  subtitle="Let viewers vote on your moment"
                  checked={allowPoll}
                  onChange={() =>
                    setAllowPoll(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<Heart size={23} />}
                  title="Allow reactions"
                  subtitle="Viewers can react to your moment"
                  checked={allowReactions}
                  onChange={() =>
                    setAllowReactions(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<MessageCircle size={23} />}
                  title="Allow replies"
                  subtitle="Let viewers reply to your moment"
                  checked={allowReplies}
                  onChange={() =>
                    setAllowReplies(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<Zap size={23} />}
                  title="Screenshot alert"
                  subtitle="Best-effort alert where the platform allows detection"
                  checked={screenshotAlert}
                  onChange={() =>
                    setScreenshotAlert(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<Download size={23} />}
                  title="Allow downloads"
                  subtitle="Viewers can save your Moment"
                  checked={allowDownloads}
                  onChange={() =>
                    setAllowDownloads(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<Archive size={23} />}
                  title="Save to archive"
                  subtitle="Keep a private copy after expiry"
                  checked={saveToArchive}
                  onChange={() =>
                    setSaveToArchive(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<MapPin size={23} />}
                  title="Show location"
                  subtitle="Share your location with viewers"
                  checked={showLocation}
                  onChange={() =>
                    setShowLocation(
                      (value) => !value
                    )
                  }
                />

                <SettingRow
                  icon={<Share2 size={23} />}
                  title="Allow sharing"
                  subtitle="Let viewers share this Moment"
                  checked={allowSharing}
                  onChange={() =>
                    setAllowSharing(
                      (value) => !value
                    )
                  }
                />
              </div>
            </section>

            {/* Summary */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {audienceIcon}

                  <div>
                    <p className="font-semibold text-sm">
                      {audienceLabel}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Your Moment expires in{" "}
                      {durationHours} hours
                    </p>
                  </div>
                </div>

                <Check
                  size={20}
                  className="text-pink-400"
                />
              </div>
            </div>

            {/* Share */}
            <button
              onClick={handlePublish}
              className="w-full py-5 rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              Share Moment
              <Share2 size={21} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// AUDIENCE BUTTON
// ======================================================

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
      className={`text-left rounded-3xl p-4 border transition ${
        active
          ? "border-pink-500 bg-pink-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
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
          <Check
            size={18}
            className="text-pink-400"
          />
        )}
      </div>

      <p className="font-semibold text-sm">
        {title}
      </p>

      <p className="text-xs text-zinc-500 mt-1">
        {subtitle}
      </p>
    </button>
  );
}

// ======================================================
// DURATION BUTTON
// ======================================================

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
      className={`py-4 rounded-3xl border font-semibold transition ${
        active
          ? "border-pink-500 bg-pink-500/10 text-white"
          : "border-white/10 bg-white/5 text-zinc-400"
      }`}
    >
      {title}
    </button>
  );
}

// ======================================================
// SETTING ROW
// ======================================================

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

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {title}
        </p>

        <p className="text-xs text-zinc-500 mt-1">
          {subtitle}
        </p>
      </div>

      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center transition ${
          checked
            ? "bg-pink-500 text-white"
            : "border border-zinc-600 bg-transparent"
        }`}
      >
        {checked && (
          <Check size={17} />
        )}
      </div>
    </button>
  );
}
