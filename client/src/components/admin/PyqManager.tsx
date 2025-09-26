import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define TypeScript interfaces
interface IExam { _id: string; name: string; }
interface ISubject { _id: string; name: string; }
interface IPyq { _id: string; title: string; year: number; }

const PyqManager: React.FC = () => {
  // --- EXISTING STATE ---
  const [exams, setExams] = useState<IExam[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [pyqs, setPyqs] = useState<IPyq[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW STATE FOR EDIT MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPyq, setEditingPyq] = useState<IPyq | null>(null);
  const [updatedPyqData, setUpdatedPyqData] = useState({ title: '', year: '' });

  // --- DATA FETCHING (Unchanged logic) ---
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await axios.get('/api/exams');
        setExams(response.data);
      } catch (err) { setError('Failed to load exams.'); }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`/api/subjects/by-exam/${selectedExamId}`);
        setSubjects(response.data);
      } catch (err) { setError('Failed to load subjects.'); }
    };
    fetchSubjects();
  }, [selectedExamId]);

  const fetchPyqsForSelectedSubject = async () => {
    if (!selectedSubjectId) return;
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/pyqs?subjectId=${selectedSubjectId}`);
      setPyqs(response.data);
    } catch (err) {
      setError('Failed to load PYQs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSubjectId) {
      setPyqs([]);
      return;
    }
    fetchPyqsForSelectedSubject();
  }, [selectedSubjectId]);

  // --- CRUD HANDLERS ---
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !year || !selectedSubjectId) return alert('Please fill all fields and select a file.');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('year', year);
    formData.append('subjectId', selectedSubjectId);
    formData.append('file', file);

    try {
      await axios.post('/api/pyqs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle('');
      setYear('');
      setFile(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      fetchPyqsForSelectedSubject(); // Refetch
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (pyqId: string) => {
    if (!window.confirm('Are you sure you want to delete this PYQ?')) return;
    try {
      await axios.delete(`/api/pyqs/${pyqId}`);
      setPyqs(pyqs.filter(p => p._id !== pyqId));
    } catch (err) {
      alert('Deletion failed.');
    }
  };

  // --- NEW HANDLERS FOR EDIT FUNCTIONALITY ---
  const handleOpenEditModal = (pyq: IPyq) => {
    setEditingPyq(pyq);
    setUpdatedPyqData({ title: pyq.title, year: String(pyq.year) });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPyq(null);
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedPyqData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePyq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPyq) return;
    try {
      const response = await axios.put(`/api/pyqs/${editingPyq._id}`, updatedPyqData);
      setPyqs(pyqs.map(p => (p._id === editingPyq._id ? response.data : p)));
      handleCloseModal();
    } catch (err) {
      alert('Failed to update PYQ.');
    }
  };


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Manage PYQs</h2>

      {/* Selection Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white">
          <option value="">-- Select Exam --</option>
          {exams.map(exam => <option key={exam._id} value={exam._id}>{exam.name}</option>)}
        </select>
        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white" disabled={!selectedExamId}>
          <option value="">-- Select Subject --</option>
          {subjects.map(subject => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
        </select>
      </div>

      {selectedSubjectId && (
        <div>
          {/* Upload Form */}
          <form onSubmit={handleUpload} className="mb-8 p-4 bg-slate-700/50 rounded-md">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Upload New PYQ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Title (e.g., GATE CSE 2024)" value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-700 border-slate-600 rounded p-2 text-white" required />
              <input type="number" placeholder="Year (e.g., 2024)" value={year} onChange={e => setYear(e.target.value)} className="bg-slate-700 border-slate-600 rounded p-2 text-white" required />
              <input id="file-input" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700" accept=".pdf" required />
            </div>
            <div className="text-right mt-4">
              <button type="submit" disabled={isUploading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-500">
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>

          {/* List of existing PYQs */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Uploaded PYQs</h3>
            {isLoading ? <p className="text-slate-400">Loading...</p> : pyqs.length > 0 ? (
              <ul className="space-y-3">
                {pyqs.map(pyq => (
                  <li key={pyq._id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                    <p className="font-bold text-white">{pyq.title} - {pyq.year}</p>
                    <div className="flex space-x-2">
                       <button onClick={() => handleOpenEditModal(pyq)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(pyq._id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400">No PYQs found for this subject.</p>}
          </div>
        </div>
      )}

      {/* --- NEW: EDIT PYQ MODAL --- */}
      {isModalOpen && editingPyq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Edit PYQ</h2>
            <form onSubmit={handleUpdatePyq}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                  <input id="edit-title" name="title" type="text" value={updatedPyqData.title} onChange={handleModalInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white" required />
                </div>
                <div>
                  <label htmlFor="edit-year" className="block text-sm font-medium text-slate-300 mb-1">Year</label>
                  <input id="edit-year" name="year" type="number" value={updatedPyqData.year} onChange={handleModalInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white" required />
                </div>
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

export default PyqManager;