import React, { useEffect, useRef, useState } from "react";
import { FaRobot, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

export default function ChatWidget({ pageContext = "" }) {
    const [listening, setListening] = useState(false);

    const audioRef = useRef(null);
    const recognitionRef = useRef(null);
    const greetedRef = useRef(false);

    const greeting = pageContext
        ? `Hi, I’m Lexi. I’m here to help you with ${pageContext.replace(/-/g, " ")}. What would you like to do?`
        : "Hi, I’m Lexi. How can I help you today?";

    /* ---------------- Speech Recognition ---------------- */
    function createRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;

        const r = new SR();
        r.lang = "en-US";
        r.interimResults = false;
        r.continuous = false;
        return r;
    }

    function startListening() {
        const recognition = createRecognition();
        if (!recognition) return;

        recognitionRef.current = recognition;
        setListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setListening(false);
            handleUserSpeech(transcript);
        };

        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);

        try {
            recognition.start();
        } catch {
            setListening(false);
        }
    }

    /* ---------------- Send speech to backend ---------------- */
    async function handleUserSpeech(text) {
        if (!text) return;

        try {
            const token = localStorage.getItem("access_token") || localStorage.getItem("token");

            const res = await fetch("http://localhost:5000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    message: text,
                    page: pageContext,
                }),
            });

            const data = await res.json();

            if (data.audio_filename) {
                audioRef.current.src =
                    `http://localhost:5000/api/audio/${encodeURIComponent(
                        data.audio_filename
                    )}`;
                audioRef.current.play().catch(() => { });
            }
        } catch (err) {
            console.error("Voice request failed:", err);
        }
    }

    /* ---------------- Speak greeting on first click ---------------- */
    async function handleBubbleClick() {
        // First click → greet user
        if (!greetedRef.current) {
            greetedRef.current = true;

            try {
                const res = await fetch("http://localhost:5000/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: greeting }),
                });

                const data = await res.json();

                if (data?.audio_filename) {
                    audioRef.current.src =
                        `http://localhost:5000/api/audio/${encodeURIComponent(
                            data.audio_filename
                        )}`;
                    audioRef.current.play().catch(() => { });
                }
            } catch (e) {
                console.error("Greeting failed", e);
            }

            return;
        }

        // After greeting → microphone mode
        startListening();
    }

    return (
        <>
            {/* Floating mic button */}
            <div className="fixed right-6 bottom-6 z-50">
                <button
                    onClick={handleBubbleClick}
                    className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center 
            text-white text-xl transition
            ${listening
                            ? "bg-red-500 animate-pulse"
                            : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}
                    aria-label="Lexi voice assistant"
                >
                    {listening ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>
            </div>

            {/* Hidden audio */}
            <audio ref={audioRef} style={{ display: "none" }} />
        </>
    );
}
