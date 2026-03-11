import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Clock, Search, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserData } from '../../types';
import { Navigate } from 'react-router-dom';

export const VCSAdmin = ({ user }: { user: UserData | null }) => {
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple admin check - you can enhance this based on your actual admin role logic
  const isAdmin = user?.role === 'ADMIN' || user?.email === 'admin@vcs.com';

  useEffect(() => {
    if (isAdmin) {
      fetchPendingJobs();
    }
  }, [isAdmin]);

  const fetchPendingJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*, profiles(company_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (data) setPendingJobs(data);
    setLoading(false);
  };

  const handleApprove = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'published' })
      .eq('id', jobId);

    if (!error) {
      setPendingJobs(prev => prev.filter(job => job.id !== jobId));
      alert('Job approved and published!');
    } else {
      alert('Error approving job: ' + error.message);
    }
  };

  const handleReject = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'rejected' })
      .eq('id', jobId);

    if (!error) {
      setPendingJobs(prev => prev.filter(job => job.id !== jobId));
      alert('Job rejected.');
    } else {
      alert('Error rejecting job: ' + error.message);
    }
  };

  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">VCS Admin Dashboard</h1>
          <p className="text-zinc-500 mt-1">Review and approve pending job postings.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Approval
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full ml-2">
              {pendingJobs.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">Loading pending jobs...</div>
        ) : pendingJobs.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {pendingJobs.map(job => (
              <div key={job.id} className="p-6 hover:bg-zinc-50 transition-colors flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-zinc-900">{job.title}</h3>
                    <span className="text-sm font-medium text-zinc-500">${job.salary_min} - ${job.salary_max}/mo</span>
                  </div>
                  <p className="text-sm text-indigo-600 font-medium mb-3">
                    {job.profiles?.company_name || 'Unknown Company'}
                  </p>
                  <p className="text-zinc-600 text-sm mb-4 line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {(job.required_skills || []).map((skill: string, idx: number) => (
                      <span key={idx} className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 md:flex-col md:justify-center border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
                  <button 
                    onClick={() => handleApprove(job.id)}
                    className="flex-1 md:w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(job.id)}
                    className="flex-1 md:w-full bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">All caught up!</h3>
            <p className="text-zinc-500">There are no pending jobs to review at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};
