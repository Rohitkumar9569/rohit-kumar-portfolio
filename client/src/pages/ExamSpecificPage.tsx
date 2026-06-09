import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowDownTrayIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';
import API from '../api';
import PyqCardSkeleton from '../components/PyqCardSkeleton';
import { getCloudinaryPdfThumbnailUrl } from '../utils/cloudinaryPdfThumbnail';

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

const PyqThumbnail = ({ fileUrl }: { fileUrl: string }) => {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = getCloudinaryPdfThumbnailUrl(fileUrl);

  if (!thumbnailUrl || failed) {
    return (
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_36%),linear-gradient(135deg,#ffffff,#eef6ff_52%,#f8fafc)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_36%),linear-gradient(135deg,#020617,#0f172a_58%,#111827)]">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/35 blur-2xl dark:bg-cyan-400/10" />
        <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-slate-300/35 blur-2xl dark:bg-slate-400/10" />
        <div className="relative h-24 w-32">
          <div className="absolute left-4 top-1 h-8 w-16 rounded-t-2xl border border-white/45 bg-white/55 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10" />
          <div className="absolute inset-x-0 bottom-0 flex h-20 items-center justify-center rounded-[1.35rem] border border-white/55 bg-white/70 shadow-[0_24px_52px_rgba(15,23,42,0.16)] backdrop-blur dark:border-white/10 dark:bg-white/10 dark:shadow-[0_24px_52px_rgba(0,0,0,0.38)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-400/10 dark:text-slate-300">
              <DocumentTextIcon className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-40 w-full overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        className="h-full w-full bg-white object-cover object-top transition duration-300 group-hover:scale-[1.025] dark:bg-slate-900"
        onError={() => setFailed(true)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/45 via-slate-950/12 to-transparent" />
      <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur dark:bg-emerald-400/10 dark:text-emerald-300">
        <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/80 dark:text-slate-200">
        PDF
      </span>
    </div>
  );
};

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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-5">
            {pyqs?.map((pyq) => (
              <div key={pyq._id} className="group flex min-h-[292px] w-full max-w-[320px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_22px_58px_rgba(15,23,42,0.13)] ring-1 ring-slate-950/5 transition duration-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_30px_78px_rgba(15,23,42,0.20)] dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-[0_26px_74px_rgba(0,0,0,0.56)] dark:ring-white/5 dark:hover:border-cyan-400/50 dark:hover:shadow-[0_30px_86px_rgba(8,145,178,0.22)]">
                <div>
                  <PyqThumbnail fileUrl={pyq.fileUrl} />
                  <div className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">{pyq.year}</span>
                    <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug text-slate-950 dark:text-white">{pyq.title}</h3>
                    <p className="mt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{examShortName} / Previous Year Paper</p>
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 px-3 pb-3 pt-0">
                  <Link to={`/pyq/view/${pyq._id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-50 px-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/20">
                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                    View
                  </Link>
                  <a href={pyq.fileUrl} target="_blank" rel="noopener noreferrer" download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                    <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                    Download
                  </a>
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
