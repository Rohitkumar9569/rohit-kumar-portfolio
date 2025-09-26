import React, { useState } from 'react';

const PyqUploadForm = () => {
  // State to hold the form data
  const [title, setTitle] = useState('');
  const [exam, setExam] = useState('');
  const [subject, setSubject] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, we just log the data. We will send it to the backend later.
    console.log({
      title,
      exam,
      subject,
      year,
      file,
    });
    // Here we will add the logic to upload the data and file.
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg space-y-6">
      {/* Form Input: Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
      </div>

      {/* Form Grid for Exam, Subject, Year */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="exam" className="block text-sm font-medium text-slate-300 mb-2">
            Exam (e.g., GATE, UPSC)
          </label>
          <input
            type="text"
            id="exam"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-slate-300 mb-2">
            Year
          </label>
          <input
            type="number"
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>
      </div>

      {/* Form Input: File Upload */}
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-slate-300 mb-2">
          PYQ PDF File
        </label>
        <input
          type="file"
          id="file"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
          accept=".pdf"
          required
        />
      </div>
      
      {/* Submit Button */}
      <div className="text-right">
        <button
          type="submit"
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
        >
          Upload PYQ
        </button>
      </div>
    </form>
  );
};

export default PyqUploadForm;