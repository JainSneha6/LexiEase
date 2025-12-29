import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import ChatWidget from '../components/ChatWidget';

const GrayOralReadingTest = () => {
  const [isReading, setIsReading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [readingTime, setReadingTime] = useState(0);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(0);
  const [fluencyRating, setFluencyRating] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const passage =
    'The sun is bright in the sky. Birds fly high and sing sweet songs. Trees sway gently in the wind. Grass is green and soft underfoot. Children laugh and play outside. They run, jump, and chase each other. A dog wags its tail and joins the fun. Everyone enjoys this nice day. Nature is full of life and happiness.';

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
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setIsRecording(false);
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        toast.error('MediaRecorder error occurred.');
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Error accessing microphone. Please check your permissions.');
      setIsReading(false);
    }
  };

  const handleFinishReading = () => {
    setIsReading(false);
    const timeTaken = (Date.now() - startTime) / 1000;
    setReadingTime(timeTaken);
    setIsTestCompleted(true);

    const wordsInPassage = passage.split(' ').length;
    const speed = (wordsInPassage / (timeTaken / 60)).toFixed(2);
    setReadingSpeed(speed);

    if (mediaRecorder) {
      mediaRecorder.stop();
    } else {
      toast.error('Recording not started correctly.');
    }
  };

  const saveResultsToBackend = async (speed, timeTaken) => {


    try {
      await axios.post(
        'http://localhost:5000/api/save-reading-results',
        { readingSpeed: speed, timeTaken },
      );
      toast.success('Results saved successfully!');
    } catch (error) {
      console.error('Error saving results:', error.response ? error.response.data : error.message);
      toast.error('Error saving results!');
    }
  };

  const uploadAudioToBackend = async () => {
    if (!audioBlob) {
      toast.error('No audio recorded!');
      return;
    }
    const formData = new FormData();
    formData.append('audio', audioBlob, 'reading-test.wav');

    try {
      const response = await axios.post('http://localhost:5000/api/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFluencyRating(response.data.fluency_rating);
      toast.success('Audio uploaded successfully!');
    } catch (error) {
      console.error('Error uploading audio:', error.response ? error.response.data : error.message);
      toast.error('Error uploading audio!');
    }
  };

  useEffect(() => {
    if (isTestCompleted && audioBlob) {
      saveResultsToBackend(readingSpeed, readingTime);
      uploadAudioToBackend();
    }
  }, [isTestCompleted, audioBlob]);

  return (
    <div className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <ToastContainer />
      <h2 className="text-4xl font-bold text-blue-800 mb-8 text-center">Gray Oral Reading Test</h2>

      <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full mx-auto text-center">
        <h3 className="text-xl font-bold mb-4">Read the following passage:</h3>
        <p className="text-gray-700 mb-4">{passage}</p>

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

        {isTestCompleted && (
          <div className="mt-8 bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-lg shadow-md text-left">
            <h4 className="text-lg font-semibold text-purple-800 mb-2">Results:</h4>
            <p className="text-gray-800 mb-1">
              Time Taken: <span className="font-semibold">{readingTime.toFixed(2)} seconds</span>
            </p>
            <p className="text-gray-800 mb-1">
              Reading Speed: <span className="font-semibold">{readingSpeed} words per minute</span>
            </p>
            {fluencyRating !== null && (
              <p className="text-gray-800">
                Fluency Rating: <span className="font-semibold">{fluencyRating}</span>
              </p>
            )}
          </div>
        )}
      </div>
      <ChatWidget pageContext="gray-oral-reading-test" />
    </div>
  );
};

export default GrayOralReadingTest;
