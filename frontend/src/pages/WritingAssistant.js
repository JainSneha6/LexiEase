import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ChatWidget from '../components/ChatWidget';

const WritingAssistant = () => {
  const [userText, setUserText] = useState('');
  const [improvedText, setImprovedText] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [loadingSpelling, setLoadingSpelling] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const handleTextChange = (event) => {
    setUserText(event.target.value);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setImageFile(file);
  };

  const handleImproveText = async () => {
    setLoadingText(true);
    const formData = new FormData();
    if (userText) formData.append('text', userText);
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/writing-assistant',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setImprovedText(response.data.improved_text);
      toast.success('Text improved successfully!');
    } catch (error) {
      console.error('Error improving text:', error.response ? error.response.data : error.message);
      toast.error('Error improving text!');
    }
    setLoadingText(false);
  };

  const handleImproveTextSpelling = async () => {
    setLoadingSpelling(true);
    const formData = new FormData();
    if (userText) formData.append('text', userText);
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/writing-assistant-spelling',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setImprovedText(response.data.improved_text);
      toast.success('Mistakes identified successfully!');
    } catch (error) {
      console.error('Error improving text:', error.response ? error.response.data : error.message);
      toast.error('Error identifying mistakes!');
    }
    setLoadingSpelling(false);
  };

  return (
    <div className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8 flex flex-col items-center" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <ToastContainer />
      <h2 className="text-4xl font-bold text-blue-800 mb-4 tracking-wide">Writing Assistant</h2>

      <textarea
        className="w-full max-w-2xl p-4 border-2 border-purple-300 rounded-xl mb-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800"
        rows="6"
        value={userText}
        onChange={handleTextChange}
        placeholder="Enter your text here..."
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="mb-4 border-2 border-purple-300 rounded-xl p-2"
      />

      <div className="flex flex-row gap-4 mt-2">
        <button
          onClick={handleImproveText}
          className="bg-gradient-to-r from-green-500 to-green-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105 font-semibold"
          disabled={loadingText}
        >
          {loadingText ? 'Improving Text...' : 'Improve Text'}
        </button>

        <button
          onClick={handleImproveTextSpelling}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105 font-semibold"
          disabled={loadingSpelling}
        >
          {loadingSpelling ? 'Identifying Mistakes...' : 'Identify Mistakes'}
        </button>
      </div>

      {improvedText && (
        <div className="bg-white shadow-lg rounded-xl p-6 mt-6 w-full max-w-2xl">
          <h4 className="text-lg font-semibold text-purple-800 mb-2">Improved Text:</h4>
          <p className="text-gray-800 leading-relaxed">{improvedText}</p>
        </div>
      )}
      <ChatWidget pageContext="writing-assistant" />
    </div>
  );
};

export default WritingAssistant;
