import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaBook, FaLightbulb, FaUserFriends } from 'react-icons/fa'; // Icons for the cards

const learningPaths = [
  {
    title: 'Mild Learning Path',
    description: 'Designed for individuals with mild learning challenges, offering support and resources for foundational skills.',
    link: '/mild-learning-path',
    icon: <FaUserFriends className="text-blue-700 text-5xl" />,
  },
  {
    title: 'Moderate Learning Path',
    description: 'Tailored for individuals with moderate learning challenges, focusing on targeted interventions and support strategies.',
    link: '/moderate-learning-path',
    icon: <FaLightbulb className="text-green-700 text-5xl" />,
  },
  {
    title: 'Severe Learning Path',
    description: 'Intensive learning strategies for individuals with severe learning challenges, ensuring personalized education plans.',
    link: '/severe-learning-path',
    icon: <FaBook className="text-red-700 text-5xl" />,
  },
];

const CustomizedLearningPathsPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [completedPaths, setCompletedPaths] = useState({});

  useEffect(() => {
    setIsVisible(true);

    // Check for completed paths
    const completionStatus = {};
    learningPaths.forEach(path => {
      if (path.localStorageKey) {
        const isCompleted = localStorage.getItem(path.localStorageKey) === 'true';
        if (isCompleted) {
          completionStatus[path.title] = true;
        }
      }
    });
    setCompletedPaths(completionStatus);
  }, []);

  return (
    <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">Customized Learning Paths</h2>
      <div className="grid grid-cols-1 gap-6">
        {learningPaths.map((path, index) => (
          <div
            key={index}
            className={`bg-white p-6 rounded-lg shadow-md transform transition-all duration-700 ease-out
              ${isVisible ? `animate-crazyCardAnimation delay-${index * 200}` : 'opacity-0'}`}
          >
            <div className="flex items-center mb-4">
              {path.icon}
              <h3 className="text-xl font-bold text-blue-700 ml-4">
                {path.link ? (
                  <Link to={path.link} className="hover:underline">
                    {path.title}
                  </Link>
                ) : (
                  path.title
                )}
              </h3>
            </div>
            <p className="text-gray-600">{path.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CustomizedLearningPathsPage;
