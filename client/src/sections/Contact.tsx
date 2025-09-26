// src/sections/Contact.tsx

import React, { useState } from 'react';
import API from '../api';
import SectionAnimator from '../components/SectionAnimator';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Sending...');

    try {
      const url = 'http://localhost:5000/api/contact';
      const response = await API.post('/api/contact', formData);

      if (response.data.success) {
        setStatus('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionAnimator id="contact" className="py-20 px-6">
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold mb-8">Get In Touch</h2>
        <p className="text-slate-300 mb-8">
          Have a project in mind or just want to say hello? Feel free to reach out.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-4 bg-slate-800 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-4 bg-slate-800 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <textarea
            name="message"
            placeholder="Your Message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            required
            className="w-full p-4 bg-slate-800 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          ></textarea>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-bold transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
        {status && <p className="mt-4 text-center">{status}</p>}
      </div>
    </SectionAnimator>
  );
};

export default Contact;