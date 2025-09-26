import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define TypeScript interfaces for our data structures
interface IExam {
  _id: string;
  name: string;
}

interface ISubject {
  _id: string;
  name: string;
  examId: string;
}

const SubjectManager: React.FC = () => {
  // --- EXISTING STATE ---
  const [exams, setExams] = useState<IExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW STATE FOR EDIT MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ISubject | null>(null);
  const [updatedSubjectName, setUpdatedSubjectName] = useState('');


  // --- DATA FETCHING (Unchanged) ---
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await axios.get('/api/exams');
        setExams(response.data);
      } catch (err) {
        setError('Could not fetch exams.');
      } finally {
        setIsLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setSubjects([]);
      return;
    }
    fetchSubjectsForSelectedExam();
  }, [selectedExamId]);

  const fetchSubjectsForSelectedExam = async () => {
    if (!selectedExamId) return;
    try {
      setIsLoadingSubjects(true);
      const response = await axios.get(`/api/subjects/by-exam/${selectedExamId}`);
      setSubjects(response.data);
    } catch (err) {
      setError('Could not fetch subjects for this exam.');
    } finally {
      setIsLoadingSubjects(false);
    }
  };
  
  // --- CRUD HANDLERS ---
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !selectedExamId) return alert('Please select an exam and enter a subject name.');
    try {
      await axios.post('/api/subjects', { name: newSubjectName, examId: selectedExamId });
      setNewSubjectName('');
      fetchSubjectsForSelectedExam(); // Refetch subjects
    } catch (err) {
      alert('Failed to add subject.');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await axios.delete(`/api/subjects/${subjectId}`);
      setSubjects(subjects.filter(s => s._id !== subjectId));
    } catch (err) {
      alert('Failed to delete subject.');
    }
  };

  // --- NEW HANDLERS FOR EDIT FUNCTIONALITY ---
  const handleOpenEditModal = (subject: ISubject) => {
    setEditingSubject(subject);
    setUpdatedSubjectName(subject.name);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !updatedSubjectName.trim()) return;
    try {
      const response = await axios.put(`/api/subjects/${editingSubject._id}`, { name: updatedSubjectName });
      setSubjects(subjects.map(s => (s._id === editingSubject._id ? response.data : s)));
      handleCloseModal();
    } catch (err) {
      alert('Failed to update subject.');
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Manage Subjects</h2>

      {/* Dropdown to select an exam */}
      <div className="mb-6">
        <label htmlFor="exam-select" className="block text-sm font-medium text-slate-300 mb-2">Select an Exam to Manage its Subjects</label>
        <select id="exam-select" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" disabled={isLoadingExams}>
          <option value="">{isLoadingExams ? 'Loading exams...' : '-- Select an Exam --'}</option>
          {exams.map(exam => <option key={exam._id} value={exam._id}>{exam.name}</option>)}
        </select>
      </div>

      {selectedExamId && (
        <div>
          {/* Form to add a new subject */}
          <form onSubmit={handleAddSubject} className="mb-8 p-4 bg-slate-700/50 rounded-md">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Add New Subject</h3>
            <div className="flex items-center gap-4">
              <input type="text" placeholder="Subject Name (e.g., Computer Science)" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" required />
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Add Subject</button>
            </div>
          </form>

          {/* List of existing subjects (Updated with Edit button) */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Existing Subjects</h3>
            {isLoadingSubjects ? <p className="text-slate-400">Loading subjects...</p> : subjects.length > 0 ? (
              <ul className="space-y-3">
                {subjects.map((subject) => (
                  <li key={subject._id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                    <p className="font-bold text-white">{subject.name}</p>
                    <div className="flex space-x-2">
                      <button onClick={() => handleOpenEditModal(subject)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteSubject(subject._id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400">No subjects found for this exam. Add one above.</p>}
          </div>
        </div>
      )}

      {/* --- NEW: EDIT SUBJECT MODAL --- */}
      {isModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Subject</h2>
            <form onSubmit={handleUpdateSubject}>
              <div className="space-y-4">
                <label htmlFor="subjectName" className="block text-sm font-medium text-slate-300">Subject Name</label>
                <input id="subjectName" type="text" value={updatedSubjectName} onChange={(e) => setUpdatedSubjectName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" required />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={handleCloseModal} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManager;