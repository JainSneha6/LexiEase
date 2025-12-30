import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFileAlt, FaProjectDiagram } from 'react-icons/fa'; // Icons for the cards

const services = [
    {
        title: 'Document Simplifier',
        description: 'Effortlessly convert complex PDF documents into simplified, easy-to-understand text.',
        link: '/document-simplifier',
        icon: <FaFileAlt className="text-blue-700 text-5xl" />,
    },
    {
        title: 'Notes & Mind Map Generation',
        description: 'Create interactive and visually appealing mind maps and notes to organize and present your ideas effectively.',
        link: '/mindmap-generator',
        icon: <FaProjectDiagram className="text-green-700 text-5xl" />,
    },
];

const DocumentSupport = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <section className="bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 min-h-screen p-8" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
            <div className="grid grid-cols-1 gap-8"> {/* Removed md:grid-cols-2 */}
                {services.map((service, index) => (
                    <div
                        key={index}
                        className={`bg-white p-8 rounded-lg shadow-lg transform transition-all duration-700 ease-out
              ${isVisible ? `animate-crazyCardAnimation delay-${index * 200}` : 'opacity-0'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            {service.icon}
                            <h3 className="text-xl font-bold text-blue-700 ml-4">
                                <Link to={service.link} className="hover:underline">
                                    {service.title}
                                </Link>
                            </h3>
                        </div>
                        <p className="text-gray-600">{service.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default DocumentSupport;
