import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, Briefcase, Settings, X, User, FileText, CheckCircle, Sparkles, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserData } from '../../types';
import * as Dialog from '@radix-ui/react-dialog';
import { matchVAsForJob } from '../../services/aiMatching';

export const EmployerDashboard = ({ user }: { user: UserData }) => {
  const [activeTab, setActiveTab] = useState<'post' | 'messages' | 'jobs' | 'profile'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Matching State
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null);
  const [jobMatches, setJobMatches] = useState<Record<string, any[]>>({});

  // Post Job State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [skills, setSkills] = useState('');

  // Profile State
  const [companyName, setCompanyName] = useState(user.company_name || '');
  const [companyWebsite, setCompanyWebsite] = useState(user.company_website || '');

  useEffect(() => {
    fetchJobs();
    fetchMessages();
    
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [payload.new, ...prev]);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('employer_id', user.id);
    if (data) setJobs(data);
    setLoading(false);
  };

  const handleFindMatches = async (job: any) => {
    if (jobMatches[job.id]) {
      // Toggle off if already loaded
      setJobMatches(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      return;
    }

    setMatchingJobId(job.id);
    
    // Fetch VAs
    const { data: vas } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, bio, category, detailed_skills')
      .not('first_name', 'is', null)
      .limit(20); // Limit to 20 to save tokens

    if (vas && vas.length > 0) {
      const aiResults = await matchVAsForJob(job, vas);
      
      const matches = vas.map(va => {
        const aiMatch = aiResults.find((r: any) => r.vaId === va.id);
        return {
          ...va,
          matchScore: aiMatch ? aiMatch.matchScore : 0,
          aiReasoning: aiMatch ? aiMatch.reasoning : ''
        };
      }).filter(va => va.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);

      setJobMatches(prev => ({ ...prev, [job.id]: matches }));
    }
    
    setMatchingJobId(null);
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').eq('employer_id', user.id).order('created_at', { ascending: false });
    if (data) setMessages(data);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('jobs').insert({
      employer_id: user.id,
      title,
      description,
      salary_min: Number(salaryMin),
      salary_max: Number(salaryMax),
      required_skills: skills.split(',').map(s => s.trim()).filter(s => s !== ''),
      status: 'published'
    });

    if (!error) {
      alert('Job posted successfully!');
      setTitle('');
      setDescription('');
      setSalaryMin('');
      setSalaryMax('');
      setSkills('');
      setActiveTab('jobs');
      fetchJobs();
    } else {
      alert('Error posting job: ' + error.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      company_name: companyName,
      company_website: companyWebsite
    }).eq('id', user.id);

    if (!error) {
      alert('Profile updated successfully!');
    } else {
      alert('Error updating profile: ' + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Employer Dashboard</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <Briefcase className="w-5 h-5" /> Job Posted
          </button>
          <button 
            onClick={() => setActiveTab('post')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'post' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <Plus className="w-5 h-5" /> Post a Job
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'messages' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <MessageSquare className="w-5 h-5" /> Messages
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <Settings className="w-5 h-5" /> Profile & Billing
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm min-h-[500px]">
          {activeTab === 'jobs' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Active Jobs</h2>
              {loading ? (
                <p>Loading jobs...</p>
              ) : jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map(job => (
                    <div key={job.id} className="p-4 border border-zinc-200 rounded-xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg text-zinc-900">{job.title}</h3>
                          <p className="text-sm text-zinc-500">Status: <span className="capitalize text-indigo-600 font-medium">{job.status}</span></p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-sm font-medium text-zinc-900">${job.salary_min} - ${job.salary_max}/mo</p>
                          <button 
                            onClick={() => handleFindMatches(job)}
                            disabled={matchingJobId === job.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              jobMatches[job.id] 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            <Sparkles className={`w-4 h-4 ${matchingJobId === job.id ? 'animate-pulse' : ''}`} />
                            {matchingJobId === job.id ? 'Analyzing...' : jobMatches[job.id] ? 'Hide Matches' : 'Find AI Matches'}
                          </button>
                        </div>
                      </div>
                      
                      {jobMatches[job.id] && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <h4 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" /> AI Recommended Candidates
                          </h4>
                          {jobMatches[job.id].length > 0 ? (
                            <div className="space-y-3">
                              {jobMatches[job.id].map((va: any) => (
                                <div key={va.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h5 className="font-bold text-zinc-900">{va.first_name} {va.last_name}</h5>
                                      <p className="text-sm text-zinc-500">{va.category}</p>
                                    </div>
                                    <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-indigo-700" /> {va.matchScore}% Match
                                    </div>
                                  </div>
                                  <p className="text-sm text-zinc-700 mb-2">{va.bio}</p>
                                  <div className="text-sm text-indigo-800 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                    <span className="font-semibold">AI Reasoning:</span> {va.aiReasoning}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500">No strong matches found at this time.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  No jobs posted yet. Click "Post a Job" to get started.
                </div>
              )}
            </div>
          )}

          {activeTab === 'post' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Post a New Job</h2>
              <form onSubmit={handlePostJob} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Job Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Executive Virtual Assistant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                    placeholder="Describe the role and responsibilities..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Min Salary ($/mo)</label>
                    <input 
                      type="number" 
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Max Salary ($/mo)</label>
                    <input 
                      type="number" 
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="1500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Required Skills (comma separated)</label>
                  <input 
                    type="text" 
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. React, Node.js, Design"
                    required
                  />
                </div>
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Publish Job Listing
                </button>
              </form>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="h-full flex flex-col">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Messages</h2>
              <div className="flex-1 flex flex-col border border-zinc-200 rounded-xl overflow-hidden h-[500px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <MessageSquare className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                      <p>No messages yet.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === user.id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-none'}`}>
                          <p>{msg.message_body}</p>
                          <span className={`text-xs mt-1 block ${msg.sender_id === user.id ? 'text-indigo-200' : 'text-zinc-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-white border-t border-zinc-200">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem('message') as HTMLInputElement;
                      if (!input.value.trim()) return;
                      
                      const { error } = await supabase.from('messages').insert({
                        sender_id: user.id,
                        receiver_id: 'admin', // Default receiver for now, or could be dynamic
                        message_body: input.value.trim()
                      });
                      
                      if (!error) {
                        input.value = '';
                        fetchMessages();
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      name="message"
                      type="text" 
                      placeholder="Type a message..." 
                      className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Profile & Billing</h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl mb-8">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Company Name</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Company Website</label>
                  <input 
                    type="url" 
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button className="bg-zinc-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-zinc-800">
                  Save Profile
                </button>
              </form>

              <div className="pt-8 border-t border-zinc-200">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Billing Information</h3>
                
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <button className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors">
                      View Subscription Details
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md z-50">
                      <Dialog.Title className="text-xl font-bold mb-4">Subscription Details</Dialog.Title>
                      <div className="space-y-4">
                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <p className="text-sm text-zinc-500">Current Plan</p>
                          <p className="text-lg font-bold text-zinc-900">{user.subscription?.plan || 'Free Tier'}</p>
                        </div>
                        {user.subscription?.invoice_url && (
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <p className="text-sm text-zinc-500 mb-2">Latest Invoice</p>
                            <a href={user.subscription.invoice_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium hover:underline flex items-center gap-2">
                              <FileText className="w-4 h-4" /> Download Invoice
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-8 flex justify-end">
                        <Dialog.Close asChild>
                          <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200">
                            Close
                          </button>
                        </Dialog.Close>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
