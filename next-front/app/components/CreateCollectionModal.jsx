"use client";

import React, { useState, useContext } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { fetchWithAuth } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";
import { ToastContext, NoteListContext } from "../(notes)/layout";
import { useRouter } from "next/navigation";

export default function CreateCollectionModal({
  show,
  onHide,
  defaultCategory,
  onCreated,
}) {
  const showToast = useContext(ToastContext);
  const noteLists = useContext(NoteListContext);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategory || "");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("Error", "Please enter a collection name", 3000, "danger");
      return;
    }

    if (!categoryId) {
      showToast("Error", "Please select a category", 3000, "danger");
      return;
    }

    setCreating(true);
    try {
      const data = await fetchWithAuth("/api/note/collections/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          list: categoryId,
        }),
      });

      const result = await data.json();
      showToast("Success", "Collection created successfully", 3000, "success");
      setName("");
      setDescription("");
      setCategoryId(defaultCategory || "");
      onHide();

      if (onCreated) {
        onCreated(result);
      }

      router.push(`/collection/${result.id}`);
    } catch (error) {
      handleApiError(error, showToast);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setCategoryId(defaultCategory || "");
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Create New File Collection</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Category *</Form.Label>
            <Form.Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category</option>
              {noteLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreate} disabled={creating}>
          {creating ? "Creating..." : "Create Collection"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
