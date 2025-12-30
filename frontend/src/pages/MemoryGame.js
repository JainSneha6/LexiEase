import React, { useState, useEffect } from 'react';
import { FaAppleAlt, FaBicycle, FaBus, FaCar, FaCarrot, FaPepperHot, FaShip, FaTrain } from 'react-icons/fa';
import { GiCherry, GiGrapes, GiWatermelon, GiStrawberry, GiPineapple, GiLion, GiTiger, GiElephant, GiAirplane } from 'react-icons/gi';
import { GiPotato, GiTomato, GiPeas, GiBellPepper } from 'react-icons/gi';
import { FaCat, FaDog, FaHorse } from 'react-icons/fa';

// Define stages with icons and appropriate colors
const stages = {
  fruits: [
    { icon: <FaAppleAlt className="text-red-500" />, name: 'Apple' },
    { icon: <GiCherry className="text-red-600" />, name: 'Cherry' },
    { icon: <GiGrapes className="text-purple-500" />, name: 'Grapes' },
    { icon: <GiWatermelon className="text-green-500" />, name: 'Watermelon' },
    { icon: <GiStrawberry className="text-pink-500" />, name: 'Strawberry' },
    { icon: <GiPineapple className="text-yellow-500" />, name: 'Pineapple' }
  ],
  animals: [
    { icon: <FaCat className="text-gray-700" />, name: 'Cat' },
    { icon: <FaDog className="text-yellow-700" />, name: 'Dog' },
    { icon: <FaHorse className="text-yellow-800" />, name: 'Horse' },
    { icon: <GiLion className="text-yellow-600" />, name: 'Lion' },
    { icon: <GiTiger className="text-orange-600" />, name: 'Tiger' },
    { icon: <GiElephant className="text-gray-500" />, name: 'Elephant' },
  ],
  vegetables: [
    { icon: <FaCarrot className="text-orange-500" />, name: 'Carrot' },
    { icon: <GiPotato className="text-yellow-700" />, name: 'Potato' },
    { icon: <GiTomato className="text-red-500" />, name: 'Tomato' },
    { icon: <GiPeas className="text-green-500" />, name: 'Peas' },
    { icon: <FaPepperHot className="text-red-600" />, name: 'Pepper' },
    { icon: <GiBellPepper className="text-green-400" />, name: 'BellPepper' },
  ],
  vehicles: [
    { icon: <FaCar className="text-blue-500" />, name: 'Car' },
    { icon: <FaBus className="text-yellow-500" />, name: 'Bus' },
    { icon: <FaTrain className="text-gray-700" />, name: 'Train' },
    { icon: <FaBicycle className="text-green-500" />, name: 'Bicycle' },
    { icon: <GiAirplane className="text-blue-400" />, name: 'Airplane' },
    { icon: <FaShip className="text-blue-600" />, name: 'Ship' },
  ]
};

const generateCards = (selectedStage) => {
  const cardData = [...stages[selectedStage], ...stages[selectedStage]]; // Duplicate icons for pairs
  return cardData.sort(() => Math.random() - 0.5); // Shuffle the cards
};

// Function to play sound
const playSound = (isCorrect) => {
  const audio = new Audio(isCorrect ? '/sounds/correct.mp3' : '/sounds/incorrect.mp3');
  audio.play();
};

const MemoryGame = () => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedIndices, setMatchedIndices] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    if (selectedStage) {
      setCards(generateCards(selectedStage));
    }
  }, [selectedStage]);

  useEffect(() => {
    if (flippedIndices.length === 2) {
      const [firstIndex, secondIndex] = flippedIndices;
      if (cards[firstIndex].name === cards[secondIndex].name) {
        setMatchedIndices((prev) => [...prev, firstIndex, secondIndex]);
        playSound(true); // Play correct sound
      } else {
        playSound(false); // Play incorrect sound
      }
      setTimeout(() => setFlippedIndices([]), 1000);
      setMoves((prev) => prev + 1);
    }
  }, [flippedIndices, cards]);

  useEffect(() => {
    if (matchedIndices.length === cards.length && cards.length > 0) {
      setTimeout(() => setGameCompleted(true), 500); // Slight delay before showing the message
    }
  }, [matchedIndices, cards]);

  const handleCardClick = (index) => {
    if (!flippedIndices.includes(index) && !matchedIndices.includes(index)) {
      setFlippedIndices((prev) => [...prev, index]);
    }
  };

  const handleStageSelect = (stage) => {
    setSelectedStage(stage);
    setFlippedIndices([]);
    setMatchedIndices([]);
    setMoves(0);
    setGameCompleted(false);
  };

  return (
    <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen flex flex-col items-center p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <h1 className="text-3xl font-bold text-blue-700 mb-4">Memory Game</h1>
      {selectedStage === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {Object.keys(stages).map((stage, index) => (
            <div
              key={stage}
              className={`bg-white p-6 rounded-2xl shadow-xl cursor-pointer transition-transform transform hover:scale-105 hover:shadow-2xl animate-crazyCardAnimation delay-${index * 100}`}
              onClick={() => handleStageSelect(stage)}
            >
              <h2 className="text-2xl font-bold text-center text-blue-700">
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </h2>
              <div className="flex justify-center mt-6">
                {stages[stage].map(({ icon }, iconIndex) => (
                  <span key={iconIndex} className="text-4xl mx-2">
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : gameCompleted ? (
        <div className="flex flex-col items-center animate-fadeIn">
          <h2 className="text-4xl font-extrabold text-green-600 mb-4 animate-bounce">
            Congratulations!
          </h2>
          <p className="text-lg text-gray-700 mb-2">You completed the game in {moves} moves!</p>
          <button
            onClick={() => setSelectedStage(null)}
            className="bg-red-400 text-white px-4 py-2 rounded-full mt-4"
          >
            Back to Stages
          </button>
        </div>
      ) : (
        <div className={`flex flex-col items-center transition-opacity duration-500 ${gameCompleted ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-lg mb-4 text-gray-700">Moves: {moves}</p>

          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className={`w-24 h-24 flex justify-center items-center border border-gray-300 rounded-lg shadow-md transition-transform duration-300 transform hover:scale-105 cursor-pointer
                  ${flippedIndices.includes(index) || matchedIndices.includes(index) ? 'bg-white' : 'bg-gray-200'}
                `}
                onClick={() => handleCardClick(index)}
              >
                {(flippedIndices.includes(index) || matchedIndices.includes(index)) && (
                  <span className="text-5xl">{card.icon}</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setSelectedStage(null)}
            className="mt-6 bg-red-400 text-white px-4 py-2 rounded-full"
          >
            Back to Stages
          </button>
        </div>
      )}
    </section>
  );
};

export default MemoryGame;
