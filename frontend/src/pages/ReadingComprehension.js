// src/pages/ReadingComprehension.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import passages from '../utils/ReadingComprehension';
import AudioPlayer from '../components/AudioPlayer';

const API_BASE = 'https://lexi-ease-ai-l753.vercel.app';

// small helper to play local correct/incorrect sounds
const playSound = (isCorrect) => {
  const audio = new Audio(isCorrect ? '/sounds/correct.mp3' : '/sounds/incorrect.mp3');
  audio.play().catch(() => { });
};

const ReadingComprehension = () => {
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(0);
  const audioPlayerRef = useRef(null); // Ref to control AudioPlayer

  // TTS player management
  const ttsAudioRef = useRef(null); // single audio element used for playback of server TTS files
  const [playingId, setPlayingId] = useState(null); // null or 'initial' | 'passage' | `q-<index>`

  // When page loads speak a short instruction (may be blocked until user interacts)
  useEffect(() => {
    speakAndPlay(
      'Read the passage and answer the questions. You can press the microphone next to the passage to hear the passage or next to each question to hear that question and its options.'
    ).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePassageSelect = (passageKey) => {
    setSelectedPassage(passageKey);
    setSelectedAnswers({});
    setScore(0);
  };

  const handleOptionSelect = (questionIndex, option) => {
    const isCorrect = passages[selectedPassage].questions[questionIndex].correctAnswer === option;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));

    if (isCorrect) {
      setScore((prev) => prev + 1);
      playSound(true);
    } else {
      playSound(false);
    }
  };

  const handleBackToPassages = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop && audioPlayerRef.current.stop();
    }
    stopAudio();
    setSelectedPassage(null);
  };

  // -------------------------- TTS helpers --------------------------
  // Request server to synthesize text and play it (server returns audio_filename)
  // Returns the Audio element's promise for play()
  const speakAndPlay = async (text, id = 'initial') => {
    // stop any playing audio first
    await stopAudio();

    if (!text || !text.trim()) return;

    try {
      // request TTS from backend
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!data?.audio_filename) return;

      const url = `${API_BASE}/api/audio/${encodeURIComponent(data.audio_filename)}`;

      // create or reuse audio element
      let audioEl = ttsAudioRef.current;
      if (!audioEl) {
        audioEl = new Audio();
        ttsAudioRef.current = audioEl;
      } else {
        // remove old handlers
        audioEl.onended = null;
        audioEl.onerror = null;
        try {
          audioEl.pause();
          audioEl.currentTime = 0;
        } catch (e) { }
      }

      audioEl.src = url;
      setPlayingId(id);

      // handle end / errors
      const cleanup = () => {
        setPlayingId(null);
        audioEl.onended = null;
        audioEl.onerror = null;
      };

      audioEl.onended = cleanup;
      audioEl.onerror = (e) => {
        console.warn('TTS playback error', e);
        cleanup();
      };

      // try to play (may be blocked until user gesture)
      await audioEl.play().catch((err) => {
        // still set state; user can click stop or a play control later
        console.warn('Playback blocked or failed:', err);
      });
    } catch (err) {
      console.error('TTS request error', err);
    }
  };

  // Stop currently playing TTS audio (if any)
  const stopAudio = async () => {
    const audioEl = ttsAudioRef.current;
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch (e) { }
      audioEl.onended = null;
      audioEl.onerror = null;
    }
    setPlayingId(null);
  };

  // Public handlers for mic actions:
  const onPlayPassage = async () => {
    if (!selectedPassage) return;
    const passageText = passages[selectedPassage].text;
    if (playingId === 'passage') {
      return stopAudio();
    }
    await speakAndPlay(passageText, 'passage');
  };

  const onPlayQuestion = async (questionIndex) => {
    if (!selectedPassage) return;
    const questionObj = passages[selectedPassage].questions[questionIndex];
    if (!questionObj) return;

    // Compose a readable string with options enumerated
    const optionsText = questionObj.options
      .map((opt, idx) => `Option ${idx + 1}: ${opt}`)
      .join('. ');

    const toSpeak = `${questionObj.question}. ${optionsText}.`;
    const id = `q-${questionIndex}`;

    if (playingId === id) {
      return stopAudio();
    }
    await speakAndPlay(toSpeak, id);
  };

  // -------------------------- render --------------------------
  return (
    <section
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen flex flex-col items-center p-8"
      style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}
    >
      <h1 className="text-3xl font-bold text-blue-700 -mt-5 mb-2">Reading Comprehension</h1>

      {selectedPassage === null ? (
        <div className="grid grid-cols-1 gap-6 w-full max-w-3xl">
          {Object.keys(passages).map((key, index) => (
            <div
              key={key}
              className={`bg-white p-6 rounded-2xl shadow-xl cursor-pointer transition-transform transform hover:scale-105 hover:shadow-2xl`}
              onClick={() => handlePassageSelect(key)}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-blue-700">Passage {index + 1}</h2>
                <small className="text-gray-500">Click to open</small>
              </div>
              <p className="mt-4 text-gray-700 text-sm">{passages[key].text.slice(0, 120)}...</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center w-full p-4 rounded-2xl max-w-5xl">
          {selectedPassage !== null && (
            <div className="-mt-5 flex flex-col items-center w-full">
              <img
                src={passages[selectedPassage].image}
                alt="GIF related to the passage"
                className="my-4 rounded-lg"
                style={{ width: '100%', maxWidth: '600px', height: 'auto', objectFit: 'cover' }}
              />

              <div className="w-full max-w-3xl bg-white rounded-xl p-4 shadow mb-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold text-gray-800">Passage</h3>
                  <div>
                    {/* mic / stop button for passage */}
                    <button
                      onClick={onPlayPassage}
                      className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border hover:shadow-sm"
                      aria-label="Read passage aloud"
                    >
                      {playingId === 'passage' ? <><FaStop /> <span className="text-sm">Stop</span></> : <><FaMicrophone /> <span className="text-sm">Read</span></>}
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-lg text-gray-800">{passages[selectedPassage].text}</p>

                {/* AudioPlayer for original voice if present */}
                {passages[selectedPassage].voice && (
                  <div className="mt-4">
                    <AudioPlayer audio={passages[selectedPassage].voice} ref={audioPlayerRef} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-3xl">
            {passages[selectedPassage].questions.map((question, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-xl shadow-md w-full">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-gray-800">{`Q${index + 1}. ${question.question}`}</h4>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPlayQuestion(index)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border hover:shadow-sm"
                      aria-label={`Read question ${index + 1} aloud`}
                    >
                      {playingId === `q-${index}` ? <><FaStop /> <span className="text-sm">Stop</span></> : <><FaMicrophone /> <span className="text-sm">Read</span></>}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className={`block p-3 border rounded cursor-pointer transition-colors 
                        ${selectedAnswers[index] === option
                          ? option === question.correctAnswer
                            ? 'bg-green-200'
                            : 'bg-red-200'
                          : 'bg-white'
                        }
                      `}
                      onClick={() => handleOptionSelect(index, option)}
                    >
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <p className="text-lg text-green-600">
              Score: {score} / {passages[selectedPassage].questions.length}
            </p>
            <div className="flex items-center gap-3 justify-center mt-4">
              <button
                onClick={handleBackToPassages}
                className="bg-red-400 text-white px-4 py-2 rounded-full"
              >
                Back to Passages
              </button>

              <button
                onClick={() => {
                  // replay initial instruction quickly
                  speakAndPlay('Read the passage and answer the questions. Use the microphone buttons to hear passage or questions aloud.').catch(() => { });
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-full"
              >
                Repeat instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReadingComprehension;
