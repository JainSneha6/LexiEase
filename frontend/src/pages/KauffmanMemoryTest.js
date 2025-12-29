import React, { useState, useEffect } from 'react';
import { FaApple, FaDog, FaCar, FaRocket, FaCat, FaFish, FaPlay } from 'react-icons/fa';
import ChatWidget from '../components/ChatWidget';

const MemoryTest = () => {
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [isRevealing, setIsRevealing] = useState(true);
  const [score, setScore] = useState(null);
  const [testType, setTestType] = useState('audio'); // Default to 'audio'
  const [showPlayIcon, setShowPlayIcon] = useState(true); // State to control play icon visibility
  const [optionsRevealed, setOptionsRevealed] = useState(false); // To control option reveal
  const sequenceLength = 4;

  // Sample datasets
  const icons = [
    { id: 'apple', icon: <FaApple /> },
    { id: 'dog', icon: <FaDog /> },
    { id: 'car', icon: <FaCar /> },
    { id: 'rocket', icon: <FaRocket /> },
    { id: 'cat', icon: <FaCat /> },
    { id: 'fish', icon: <FaFish /> }
  ];

  const words = [
    { id: 'apple', word: 'Apple' },
    { id: 'dog', word: 'Dog' },
    { id: 'car', word: 'Car' },
    { id: 'rocket', word: 'Rocket' },
    { id: 'cat', word: 'Cat' },
    { id: 'fish', word: 'Fish' }
  ];

  const audio = [
    { id: 'apple', sound: 'sounds/apple.mp3' },
    { id: 'dog', sound: 'sounds/dog.mp3' },
    { id: 'car', sound: 'sounds/car.mp3' },
    { id: 'rocket', sound: 'sounds/rocket.mp3' },
    { id: 'cat', sound: 'sounds/cat.mp3' },
    { id: 'fish', sound: 'sounds/fish.mp3' }
  ];

  useEffect(() => {
    // Generate a random sequence based on the selected test type
    const dataset = testType === 'icons' ? icons : testType === 'words' ? words : audio;
    const randomSequence = generateRandomSequence(dataset, sequenceLength);
    setSequence(randomSequence);
  }, [testType]);

  const generateRandomSequence = (dataArray, length) => {
    // Shuffle and select a random sequence from the provided dataset
    const shuffled = [...dataArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, length);
  };

  const playAudioSequence = async (sequence) => {
    for (const item of sequence) {
      const audioElement = new Audio(item.sound);
      await new Promise((resolve) => {
        audioElement.play();
        audioElement.onended = resolve; // Wait for audio to finish
      });
    }
    setShowPlayIcon(false); // Hide play icon after playback
  };

  const playSound = (sound) => {
    const audioElement = new Audio(sound);
    audioElement.play();
  };

  const handleUserInput = (item) => {
    setUserSequence((prev) => [...prev, { id: item.id }]); // Only push the id
  };

  const handleSubmit = () => {
    console.log(sequence);
    console.log(userSequence)
    const score = calculateScore(sequence, userSequence);
    setScore(score);
  };

  const calculateScore = (original, user) => {
    return user.reduce((acc, item, index) => {
      return item.id === original[index].id ? acc + 1 : acc;
    }, 0);
  };

  const handleStartTest = async () => {
    // Reset user input and reveal options
    console.log(testType)
    setUserSequence([]);
    setIsRevealing(true);
    setShowPlayIcon(true); // Show the play icon again
    setOptionsRevealed(false);

    // Generate a new sequence


    // For audio tests, play the sequence
    if (testType === 'audio') {
      const dataset = testType === 'icons' ? icons : testType === 'words' ? words : audio;
      const randomSequence = generateRandomSequence(dataset, sequenceLength);
      setSequence(randomSequence);
      await playAudioSequence(randomSequence);
      setIsRevealing(false);
      setOptionsRevealed(true);// Wait for audio to finish
    }

    // For icons and words, reveal options immediately
    if (testType === 'icons' || testType === 'words') {
      setIsRevealing(false);
      setOptionsRevealed(true);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <h1 className="text-5xl font-semibold text-blue-700 mb-8">Memory Test</h1>

      <div className="w-full max-w-3xl flex flex-col bg-white rounded-3xl shadow-lg overflow-hidden" style={{ height: '80vh' }}>
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          <div className="flex justify-center space-x-4 mb-4">
            <button onClick={() => setTestType('icons')} className="bg-purple-500 text-white rounded-lg px-4 py-2">Test with Icons</button>
            <button onClick={() => setTestType('words')} className="bg-purple-500 text-white rounded-lg px-4 py-2">Test with Words</button>
            <button onClick={() => setTestType('audio')} className="bg-purple-500 text-white rounded-lg px-4 py-2">Test with Audio</button>
          </div>

          {/* Start Test Button */}
          <button onClick={handleStartTest} className="mt-4 bg-blue-500 text-white rounded-lg px-4 py-2">
            Start Test
          </button>

          {isRevealing ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">Memorize this sequence:</h2>
              {testType === 'audio' && showPlayIcon && (
                <button onClick={handleStartTest} className="mt-4 bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center">
                  <FaPlay className="mr-2" /> Play
                </button>
              )}
              <div className="sequence flex gap-4">
                {sequence.map((item, index) => (
                  <div key={index} className="text-3xl">
                    {testType === 'icons' && item.icon}
                    {testType === 'words' && <span>{item.word}</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {optionsRevealed && (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Enter the sequence:</h2>

                  {/* Render options based on testType */}
                  <div className="options flex gap-4 flex-wrap">
                    {testType === 'icons' &&
                      icons.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <button onClick={() => handleUserInput(item)} className="text-3xl bg-purple-100 rounded-lg p-2 cursor-pointer hover:bg-purple-200 transition mr-2">
                            {item.icon}
                          </button>
                        </div>
                      ))}

                    {testType === 'words' &&
                      words.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <button onClick={() => handleUserInput(item)} className="text-2xl bg-purple-100 rounded-lg p-2 cursor-pointer hover:bg-purple-200 transition mr-2">
                            {item.word}
                          </button>
                        </div>
                      ))}

                    {testType === 'audio' &&
                      audio.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <button onClick={() => handleUserInput(item)} className="text-3xl bg-purple-100 rounded-lg p-2 cursor-pointer hover:bg-purple-200 transition mr-2">
                            {icons.find((icon) => icon.id === item.id)?.icon}
                          </button>
                          <button onClick={() => playSound(item.sound)} className="text-l rounded-lg p-1 hover:bg-green-200 transition">
                            <FaPlay />
                          </button>
                        </div>
                      ))}
                  </div>

                  <button onClick={handleSubmit} className="mt-4 bg-blue-500 text-white rounded-lg px-4 py-2">
                    Submit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {score !== null && (
          <div className="p-4 bg-gray-100 border-t border-gray-200">
            <h2 className="text-xl">Your Score: {score}/{sequence.length}</h2>
          </div>
        )}
      </div>
      <ChatWidget pageContext="kauffman-battery-assessment-test" />
    </div>
  );
};

export default MemoryTest;
