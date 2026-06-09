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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus('Sending...');

    try {
      await API.post('/api/contact', formData);
      setStatus('Message sent successfully!');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = 'w-full p-4 rounded-xl transition-all duration-300 ' +
    'bg-white/85 dark:bg-slate-950/45 backdrop-blur-xl ' +
    'border border-slate-200/80 dark:border-cyan-400/10 ' +
    'shadow-md shadow-slate-300/30 dark:shadow-slate-950/35 ' +
    'hover:shadow-lg hover:shadow-slate-300/40 dark:hover:shadow-cyan-950/25 ' +
    'focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:shadow-xl focus:shadow-cyan-400/40 dark:focus:shadow-cyan-800/50 ' +
    'text-gray-800 dark:text-white placeholder:text-gray-600/70 dark:placeholder:text-slate-400/80';

  const statusClasses = status.includes('successfully')
    ? 'text-emerald-500 dark:text-emerald-400'
    : status.includes('Failed')
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-gray-600 dark:text-slate-400';

  return (
    <SectionAnimator id="contact" className="portfolio-section-surface py-20 px-6">
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">Get In Touch</h2>
        <p className="text-gray-600 dark:text-slate-300 mb-12">
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
            className={inputClasses}
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClasses}
          />
          <textarea
            name="message"
            placeholder="Your Message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            required
            className={`${inputClasses} resize-none`}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 font-bold rounded-xl text-white transition-all duration-300 ease-in-out bg-cyan-600 dark:bg-cyan-500 shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50 hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
        {status && <p className={`mt-6 text-center font-semibold ${statusClasses}`}>{status}</p>}
      </div>
    </SectionAnimator>
  );
};

export default Contact;
