"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, File, X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";

export function DocumentUploader({ onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Notify parent whenever files change
  useEffect(() => {
    if (onFilesChange) {
      const successfulDocIds = files
        .filter((f) => f.status === "success")
        .map((f) => f.docId);
      onFilesChange(successfulDocIds);
    }
  }, [files, onFilesChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (document) => {
    const tempId = Math.random().toString(36).substr(2, 9);

    try {
      const formData = new FormData();
      formData.append("document", document);

      const res = await fetch("/api/compliance-check", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();

      return {
        id: tempId,
        docId: data.docId,
        name: document.name,
        size: document.size,
        type: document.type,
        status: "success",
        linesCount: data.linesCount,
        wordCount: data.wordCount,
      };
    } catch (error) {
      return {
        id: tempId,
        docId: "",
        name: document.name,
        size: document.size,
        type: document.type,
        status: "error",
        error: error.message,
      };
    }
  };

  const processFiles = async (filesToProcess) => {
    const acceptedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    const validFiles = filesToProcess.filter(
      (file) =>
        acceptedTypes.includes(file.type) ||
        /\.(pdf|jpg|jpeg|png|gif|bmp|webp|doc|docx|txt|ppt|pptx)$/i.test(file.name)
    );

    if (validFiles.length === 0) {
      alert("Please upload PDF, DOCX, TXT, PPTX, or image files");
      return;
    }

    const uploadingFiles = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      docId: "",
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
    }));

    setFiles((prev) => [...prev, ...uploadingFiles]);

    const uploadPromises = validFiles.map(uploadFile);
    const results = await Promise.all(uploadPromises);

    setFiles((prev) => {
      const updated = prev.filter((f) => f.status !== "uploading");
      return [...updated, ...results];
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = async (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await processFiles(selectedFiles);
      e.target.value = "";
    }
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.txt,.ppt,.pptx"
          onChange={handleFileInput}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium mb-2">Drop your documents here</p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, JPG, PNG, DOC, DOCX, TXT, PPT, PPTX, and more
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Uploaded Documents ({files.filter((f) => f.status === "success").length}/{files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-md bg-primary/10">
                    {file.status === "uploading" ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : file.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <File className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.status === "uploading" && "Uploading..."}
                      {file.status === "success" &&
                        `${formatFileSize(file.size)} • ${file.linesCount} lines • ${file.wordCount} words`}
                      {file.status === "error" && `Error: ${file.error}`}
                    </p>
                  </div>
                </div>
                {file.status !== "uploading" && (
                  <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
