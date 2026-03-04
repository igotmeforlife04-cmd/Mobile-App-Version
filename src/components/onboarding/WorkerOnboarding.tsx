import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { JOB_CATEGORIES } from '../../lib/jobCategories';
import { UserData } from '../../types';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

interface WorkerOnboardingProps {
  user: UserData;
  onComplete: () => void;
}

export const WorkerOnboarding: React.FC<WorkerOnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    selectedCategory: '',
    selectedRoles: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      selectedCategory: e.target.value,
      selectedRoles: [], // Reset roles when category changes
    }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const roles = prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role];
      return { ...prev, selectedRoles: roles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          detailed_skills: {
            category: formData.selectedCategory,
            roles: formData.selectedRoles,
          },
          // Ensure the profile is marked as complete if you have a flag, 
          // or just rely on the presence of these fields.
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onComplete();
      navigate('/va'); // Redirect to VA dashboard
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.bio) {
        setError('Please fill in all fields.');
        return;
      }
      setError(null);
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
    setError(null);
  };

  const currentCategory = JOB_CATEGORIES.find(c => c.category === formData.selectedCategory);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-xl overflow-hidden border border-zinc-200">
        <div className="bg-teal-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to VAHub!</h1>
          <p className="text-teal-100">Let's set up your profile to help you find the perfect job.</p>
        </div>

        <div className="p-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8 gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>1</div>
            <div className={`h-1 w-16 ${step >= 2 ? 'bg-teal-600' : 'bg-zinc-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>2</div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Professional Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                    placeholder="Tell us about your experience and skills..."
                  />
                  <p className="text-xs text-zinc-400 mt-2">This will be visible to employers.</p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center gap-2"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Primary Category</label>
                  <select
                    value={formData.selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  >
                    <option value="">Select a category...</option>
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category}
                      </option>
                    ))}
                  </select>
                </div>

                {currentCategory && (
                  <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                    <label className="block text-sm font-bold text-zinc-700 mb-4">Select Your Roles</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentCategory.roles.map((role) => (
                        <label
                          key={role}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                            formData.selectedRoles.includes(role)
                              ? 'bg-teal-50 border-teal-200 text-teal-700'
                              : 'bg-white border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedRoles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="hidden"
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                            formData.selectedRoles.includes(role)
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-zinc-300'
                          }`}>
                            {formData.selectedRoles.includes(role) && <CheckCircle className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-medium">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-zinc-500 font-bold hover:text-zinc-700 px-4 py-2"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.selectedCategory || formData.selectedRoles.length === 0}
                    className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Complete Profile'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
