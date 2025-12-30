import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FaVolumeUp } from 'react-icons/fa';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const API_BASE = "http://localhost:5000";

const nonsenseWords = {
  easy: ['zap', 'zaf'],
  medium: ['zass', 'ziff'],
  hard: ['zitch', 'zetch'],
};

const difficulties = ['easy', 'medium', 'hard'];

const Test1 = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState({});
  const [score, setScore] = useState(0);

  const signatureRef = useRef(null);
  const ttsAudioRef = useRef(null);

  const currentDifficulty = difficulties[currentDifficultyIndex];
  const allWords = nonsenseWords[currentDifficulty];
  const currentWord = allWords[currentWordIndex];

  /* =========================
     ElevenLabs TTS helper
  ========================== */
  const speak = async (text) => {
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      audio.src = `${API_BASE}/api/audio/${encodeURIComponent(data.audio_filename)}`;

      await audio.play().catch(() => { });
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  /* =========================
     Initial instruction voice
  ========================== */
  useEffect(() => {
    speak(
      "Click the sound button to hear the word. Then write the word in the box. After that, click check spelling. You can do it. All the best."
    );
  }, []);

  /* =========================
     Canvas setup
  ========================== */
  useEffect(() => {
    const canvas = signatureRef.current?.getCanvas();
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentWordIndex, currentDifficultyIndex]);

  /* =========================
     Play nonsense word audio
  ========================== */
  const handlePlayAudio = () => {
    const audio = new Audio(`/nonsense_words_audio/${currentWord}.wav`);
    audio.play().catch(() => { });
  };

  /* =========================
     Clear canvas
  ========================== */
  const clearSignature = () => {
    signatureRef.current.clear();
    const canvas = signatureRef.current?.getCanvas();
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  /* =========================
     Check spelling
  ========================== */
  const handleCheckSpelling = async () => {
    try {
      // 🔊 Speak before checking
      await speak("Checking your spelling now.");

      const imageDataUrl = signatureRef.current.toDataURL('image/png');
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'writing.png');
      formData.append('word', currentWord);

      const res = await fetch('http://localhost:5000/api/upload_image', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      setResults(prev => ({
        ...prev,
        [currentWord]: result.result,
      }));

      // Move to next word or difficulty
      if (currentWordIndex < allWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
      } else if (currentDifficultyIndex < difficulties.length - 1) {
        setCurrentDifficultyIndex(prev => prev + 1);
        setCurrentWordIndex(0);
      } else {
        setIsFinished(true);
      }

      clearSignature();

      // 🔊 Prompt for next round
      setTimeout(() => {
        speak("Now listen to the next word and do the same as before.");
      }, 600);

    } catch (error) {
      console.error("Error checking spelling:", error);
    }
  };

  /* =========================
     Submit results
  ========================== */
  useEffect(() => {
    if (!isFinished) return;

    const submitResults = async () => {
      try {
        const res = await fetch('http://65.20.88.229/api/submit_results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results }),
        });

        const data = await res.json();
        setScore(data.score);
      } catch (err) {
        console.error(err);
      }
    };

    submitResults();
  }, [isFinished]);

  const correctCount = Object.values(results).filter(r => r === 'Correct').length;
  const incorrectCount = Object.values(results).filter(r => r === 'Incorrect').length;

  const chartData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [correctCount, incorrectCount],
        backgroundColor: ['#4CAF50', '#F44336'],
      },
    ],
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-green-200 via-blue-200 to-purple-200"
      style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}
    >
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">
        Phonological Awareness Test
      </h2>

      <div className="relative w-full max-w-3xl p-10 bg-white rounded-lg shadow-2xl">

        {isFinished ? (
          <div className="mt-6 text-center">
            <h2 className="text-3xl font-bold text-green-700 mb-4">
              Test Completed!
            </h2>

            <p className="text-xl font-semibold mb-4">
              Your score: {score.toFixed(2)}%
            </p>

            <div style={{ width: 400, margin: '0 auto' }}>
              <Pie data={chartData} />
            </div>
          </div>
        ) : (
          <>
            {/* AUDIO BUTTON */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handlePlayAudio}
                className="p-6 text-3xl text-white bg-blue-600 rounded-full hover:bg-blue-700"
                aria-label="Play word"
              >
                <FaVolumeUp />
              </button>
            </div>

            {/* DRAWING AREA */}
            <div className="mb-6" style={{ height: '300px' }}>
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  width: 720,
                  height: 300,
                  className: 'signature-canvas',
                  style: { backgroundColor: 'white' },
                }}
              />
            </div>

            {/* CHECK BUTTON */}
            <div className="flex justify-center">
              <button
                onClick={handleCheckSpelling}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Check Spelling
              </button>
            </div>

            {/* PROGRESS */}
            <div className="w-full mt-6">
              <div className="h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${((currentWordIndex + 1) / allWords.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Test1;
