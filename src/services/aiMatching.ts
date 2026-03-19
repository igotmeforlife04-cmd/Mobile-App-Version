import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function matchJobsForVA(vaProfile: any, jobs: any[]) {
  if (!jobs || jobs.length === 0) return [];

  const prompt = `
You are an expert technical recruiter and AI matching engine.
I will provide you with a Virtual Assistant (VA) profile and a list of available jobs.
Your task is to analyze the VA's skills, experience, and bio against the requirements of each job.
Return a JSON array of objects, where each object contains:
- jobId: the ID of the job
- matchScore: an integer from 0 to 100 representing how well the VA matches the job
- reasoning: a short 1-2 sentence explanation of why this is a good or bad match.

VA Profile:
${JSON.stringify(vaProfile, null, 2)}

Jobs:
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, description: j.description, skills: j.required_skills, salary_min: j.salary_min, salary_max: j.salary_max })), null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              jobId: { type: Type.STRING },
              matchScore: { type: Type.INTEGER },
              reasoning: { type: Type.STRING }
            },
            required: ['jobId', 'matchScore', 'reasoning']
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    return result;
  } catch (error) {
    console.error("AI Matching Error:", error);
    return [];
  }
}

export async function matchVAsForJob(jobDetails: any, vas: any[]) {
  if (!vas || vas.length === 0) return [];

  const prompt = `
You are an expert technical recruiter and AI matching engine.
I will provide you with a Job description and a list of available Virtual Assistant (VA) profiles.
Your task is to analyze the Job's requirements against the skills, experience, and bio of each VA.
Return a JSON array of objects, where each object contains:
- vaId: the ID of the VA
- matchScore: an integer from 0 to 100 representing how well the VA matches the job
- reasoning: a short 1-2 sentence explanation of why this VA is a good or bad match for the job.

Job Details:
${JSON.stringify(jobDetails, null, 2)}

VA Profiles:
${JSON.stringify(vas.map(v => ({ id: v.id, name: v.first_name + ' ' + v.last_name, bio: v.bio, category: v.category, skills: v.detailed_skills })), null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              vaId: { type: Type.STRING },
              matchScore: { type: Type.INTEGER },
              reasoning: { type: Type.STRING }
            },
            required: ['vaId', 'matchScore', 'reasoning']
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    return result;
  } catch (error) {
    console.error("AI Matching Error:", error);
    return [];
  }
}
