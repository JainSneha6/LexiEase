import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf";
import { jsPDF } from "jspdf";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = "http://localhost:5000";

// Web Speech API
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// PDF.js worker
GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

export default function DocumentSimplifier() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [simplifiedText, setSimplifiedText] = useState("");
  const [importantWords, setImportantWords] = useState([]);
  const [loadingText, setLoadingText] = useState(false);
  const [message, setMessage] = useState("");
  const [docId, setDocId] = useState(null);
  const [questionInput, setQuestionInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [listening, setListening] = useState(false);

  // Audio refs
  const ttsAudioRef = useRef(null);
  const recognitionRef = useRef(null);

  /* =========================
     ElevenLabs TTS helper
  ========================== */
  const speak = async (text) => {
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!data?.audio_filename) return;

      let audio = ttsAudioRef.current;
      if (!audio) {
        audio = new Audio();
        ttsAudioRef.current = audio;
      }

      audio.pause();
      audio.currentTime = 0;
      audio.src = `${API_BASE}/api/audio/${encodeURIComponent(
        data.audio_filename
      )}`;

      await audio.play().catch(() => {});
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  /* =========================
     Initial page instructions
  ========================== */
  useEffect(() => {
    speak(
      "Welcome to the document simplifier. Upload a PDF file. I will simplify the text for you. After that, you can ask questions by typing or speaking."
    );
  }, []);

  /* =========================
     Voice after simplification
  ========================== */
  useEffect(() => {
    if (!simplifiedText) return;

    speak(
      "The simplified text is ready. You can read it now. You can also ask questions about this document."
    );
  }, [simplifiedText]);

  /* =========================
     Voice input (speech → text)
  ========================== */
  const startVoiceQuestion = () => {
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        speak("Listening. Please ask your question.");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestionInput(transcript);

        setTimeout(() => {
          askDocQuestion(transcript);
          setQuestionInput("");
        }, 300);
      };

      recognition.onerror = () => {
        setListening(false);
        speak("Sorry, I could not understand. Please try again.");
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
  };

  /* =========================
     File handling
  ========================== */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessage("");
    }
  };

  const extractTextFromPDF = async (file) => {
    const pdfData = await file.arrayBuffer();
    const pdfDoc = await getDocument({ data: pdfData }).promise;
    let text = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      text += pageText + "\n";
    }

    return text.trim();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a PDF file.");
      return;
    }

    setLoadingText(true);
    try {
      const extractedText = await extractTextFromPDF(selectedFile);

      const res = await axios.post(`${API_BASE}/api/upload-pdf`, {
        content: extractedText,
      });

      setSimplifiedText(res.data.simplified_text || "");
      setImportantWords(res.data.important_words || []);
      setDocId(res.data.doc_id || null);
      setMessage("Uploaded and simplified successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Upload failed.");
    } finally {
      setLoadingText(false);
    }
  };

  /* =========================
     Ask document question
  ========================== */
  const askDocQuestion = async (question) => {
    if (!docId || !question.trim()) return;

    setQaLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/ask-doc`, {
        doc_id: docId,
        question,
        page: "document-simplifier",
      });

      setChatHistory((h) => [
        ...h,
        { role: "user", text: question },
        {
          role: "assistant",
          text: res.data.response,
          audio: res.data.audio_filename,
        },
      ]);

      if (res.data.audio_filename) {
        const audio = new Audio(
          `${API_BASE}/api/audio/${res.data.audio_filename}`
        );
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setMessage("Error asking question.");
    } finally {
      setQaLoading(false);
    }
  };

  /* =========================
     Download PDF
  ========================== */
  const handleDownloadPDF = () => {
    if (!simplifiedText) return;

    const doc = new jsPDF();
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(simplifiedText, 190);
    let y = 10;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 8;
    });

    doc.save("simplified_text.pdf");
  };

  /* =========================
     Formatting helpers
  ========================== */
  const escapeRegExp = (string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightImportantWords = (text, words) => {
    let output = text;
    words.forEach((w) => {
      if (!w) return;
      const r = new RegExp(`(${escapeRegExp(w)})`, "gi");
      output = output.replace(r, "<mark>$1</mark>");
    });
    return output;
  };

  const formatTextWithHeadings = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, "<br/><br/><strong>$1</strong><br/>");

  /* =========================
     UI
  ========================== */
  return (
    <div
      className="min-h-screen p-8 flex flex-col items-center bg-gradient-to-r from-green-200 via-blue-200 to-purple-200"
      style={{ fontFamily: "OpenDyslexic", lineHeight: "1.5" }}
    >
      <h1 className="text-3xl font-bold text-blue-800 mb-6">
        Document Simplifier
      </h1>

      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="border p-2 mb-4 w-full max-w-md"
      />

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loadingText ? "Uploading..." : "Upload & Simplify"}
        </button>

        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Download PDF
        </button>
      </div>

      {message && <p className="text-red-700">{message}</p>}

      {simplifiedText && (
        <div className="mt-6 bg-white rounded shadow p-6 w-full max-w-4xl">
          <h2 className="text-xl font-semibold">Simplified Text</h2>
          <div
            className="mt-2 text-gray-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: highlightImportantWords(
                formatTextWithHeadings(simplifiedText),
                importantWords
              ),
            }}
          />
        </div>
      )}

      {docId && (
        <div className="bg-white p-4 rounded shadow max-w-4xl w-full mt-6">
          <h3 className="font-semibold mb-2">Chat with Document</h3>

          <input
            className="border p-2 w-full"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask a question about the document..."
          />

          <div className="flex gap-2 mt-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => {
                if (questionInput.trim()) {
                  askDocQuestion(questionInput);
                  setQuestionInput("");
                }
              }}
            >
              {qaLoading ? "Thinking..." : "Ask"}
            </button>

            <button
              onClick={startVoiceQuestion}
              className={`px-4 py-2 rounded ${
                listening ? "bg-red-500 text-white" : "bg-gray-200"
              }`}
              title="Ask using voice"
            >
              🎤
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {chatHistory.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <span className="inline-block bg-gray-100 px-3 py-2 rounded">
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
