import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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

const ExamSpecificPage = () => {
  const { examName } = useParams<{ examName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubjectId = searchParams.get('subject');

  const [currentExam, setCurrentExam] = useState<IExam | null>(null);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [pyqs, setPyqs] = useState<IPyq[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [areSubjectsLoaded, setAreSubjectsLoaded] = useState<boolean>(false);

  // --- DATA FETCHING EFFECTS ---

  // Effect 1: Fetches the main exam data and its subjects.
  useEffect(() => {
    const initializeExamAndSubjects = async () => {
      if (!examName) return;

      setLoading(true);
      setAreSubjectsLoaded(false);
      setSubjects([]);
      setPyqs([]);
      
      try {
        const examsResponse = await API.get<IExam[]>('/api/exams');
        const exam = examsResponse.data.find(e => e.slug === examName);

        if (exam) {
          setCurrentExam(exam);
          const subjectsResponse = await API.get<ISubject[]>(`/api/subjects/by-exam/${exam._id}`);
          setSubjects(subjectsResponse.data);
          
          // If no subject is in the URL, set the first subject as the default.
          if (!searchParams.get('subject') && subjectsResponse.data.length > 0) {
            setSearchParams({ subject: subjectsResponse.data[0]._id }, { replace: true });
          }
          
          // ✅ FIX: If the exam has NO subjects, we can stop loading now.
          if (subjectsResponse.data.length === 0) {
            setLoading(false);
          }

        } else {
          setError(`Exam "${examName}" not found.`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to load exam data.');
        setLoading(false);
      } finally {
        setAreSubjectsLoaded(true);
      }
    };

    initializeExamAndSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examName]);

  // Effect 2: Fetches PYQs for the selected subject.
  useEffect(() => {
    if (!areSubjectsLoaded) {
      return;
    }

    const fetchPyqsForSubject = async () => {
      // If there's no subject to load, we don't need to do anything.
      // The loading state is already handled by the first effect.
      if (!selectedSubjectId) {
        return;
      }

      setLoading(true); // Show loader when switching subjects
      try {
        const response = await API.get<IPyq[]>(`/api/pyqs?subjectId=${selectedSubjectId}`);
        setPyqs(response.data);
      } catch (err) {
        console.error('Failed to fetch PYQs:', err);
        setError('Failed to load question papers.');
        setPyqs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPyqsForSubject();
  }, [selectedSubjectId, areSubjectsLoaded]);


  // --- RENDER LOGIC (No changes) ---

  if (error) {
    return <div className="text-center text-red-400 py-24">{error}</div>;
  }

  return (
    <section className="container mx-auto px-6 py-24 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">
        Previous Year Questions for <span className="text-cyan-400 uppercase">{currentExam?.shortName || examName}</span>
      </h1>

      <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12 bg-slate-800 p-2 rounded-lg">
        {subjects.map(subject => (
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <PyqCardSkeleton key={index} />
          ))}
        </div>
      ) : pyqs.length === 0 ? (
        <p className="text-center text-slate-400 mt-16">No PYQs found for this subject yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pyqs.map((pyq) => (
            <div key={pyq._id} className="bg-slate-800 rounded-lg p-6 flex flex-col justify-between hover:scale-105 hover:border-cyan-600 border border-transparent transition-all duration-300">
              <div>
                <span className="bg-cyan-900 text-cyan-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{pyq.year}</span>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">{pyq.title}</h3>
                <p className="text-slate-400 text-sm">{currentExam?.shortName}</p>
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