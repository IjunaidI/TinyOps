/// <reference types="vite/client" />
import React from "react";
import { createRoot } from "react-dom/client";
import Experience from "./Experience";
import "./base.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Experience />
  </React.StrictMode>,
);

if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("capture") === "1") {
  void import("./showcase/CaptureControls").then(({ default: CaptureControls }) => {
    const captureRoot = document.createElement("div");
    captureRoot.id = "showcase-capture-root";
    document.body.appendChild(captureRoot);
    createRoot(captureRoot).render(<CaptureControls />);
  });
}
