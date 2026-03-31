"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Modal, Button, Spinner } from "react-bootstrap";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
  { ssr: false },
);

const ExcalidrawOverlay = ({
  show,
  onHide,
  onSave,
  initialData,
  isLoading = false,
}) => {
  const [excalidrawApi, setExcalidrawApi] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedInitialData = useMemo(() => {
    if (!initialData || typeof initialData !== "object") return null;
    const normalizedAppState = {
      ...(initialData.appState || {}),
      collaborators: new Map(),
    };

    return {
      elements: initialData.elements || [],
      appState: normalizedAppState,
      files: initialData.files || {},
    };
  }, [initialData]);

  const handleSave = async () => {
    if (!excalidrawApi || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        elements: excalidrawApi.getSceneElements(),
        appState: excalidrawApi.getAppState(),
        files: excalidrawApi.getFiles(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Draw</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0" style={{ minHeight: "80vh" }}>
        {isLoading ? (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <Excalidraw
            initialData={normalizedInitialData}
            excalidrawAPI={(api) => setExcalidrawApi(api)}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Drawing"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExcalidrawOverlay;
