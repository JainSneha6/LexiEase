import React from 'react';
import Header from '../components/Header';
import ServicesSection from '../components/ServiceSection';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-green-200 via-blue-200 to-purple-200" style={{ fontFamily: 'OpenDyslexic', lineHeight: '1.5' }}>
      <Header />
      <main className="flex-1 w-full max-w-4xl mt-6 text-center">
        <ServicesSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
