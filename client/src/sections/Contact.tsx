import React, { useState } from 'react';
import API from '../api'; // Assuming this is defined elsewhere
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
            // Placeholder for actual API call
             const response = await API.post('/api/contact', formData);
            // if (response.data.success) {
            setStatus('Message sent successfully!');
            setFormData({ name: '', email: '', message: '' });
            // }
        } catch (error) {
            console.error('Form submission error:', error);
            setStatus('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- FIX: Reusable input style for "raised" effect with shadow ---
    const inputClasses = "w-full p-4 rounded-xl transition-all duration-300 " +
        "bg-gray-200/70 dark:bg-slate-800/80 " + // Slightly lighter background for raised effect
        "border border-gray-300 dark:border-slate-700 " +
        "shadow-md shadow-gray-400/30 dark:shadow-slate-900/40 " + // Default shadow for raised look
        "hover:shadow-lg hover:shadow-gray-400/40 dark:hover:shadow-slate-900/50 " + // Enhanced shadow on hover
        "focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:shadow-xl focus:shadow-cyan-400/40 dark:focus:shadow-cyan-800/50 " + // Focus with cyan accent shadow
        "text-gray-800 dark:text-white placeholder:text-gray-600/70 dark:placeholder:text-slate-400/80";

    // --- Conditional classes for the status message (using cyan-friendly colors) ---
    const statusClasses = status.includes('successfully')
        ? 'text-emerald-500 dark:text-emerald-400'
        : status.includes('Failed')
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-gray-600 dark:text-slate-400';

    return (
        // Section background consistent
        <SectionAnimator id="contact" className="bg-slate-50 dark:bg-background py-20 px-6">
            <div className="container mx-auto max-w-2xl text-center">
                {/* Heading color consistent */}
                <h2 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">Get In Touch</h2>
                {/* Paragraph color consistent */}
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
                        className={`${inputClasses} resize-none`}></textarea>
                    <button
                        type="submit"
                        disabled={loading}
                        // Button Styling matching CTA/Skills button
                        className="w-full p-4 font-bold rounded-xl text-white transition-all duration-300 ease-in-out 
                           bg-cyan-600 dark:bg-cyan-500 
                           shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50 
                           hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:-translate-y-1 
                           hover:shadow-xl hover:shadow-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 
                           active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0" >
                        {loading ? 'Sending...' : 'Send Message'}
                    </button>
                </form>
                {status && <p className={`mt-6 text-center font-semibold ${statusClasses}`}>{status}</p>}
            </div>
        </SectionAnimator>
    );
};

export default Contact;