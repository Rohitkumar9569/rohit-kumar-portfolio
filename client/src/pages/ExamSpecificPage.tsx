import React, { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import API from '../api';
import PyqCardSkeleton from '../components/PyqCardSkeleton';

// --- Interfaces (No changes) ---
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

// --- API functions (No changes) ---
const fetchExamAndSubjects = async (examName: string) => {
  const examsResponse = await API.get<IExam[]>('/api/exams');
  const exam = examsResponse.data.find(e => e.slug === examName);
  if (!exam) { throw new Error(`Exam "${examName}" not found.`); }
  const subjectsResponse = await API.get<ISubject[]>(`/api/subjects/by-exam/${exam._id}`);
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

  const { data: examData, isLoading: isLoadingExam, isError: isErrorExam } = useQuery({
    queryKey: ['exam', examName],
    queryFn: () => fetchExamAndSubjects(examName!),
    enabled: !!examName,
  });

  const { data: pyqs, isLoading: isLoadingPyqs, isError: isErrorPyqs } = useQuery({
    queryKey: ['pyqs', selectedSubjectId],
    queryFn: () => fetchPyqsForSubject(selectedSubjectId!),
    enabled: !!selectedSubjectId,
  });

  useEffect(() => {
    if (examData && !selectedSubjectId && examData.subjects.length > 0) {
      setSearchParams({ subject: examData.subjects[0]._id }, { replace: true });
    }
  }, [examData, selectedSubjectId, setSearchParams]);

  // --- Dynamic SEO & Content Generation ---
  const currentYear = new Date().getFullYear();
  const examShortName = examData?.exam.shortName || 'Exam';
  const examFullName = examData?.exam.name || 'Competitive Exam';

  const pageTitle = `${examShortName} PYQ Papers (${currentYear} Updated) - Free PDF Download | Study Hub`;
  const pageDescription = `Access all previous year question papers for ${examFullName} (${examShortName}). Download free, up-to-date PYQ PDFs to master the exam pattern and boost your score.`;
  const canonicalUrl = `https://rohitkumar-portfolio.vercel.app/study/${examName}`;

  // --- Enhanced FAQ Data for On-Page Content ---
  const faqs = examData ? [
    {
      question: `Where can I get free ${examShortName} PYQ PDFs?`,
      answer: `You can download 100% free ${examShortName} PYQ PDFs directly from this page. Just choose your subject, find the year you need, and click the "Download" button. No sign-up required.`
    },
    {
      question: `Why is solving ${examShortName} previous year papers important?`,
      answer: `Solving ${examShortName} PYQs is crucial for understanding the exam pattern, identifying high-weightage topics, improving time management, and building confidence by practicing with actual past exam questions.`
    },
    {
      question: `Are these the latest ${examFullName} question papers?`,
      answer: `Yes, this collection is regularly updated to include the latest available previous year papers for the ${examFullName}, ensuring you prepare with the most relevant resources.`
    }
  ] : [];

  // --- ADVANCED Structured Data for Elite SEO (JSON-LD) ---
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        'name': pageTitle,
        'description': pageDescription,
        'url': canonicalUrl,
        'breadcrumb': {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://rohitkumar-portfolio.vercel.app/' },
            { '@type': 'ListItem', 'position': 2, 'name': 'Study Hub', 'item': canonicalUrl },
            { '@type': 'ListItem', 'position': 3, 'name': examFullName, 'item': canonicalUrl }
          ]
        },
      },
      {
        '@type': 'FAQPage',
        'mainEntity': faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': { '@type': 'Answer', 'text': faq.answer }
        }))
      },
      {
        // This tells Google this page is a collection of downloadable files (PYQs)
        '@type': 'Dataset',
        'name': `${examShortName} Previous Year Question Papers`,
        'description': `A dataset containing PYQ files for the ${examFullName} exam, available for free download in PDF format.`,
        'creator': { '@type': 'Person', 'name': 'Rohit Kumar' },
        'license': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'distribution': pyqs?.map(pyq => ({
          '@type': 'DataDownload',
          'encodingFormat': 'application/pdf',
          'contentUrl': pyq.fileUrl,
          'name': pyq.title
        }))
      }
    ]
  };

  if (isErrorExam || isErrorPyqs) {
    return <div className="text-center text-red-400 py-24">Failed to load data.</div>;
  }

  const isLoading = isLoadingExam || (selectedSubjectId && isLoadingPyqs);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* --- Main Content Section --- */}
      <section className="bg-slate-50 dark:bg-background container mx-auto px-6 pt-24 pb-12 min-h-screen">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-800 dark:text-white">
          {examFullName} <span className="text-cyan-600 dark:text-cyan-400">Previous Year Questions</span>
        </h1>

        <p className="text-center text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-12">
          {`Master the ${examShortName} exam by practicing with our complete collection of authentic PYQs. Download free PDFs, understand the paper pattern, and score higher.`}
        </p>

        <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12 bg-gray-300/70 dark:bg-slate-700/80 p-3 rounded-xl shadow-md">
          {examData?.subjects.map(subject => (
            <button
              key={subject._id}
              onClick={() => setSearchParams({ subject: subject._id })}
              className={`px-3 py-2 text-sm md:px-6 md:py-2 font-semibold rounded-lg transition-colors duration-300 
                 ${selectedSubjectId === subject._id
                  ? 'bg-cyan-500 text-white dark:bg-cyan-500 shadow-md shadow-gray-900/80 dark:shadow-slate-900/80'
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
          <p className="text-center text-slate-500 dark:text-slate-400 mt-16">No PYQs found for this subject yet. Select a subject to see papers.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pyqs?.map((pyq) => (
              <div key={pyq._id} className="bg-gray-300/90 dark:bg-slate-700/80 rounded-xl p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/30 dark:shadow-cyan-800/50 hover:shadow-2xl hover:shadow-cyan-500/40 dark:hover:shadow-cyan-800/70 hover:-translate-y-1 transition-all duration-300 transform">
                <div>
                  <span className="bg-blue-600/80 dark:bg-blue-400/90 text-white dark:text-gray-900 text-xs font-semibold px-3 py-1 rounded-full shadow-md shadow-blue-500/40">{pyq.year}</span>
                  <h3 className="text-xl font-semibold text-green-600/80 dark:text-green-500/80 mt-4 mb-2">{pyq.title}</h3>
                  <p className="text-gray-700 dark:text-slate-300 text-sm">{examShortName}</p>
                </div>
                <div className="flex space-x-4 mt-6">
                  <Link to={`/pyq/view/${pyq._id}`} className="flex-1 text-center bg-cyan-600 dark:bg-cyan-400/60 hover:bg-cyan-700 dark:hover:bg-cyan-700/80 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-slate-900/80">View Online</Link>
                  <a href={pyq.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gray-700 dark:bg-slate-800 hover:bg-gray-600 dark:hover:bg-slate-700 text-cyan-400 dark:text-cyan-500 font-bold py-2 px-4 rounded-lg transition-colors shadow-md shadow-gray-900/80 dark:shadow-slate-900/80">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- FAQ Section for On-Page SEO --- */}
      {faqs.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">Frequently Asked Questions ({examShortName})</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <details key={index} className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-md cursor-pointer group">
                  <summary className="font-semibold text-lg text-slate-800 dark:text-slate-100 flex justify-between items-center">
                    {faq.question}
                    <span className="text-cyan-500 transform transition-transform duration-300 group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default ExamSpecificPage;