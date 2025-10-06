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
  
  // --- Reusable premium styles for form elements ---
  const inputClasses = "w-full p-4 bg-foreground/5 rounded-xl border border-foreground/10 focus:outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] text-foreground placeholder:text-foreground/40 transition-all duration-300";

  // --- Conditional classes for the status message (using more elegant colors) ---
  const statusClasses = status.includes('successfully')
    ? 'text-emerald-500' // A green that matches our theme
    : status.includes('Failed')
    ? 'text-rose-500' // A modern red
    : 'text-foreground/70';

  return (
    <SectionAnimator id="contact" className="bg-background py-20 px-6">
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-foreground">Get In Touch</h2>
        <p className="text-foreground/70 mb-12">
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
          ></textarea>
          <button
            type="submit"
            disabled={loading}
            // --- Premium Button Styling with 3D effect and hover glow ---
            className="w-full p-4 bg-[hsl(var(--accent))] text-white rounded-xl font-bold shadow-lg shadow-[hsl(var(--accent)/0.3)] transition-all duration-300 ease-in-out hover:brightness-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-[hsl(var(--accent)/0.5)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.5)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
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