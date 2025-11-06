"use client";

import HeroSection from "./components/HeroSection";
import { DocumentUploader } from "./components/DocumentUploader";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [docIds, setDocIds] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!query.trim()) {
      setError("Please enter a question");
      return;
    }

    if (docIds.length === 0) {
      setError("Please upload at least one document first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docIds, question: query }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get answer");
      }

      const data = await res.json();
      if (!data.answer) {
        throw new Error("No answer received from the server");
      }
      setAnswer(data.answer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Intelligent Document Analyzer
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your documents and ask AI-powered questions to extract
              insights, count occurrences, and analyze content instantly.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Upload Documents
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload PDFs, images, or scanned documents (supports handwritten text)
              </p>
            </div>
            <DocumentUploader onFilesChange={setDocIds} />
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Ask Questions
              </h2>
              <p className="text-sm text-muted-foreground">
                Ask any question about your uploaded documents
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="question-input" className="text-sm font-medium">Ask a Question</label>
                <p className="text-xs text-muted-foreground">
                  Example: "How many times does the word 'Vansh' appear?" or "Summarize the main points" or "On which lines does 'AI' appear?"
                </p>
              </div>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <div className="relative">
                <Textarea
                  id="question-input"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question here..."
                  className="min-h-[120px] pr-12 resize-none"
                  disabled={isLoading}
                  aria-label="Question input"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading || docIds.length === 0}
                  size="icon"
                  className="absolute bottom-3 right-3"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 text-xs border rounded">Enter</kbd> to send or{" "}
                <kbd className="px-1.5 py-0.5 text-xs border rounded">Shift+Enter</kbd> for new line
              </p>

              {answer && (
                <div className="mt-6 p-6 rounded-lg border bg-card">
                  <h3 className="text-sm font-semibold mb-3 text-primary">Answer:</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm">{answer}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
