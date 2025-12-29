import React, { useState } from 'react';
import puzzles from '../utils/puzzles';
import AudioPlayer from '../components/AudioPlayer';
import ChatWidget from '../components/ChatWidget';

const playSound = (isCorrect) => {
  const audio = new Audio(isCorrect ? '/sounds/correct.mp3' : '/sounds/click.mp3');
  audio.play();
};

const shuffleArray = (array) => {
  let newArr = array.slice();
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const isCorrectSpelling = (tiles, correctWord) => {
  return tiles.slice(0, correctWord.length).join('') === correctWord.join('');
};

const areTilesAdjacent = (index1, index2) => {
  const row1 = Math.floor(index1 / 3);
  const col1 = index1 % 3;
  const row2 = Math.floor(index2 / 3);
  const col2 = index2 % 3;

  return (Math.abs(row1 - row2) === 1 && col1 === col2) || (Math.abs(col1 - col2) === 1 && row1 === row2);
};

const PuzzleGame = () => {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [win, setWin] = useState(false);

  const handlePuzzleSelect = (puzzleKey) => {
    const puzzle = puzzles[puzzleKey];
    setSelectedPuzzle(puzzleKey);
    setTiles(shuffleArray(puzzle.tiles)); // Shuffle tiles
    setWin(false);
    setSelectedTile(null);
  };

  const handleTileClick = (index) => {
    if (selectedTile === null) {
      setSelectedTile(index);
    } else if (areTilesAdjacent(selectedTile, index)) {
      // Swap tiles only if they are adjacent
      const newTiles = tiles.slice();
      [newTiles[selectedTile], newTiles[index]] = [newTiles[index], newTiles[selectedTile]];
      setTiles(newTiles);
      setSelectedTile(null);

      // Check if the user solved the puzzle
      if (isCorrectSpelling(newTiles, puzzles[selectedPuzzle].correctWord)) {
        setWin(true);
        playSound(true); // Play the correct sound
      } else {
        playSound(false); // Play the incorrect sound
      }
    } else {
      // If tiles are not adjacent, just deselect the current tile
      setSelectedTile(null);
    }
  };

  return (
    <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen flex flex-col items-center p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
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
              <p className="mt-4 text-gray-700 text-sm">Spell the word {puzzles[key].correctWord.join('')}...</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex w-full h-full p-4 rounded-2xl">
          {/* Left Side - GIF */}
          <div className="flex flex-col items-center">
            <img
              src={puzzles[selectedPuzzle].image}
              alt="GIF related to the puzzle"
              className="my-2"
              style={{ width: '900px', height: '500px', objectFit: 'cover', borderRadius: '12px' }}
            />
            <AudioPlayer audio={puzzles[selectedPuzzle].voice} />
          </div>

          {/* Right Side - Puzzle */}
          <div className="flex flex-col items-center w-full">
            <div className="grid grid-cols-3 gap-4">
              {tiles.map((tile, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center text-6xl font-bold cursor-pointer bg-white 
                    ${selectedTile === index ? 'bg-yellow-300 shadow-xl' : 'bg-white'}
                    text-black transition-transform duration-300 ease-in-out
                    transform hover:scale-110 hover:shadow-lg rounded-lg`}
                  onClick={() => handleTileClick(index)}
                  style={{
                    height: '90px',
                    width: '90px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {tile}
                </div>
              ))}
            </div>
            {win && <div className="text-center mt-6 text-4xl text-blue-700 font-bold animate-bounce">Well Done! You Spelled {puzzles[selectedPuzzle].word} Correctly!</div>}
            <button
              onClick={() => setSelectedPuzzle(null)}
              className="bg-red-400 text-white px-4 py-2 rounded-full mt-4"
            >
              Back to Puzzles
            </button>
          </div>
        </div>
      )}
      <ChatWidget pageContext="phonological-assistant" />
    </section>
  );
};

export default PuzzleGame;
