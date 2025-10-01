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
    <section className="container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">
        Previous Year Questions for <span className="text-cyan-400 uppercase">{examData?.exam.shortName || examName}</span>
      </h1>

      <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12 bg-slate-800 p-2 rounded-lg">
        {examData?.subjects.map(subject => (
          <button
            key={subject._id}
            onClick={() => setSearchParams({ subject: subject._id })}
            className={`px-3 py-2 text-sm md:px-6 md:py-2 font-semibold rounded-md transition-colors ${selectedSubjectId === subject._id
              ? 'bg-cyan-600 text-white'
              : 'bg-transparent text-slate-300 hover:bg-slate-700'
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
        <p className="text-center text-slate-400 mt-16">No PYQs found for this subject yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pyqs?.map((pyq) => (
            <div key={pyq._id} className="bg-slate-800 rounded-lg p-6 flex flex-col justify-between hover:scale-105 hover:border-cyan-600 border border-transparent transition-all duration-300">
              <div>
                <span className="bg-cyan-900 text-cyan-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{pyq.year}</span>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">{pyq.title}</h3>
                <p className="text-slate-400 text-sm">{examData?.exam.shortName}</p>
              </div>
              <div className="flex space-x-4 mt-6">
                <Link to={`/pyq/view/${pyq._id}`} className="flex-1 text-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                  View Online
                </Link>
                <a href={pyq.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
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