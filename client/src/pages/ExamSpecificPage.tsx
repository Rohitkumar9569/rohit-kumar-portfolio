import React, { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '../api';
import PyqCardSkeleton from '../components/PyqCardSkeleton';

// --- INTERFACES (No changes) ---
interface IExam {
  _id: string;
  name: string;
  shortName: string;
  slug: string;
}
interface ISubject {
  _id: string;
  name: string;
  examId: string;
}
interface IPyq {
  _id: string;
  year: number;
  title: string;
  subject: string;
  fileUrl: string;
}

// --- 1. API functions are moved out for cleanliness ---
const fetchExamAndSubjects = async (examName: string) => {
  // First, get all exams to find the ID for the current one.
  const examsResponse = await API.get<IExam[]>('/api/exams');
  const exam = examsResponse.data.find(e => e.slug === examName);

  if (!exam) {
    throw new Error(`Exam "${examName}" not found.`);
  }

  // Then, get the subjects for that exam.
  const subjectsResponse = await API.get<ISubject[]>(`/api/subjects/by-exam/${exam._id}`);

  // Return both the exam and its subjects.
  return { exam, subjects: subjectsResponse.data };
};

const fetchPyqsForSubject = async (subjectId: string) => {
  const response = await API.get<IPyq[]>(`/api/pyqs?subjectId=${subjectId}`);
  return response.data;
};


const ExamSpecificPage = () => {
  const { examName } = useParams<{ examName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubjectId = searchParams.get('subject');

  // --- 2. useQuery to fetch exam and subjects ---
  const {
    data: examData,
    isLoading: isLoadingExam,
    isError: isErrorExam
  } = useQuery({
    queryKey: ['exam', examName], // Caches based on the exam name
    queryFn: () => fetchExamAndSubjects(examName!),
    enabled: !!examName, // Only run the query if examName exists
  });

  // --- 3. useQuery to fetch PYQs (dependent on a subject being selected) ---
  const {
    data: pyqs,
    isLoading: isLoadingPyqs,
    isError: isErrorPyqs
  } = useQuery({
    queryKey: ['pyqs', selectedSubjectId], // Caches based on the selected subject
    queryFn: () => fetchPyqsForSubject(selectedSubjectId!),
    enabled: !!selectedSubjectId, // IMPORTANT: Only runs when a subject is selected
  });

  // --- 4. A separate effect to set the default subject once subjects are loaded ---
  useEffect(() => {
    // If subjects have loaded, there's no subject in the URL, and there is at least one subject
    if (examData && !selectedSubjectId && examData.subjects.length > 0) {
      setSearchParams({ subject: examData.subjects[0]._id }, { replace: true });
    }
  }, [examData, selectedSubjectId, setSearchParams]);

  // --- RENDER LOGIC ---

  if (isErrorExam || isErrorPyqs) {
    return <div className="text-center text-red-400 py-24">Failed to load data.</div>;
  }

  const isLoading = isLoadingExam || isLoadingPyqs;

  return (
    // Main section setup for Light Mode (default: #F9FAFB) and Dark Mode (dark: #0A192F)
    <section className="bg-[#F9FAFB] text-[#0A192F] dark:bg-[#0A192F] dark:text-[#E6F1FF] container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">
        Previous Year Questions for <span className="text-cyan-600 dark:text-[#00F5D4] uppercase">{examData?.exam.shortName || examName}</span>
      </h1>

      {/* Subject Buttons Container */}
      <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12 bg-gray-200 dark:bg-slate-800 p-2 rounded-lg shadow-md">
        {examData?.subjects.map(subject => (
          <button
            key={subject._id}
            onClick={() => setSearchParams({ subject: subject._id })}
            className={`px-3 py-2 text-sm md:px-6 md:py-2 font-semibold rounded-md transition-colors duration-200 shadow-sm
              ${selectedSubjectId === subject._id
                // Selected State
                ? 'bg-cyan-600 text-white dark:bg-[#02b3b0] dark:text-[#0A192F]'
                // Default & Hover States
                : 'bg-gray-100 text-slate-700 hover:bg-cyan-100 hover:text-cyan-600 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => <PyqCardSkeleton key={index} />)}
        </div>
      ) : pyqs?.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 mt-16">No PYQs found for this subject yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pyqs?.map((pyq) => (
            <div
              key={pyq._id}
              // Card Background: Adjusted to match image's dark slate color (#1D2E40)
              className="bg-[#FFFFFF] dark:bg-[#1D2E40] rounded-xl p-6 flex flex-col justify-between 
                           shadow-lg shadow-gray-300/50 dark:shadow-cyan-700/20 
                           hover:shadow-xl hover:scale-[1.02] 
                           border border-transparent 
                           transition-all duration-300 transform"
            >
              <div>
                {/* Year Tag: Background adjusted to match image's dark gray/blue (#3B4E63) */}
                <span className="bg-cyan-100 dark:bg-[#3B4E63] text-cyan-800 dark:text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">{pyq.year}</span>
                <h3 className="text-xl font-semibold text-[#0A192F] dark:text-white mt-4 mb-2">{pyq.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{examData?.exam.shortName}</p>
              </div>
              <div className="flex space-x-4 mt-6">
                {/* View Online Button: Adjusted to match image's light blue/cyan (#30A9BF) */}
                <Link to={`/pyq/view/${pyq._id}`} className="flex-1 text-center bg-cyan-600 dark:bg-[#30A9BF] hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-lg hover:shadow-xl">
                  View Online
                </Link>
                {/* Download Button: Adjusted to match image's dark slate/blue (#283E54) */}
                <a
                  href={pyq.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-gray-200 dark:bg-[#283E54] 
                               hover:bg-gray-300 dark:hover:bg-[#203345] // Darker hover effect
                               text-gray-800 dark:text-white font-bold py-2 px-4 rounded-md 
                               transition-colors shadow-lg hover:shadow-xl"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ExamSpecificPage;