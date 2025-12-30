import React, { useState, useRef, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = "https://lexi-ease-ai-l753.vercel.app";

const GrayOralReadingTest = () => {
  const [isReading, setIsReading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const [readingTime, setReadingTime] = useState(0);
  const [readingSpeed, setReadingSpeed] = useState(0);
  const [fluencyRating, setFluencyRating] = useState(null); 
  const [startTime, setStartTime] = useState(null);
  const [isTestCompleted, setIsTestCompleted] = useState(false);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackAudio, setFeedbackAudio] = useState(null);

  const feedbackAudioRef = useRef(null);

  // 🔐 prevents double speaking in React StrictMode
  const hasPlayedIntroRef = useRef(false);

  const passage =
    "The sun is bright in the sky. Birds fly high and sing sweet songs. Trees sway gently in the wind. Grass is green and soft underfoot. Children laugh and play outside. They run, jump, and chase each other. A dog wags its tail and joins the fun. Everyone enjoys this nice day. Nature is full of life and happiness.";

  /* ===========================
     🔊 TEXT TO SPEECH (ElevenLabs)
  ============================ */
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

      const audio = new Audio(
        `${API_BASE}/api/audio/${encodeURIComponent(data.audio_filename)}`
      );

      feedbackAudioRef.current = audio;

      try {
        await audio.play();
      } catch {
        // autoplay blocked → ignored safely
      }

      return new Promise((resolve) => {
        audio.onended = resolve;
        setTimeout(resolve, 30000);
      });
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  /* ===========================
     🔊 INTRO (RUN ONCE)
  ============================ */
  useEffect(() => {
    if (hasPlayedIntroRef.current) return;
    hasPlayedIntroRef.current = true;

    const introText =
      "Welcome to the reading test. You will see a short passage on the screen. " +
      "Click start reading and read the passage aloud. " +
      "When you finish reading, click finish. " +
      "Try your best. All the best!";

    speakText(introText);
  }, []);

  /* ===========================
     START RECORDING
  ============================ */
  const handleStartReading = async () => {
    setIsReading(true);
    setStartTime(Date.now());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      let chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
      };

      recorder.start();
    } catch (err) {
      toast.error("Microphone access denied.");
      setIsReading(false);
    }
  };

  /* ===========================
     STOP RECORDING
  ============================ */
  const handleFinishReading = () => {
    setIsReading(false);

    const timeTaken = (Date.now() - startTime) / 1000;
    setReadingTime(timeTaken);

    const words = passage.split(" ").length;
    const speed = (words / (timeTaken / 60)).toFixed(2);
    setReadingSpeed(speed);

    setIsTestCompleted(true);

    if (mediaRecorder) mediaRecorder.stop();
  };

  /* ===========================
     SEND AUDIO TO BACKEND
  ============================ */
  const uploadAudioToBackend = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append("audio", audioBlob, "reading.wav");
    formData.append("readingSpeed", readingSpeed);
    formData.append("timeTaken", readingTime);

    try {
      const res = await axios.post(
        `${API_BASE}/api/upload-audio`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setFluencyRating(res.data.fluency_rating);
      setFeedbackText(res.data.feedback_text || "");

      if (res.data.feedback_audio) {
        const url = `${API_BASE}/api/audio/${res.data.feedback_audio}`;
        setFeedbackAudio(url);

        setTimeout(() => {
          feedbackAudioRef.current?.play().catch(() => { });
        }, 300);
      }

      toast.success("Reading analyzed successfully!");
    } catch (err) {
      toast.error("Error analyzing reading.");
    }
  };

  /* trigger backend after recording */
  useEffect(() => {
    if (isTestCompleted && audioBlob) {
      uploadAudioToBackend();
    }
  }, [isTestCompleted, audioBlob]); 

  return (
    <div
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center"
      style={{ fontFamily: "OpenDyslexic", lineHeight: "1.5" }}
    >
      <ToastContainer />

      <h2 className="text-4xl font-bold text-blue-800 mb-8 text-center">
        Gray Oral Reading Test
      </h2>

      <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full mx-auto text-center">
        <h3 className="text-xl font-bold mb-4">Read the following passage:</h3>

        <p className="text-gray-700 mb-6">{passage}</p>

        {!isReading ? (
          <button
            onClick={handleStartReading}
            className="bg-green-500 text-white px-6 py-3 rounded-full shadow hover:scale-105 transition"
          >
            Start Reading
          </button>
        ) : (
          <button
            onClick={handleFinishReading}
            className="bg-red-500 text-white px-6 py-3 rounded-full shadow hover:scale-105 transition"
          >
            Finish Reading
          </button>
        )}

        {isTestCompleted && (
          <div className="mt-8 bg-purple-100 p-5 rounded-lg text-left">
            <h4 className="font-semibold text-purple-800 mb-2">Results</h4>

            <p>
              <strong>Time Taken:</strong> {readingTime.toFixed(2)} seconds
            </p>
            <p>
              <strong>Reading Speed:</strong> {readingSpeed} WPM
            </p>

            {fluencyRating !== null && (
              <p>
                <strong>Fluency Score:</strong> {fluencyRating}
              </p>
            )}
          </div>
        )}

        {feedbackText && (
          <div className="mt-6 bg-green-100 p-5 rounded-lg shadow">
            <h4 className="font-semibold text-green-800 mb-2">
              Lexi’s Feedback
            </h4>
            <p className="text-gray-800">{feedbackText}</p>

            {feedbackAudio && (
              <audio ref={feedbackAudioRef} src={feedbackAudio} className="mt-3 w-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GrayOralReadingTest;
