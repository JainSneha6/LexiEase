// Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaMicrophone, FaPaperPlane, FaFileImage, FaStop, FaSpinner, FaPlay, FaPause } from "react-icons/fa";
import ChatWidget from "../components/ChatWidget";

const API_BASE = "http://localhost:5000";

const Chatbot = () => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [messages, setMessages] = useState([]); // message objects: { id, sender, type, text?, audioUrl?, duration?, status? }
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // WebAudio monitoring refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastSpokenRef = useRef(Date.now());
  const autoSendRef = useRef(false);

  // playback refs map: id -> audio element or Audio()
  const audioPlayersRef = useRef({});

  // silence threshold & timeout (ms)
  const SILENCE_THRESHOLD = 0.01; // tweak if needed
  const SILENCE_TIMEOUT_MS = 5000; // 5s silence => auto-send

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopMonitoring();
      if (streamRef.current) stopStreamTracks(streamRef.current);
      // revoke any object URLs created for user recordings
      messages.forEach((m) => {
        if (m.type === "audio" && m.audioUrl && m.audioUrl.startsWith("blob:")) {
          try { URL.revokeObjectURL(m.audioUrl); } catch { }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    setFile(file);
  };

  const stopStreamTracks = (stream) => {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) { /* ignore */ }
  };

  // ---------- Recording & silence monitoring ----------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks, { type: audioChunks[0]?.type || "audio/webm" });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioURL(url);

        stopMonitoring();

        if (autoSendRef.current) {
          autoSendRef.current = false;
          await submitAudioBlob(blob); // auto-send path
        } else {
          setIsRecording(false); // manual stop => preview available
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startMonitoring(stream);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = (manual = true) => {
    if (!mediaRecorderRef.current) return;
    autoSendRef.current = !manual;
    try {
      mediaRecorderRef.current.stop();
    } catch (e) {
      console.warn("Stop error:", e);
    }
    if (streamRef.current) {
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
    }
  };

  const startMonitoring = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      lastSpokenRef.current = Date.now();

      const checkSilence = () => {
        try {
          analyser.getFloatTimeDomainData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i];
            sumSquares += v * v;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          if (rms > SILENCE_THRESHOLD) {
            lastSpokenRef.current = Date.now();
          } else {
            const idle = Date.now() - lastSpokenRef.current;
            if (idle >= SILENCE_TIMEOUT_MS) {
              // silence detected -> auto-send
              stopRecording(false);
              return;
            }
          }
          rafIdRef.current = requestAnimationFrame(checkSilence);
        } catch (err) {
          // audio context might be closed
        }
      };

      rafIdRef.current = requestAnimationFrame(checkSilence);
    } catch (error) {
      console.error("Error initializing audio monitoring:", error);
    }
  };

  const stopMonitoring = () => {
    try {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }
      dataArrayRef.current = null;
    } catch (e) { }
  };

  // ---------- Helpers ----------
  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const getDurationFromBlob = (blob) =>
    new Promise((resolve) => {
      try {
        const tempUrl = URL.createObjectURL(blob);
        const a = new Audio(tempUrl);
        a.addEventListener("loadedmetadata", () => {
          const d = isNaN(a.duration) ? 0 : a.duration;
          a.pause();
          URL.revokeObjectURL(tempUrl);
          resolve(Math.round(d * 10) / 10); // 1 decimal
        });
        a.addEventListener("error", () => {
          URL.revokeObjectURL(tempUrl);
          resolve(0);
        });
      } catch {
        resolve(0);
      }
    });

  // Play/pause for a message's audio (user or bot)
  const togglePlay = (msg) => {
    if (!msg.audioUrl) return;
    let player = audioPlayersRef.current[msg.id];
    if (!player) {
      player = new Audio(msg.audioUrl);
      audioPlayersRef.current[msg.id] = player;
      player.onended = () => setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, playing: false } : m)));
    }
    if (player.paused) {
      player.play().catch((e) => console.warn("Playback blocked:", e));
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, playing: true } : m)));
    } else {
      player.pause();
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, playing: false } : m)));
    }
  };

  // ---------- New: submitAudioBlob (adds polished user-audio bubble and sends to backend) ----------
  const submitAudioBlob = async (blob) => {
    const id = makeId();
    const url = URL.createObjectURL(blob);
    const duration = await getDurationFromBlob(blob);

    // add polished user audio message (status: sending)
    const userAudioMsg = {
      id,
      sender: "user",
      type: "audio",
      audioUrl: url,
      duration,
      status: "sending",
    };
    setMessages((prev) => [...prev, userAudioMsg]);

    // build form and send to backend exactly as before
    const formData = new FormData();
    formData.append("audio", blob, "recording.wav");

    try {
      const res = await axios.post(`${API_BASE}/api/ask`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // update user's message status to 'sent'
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)));

      // create bot reply same as your existing flow (no changes to how it's handled)
      const botText = res.data.response || "Sorry, couldn't get a response.";
      const audioFilename = res.data.audio_filename; // may be null

      const botMessage = { sender: "bot", content: botText, audioUrl: null };
      if (audioFilename) botMessage.audioUrl = `${API_BASE}/api/audio/${audioFilename}`;

      setMessages((prev) => [...prev, botMessage]);

      // if backend returned audio, attempt to play it (same behavior as before)
      if (botMessage.audioUrl) {
        try {
          const audio = new Audio(botMessage.audioUrl);
          await audio.play();
        } catch (e) {
          console.warn("Playback prevented or failed:", e);
        }
      }
    } catch (error) {
      console.error("Error sending audio:", error);
      // mark user message failed
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m)));
      setMessages((prev) => [...prev, { sender: "bot", content: "Error contacting server." }]);
    } finally {
      // clear preview state
      setAudioBlob(null);
      setAudioURL("");
      setIsRecording(false);
    }
  };

  // ---------- Original handleSubmit (text / image / audio preview) ----------
  const handleSubmit = async () => {
    // If there's a recorded preview audio, send it using new polished flow
    if (audioBlob) {
      await submitAudioBlob(audioBlob);
      return;
    }

    // text/image path (same as before)
    setMessages((prev) => [...prev, { sender: "user", content: text }]);

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (image) formData.append("image", image);

    try {
      const res = await axios.post(`${API_BASE}/api/ask`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const botText = res.data.response || "Sorry, couldn't get a response.";
      const audioFilename = res.data.audio_filename; // may be null

      const botMessage = { sender: "bot", content: botText, audioUrl: null };
      if (audioFilename) botMessage.audioUrl = `${API_BASE}/api/audio/${audioFilename}`;

      setMessages((prev) => [...prev, botMessage]);

      // Auto-play bot audio if present (unchanged)
      if (botMessage.audioUrl) {
        try {
          const audio = new Audio(botMessage.audioUrl);
          await audio.play();
        } catch (e) {
          console.warn("Playback prevented or failed:", e);
        }
      }
    } catch (error) {
      console.error("Error sending request:", error);
      setMessages((prev) => [...prev, { sender: "bot", content: "Error contacting server." }]);
    } finally {
      setText("");
      setImage(null);
      setAudioBlob(null);
      setAudioURL("");
      setIsRecording(false);
    }
  };

  // ---------- UI rendering ----------
  const AudioMessage = ({ msg }) => {
    return (
      <div className={`p-3 rounded-xl max-w-md flex items-center ${msg.sender === "user" ? "ml-auto bg-purple-100 text-right" : "mr-auto bg-gray-100 text-left"}`}>
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium">{msg.sender === "user" ? "You" : "Bot"}</div>
              {msg.status === "sending" && (
                <div className="flex items-center text-xs text-gray-500"><FaSpinner className="animate-spin mr-1" />Sending...</div>
              )}
              {msg.status === "failed" && <div className="text-xs text-red-500">Failed</div>}
            </div>

            <div className="mt-2 flex items-center space-x-3">
              <button onClick={() => togglePlay(msg)} className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50 text-sm flex items-center">
                {msg.playing ? <FaPause /> : <FaPlay />} <span className="ml-2">{msg.playing ? "Pause" : "Play"}</span>
              </button>

              <div className="text-sm text-gray-600">{msg.duration ? `${msg.duration}s` : ""}</div>

              <div className="h-8 w-36 bg-gradient-to-r from-purple-300 to-purple-100 rounded-md overflow-hidden">
                <div className="flex h-full items-end justify-between px-1">
                  <div className="h-3 bg-white/40 w-1 rounded" />
                  <div className="h-5 bg-white/50 w-1 rounded" />
                  <div className="h-2 bg-white/30 w-1 rounded" />
                  <div className="h-6 bg-white/60 w-1 rounded" />
                  <div className="h-4 bg-white/45 w-1 rounded" />
                  <div className="h-3 bg-white/35 w-1 rounded" />
                </div>
              </div>

              {/* invisible audio element to allow DOM control (not displayed) */}
              <audio ref={(el) => { if (el) audioPlayersRef.current[msg.id] = el; }} src={msg.audioUrl} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center"
      style={{ fontFamily: "OpenDyslexic", lineHeight: "1.5" }}
    >
      <h1 className="text-5xl font-semibold text-blue-700 mb-8">Dyslexia Support Chatbot</h1>

      <div className="w-full max-w-3xl flex flex-col bg-white rounded-3xl shadow-lg overflow-hidden" style={{ height: "80vh" }}>
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index}>
              {msg.type === "audio" ? (
                <AudioMessage msg={msg} />
              ) : (
                <div className={`p-4 rounded-xl max-w-md ${msg.sender === "user" ? "ml-auto bg-purple-100 text-right" : "mr-auto bg-gray-100 text-left"}`}>
                  <p className="text-lg whitespace-pre-wrap">{msg.content || msg.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-purple-50 border-t border-gray-200">
          <div className="relative flex items-center">
            <textarea
              className="w-full py-2 px-4 pr-16 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-300 focus:outline-none resize-none"
              rows="1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your question..."
            ></textarea>

            <div className="absolute right-4 flex items-center space-x-3">
              <label className="cursor-pointer text-purple-500 hover:text-purple-700">
                <FaFileImage size={20} />
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setImage)} className="hidden" />
              </label>

              {!isRecording ? (
                <button onClick={startRecording} className="text-green-500 hover:text-green-700" title="Start recording (click to begin)">
                  <FaMicrophone size={20} />
                </button>
              ) : (
                <button onClick={() => stopRecording(true)} className="text-red-500 hover:text-red-700" title="Stop recording (manual)">
                  <FaStop size={20} />
                </button>
              )}

              <button onClick={handleSubmit} className="text-blue-500 hover:text-blue-700" title="Send">
                <FaPaperPlane size={20} />
              </button>
            </div>
          </div>

          {/* preview for recorded audio (manual stop) */}
          {audioURL && !isRecording && (
            <div className="mt-3 flex items-center space-x-3">
              <audio controls src={audioURL} className="mr-3" />
              <button
                onClick={() => submitAudioBlob(audioBlob)}
                className="text-sm text-green-600 px-3 py-1 border rounded"
              >
                Send recording
              </button>
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setAudioURL("");
                }}
                className="text-sm text-red-600"
              >
                Remove recording
              </button>
            </div>
          )}
        </div>
      </div>
      <ChatWidget pageContext="chatbot" />
    </div>
  );
};

export default Chatbot;
