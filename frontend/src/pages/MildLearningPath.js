import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeadphones, FaBookOpen } from 'react-icons/fa'; // Icons for the cards
import ChatWidget from '../components/ChatWidget';

const readingAssistanceOptions = [
  {
    title: 'Reading Aloud Support',
    description: 'Utilize audio resources that read text aloud to help improve comprehension and fluency.',
    link: '/reading-assistance',
    icon: <FaHeadphones className="text-blue-700 text-5xl" />,
  },
  {
    title: 'Reading Comprehension',
    description: 'Improve understanding and retention of text through various passages and questions.',
    link: '/reading-comprehension',
    icon: <FaBookOpen className="text-orange-700 text-5xl" />, // Use an appropriate icon
  },
];

const MildLearningPathPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [completedAssistance, setCompletedAssistance] = useState({});

  useEffect(() => {
    setIsVisible(true);

    const completionStatus = {};
    readingAssistanceOptions.forEach(option => {
      if (option.localStorageKey) {
        const isCompleted = localStorage.getItem(option.localStorageKey) === 'true';
        if (isCompleted) {
          completionStatus[option.title] = true;
        }
      }
    });
    setCompletedAssistance(completionStatus);
  }, []);

  return (
    <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">Mild Learning Path: Reading Assistance</h2>
      <div className="grid grid-cols-1 gap-6">
        {readingAssistanceOptions.map((option, index) => (
          <div
            key={index}
            className={`bg-white p-6 rounded-lg shadow-md transform transition-all duration-700 ease-out
              ${isVisible ? `animate-crazyCardAnimation delay-${index * 200}` : 'opacity-0'}`}
          >
            <div className="flex items-center mb-4">
              {option.icon}
              <h3 className="text-xl font-bold text-blue-700 ml-4">
                {option.link ? (
                  <Link to={option.link} className="hover:underline">
                    {option.title}
                  </Link>
                ) : (
                  option.title
                )}
              </h3>
            </div>
            <p className="text-gray-600">{option.description}</p>
          </div>
        ))}
      </div>
      <ChatWidget pageContext="mild-learning-path" />
    </section>
  );
};

export default MildLearningPathPage;
