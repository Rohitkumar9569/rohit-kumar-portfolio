import icCompetitive from './categories/ic_competitive.svg';
import icEntrance from './categories/ic_entrance.svg';
import icSchool from './categories/ic_school.svg';
import icUniversity from './categories/ic_university.svg';
import icPlacement from './categories/ic_placement.svg';
import icLanguage from './categories/ic_language.svg';
import icOlympiad from './categories/ic_olympiad.svg';
import icAbroad from './categories/ic_abroad.svg';
import icStateExam from './categories/ic_state_exam.svg';

import icUpscCse from './exams/ic_upsc_cse.svg';
import icNda from './exams/ic_nda.svg';
import icCds from './exams/ic_cds.svg';
import icSscCgl from './exams/ic_ssc_cgl.svg';
import icSscChsl from './exams/ic_ssc_chsl.svg';
import icSscGd from './exams/ic_ssc_gd.svg';
import icPolice from './exams/ic_police.svg';
import icSbi from './exams/ic_sbi.svg';
import icRbi from './exams/ic_rbi.svg';
import icRrbNtpc from './exams/ic_rrb_ntpc.svg';
import icRailway from './exams/ic_railway.svg';
import icMetro from './exams/ic_metro.svg';
import icShield from './exams/ic_shield.svg';
import icGear from './exams/ic_gear.svg';
import icForest from './exams/ic_forest.svg';
import icWrench from './exams/ic_wrench.svg';
import icBank from './exams/ic_bank.svg';
import icNabard from './exams/ic_nabard.svg';
import icSebi from './exams/ic_sebi.svg';
import icOil from './exams/ic_oil.svg';
import icPower from './exams/ic_power.svg';
import icBhel from './exams/ic_bhel.svg';
import icBel from './exams/ic_bel.svg';
import icIsro from './exams/ic_isro.svg';
import icNuclear from './exams/ic_nuclear.svg';
import icResearch from './exams/ic_research.svg';
import icBioResearch from './exams/ic_bio_research.svg';
import icCoastGuard from './exams/ic_coast_guard.svg';
import icItbp from './exams/ic_itbp.svg';
import icIbAcio from './exams/ic_ib_acio.svg';
import icSsb from './exams/ic_ssb.svg';
import icJudiciary from './exams/ic_judiciary.svg';
import icImd from './exams/ic_imd.svg';
import icPostal from './exams/ic_postal.svg';
import icFci from './exams/ic_fci.svg';
import icEpfo from './exams/ic_epfo.svg';
import icMedical from './exams/ic_medical.svg';

import icNeet from './entrance/ic_neet.svg';
import icGpat from './entrance/ic_gpat.svg';
import icDental from './entrance/ic_dental.svg';
import icAyush from './entrance/ic_ayush.svg';
import icDesign from './entrance/ic_design.svg';
import icNift from './entrance/ic_nift.svg';
import icArchitecture from './entrance/ic_architecture.svg';
import icTeacher from './entrance/ic_teacher.svg';
import icHotel from './entrance/ic_hotel.svg';
import icFtii from './entrance/ic_ftii.svg';
import icJournalism from './entrance/ic_journalism.svg';
import icMerchantNavy from './entrance/ic_merchant_navy.svg';
import icCaFinal from './entrance/ic_ca_final.svg';
import icIitJam from './entrance/ic_iit_jam.svg';
import icGate from './entrance/ic_gate.svg';

import icCbse from './education/ic_cbse.svg';
import icIcse from './education/ic_icse.svg';
import icStateBoard from './education/ic_state_board.svg';
import icPrimary from './education/ic_primary.svg';
import icMiddle from './education/ic_middle.svg';
import icSeniorSec from './education/ic_senior_sec.svg';
import icIit from './education/ic_iit.svg';
import icIim from './education/ic_iim.svg';
import icNlu from './education/ic_nlu.svg';
import icIgnou from './education/ic_ignou.svg';

import icIelts from './language/ic_ielts.svg';
import icToeflGre from './language/ic_toefl_gre.svg';
import icPte from './language/ic_pte.svg';
import icGerman from './language/ic_german.svg';
import icFrench from './language/ic_french.svg';
import icJlpt from './language/ic_jlpt.svg';
import icTopik from './language/ic_topik.svg';
import icHsk from './language/ic_hsk.svg';

import icOverview from './tabs/ic_overview.svg';
import icSyllabus from './tabs/ic_syllabus.svg';
import icMockTest from './tabs/ic_mock_test.svg';
import icAnswerKey from './tabs/ic_answer_key.svg';
import icUpdates from './tabs/ic_updates.svg';
import icStrategy from './tabs/ic_strategy.svg';
import icInterview from './tabs/ic_interview.svg';

import icHot from './badges/ic_hot.svg';
import icNew from './badges/ic_new.svg';
import icPremium from './badges/ic_premium.svg';
import icVerified from './badges/ic_verified.svg';

import studyAptitude from './study/aptitude.svg';
import studyBookSolution from './study/book-solution.svg';
import studyBook from './study/book.svg';
import studyBookmark from './study/bookmark.svg';
import studyBrain from './study/brain.svg';
import studyCertificate from './study/certificate.svg';
import studyChart from './study/chart.svg';
import studyClipboardCheck from './study/clipboard-check.svg';
import studyClipboard from './study/clipboard.svg';
import studyClock from './study/clock.svg';
import studyCoding from './study/coding.svg';
import studyEnglish from './study/english.svg';
import studyExam from './study/exam.svg';
import studyFolder from './study/folder.svg';
import studyFormula from './study/formula.svg';
import studyLiveClass from './study/live-class.svg';
import studyMockTest from './study/mock-test.svg';
import studyNotebook from './study/notebook.svg';
import studyPyq from './study/pyq.svg';
import studyQa from './study/qa.svg';
import studyQuiz from './study/quiz.svg';
import studyScience from './study/science.svg';
import studySparkles from './study/sparkles.svg';
import studyStudentProfile from './study/student-profile.svg';
import studyMaterial from './study/study-material.svg';
import studySyllabus from './study/syllabus.svg';
import studyTarget from './study/target.svg';
import studyVideoLecture from './study/video-lecture.svg';

const subjectIconModules = import.meta.glob('./subjects/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const subjectIcons = Object.fromEntries(
  Object.entries(subjectIconModules).map(([iconPath, url]) => {
    const fileName = iconPath.split('/').pop() || iconPath;
    return [fileName.replace(/\.svg$/, ''), url];
  })
);

export const ICON_ASSETS = {
  categories: {
    ic_competitive: icCompetitive,
    ic_entrance: icEntrance,
    ic_school: icSchool,
    ic_university: icUniversity,
    ic_placement: icPlacement,
    ic_language: icLanguage,
    ic_olympiad: icOlympiad,
    ic_abroad: icAbroad,
    ic_state_exam: icStateExam,
  },
  exams: {
    ic_upsc_cse: icUpscCse,
    ic_nda: icNda,
    ic_cds: icCds,
    ic_ssc_cgl: icSscCgl,
    ic_ssc_chsl: icSscChsl,
    ic_ssc_gd: icSscGd,
    ic_police: icPolice,
    ic_sbi: icSbi,
    ic_rbi: icRbi,
    ic_rrb_ntpc: icRrbNtpc,
    ic_railway: icRailway,
    ic_metro: icMetro,
    ic_shield: icShield,
    ic_gear: icGear,
    ic_forest: icForest,
    ic_wrench: icWrench,
    ic_bank: icBank,
    ic_nabard: icNabard,
    ic_sebi: icSebi,
    ic_oil: icOil,
    ic_power: icPower,
    ic_bhel: icBhel,
    ic_bel: icBel,
    ic_isro: icIsro,
    ic_nuclear: icNuclear,
    ic_research: icResearch,
    ic_bio_research: icBioResearch,
    ic_coast_guard: icCoastGuard,
    ic_itbp: icItbp,
    ic_ib_acio: icIbAcio,
    ic_ssb: icSsb,
    ic_judiciary: icJudiciary,
    ic_imd: icImd,
    ic_postal: icPostal,
    ic_fci: icFci,
    ic_epfo: icEpfo,
    ic_medical: icMedical,
  },
  entrance: {
    ic_neet: icNeet,
    ic_gpat: icGpat,
    ic_dental: icDental,
    ic_ayush: icAyush,
    ic_design: icDesign,
    ic_nift: icNift,
    ic_architecture: icArchitecture,
    ic_teacher: icTeacher,
    ic_hotel: icHotel,
    ic_ftii: icFtii,
    ic_journalism: icJournalism,
    ic_merchant_navy: icMerchantNavy,
    ic_ca_final: icCaFinal,
    ic_iit_jam: icIitJam,
    ic_gate: icGate,
  },
  education: {
    ic_cbse: icCbse,
    ic_icse: icIcse,
    ic_state_board: icStateBoard,
    ic_primary: icPrimary,
    ic_middle: icMiddle,
    ic_senior_sec: icSeniorSec,
    ic_iit: icIit,
    ic_iim: icIim,
    ic_nlu: icNlu,
    ic_ignou: icIgnou,
  },
  language: {
    ic_ielts: icIelts,
    ic_toefl_gre: icToeflGre,
    ic_pte: icPte,
    ic_german: icGerman,
    ic_french: icFrench,
    ic_jlpt: icJlpt,
    ic_topik: icTopik,
    ic_hsk: icHsk,
  },
  tabs: {
    ic_overview: icOverview,
    ic_syllabus: icSyllabus,
    ic_mock_test: icMockTest,
    ic_answer_key: icAnswerKey,
    ic_updates: icUpdates,
    ic_strategy: icStrategy,
    ic_interview: icInterview,
  },
  badges: {
    ic_hot: icHot,
    ic_new: icNew,
    ic_premium: icPremium,
    ic_verified: icVerified,
  },
  study: {
    aptitude: studyAptitude,
    'book-solution': studyBookSolution,
    book: studyBook,
    bookmark: studyBookmark,
    brain: studyBrain,
    certificate: studyCertificate,
    chart: studyChart,
    'clipboard-check': studyClipboardCheck,
    clipboard: studyClipboard,
    clock: studyClock,
    coding: studyCoding,
    english: studyEnglish,
    exam: studyExam,
    folder: studyFolder,
    formula: studyFormula,
    'live-class': studyLiveClass,
    'mock-test': studyMockTest,
    notebook: studyNotebook,
    pyq: studyPyq,
    qa: studyQa,
    quiz: studyQuiz,
    science: studyScience,
    sparkles: studySparkles,
    'student-profile': studyStudentProfile,
    'study-material': studyMaterial,
    syllabus: studySyllabus,
    target: studyTarget,
    'video-lecture': studyVideoLecture,
  },
  subjects: subjectIcons,
};

export const ALL_ICON_ASSETS = Object.values(ICON_ASSETS).flatMap((group) => Object.values(group));

const normalizeIconAssetKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const ICON_ASSET_BY_KEY = Object.entries(ICON_ASSETS).reduce<Record<string, string>>((registry, [, group]) => {
  Object.entries(group).forEach(([key, url]) => {
    const normalizedKey = normalizeIconAssetKey(key);
    const shortKey = normalizedKey.replace(/^ic_/, '');
    registry[normalizedKey] = url;
    registry[shortKey] = url;
    registry[shortKey.replace(/_/g, '-')] = url;
  });
  return registry;
}, {});

export const getIconAsset = (key = '', fallback = ICON_ASSETS.study.folder) =>
  ICON_ASSET_BY_KEY[normalizeIconAssetKey(key)] || ICON_ASSET_BY_KEY[normalizeIconAssetKey(key).replace(/^ic_/, '')] || fallback;

export default ICON_ASSETS;
