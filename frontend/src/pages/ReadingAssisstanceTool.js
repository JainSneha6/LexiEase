import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import paragraphs from '../utils/ReadingParagraphs';
import AudioPlayer from '../components/AudioPlayer';
import ChatWidget from '../components/ChatWidget';

const API_BASE = "http://localhost:5000";

const ReadingAssistanceTool = () => {
  const [isReading, setIsReading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [readingTime, setReadingTime] = useState(0);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(0);
  const [fluencyRating, setFluencyRating] = useState(null);
  const [isFluencyRatingReceived, setIsFluencyRatingReceived] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [currentParagraph, setCurrentParagraph] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(1); // Default speech speed
  const [voices, setVoices] = useState([]); // Available voices
  const [selectedVoice, setSelectedVoice] = useState(null); // Selected voice
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
  const [wordDefinitions, setWordDefinitions] = useState(null);

  const audioRef = useRef(null);
  const introPlayedRef = useRef(false);

  /* ✅ Dyslexia-friendly text style */
  const dyslexiaStyle = {
    fontFamily: 'OpenDyslexic, sans-serif',
    lineHeight: '2',
    letterSpacing: '0.08em',
    wordSpacing: '0.15em',
    backgroundColor: '#F8FBFF',
    color: '#333',
    padding: '12px',
    borderRadius: '8px',
  };

  /* ================= ELEVENLABS SPEECH ================= */
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

      audioRef.current.src = `${API_BASE}/api/audio/${encodeURIComponent(
        data.audio_filename
      )}`;

      try {
        await audioRef.current.play();
      } catch {
        // autoplay blocked
      }
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  /* ================= INTRO VOICE (ONCE) ================= */
  useEffect(() => {
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;

    speakText(
      "Welcome!" +
      "You can listen to each sentence using the listen button. " +
      "When ready, press start reading and read the passage aloud. " +
      "Click finish reading when you are done to get your fluency score. " +
      "You can also tap on words to check their meanings. " +
      "All the best!"
    );
  }, []);

  /* ================= RECORDING ================= */
  const handleStartReading = async () => {
    setIsReading(true);
    setStartTime(Date.now());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      let chunks = [];
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        setIsRecording(false);
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        toast.error('MediaRecorder error occurred.');
      };

      recorder.start();
    } catch {
      toast.error("Microphone access denied.");
      setIsReading(false);
    }
  };

  const handleFinishReading = () => {
    setIsReading(false);
    const timeTaken = (Date.now() - startTime) / 1000;
    setReadingTime(timeTaken);
    setIsTestCompleted(true);

    const wordsInPassage = paragraphs[currentParagraph].text.split(' ').length;
    const speed = (wordsInPassage / (timeTaken / 60)).toFixed(2);
    setReadingSpeed(speed);

    if (mediaRecorder) mediaRecorder.stop();
  };

  /* ================= SEND AUDIO FOR ANALYSIS ================= */
  useEffect(() => {
    if (!audioBlob || !isTestCompleted) return;

    const upload = async () => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "reading.wav");

      try {
        const res = await axios.post(`${API_BASE}/api/upload-audio`, formData);
        setFluencyRating(res.data.fluency_rating);
        toast.success("Fluency evaluated successfully!");
      } catch {
        toast.error("Failed to analyze fluency.");
      }
    };

    upload();
  }, [audioBlob, isTestCompleted]);

  /* ================= SENTENCE SPEECH ================= */
  const handleReadSentence = async (sentence, index) => {
    setCurrentSentenceIndex(index);
    await speakText(sentence);
    setCurrentSentenceIndex(null);
  };

  /* ================= WORD MEANING ================= */
  const handleWordClick = async (word) => {
    const audio = new Audio('/sounds/click.mp3');
    audio.play();
    try {
      const res = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      const data = res.data[0];
      setWordDefinitions({
        word,
        definition: data.meanings[0].definitions[0].definition,
        synonyms: data.meanings[0].synonyms || [],
      });
    } catch (error) {
      console.error('Error fetching word meaning:', error);
      toast.error('Error fetching word meaning!');
    }
  };

  return (
    <div
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center"
      style={{ fontFamily: "OpenDyslexic" }}
    >
      <ToastContainer />
      <h2 className="text-4xl font-bold text-blue-800 mb-8 text-center">Reading Assistance Tool</h2>
      

      {currentParagraph === null ? (
        <section className="grid grid-cols-1 gap-6 w-full max-w-4xl">
          <h3 className="text-xl font-bold text-center">
            Select a paragraph to begin
          </h3>

          {paragraphs.map((paragraph, index) => (
            <div
              key={index}
              className={`bg-white p-6 rounded-lg shadow-md cursor-pointer transition-transform transform hover:scale-105
                w-full ${isVisible ? `animate-crazyCardAnimation delay-${index * 200}` : 'opacity-0'}`}
              onClick={() => handleParagraphSelect(index)}
            >
              <h3 className="text-xl font-bold text-blue-700 mb-2">
                {`Paragraph ${index + 1}`}
              </h3>
              <p className="text-gray-600">{paragraph.text.substring(0, 100)}...</p>
            </div>
          ))}
        </section>
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl w-full">
          <h3 className="text-xl font-bold mb-4">Read the following passage:</h3>
          {currentParagraph !== null && (<div className="mt-4 flex flex-col items-center"> <img src={paragraphs[currentParagraph].image} alt="GIF related to the passage" className="my-2 " style={{ width: '600px', height: '300px' }} /> <AudioPlayer audio={paragraphs[currentParagraph].voice} /> </div>)}
          <div className="my-4 flex justify-center">
            <AudioPlayer audio={paragraphs[currentParagraph].voice} />
          </div>

          <div style={dyslexiaStyle}>
            {paragraphs[currentParagraph].text.split(". ").map((sentence, i) => (
              <div key={i} className="flex items-start gap-3 mb-3">
                <div className="flex flex-wrap">
                  {sentence.split(" ").map((word, idx) => (
                    <span
                      key={wordIndex}
                      onClick={() => handleWordClick(word)}
                      className="cursor-pointer hover:bg-gray-200 mr-1"
                    >
                      {word}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleReadSentence(sentence.trim(), index)}
                  className="text-blue-500 underline hover:text-blue-700 ml-4"
                >
                  Listen
                </button>
              </div>
            ))}
          </div>


          <div className="mb-4">
            <label htmlFor="speechSpeed" className="mr-2">Speech Speed:</label>
            <input
              type="range"
              id="speechSpeed"
              min="0.5"
              max="2"
              step="0.1"
              value={speechSpeed}
              onChange={(e) => setSpeechSpeed(e.target.value)}
              className="w-full"
            />
            <p>Current Speed: {speechSpeed}x</p>
          </div>

          <div className="mb-4">
            <label htmlFor="voiceSelect" className="mr-2">Select Voice:</label>
            <select
              id="voiceSelect"
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice);
              }}
            >
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>{voice.name} ({voice.lang})</option>
              ))}
            </select>
          </div>

          {!isReading ? (
            <button
              onClick={handleStartReading}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105"
            >
              Start Reading
            </button>
          ) : (
            <button
              onClick={handleFinishReading}
              className="bg-gradient-to-r from-red-400 to-red-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105"
            >
              Finish Reading
            </button>
          )}

          {wordDefinitions.word && (
            <div className="bg-blue-100 p-4 rounded-lg mt-4">
              <h4 className="text-blue-800 font-semibold">
                Meaning of "{wordDefinitions.word}":
              </h4>
              <p className="text-blue-600">{wordDefinitions.definition}</p>
              {wordDefinitions.synonyms.length > 0 && (
                <p>
                  <strong>Synonyms:</strong>{" "}
                  {wordDefinitions.synonyms.join(", ")}
                </p>
              )}
            </div>
          )}    

          {isTestCompleted && (
            <div className="mt-8 bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-lg shadow-md text-left">
              <h4 className="text-lg font-semibold text-purple-800 mb-2">Results:</h4>
              <p className="text-gray-800 mb-1">
                Time Taken: <span className="font-bold">{readingTime.toFixed(2)} seconds</span>
              </p>
              <p className="text-gray-800 mb-1">
                Reading Speed: <span className="font-bold">{readingSpeed} WPM</span>
              </p>
              {fluencyRating !== null && (
                <p className="text-gray-800 mb-1">
                  Fluency Rating: <span className="font-bold">{fluencyRating}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <ChatWidget pageContext="reading-assistance" />
      <audio ref={audioRef} hidden />
    </div>
  );
}

export default ReadingAssistanceTool;
