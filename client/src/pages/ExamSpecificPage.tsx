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
    // Background consistent with portfolio theme
    <section className="bg-slate-50 dark:bg-background container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        Previous Year Questions for <span className="text-cyan-600 dark:text-cyan-400 uppercase">{examData?.exam.shortName || examName}</span>
      </h1>

      {/* Subject Buttons Container: Adjusted to match Skills button container */}
      <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12 bg-gray-300/70 dark:bg-slate-700/80 p-3 rounded-xl shadow-md">
        {examData?.subjects.map(subject => (
          <button
            key={subject._id}
            onClick={() => setSearchParams({ subject: subject._id })}
            className={`px-3 py-2 text-sm md:px-6 md:py-2 font-semibold rounded-lg transition-colors duration-300 
             ${selectedSubjectId === subject._id
                // Selected State: Cyan Accent
                ? 'bg-cyan-500 text-white dark:bg-cyan-500 shadow-md shadow-gray-900/80 dark:shadow-slate-900/80'
                // Default & Hover States: Consistent with Skills buttons
                : 'bg-gray-100 text-slate-700 hover:bg-gray-300 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm'
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
              // --- FIX: Card Background and Shadow to match Skills/Projects Cards ---
              className="bg-gray-300/90 dark:bg-slate-700/80 rounded-xl p-6 flex flex-col justify-between 
                           shadow-xl shadow-cyan-500/30 dark:shadow-cyan-800/50 
                           hover:shadow-2xl hover:shadow-cyan-500/40 dark:hover:shadow-cyan-800/70
                           hover:-translate-y-1 transition-all duration-300 transform "
            >
              <div>
                {/* --- FIX: Year Tag with unique color --- */}
                <span className="bg-blue-600/80 dark:bg-blue-400/90 text-white dark:text-gray-900 text-xs font-semibold px-3 py-1 rounded-full shadow-md shadow-blue-500/40">
                  {pyq.year}
                </span>
                {/* --- FIX: Title Color (Skill Accent) --- */}
                <h3 className="text-xl font-semibold text-green-600/80 dark:text-green-500/80 mt-4 mb-2">{pyq.title}</h3>
                <p className="text-gray-700 dark:text-slate-300 text-sm">{examData?.exam.shortName}</p>
              </div>
              <div className="flex space-x-4 mt-6">
                {/* View Online Button: Primary Accent Button */}
                <Link
                  to={`/pyq/view/${pyq._id}`}
                  className="flex-1 text-center bg-cyan-600 dark:bg-cyan-400/60 hover:bg-cyan-700 dark:hover:bg-cyan-700/80 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-slate-900/80  "
                >
                  View Online
                </Link>
                {/* Download Button: Secondary/Outline Button Style */}
                <a
                  href={pyq.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-gray-700 dark:bg-slate-800 
                      hover:bg-gray-600 dark:hover:bg-slate-700 
                      text-cyan-400 dark:text-cyan-500 font-bold py-2 px-4 rounded-lg 
                       transition-colors shadow-md shadow-gray-900/80 dark:shadow-slate-900/80"
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