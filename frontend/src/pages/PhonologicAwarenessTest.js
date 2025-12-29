import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FaVolumeUp } from 'react-icons/fa';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import ChatWidget from '../components/ChatWidget';

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
  const [selectedSegment, setSelectedSegment] = useState(null);
  const signatureRef = useRef(null);

  const currentDifficulty = difficulties[currentDifficultyIndex];
  const allWords = nonsenseWords[currentDifficulty];
  const currentWord = allWords[currentWordIndex];

  useEffect(() => {
    const canvas = signatureRef.current?.getCanvas();
    if (canvas) {
      const context = canvas.getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentWordIndex, currentDifficultyIndex]);

  useEffect(() => {
    if (isFinished) {
      submitResults();
    }
  }, [isFinished]);

  const handlePlayAudio = () => {
    const audio = new Audio(`/nonsense_words_audio/${currentWord}.wav`);
    audio.play().catch(error => console.error('Error playing audio:', error));
  };

  const handleCheckSpelling = async () => {
    try {
      const imageDataUrl = signatureRef.current.toDataURL('image/png');
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob, 'signature.png');
      formData.append('word', currentWord);

      const res = await fetch('http://localhost:5000/api/upload_image', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      setResults(prevResults => ({
        ...prevResults,
        [currentWord]: result.result,
      }));

      if (currentWordIndex < allWords.length - 1) {
        setCurrentWordIndex(prevIndex => prevIndex + 1);
      } else {
        if (currentDifficultyIndex < difficulties.length - 1) {
          setCurrentDifficultyIndex(prevIndex => prevIndex + 1);
          setCurrentWordIndex(0);
        } else {
          setIsFinished(true);
        }
      }

      clearSignature();
    } catch (error) {
      console.error('Error checking spelling:', error);
    }
  };

  const clearSignature = () => {
    signatureRef.current.clear();
    const canvas = signatureRef.current?.getCanvas();
    if (canvas) {
      const context = canvas.getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const submitResults = async () => {
    try {
      const res = await fetch('http://65.20.88.229/api/submit_results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results }),
      });

      const data = await res.json();
      setScore(data.score);
    } catch (error) {
      console.error('Error submitting results:', error);
    }
  };

  const correctCount = Object.values(results).filter(result => result === 'Correct').length;
  const incorrectCount = Object.values(results).filter(result => result === 'Incorrect').length;

  const chartData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [correctCount, incorrectCount],
        backgroundColor: ['#4CAF50', '#F44336'],
        hoverBackgroundColor: ['#66BB6A', '#EF5350'],
      },
    ],
  };

  const chartOptions = {
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setSelectedSegment(index);
      }
    },
  };

  //   const renderDetailedResults = () => {
  //     const filteredResults = Object.entries(results).filter(
  //       ([, result]) => (selectedSegment === 0 && result === 'Correct') || (selectedSegment === 1 && result === 'Incorrect')
  //     );

  //     return (
  //       <div className="mt-5 p-5 bg-white rounded-lg shadow-md">
  //         <h3 className="text-2xl font-semibold text-gray-800 mb-4">
  //           {selectedSegment === 0 ? 'Correct Words' : 'Incorrect Words'}
  //         </h3>
  //         <ul className="space-y-4">
  //           {filteredResults.map(([word, result]) => (
  //             <li
  //               key={word}
  //               className={`text-lg font-medium ${
  //                 result === 'Correct' ? 'text-green-600' : 'text-red-600'
  //               } flex justify-between items-center`}
  //             >
  //               <span>{word}</span>
  //               <span
  //                 className={`inline-block py-1 px-3 rounded-full text-sm font-semibold ${
  //                   result === 'Correct' ? 'bg-green-100' : 'bg-red-100'
  //                 }`}
  //               >
  //                 {result}
  //               </span>
  //             </li>
  //           ))}
  //         </ul>
  //       </div>
  //     );
  //   };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-green-200 via-blue-200 to-purple-200" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">Phonological Awareness Test</h2>
      <div className="relative w-full max-w-3xl p-10 bg-white rounded-lg shadow-2xl">
        {isFinished ? (
          <div className="mt-10 p-5 bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded-lg shadow-lg">
            <h2 className="text-3xl font-extrabold text-green-800 mb-3 text-center">Test Completed!</h2>
            <p className="text-xl text-center font-semibold text-gray-700 mb-6">
              Your score: <span className="text-green-600">{score.toFixed(2)}%</span>
            </p>

            <div style={{ width: '400px', height: '400px', margin: '0 auto' }}>
              < Pie data={chartData} options={chartOptions} />
            </div>

            {/* {selectedSegment !== null && renderDetailedResults()} */}
          </div>
        ) : (
          <>
            <button className="absolute top-4 right-4 text-xl font-bold text-gray-400 hover:text-gray-600">
              &times;
            </button>

            <div className="flex justify-center space-x-10 mb-10">
              <button
                className="p-5 text-3xl text-white bg-blue-600 rounded-full hover:bg-blue-700"
                onClick={handlePlayAudio}
              >
                <FaVolumeUp />
              </button>
            </div>

            <div className="mt-5 mb-5 w-full" style={{ height: '300px' }}>
              <SignatureCanvas
                ref={signatureRef}
                penColor='black'
                canvasProps={{ width: 720, height: 300, className: 'signature-canvas', style: { backgroundColor: 'white' } }}
              />
            </div>

            <div className="mt-5">
              <button
                onClick={handleCheckSpelling}
                className="mt-3 p-3 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Check Spelling
              </button>
            </div>

            <div className="w-full mt-5">
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${((currentWordIndex + 1) / allWords.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </>
        )}
      </div>
      <ChatWidget pageContext="phonological-awareness-test" />
    </div>
  );
};

export default Test1;
