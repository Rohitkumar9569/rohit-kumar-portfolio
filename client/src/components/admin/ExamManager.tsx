import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the structure of an Exam object for TypeScript
interface IExam {
  _id: string;
  name: string;
  shortName: string;
  slug: string;
}

const ExamManager: React.FC = () => {
  // --- EXISTING STATE ---
  const [exams, setExams] = useState<IExam[]>([]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamShortName, setNewExamShortName] = useState('');
  const [newExamSlug, setNewExamSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW STATE FOR EDIT MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<IExam | null>(null);
  const [updatedData, setUpdatedData] = useState({ name: '', shortName: '', slug: '' });

  // --- DATA FETCHING (Unchanged) ---
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/exams');
      setExams(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch exams.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRUD HANDLERS ---
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName || !newExamShortName || !newExamSlug) return alert('Please fill all fields.');
    try {
      const newExam = { name: newExamName, shortName: newExamShortName, slug: newExamSlug };
      await axios.post('/api/exams', newExam);
      setNewExamName('');
      setNewExamShortName('');
      setNewExamSlug('');
      fetchExams();
    } catch (err) {
      alert('Failed to add exam. Check for duplicates.');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await axios.delete(`/api/exams/${id}`);
      setExams(exams.filter((exam) => exam._id !== id));
    } catch (err) {
      alert('Failed to delete exam.');
    }
  };

  // --- NEW HANDLERS FOR EDIT FUNCTIONALITY ---

  // Open the modal and populate it with the selected exam's data
  const handleOpenEditModal = (exam: IExam) => {
    setEditingExam(exam);
    setUpdatedData({ name: exam.name, shortName: exam.shortName, slug: exam.slug });
    setIsModalOpen(true);
  };

  // Close the modal and reset state
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExam(null);
  };
  
  // Update the state as user types in the modal's form
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedData(prev => ({ ...prev, [name]: value }));
  };

  // Handle the submission of the edit form
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    try {
      const response = await axios.put(`/api/exams/${editingExam._id}`, updatedData);
      // Update the exam in the main list with the new data from the API
      setExams(exams.map(exam => (exam._id === editingExam._id ? response.data : exam)));
      handleCloseModal(); // Close modal on success
    } catch (err) {
      alert('Failed to update exam.');
    }
  };


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Manage Exams</h2>
      
      {/* --- ADD EXAM FORM (Unchanged) --- */}
      <form onSubmit={handleAddExam} className="mb-8 p-4 bg-slate-700/50 rounded-md">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Add New Exam</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Full Name" value={newExamName} onChange={(e) => setNewExamName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" required />
          <input type="text" placeholder="Short Name" value={newExamShortName} onChange={(e) => setNewExamShortName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" required />
          <input type="text" placeholder="Slug" value={newExamSlug} onChange={(e) => setNewExamSlug(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" required />
        </div>
        <div className="text-right mt-4">
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">Add Exam</button>
        </div>
      </form>

      {/* --- LIST OF EXISTING EXAMS (Updated with Edit button) --- */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Existing Exams</h3>
        {isLoading ? <p className="text-slate-400">Loading exams...</p> : error ? <p className="text-red-400">{error}</p> : (
          <ul className="space-y-3">
            {exams.map((exam) => (
              <li key={exam._id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                <div>
                  <p className="font-bold text-white">{exam.name}</p>
                  <p className="text-sm text-slate-400">{exam.shortName}</p>
                </div>
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenEditModal(exam)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteExam(exam._id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- NEW: EDIT EXAM MODAL --- */}
      {isModalOpen && editingExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Exam</h2>
            <form onSubmit={handleUpdateExam}>
              <div className="space-y-4">
                <input type="text" name="name" value={updatedData.name} onChange={handleModalInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" />
                <input type="text" name="shortName" value={updatedData.shortName} onChange={handleModalInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" />
                <input type="text" name="slug" value={updatedData.slug} onChange={handleModalInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" />
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

export default ExamManager;