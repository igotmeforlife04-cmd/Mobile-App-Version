import React, { useState, useEffect } from 'react';
import { Briefcase, Search, Star, ExternalLink, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserData } from '../../types';

export const VADashboard = ({ user }: { user: UserData }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState<string[]>([]);

  useEffect(() => {
    fetchProfileAndJobs();
  }, [user.id]);

  const fetchProfileAndJobs = async () => {
    // 1. Fetch VA's skills from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('detailed_skills')
      .eq('id', user.id)
      .single();

    let skills: string[] = [];
    if (profile?.detailed_skills?.roles) {
      skills = profile.detailed_skills.roles;
    }
    setMySkills(skills);

    // 2. Fetch published jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (jobsData) {
      // 3. Match jobs based on skills
      // A simple matching algorithm: count how many required_skills match the VA's skills
      const matchedJobs = jobsData.map(job => {
        const required = job.required_skills || [];
        const matchCount = required.filter((s: string) => 
          skills.some(mySkill => mySkill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(mySkill.toLowerCase()))
        ).length;
        
        return {
          ...job,
          matchScore: required.length > 0 ? Math.round((matchCount / required.length) * 100) : 0
        };
      }).sort((a, b) => b.matchScore - a.matchScore); // Sort by highest match

      setJobs(matchedJobs);
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Job Feed</h1>
          <p className="text-zinc-500 mt-1">Jobs matched to your skills: {mySkills.join(', ') || 'None listed'}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search jobs..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500">Finding the best matches for you...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 mb-1">{job.title}</h2>
                      <p className="text-zinc-500 text-sm flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> {job.job_type || 'Full-time'} • Posted {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {job.matchScore > 0 && (
                      <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <Star className="w-4 h-4 fill-teal-700" /> {job.matchScore}% Match
                      </div>
                    )}
                  </div>
                  
                  <p className="text-zinc-700 mb-6 line-clamp-3">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(job.required_skills || []).map((skill: string, idx: number) => (
                      <span key={idx} className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <div className="font-bold text-zinc-900">
                      ${job.salary_min} - ${job.salary_max} <span className="text-sm font-normal text-zinc-500">/mo</span>
                    </div>
                    <button className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center gap-2">
                      Apply Now <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                <h3 className="text-lg font-bold text-zinc-900 mb-2">No jobs found</h3>
                <p className="text-zinc-500">There are currently no published jobs matching your criteria.</p>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-teal-600 p-6 rounded-2xl text-white shadow-xl shadow-teal-100">
              <h3 className="text-lg font-bold mb-2">Complete Your Profile</h3>
              <p className="text-teal-100 text-sm mb-6">
                VAs with complete profiles are 4x more likely to get hired. Add more skills to improve your job matches.
              </p>
              <button className="w-full bg-white text-teal-600 py-2 rounded-lg font-bold hover:bg-teal-50 transition-all">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
