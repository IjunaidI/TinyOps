import { useEffect, useRef, useState } from "react";
import "./capture.css";

/** A local production aid, only loaded by Vite's dev entry point. */
export default function CaptureControls() {
  const [name, setName] = useState("city-tour");
  const [phase, setPhase] = useState<"idle" | "choosing" | "recording" | "saving">("idle");
  const [seconds, setSeconds] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState("Record the game tab. Alt + Shift + S stops recording.");
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const mounted = useRef(true);

  function stop() {
    const current = recorder.current;
    if (current?.state === "recording") current.stop();
  }

  useEffect(() => {
    mounted.current = true;
    function onKey(event: KeyboardEvent) {
      if (event.altKey && event.shiftKey && event.code === "KeyS") {
        event.preventDefault();
        stop();
        setHidden(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      mounted.current = false;
      window.removeEventListener("keydown", onKey);
      stop();
      activeStream.current?.getTracks().forEach((track) => track.stop());
      activeStream.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const interval = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => () => {
    if (download) URL.revokeObjectURL(download.url);
  }, [download]);

  async function start() {
    setPhase("choosing");
    setDownload(null);
    setMessage("Choose this game tab in the browser's share dialog.");
    const clipName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "city-tour";
    try {
      const options = {
        video: { frameRate: 30, displaySurface: "browser" },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
      } as DisplayMediaStreamOptions;
      const stream = await navigator.mediaDevices.getDisplayMedia(options);
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      activeStream.current = stream;
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("This browser does not support WebM recording. Use Chrome.");
      const current = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 14_000_000 });
      recorder.current = current;
      const chunks: BlobPart[] = [];
      current.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      current.onerror = () => {
        setMessage("Recording was interrupted. Stop to save any footage already captured.");
        setHidden(false);
      };
      current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        activeStream.current = null;
        recorder.current = null;
        setHidden(false);
        setPhase("saving");
        setMessage("Saving footage locally…");
        const blob = new Blob(chunks, { type: "video/webm" });
        const filename = `${clipName}.webm`;
        const url = URL.createObjectURL(blob);
        if (mounted.current) setDownload({ url, filename });
        try {
          const response = await fetch(`/__showcase/recording?name=${encodeURIComponent(clipName)}`, {
            method: "POST",
            headers: { "Content-Type": "video/webm", "X-Showcase-Capture": "1" },
            body: blob,
          });
          const result = await response.json() as { saved?: string; error?: string };
          if (!response.ok || !result.saved) throw new Error(result.error || "Local save failed.");
          setMessage(`Saved: ${result.saved}`);
        } catch {
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          setMessage("Local save unavailable. Footage downloaded; a backup link is below.");
        } finally {
          if (!mounted.current) URL.revokeObjectURL(url);
          setPhase("idle");
        }
      };
      stream.getVideoTracks()[0].addEventListener("ended", stop, { once: true });
      startedAt.current = Date.now();
      setSeconds(0);
      current.start(1000);
      setPhase("recording");
      setMessage("Recording. Hide controls for a clean frame; Alt + Shift + S stops.");
    } catch (error) {
      activeStream.current?.getTracks().forEach((track) => track.stop());
      activeStream.current = null;
      recorder.current = null;
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Could not start recording.");
    }
  }

  if (hidden) return <button className="showcase-capture-reveal" onClick={() => setHidden(false)} aria-label="Show recording controls" title="Show recording controls">●</button>;

  return <aside className={`showcase-capture ${phase === "recording" ? "is-recording" : ""}`} aria-label="Video capture controls">
    <div className="showcase-capture-heading"><strong>Local video capture</strong><span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span></div>
    <label>Clip name<input value={name} maxLength={64} onChange={(event) => setName(event.target.value)} disabled={phase !== "idle"} /></label>
    <div className="showcase-capture-actions">
      {phase === "recording" ? <><button onClick={stop}>Stop & save</button><button onClick={() => setHidden(true)}>Hide controls</button></> : <button onClick={() => void start()} disabled={phase !== "idle"}>{phase === "idle" ? "Start recording" : phase === "choosing" ? "Choose tab…" : "Saving…"}</button>}
      {download && <a href={download.url} download={download.filename}>Download backup</a>}
    </div>
    <p role="status">{message}</p>
  </aside>;
}
