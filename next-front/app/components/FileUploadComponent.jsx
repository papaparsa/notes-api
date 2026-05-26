"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { fetchWithAuth } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";

const FileUploadComponent = ({
  onFileUploaded,
  noteId,
  onSuccess,
  initialText = "",
  onTextChange,
  size,
  width = "24px",
  height = "24px",
  className = "",
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [compressImage, setCompressImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress("Uploading...");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("compress_image", compressImage);
    if (noteId) {
      formData.append("note_id", noteId);
    }

    try {
      const response = await fetchWithAuth(
        "/api/note/upload/",
        {
          method: "POST",
          body: formData,
        },
        30000, // 30 second timeout for large files
      );

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      if (onSuccess) {
        onSuccess(data);
      } else if (onFileUploaded) {
        onFileUploaded(data.url);
      }
      setUploadProgress("Upload complete!");
      setSelectedFile(null);
    } catch (err) {
      console.error("Error uploading file:", err);
      handleApiError(err);
      setUploadProgress("Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <>
      <Button
        variant="outline-secondary"
        className="shadow-none"
        onClick={() => setShowModal(true)}
        size={size}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          style={{
            fill: "var(--bs-body-color)", // This will use Bootstrap's body color variable
          }}
          className="bi bi-paperclip"
          viewBox="0 0 16 16"
        >
          <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z" />
        </svg>
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? "blue" : "gray"}`,
                borderRadius: "5px",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                minHeight: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onButtonClick}
            >
              <div>
                <p>Drag and drop your file here or click to select a file</p>
                <p>You can also paste an image from your clipboard</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </Form.Group>
          {selectedFile && (
            <p className="mt-3">
              Selected file:{" "}
              {selectedFile.name.split(".").slice(0, -1).join(".") ||
                selectedFile.name}
            </p>
          )}
          <Form.Group className="mt-3">
            <Form.Check
              type="checkbox"
              label="Compress Image"
              checked={compressImage}
              onChange={(e) => setCompressImage(e.target.checked)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              setSelectedFile(null);
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {uploadProgress && (
        <div className="ml-2 d-flex align-items-center">
          <Spinner animation="border" size="sm" className="mr-2" />
          <span>{uploadProgress}</span>
        </div>
      )}
    </>
  );
};

export default FileUploadComponent;
