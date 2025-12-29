import React, { useState, useRef, useEffect } from "react";
import puzzles from "../utils/puzzles";
import ChatWidget from "../components/ChatWidget";

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const PhonologicalAssistant = () => {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [win, setWin] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | asking | listening | puzzle

  const gifAudioRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const recognitionRef = useRef(null);

  /* ---------------- AUDIO CONTROL ---------------- */

  const pauseGifAudio = () => {
    gifAudioRef.current?.pause();
  };

  const resumeGifAudio = () => {
    gifAudioRef.current?.play().catch(() => { });
  };

  /* ---------------- ELEVENLABS SPEAK ---------------- */

  const speak = async (text) => {
    pauseGifAudio();

    const res = await fetch("http://localhost:5000/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (!data.audio_filename) return;

    ttsAudioRef.current.src = `http://localhost:5000/api/audio/${data.audio_filename}`;
    ttsAudioRef.current.onended = resumeGifAudio;
    await ttsAudioRef.current.play();
  };

  /* ---------------- SPEECH RECOGNITION ---------------- */

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.interimResults = false;

    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      await verifyAnswer(transcript);
    };

    recog.onerror = () => {
      setStage("listening");
    };

    recog.start();
    recognitionRef.current = recog;
  };

  /* ---------------- VERIFY ANSWER ---------------- */

  const verifyAnswer = async (spokenText) => {
    const puzzle = puzzles[selectedPuzzle];

    const res = await fetch("http://localhost:5000/api/verify-object", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: spokenText,
        correct: puzzle.word,
      }),
    });

    const data = await res.json();

    if (data.audio_filename) {
      pauseGifAudio();
      ttsAudioRef.current.src = `http://localhost:5000/api/audio/${data.audio_filename}`;
      await ttsAudioRef.current.play();
      ttsAudioRef.current.onended = resumeGifAudio;
    }

    if (data.correct) {
      setTiles(shuffleArray(puzzle.tiles));
      setStage("puzzle");
    } else {
      setStage("listening");
    }
  };

  /* ---------------- START PROMPT ---------------- */

  const startPrompt = async () => {
    setStage("asking");
    await speak("What can you see in this image?");
    setStage("listening");
  };

  /* ---------------- SELECT PUZZLE ---------------- */

  const handlePuzzleSelect = async (key) => {
    setSelectedPuzzle(key);
    setSelectedTile(null);
    setWin(false);
    setTiles([]);
    await startPrompt();
  };

  /* ---------------- TILE CLICK ---------------- */

  const handleTileClick = (index) => {
    if (selectedTile === null) {
      setSelectedTile(index);
      return;
    }

    const updated = [...tiles];
    [updated[selectedTile], updated[index]] =
      [updated[index], updated[selectedTile]];

    setTiles(updated);
    setSelectedTile(null);

    const correct = puzzles[selectedPuzzle].correctWord.join("");

    if (updated.slice(0, correct.length).join("") === correct) {
      setWin(true);
      speak(`Great job! You spelled ${puzzles[selectedPuzzle].word} correctly.`);
    }
  };

  /* ---------------- AUTO LOOP IMAGE AUDIO ---------------- */

  useEffect(() => {
    if (gifAudioRef.current) {
      gifAudioRef.current.loop = true;
      gifAudioRef.current.play().catch(() => { });
    }
  }, [selectedPuzzle]);

  return (
    <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen flex flex-col items-center p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>

      <audio ref={ttsAudioRef} hidden />

      <h1 className="text-5xl font-bold text-blue-700 -mt-5 mb-8">3x3 Word Puzzle</h1>
      {selectedPuzzle === null ? (
        <div className="grid grid-cols-1 gap-6">
          {Object.keys(puzzles).map((key, index) => (
            <div
              key={key}
              className={`bg-white p-6 rounded-2xl shadow-xl cursor-pointer transition-transform transform hover:scale-105 hover:shadow-2xl animate-crazyCardAnimation delay-${index * 100}`}
              onClick={() => handlePuzzleSelect(key)}
            >
              <h2 className="text-2xl font-bold text-center text-blue-700">
                Puzzle {index + 1}
              </h2>
              <p className="mt-4 text-gray-700 text-sm">
                Spell the word {puzzles[key].correctWord.join("")}...
              </p>
            </div>

          ))}
        </div>
      ) : (
        <div className="flex w-full h-full p-4 rounded-2xl">

          {/* LEFT: IMAGE + AUDIO */}
          <div className="flex flex-col items-center">
            <img
              src={puzzles[selectedPuzzle].image}
              alt="object"
              className="my-2"
              style={{
                width: "900px",
                height: "500px",
                objectFit: "cover",
                borderRadius: "12px",
              }}
            />

            <audio
              ref={gifAudioRef}
              src={puzzles[selectedPuzzle].voice}
              autoPlay
              loop
            />
          </div>

          {/* RIGHT: PUZZLE */}
          <div className="flex flex-col items-center w-full">
            <div className="grid grid-cols-3 gap-4">
              {tiles.map((tile, idx) => (
                <div
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  className={`flex items-center justify-center text-6xl font-bold cursor-pointer bg-white
                  ${selectedTile === idx ? "bg-yellow-300 shadow-xl" : ""}
                  transition-transform duration-300 ease-in-out
                  transform hover:scale-110 hover:shadow-lg rounded-lg`}
                  style={{
                    height: "90px",
                    width: "90px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  {tile}
                </div>
              ))}
            </div>

            {stage === "listening" && (
              <button
                onClick={startSpeechRecognition}
                className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow hover:scale-105"
              >
                🎤 Tap and say what you see
              </button>
            )}

            {win && (
              <div className="text-center mt-6 text-4xl text-blue-700 font-bold animate-bounce">
                Well Done! You Spelled {puzzles[selectedPuzzle].word} Correctly!
              </div>
            )}
          </div>
        </div>
      )}

      <ChatWidget pageContext="phonological-assistant" />
    </section>
  );
};

export default PhonologicalAssistant;
