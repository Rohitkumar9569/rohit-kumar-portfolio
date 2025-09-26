import React from 'react';
import { Link } from 'react-router-dom';

const exams = [
  { name: 'GATE', path: '/study/gate' },
  { name: 'UPSC', path: '/study/upsc' },
  { name: 'SSC', path: '/study/ssc' },
];

const StudyZonePage = () => {
  return (
    <section className="container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-bold text-center text-cyan-400 mb-12">
        Welcome to the Study Zone
      </h1>
      <p className="text-lg text-slate-300 text-center mb-16 max-w-2xl mx-auto">
        Select an exam category to browse Previous Year Questions (PYQs).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {exams.map((exam) => (
          <Link
            key={exam.name}
            to={exam.path}
            className="bg-slate-800 p-8 rounded-lg text-center hover:bg-slate-700 hover:scale-105 transition-transform duration-300"
          >
            <h2 className="text-3xl font-semibold text-white">{exam.name}</h2>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default StudyZonePage;