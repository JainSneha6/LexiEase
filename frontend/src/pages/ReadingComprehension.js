import React, { useState, useRef } from 'react';
import passages from '../utils/ReadingComprehension';
import AudioPlayer from '../components/AudioPlayer';
import ChatWidget from '../components/ChatWidget';

const playSound = (isCorrect) => {
  const audio = new Audio(isCorrect ? '/sounds/correct.mp3' : '/sounds/incorrect.mp3');
  audio.play();
};

const ReadingComprehension = () => {
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(0);
  const audioPlayerRef = useRef(null); // Ref to control AudioPlayer

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
      audioPlayerRef.current.stop();
    }
    setSelectedPassage(null);
  };

  return (
    <section
      className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen flex flex-col items-center p-8"
      style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}
    >
      <h1 className="text-3xl font-bold text-blue-700 -mt-5 mb-2">Reading Comprehension</h1>
      {selectedPassage === null ? (
        <div className="grid grid-cols-1 gap-6">
          {Object.keys(passages).map((key, index) => (
            <div
              key={key}
              className={`bg-white p-6 rounded-2xl shadow-xl cursor-pointer transition-transform transform hover:scale-105 hover:shadow-2xl animate-crazyCardAnimation delay-${index * 100}`}
              onClick={() => handlePassageSelect(key)}
            >
              <h2 className="text-2xl font-bold text-center text-blue-700">
                Passage {index + 1}
              </h2>
              <p className="mt-4 text-gray-700 text-sm">{passages[key].text.slice(0, 60)}...</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center w-full h-full p-4 rounded-2xl">
          {selectedPassage !== null && (
            <div className="-mt-5 flex flex-col items-center">
              <img
                src={passages[selectedPassage].image}
                alt="GIF related to the passage"
                className="my-2"
                style={{ width: '600px', height: '300px' }}
              />
              <AudioPlayer audio={passages[selectedPassage].voice} ref={audioPlayerRef} />
            </div>
          )}
          <p className="text-lg text-gray-800 mb-4 max-w-xl text-center">{passages[selectedPassage].text}</p>
          <div className="flex flex-col gap-4 w-full max-w-2xl">
            {passages[selectedPassage].questions.map((question, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-xl shadow-md w-full">
                <h3 className="text-md font-semibold text-gray-800">{question.question}</h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className={`block p-2 border rounded cursor-pointer transition-colors 
                        ${selectedAnswers[index] === option
                          ? option === question.correctAnswer
                            ? 'bg-green-200'
                            : 'bg-red-200'
                          : 'bg-gray-100'
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
            <button
              onClick={handleBackToPassages}
              className="bg-red-400 text-white px-4 py-2 rounded-full mt-4"
            >
              Back to Passages
            </button>
          </div>
        </div>
      )}
      <ChatWidget pageContext="reading-comprehension" />
    </section>
  );
};

export default ReadingComprehension;
