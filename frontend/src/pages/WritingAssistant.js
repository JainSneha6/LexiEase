// src/pages/WritingAssistant.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = "https://lexi-ease-ai-l753.vercel.app";

const WritingAssistant = () => {
  // visible text
  const [pastedText, setPastedText] = useState("");
  const [leftImproved, setLeftImproved] = useState("");
  const [rightMistakes, setRightMistakes] = useState("");

  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);

  // authoritative working text
  const currentWorkingTextRef = useRef("");

  // speech
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);

  // initial instruction on mount
  useEffect(() => {
    // speak initial prompt (may be blocked until user gesture)
    speakText(
      "Paste the text or upload an image of your handwritten document that you want assistance with."
    );
    return () => {
      // cleanup recognition on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort && recognitionRef.current.abort();
        } catch (e) { }
        recognitionRef.current = null;
      }
    };
  }, []);

  // TTS helper
  const speakText = async (text) => {
    if (!text?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!data?.audio_filename) return;

      const audio = ttsAudioRef.current || new Audio();
      ttsAudioRef.current = audio;
      audio.src = `${API_BASE}/api/audio/${encodeURIComponent(data.audio_filename)}`;

      try {
        await audio.play();
      } catch {
        // autoplay may be blocked; continue without throwing
      }

      return new Promise((resolve) => {
        const cleanup = () => {
          audio.onended = null;
          audio.onerror = null;
          resolve();
        };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        setTimeout(cleanup, 30000);
      });
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  // handle paste
  const handlePaste = async (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (!text?.trim()) return;
    setPastedText(text);
    currentWorkingTextRef.current = text;
    await processDocument({ text });
  };

  // handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPastedText("");
    await processDocument({ imageFile: file });
  };

  // core processing
  const processDocument = async ({ text, imageFile }) => {
    setProcessing(true);
    // clear previous
    setLeftImproved("");
    setRightMistakes("");

    try {
      const formData = new FormData();
      if (text) formData.append("text", text);
      if (imageFile) formData.append("image", imageFile);

      const [improveRes, spellRes] = await Promise.allSettled([
        axios.post(`${API_BASE}/api/writing-assistant`, formData),
        axios.post(`${API_BASE}/api/writing-assistant-spelling`, formData),
      ]);

      // get values from responses (use local vars)
      const improvedText =
        improveRes.status === "fulfilled"
          ? (improveRes.value.data.improved_text ||
            improveRes.value.data.improvedText ||
            "")
          : "";

      const mistakesText =
        spellRes.status === "fulfilled"
          ? (spellRes.value.data.improved_text ||
            spellRes.value.data.improvedText ||
            "")
          : "";

      // update authoritative working text if we have an improved value
      if (improvedText && improvedText.trim()) {
        currentWorkingTextRef.current = improvedText.trim();
      } else if (text && text.trim()) {
        // fallback to original text if no improved text returned
        currentWorkingTextRef.current = text.trim();
      }

      // set state so panes will render
      setLeftImproved(improvedText);
      setRightMistakes(mistakesText);

      // ensure the DOM updates and panes render BEFORE speaking:
      // await two animation frames (robust across browsers)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // now UI should show panes; stop processing indicator
      setProcessing(false);

      // ask the user the question (do NOT read the mistakes aloud)
      await speakText(
        "Processing complete. Do you want any more assistance? If yes, say your suggestion. If not, say no."
      );

      // start listening for instruction
      startListeningForInstruction();
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("Failed to process document.");
      setProcessing(false);
    }
  };

  // voice listener
  const startListeningForInstruction = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    if (listening) return;

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onstart = () => setListening(true);

    rec.onerror = (e) => {
      console.error("SpeechRecognition error", e);
      setListening(false);
      // re-prompt and restart listening
      speakText("I didn't catch that. Do you want more help?").then(() => {
        startListeningForInstruction();
      }).catch(() => { });
    };

    rec.onend = () => setListening(false);

    rec.onresult = async (ev) => {
      setListening(false);
      const transcript = Array.from(ev.results).map((r) => r[0].transcript).join(" ").trim();
      if (!transcript) {
        await speakText("I didn't hear anything. Do you want more help?");
        startListeningForInstruction();
        return;
      }

      const stopRegex =
        /\b(no|nope|nah|stop|don't|dont|no thanks|thank you|that's all|thats all)\b/i;

      if (stopRegex.test(transcript)) {
        await speakText("Okay. If you need help later, just paste or upload new text.");
        return;
      }

      // apply instruction
      await applyVoiceInstruction(transcript);

      // re-ask the question after applying
      await speakText("Do you want any more assistance? If yes, say your instruction.");

      // start listening again
      startListeningForInstruction();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error("Recognition start error:", err);
    }
  };

  // apply voice instruction
  const applyVoiceInstruction = async (instructionText) => {
    setProcessing(true);
    try {
      const baseText = currentWorkingTextRef.current || "";
      if (!baseText.trim()) {
        toast.error("No text available to improve.");
        setProcessing(false);
        return;
      }

      const payload = `INSTRUCTION: ${instructionText}\n\nTEXT:\n${baseText}`;
      const formData = new FormData();
      formData.append("text", payload);

      const res = await axios.post(`${API_BASE}/api/writing-assistant`, formData);

      const updated =
        res.data.improved_text || res.data.improvedText || "";

      if (updated && updated.trim()) {
        setLeftImproved(updated);
        currentWorkingTextRef.current = updated;
      }

      // re-run spelling on updated content
      const spellForm = new FormData();
      spellForm.append("text", updated || baseText);
      const spellRes = await axios.post(`${API_BASE}/api/writing-assistant-spelling`, spellForm);
      const mistakes =
        spellRes.data.improved_text || spellRes.data.improvedText || "";

      setRightMistakes(mistakes);

      // keep behavior: read updated mistakes aloud
      if (mistakes) {
        await speakText(mistakes);
      }
    } catch (err) {
      console.error("Instruction error:", err);
      toast.error("Failed to apply instruction.");
    } finally {
      setProcessing(false);
    }
  };

  const showResults = !processing && (leftImproved || rightMistakes);

  return (
    <div
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center"
      style={{ fontFamily: "OpenDyslexic", lineHeight: "1.5" }}
    >
      <ToastContainer />

      <h2 className="text-4xl font-bold text-blue-800 mb-4">
        Writing Assistant
      </h2>

      {/* INPUT PANEL */}
      <div className="w-full max-w-4xl bg-white rounded-xl p-6 shadow-lg mb-6">
        <h3 className="text-lg font-semibold mb-2">Paste text or upload an image</h3>
        <p className="text-sm text-gray-500 mb-3">
          Paste (Ctrl+V) your handwritten/typed text or upload an image. Processing begins automatically.
        </p>

        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Paste your handwritten or typed text here..."
          className="w-full h-40 p-3 border rounded-md resize-none"
        />

        <div className="mt-4 flex justify-between items-center">
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          <span className="text-sm text-gray-600">{processing ? "Processing..." : "Waiting for input"}</span>
        </div>
      </div>

      {/* RESULTS */}
      {showResults && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-2">Improved Text</h3>
            <div className="min-h-[16rem] p-3 border rounded bg-gray-50 whitespace-pre-wrap">{leftImproved}</div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-2">Mistakes & Suggestions</h3>
            <div className="min-h-[16rem] p-3 border rounded bg-gray-50 whitespace-pre-wrap">{rightMistakes}</div>
            <div className="mt-3 text-xs text-gray-600">
              {listening ? "Listening for your instruction..." : "After reading this, say what you want to improve next."}
            </div>
          </div>
        </div>
      )}

      <audio ref={ttsAudioRef} hidden />
    </div>
  );
};

export default WritingAssistant;
