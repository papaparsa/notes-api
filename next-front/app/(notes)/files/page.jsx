"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Spinner,
  Badge,
  ListGroup,
  Dropdown,
} from "react-bootstrap";
import { fetchWithAuth } from "@/app/lib/api";
import { handleApiError } from "@/app/utils/errorHandler";
import { ToastContext } from "@/app/(notes)/layout";
import Link from "next/link";

const FileTypeIcon = ({ contentType }) => {
  if (contentType.startsWith("image/")) {
    return <i className="bi bi-file-earmark-image"></i>;
  } else if (contentType.startsWith("video/")) {
    return <i className="bi bi-file-earmark-play"></i>;
  } else if (contentType.startsWith("audio/")) {
    return <i className="bi bi-file-earmark-music"></i>;
  } else if (contentType === "application/pdf") {
    return <i className="bi bi-file-earmark-pdf"></i>;
  } else if (contentType.includes("zip") || contentType.includes("rar")) {
    return <i className="bi bi-file-earmark-zip"></i>;
  } else {
    return <i className="bi bi-file-earmark"></i>;
  }
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function FilesPage() {
  const router = useRouter();
  const showToast = useContext(ToastContext);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [showAddToCollectionModal, setShowAddToCollectionModal] =
    useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    loadFiles();
    loadCollections();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/note/all-files/");
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, showToast);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const response = await fetchWithAuth("/api/note/collections/");
      const data = await response.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, showToast);
    }
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    setShowDetailsModal(true);
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection) {
      showToast("Please select a collection", "warning");
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/note/collections/${selectedCollection}/files/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file_id: selectedFile.id }),
        },
      );

      if (response.ok) {
        showToast("Success", "File added to collection", 3000, "success");
        setShowAddToCollectionModal(false);
        loadFiles();
      } else {
        const error = await response.json();
        showToast(
          "Error",
          error.error || "Failed to add file to collection",
          3000,
          "danger",
        );
      }
    } catch (error) {
      handleApiError(error, showToast);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile || !selectedFile.can_delete) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedFile.name}" permanently?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/note/files/${selectedFile.id}/`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        showToast("Success", "File deleted", 3000, "success");
        setShowDetailsModal(false);
        setSelectedFile(null);
        loadFiles();
        return;
      }

      const error = await response.json();
      showToast(
        "Error",
        error.error || "Failed to delete file",
        3000,
        "danger",
      );
      loadFiles();
    } catch (error) {
      handleApiError(error, showToast);
    }
  };

  const filteredFiles = files
    .filter(
      (file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.original_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "type") {
        return a.content_type.localeCompare(b.content_type);
      }
      return 0;
    });

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>All Files</h2>
          <p className="text-muted">
            Browse all files uploaded to your notes and collections
          </p>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="type">Sort by Type</option>
          </Form.Select>
        </Col>
        <Col md={4} className="text-end">
          <Badge bg="secondary">{filteredFiles.length} files</Badge>
        </Col>
      </Row>

      {filteredFiles.length === 0 ? (
        <Card>
          <Card.Body className="text-center text-muted py-5">
            <i className="bi bi-inbox" style={{ fontSize: "3rem" }}></i>
            <p className="mt-3">
              {searchTerm
                ? "No files found matching your search"
                : "No files uploaded yet"}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {filteredFiles.map((file) => (
            <Col md={6} lg={4} key={file.id} className="mb-3">
              <Card
                style={{ cursor: "pointer" }}
                className="h-100"
                onClick={() => handleFileClick(file)}
              >
                <Card.Body>
                  <div className="d-flex align-items-start">
                    <div
                      style={{ fontSize: "2rem" }}
                      className="me-3 text-primary"
                    >
                      <FileTypeIcon contentType={file.content_type} />
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <Card.Title
                        className="text-truncate mb-1"
                        title={file.name}
                      >
                        {file.name}
                      </Card.Title>
                      <Card.Text className="text-muted small mb-2">
                        {formatFileSize(file.size)}
                      </Card.Text>
                      <div className="d-flex gap-2 flex-wrap">
                        {file.note_count > 0 && (
                          <Badge bg="info" pill>
                            <i className="bi bi-file-text me-1"></i>
                            {file.note_count} note
                            {file.note_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {file.collection_count > 0 && (
                          <Badge bg="success" pill>
                            <i className="bi bi-folder me-1"></i>
                            {file.collection_count} collection
                            {file.collection_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>File Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFile && (
            <>
              <div className="mb-3">
                <h5>{selectedFile.name}</h5>
                <p className="text-muted">
                  Original: {selectedFile.original_name}
                </p>
                <p className="text-muted">
                  Size: {formatFileSize(selectedFile.size)} | Type:{" "}
                  {selectedFile.content_type}
                </p>
              </div>

              {selectedFile.content_type.startsWith("image/") && (
                <div className="mb-3">
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    style={{ maxWidth: "100%", maxHeight: "400px" }}
                    className="rounded"
                  />
                </div>
              )}

              <div className="mb-3">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => window.open(selectedFile.url, "_blank")}
                  className="me-2"
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  Open File
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowAddToCollectionModal(true);
                  }}
                >
                  <i className="bi bi-folder-plus me-1"></i>
                  Add to Collection
                </Button>
                {selectedFile.can_delete && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteFile}
                    className="ms-2"
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete
                  </Button>
                )}
              </div>

              {selectedFile.notes && selectedFile.notes.length > 0 && (
                <div className="mb-3">
                  <h6>
                    <i className="bi bi-file-text me-2"></i>
                    Referenced in Notes
                  </h6>
                  <ListGroup>
                    {selectedFile.notes.map((note) => (
                      <ListGroup.Item
                        key={note.id}
                        action
                        as={Link}
                        href={`/message/${note.id}`}
                      >
                        <div className="d-flex justify-content-between">
                          <div className="text-truncate">{note.text}</div>
                          <Badge bg="secondary" className="ms-2">
                            {note.category}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}

              {selectedFile.collections &&
                selectedFile.collections.length > 0 && (
                  <div>
                    <h6>
                      <i className="bi bi-folder me-2"></i>
                      In Collections
                    </h6>
                    <ListGroup>
                      {selectedFile.collections.map((collection) => (
                        <ListGroup.Item
                          key={collection.id}
                          action
                          as={Link}
                          href={`/collection/${collection.id}`}
                        >
                          <div className="d-flex justify-content-between">
                            <div>{collection.name}</div>
                            <Badge bg="secondary" className="ms-2">
                              {collection.category}
                            </Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}

              {(!selectedFile.notes || selectedFile.notes.length === 0) &&
                (!selectedFile.collections ||
                  selectedFile.collections.length === 0) && (
                  <p className="text-muted text-center py-3">
                    This file is not referenced in any notes or collections
                  </p>
                )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showAddToCollectionModal}
        onHide={() => setShowAddToCollectionModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Add to Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFile && (
            <>
              <p>
                Add <strong>{selectedFile.name}</strong> to a collection:
              </p>
              <Form.Select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
              >
                <option value="">Select a collection...</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} ({collection.list_name})
                  </option>
                ))}
              </Form.Select>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowAddToCollectionModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddToCollection}>
            Add to Collection
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
