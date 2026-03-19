import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserData } from '../../types';

export const VCSAdmin = ({ user }: { user: UserData }) => {
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const fetchPendingJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
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
    } else {
      alert('Error rejecting job: ' + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">VCS Admin - Job Approvals</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm min-h-[500px]">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">Pending Jobs</h2>
        
        {loading ? (
          <p>Loading pending jobs...</p>
        ) : pendingJobs.length > 0 ? (
          <div className="space-y-4">
            {pendingJobs.map(job => (
              <div key={job.id} className="p-6 border border-zinc-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">{job.title}</h3>
                  <p className="text-sm text-zinc-500 mb-2">Posted on {new Date(job.created_at).toLocaleDateString()}</p>
                  <p className="text-zinc-700 line-clamp-2 max-w-2xl">{job.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(job.required_skills || []).map((skill: string, idx: number) => (
                      <span key={idx} className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 min-w-max">
                  <button 
                    onClick={() => handleApprove(job.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(job.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <Briefcase className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
            <p>No pending jobs to review.</p>
          </div>
        )}
      </div>
    </div>
  );
};
