import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db.ts";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth
  const getUserWithSubscription = (userId: string) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return null;
    const subscription = db.prepare(`
      SELECT subscriptions.*, plans.name as plan_name 
      FROM subscriptions 
      JOIN plans ON subscriptions.plan_id = plans.id 
      WHERE employer_id = ?
    `).get(userId) as any;
    return { ...user, subscription: subscription ? { plan: subscription.plan_name, status: subscription.status } : null };
  };

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
      if (user) {
        const fullUser = getUserWithSubscription(user.id);
        res.json({ user: fullUser });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)").run(id, name, email, password, role);
      
      if (role === 'va') {
        db.prepare("INSERT INTO va_profiles (id, user_id) VALUES (?, ?)").run(uuidv4(), id);
      } else if (role === 'employer') {
        db.prepare("INSERT INTO employer_profiles (id, user_id) VALUES (?, ?)").run(uuidv4(), id);
        // Default free plan for new employers
        db.prepare("INSERT INTO subscriptions (id, employer_id, plan_id, status) VALUES (?, ?, ?, ?)")
          .run(uuidv4(), id, 'starter', 'active');
      }
      
      const fullUser = getUserWithSubscription(id);
      res.json({ user: fullUser });
    } catch (e: any) {
      res.status(400).json({ error: e.message.includes("UNIQUE") ? "Email already exists" : "Registration failed" });
    }
  });

  // Jobs
  app.get("/api/jobs", (req, res) => {
    const jobs = db.prepare(`
      SELECT jobs.*, employer_profiles.company_name, employer_profiles.logo_url 
      FROM jobs 
      JOIN employer_profiles ON jobs.employer_id = employer_profiles.user_id
      WHERE jobs.status = 'approved'
      ORDER BY jobs.is_featured DESC, jobs.created_at DESC
    `).all() as any[];

    const jobsWithSkills = jobs.map(job => {
      const skills = db.prepare("SELECT skill_name FROM job_skills WHERE job_id = ?").all(job.id as string) as any[];
      return { ...job, skills: skills.map(s => s.skill_name) };
    });

    res.json(jobsWithSkills);
  });

  app.get("/api/jobs/:id", (req, res) => {
    const job = db.prepare(`
      SELECT jobs.*, employer_profiles.company_name, employer_profiles.company_description, employer_profiles.logo_url 
      FROM jobs 
      JOIN employer_profiles ON jobs.employer_id = employer_profiles.user_id
      WHERE jobs.id = ?
    `).get(req.params.id) as any;

    if (!job) return res.status(404).json({ error: "Job not found" });

    const skills = db.prepare("SELECT skill_name FROM job_skills WHERE job_id = ?").all(job.id) as any[];
    res.json({ ...job, skills: skills.map(s => s.skill_name) });
  });

  app.post("/api/applications", (req, res) => {
    const { job_id, va_id, cover_letter, resume_url } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO applications (id, job_id, va_id, cover_letter, resume_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, job_id, va_id, cover_letter, resume_url);
      res.json({ id });
    } catch (e) {
      res.status(400).json({ error: "Application failed" });
    }
  });

  app.post("/api/jobs", (req, res) => {
    const { employer_id, title, description, salary_min, salary_max, job_type, experience_level, skills } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO jobs (id, employer_id, title, description, salary_min, salary_max, job_type, experience_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, employer_id, title, description, salary_min, salary_max, job_type, experience_level);

      if (skills && Array.isArray(skills)) {
        const insertSkill = db.prepare("INSERT INTO job_skills (id, job_id, skill_name) VALUES (?, ?, ?)");
        for (const skill of skills) {
          insertSkill.run(uuidv4(), id, skill);
        }
      }
      res.json({ id });
    } catch (e) {
      res.status(400).json({ error: "Failed to post job" });
    }
  });

  // Subscriptions
  app.post("/api/subscriptions/subscribe", (req, res) => {
    const { user_id, plan_name } = req.body;
    try {
      const plan = db.prepare("SELECT id FROM plans WHERE name = ?").get(plan_name) as any;
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      db.prepare("DELETE FROM subscriptions WHERE employer_id = ?").run(user_id);
      db.prepare("INSERT INTO subscriptions (id, employer_id, plan_id, status) VALUES (?, ?, ?, ?)")
        .run(uuidv4(), user_id, plan.id, 'active');

      const fullUser = getUserWithSubscription(user_id);
      res.json({ user: fullUser });
    } catch (e) {
      res.status(400).json({ error: "Subscription failed" });
    }
  });

  app.get("/api/users/:id/subscription", (req, res) => {
    const userId = req.params.id;
    const subscription = db.prepare(`
      SELECT subscriptions.*, plans.name as plan_name 
      FROM subscriptions 
      JOIN plans ON subscriptions.plan_id = plans.id 
      WHERE employer_id = ?
    `).get(userId) as any;
    
    if (subscription) {
      res.json({ subscription: { plan: subscription.plan_name, status: subscription.status } });
    } else {
      res.json({ subscription: null });
    }
  });

  // Admin
  app.get("/api/admin/stats", (req, res) => {
    const stats = {
      totalVAs: db.prepare("SELECT count(*) as count FROM users WHERE role = 'va'").get() as any,
      totalEmployers: db.prepare("SELECT count(*) as count FROM users WHERE role = 'employer'").get() as any,
      totalJobs: db.prepare("SELECT count(*) as count FROM jobs").get() as any,
      pendingJobs: db.prepare("SELECT count(*) as count FROM jobs WHERE status = 'pending'").get() as any,
    };
    res.json(stats);
  });

  app.get("/api/admin/pending-jobs", (req, res) => {
    const jobs = db.prepare(`
      SELECT jobs.*, employer_profiles.company_name 
      FROM jobs 
      JOIN employer_profiles ON jobs.employer_id = employer_profiles.user_id
      WHERE jobs.status = 'pending'
      ORDER BY jobs.created_at DESC
    `).all();
    res.json(jobs);
  });

  app.post("/api/admin/approve-job", (req, res) => {
    const { id, admin_id } = req.body;
    db.prepare("UPDATE jobs SET status = 'approved' WHERE id = ?").run(id);
    
    db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, description) VALUES (?, ?, ?, ?)")
      .run(uuidv4(), admin_id, 'job_approved', `Approved job: ${id}`);
      
    res.json({ success: true });
  });

  app.post("/api/admin/reject-job", (req, res) => {
    const { id, reason, admin_id } = req.body;
    db.prepare("UPDATE jobs SET status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason, id);
    
    db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, description) VALUES (?, ?, ?, ?)")
      .run(uuidv4(), admin_id, 'job_rejected', `Rejected job: ${id}. Reason: ${reason}`);
      
    res.json({ success: true });
  });

  app.get("/api/admin/users", (req, res) => {
    const { search } = req.query;
    let query = "SELECT id, name, email, role, status, created_at FROM users WHERE role != 'admin'";
    let params: any[] = [];
    
    if (search) {
      query += " AND (name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const users = db.prepare(query).all(...params);
    res.json(users);
  });

  app.post("/api/admin/users", (req, res) => {
    const { name, email, password, role, status } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, email, password, role, status || 'approved');
      
      if (role === 'va') {
        db.prepare("INSERT INTO va_profiles (id, user_id) VALUES (?, ?)").run(uuidv4(), id);
      } else if (role === 'employer') {
        db.prepare("INSERT INTO employer_profiles (id, user_id) VALUES (?, ?)").run(uuidv4(), id);
        db.prepare("INSERT INTO subscriptions (id, employer_id, plan_id, status) VALUES (?, ?, ?, ?)")
          .run(uuidv4(), id, 'starter', 'active');
      }

      db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, target_user_id, description) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), 'admin-1', 'user_created', id, `Created user: ${name} (${role})`);
      
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(400).json({ error: e.message.includes("UNIQUE") ? "Email already exists" : "Creation failed" });
    }
  });

  app.put("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?").run(name, email, role, status, id);
      
      db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, target_user_id, description) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), 'admin-1', 'user_updated', id, `Updated user: ${name}`);

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Update failed" });
    }
  });

  app.post("/api/admin/import-users", (req, res) => {
    const { users, admin_id } = req.body;
    let importedCount = 0;
    let errors = [];

    const insertUser = db.prepare("INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)");
    const insertVaProfile = db.prepare("INSERT INTO va_profiles (id, user_id) VALUES (?, ?)");
    const insertEmpProfile = db.prepare("INSERT INTO employer_profiles (id, user_id) VALUES (?, ?)");
    const insertSub = db.prepare("INSERT INTO subscriptions (id, employer_id, plan_id, status) VALUES (?, ?, ?, ?)");

    const transaction = db.transaction((usersToImport) => {
      for (const user of usersToImport) {
        try {
          const id = uuidv4();
          // Default password '123456' if not provided
          insertUser.run(id, user.name, user.email, user.password || '123456', user.role, user.status || 'approved');
          
          if (user.role === 'va') {
            insertVaProfile.run(uuidv4(), id);
          } else if (user.role === 'employer') {
            insertEmpProfile.run(uuidv4(), id);
            insertSub.run(uuidv4(), id, 'starter', 'active');
          }
          importedCount++;
        } catch (e: any) {
          errors.push(`Failed to import ${user.email}: ${e.message}`);
        }
      }
    });

    try {
      transaction(users);
      db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, description) VALUES (?, ?, ?, ?)")
        .run(uuidv4(), admin_id || 'admin-1', 'users_imported', `Imported ${importedCount} users`);
      res.json({ success: true, imported: importedCount, errors });
    } catch (e: any) {
      res.status(500).json({ error: "Import transaction failed" });
    }
  });

  app.post("/api/admin/subscriptions", (req, res) => {
    const { user_id, plan_name, status, admin_id } = req.body;
    try {
      const plan = db.prepare("SELECT id FROM plans WHERE name = ?").get(plan_name) as any;
      // If plan not found by name, try by ID (slug)
      const planId = plan ? plan.id : plan_name.toLowerCase();
      
      // Check if plan exists
      const validPlan = db.prepare("SELECT id FROM plans WHERE id = ?").get(planId);
      if (!validPlan) return res.status(404).json({ error: "Plan not found" });

      // Check if subscription exists
      const existing = db.prepare("SELECT id FROM subscriptions WHERE employer_id = ?").get(user_id);

      if (existing) {
        db.prepare("UPDATE subscriptions SET plan_id = ?, status = ? WHERE employer_id = ?")
          .run(planId, status || 'active', user_id);
      } else {
        db.prepare("INSERT INTO subscriptions (id, employer_id, plan_id, status) VALUES (?, ?, ?, ?)")
          .run(uuidv4(), user_id, planId, status || 'active');
      }

      db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, target_user_id, description) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), admin_id || 'admin-1', 'subscription_updated', user_id, `Set subscription to ${plan_name} (${status})`);

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Subscription update failed" });
    }
  });

  app.get("/api/admin/subscriptions", (req, res) => {
    const { status } = req.query;
    let query = `
      SELECT subscriptions.*, plans.name as plan_name, plans.price, users.email as user_email
      FROM subscriptions 
      JOIN plans ON subscriptions.plan_id = plans.id
      JOIN users ON subscriptions.employer_id = users.id
    `;
    
    if (status && status !== 'all') {
      query += ` WHERE subscriptions.status = ?`;
      const subs = db.prepare(query).all(status);
      res.json(subs);
    } else {
      const subs = db.prepare(query).all();
      res.json(subs);
    }
  });

  app.get("/api/admin/payments", (req, res) => {
    // Mock payments since we don't have a payments table in db.ts schema yet
    // Or check if payments table exists? db.ts doesn't show it.
    // I will return an empty array or mock data for now to prevent crash.
    res.json([]);
  });

  app.post("/api/admin/update-user-status", (req, res) => {
    const { id, status, admin_id } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
    
    db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, target_user_id, description) VALUES (?, ?, ?, ?, ?)")
      .run(uuidv4(), admin_id, 'user_status_updated', id, `Updated user status to ${status}`);
      
    res.json({ success: true });
  });

  app.delete("/api/admin/delete-user", (req, res) => {
    const { id, admin_id } = req.body;
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    
    db.prepare("INSERT INTO admin_logs (id, admin_id, action_type, target_user_id, description) VALUES (?, ?, ?, ?, ?)")
      .run(uuidv4(), admin_id, 'user_deleted', id, `Deleted user: ${id}`);
      
    res.json({ success: true });
  });

  app.get("/api/admin/logs", (req, res) => {
    const logs = db.prepare(`
      SELECT admin_logs.*, users.name as admin_name 
      FROM admin_logs 
      JOIN users ON admin_logs.admin_id = users.id 
      ORDER BY admin_logs.created_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // VA Profiles
  app.get("/api/talents", (req, res) => {
    const profiles = db.prepare(`
      SELECT va_profiles.*, users.name, users.email 
      FROM va_profiles 
      JOIN users ON va_profiles.user_id = users.id
      WHERE users.status = 'approved'
    `).all() as any[];

    const profilesWithSkills = profiles.map(profile => {
      const skills = db.prepare("SELECT skill_name, years_experience FROM va_skills WHERE va_id = ?").all(profile.user_id) as any[];
      return { ...profile, skills };
    });

    res.json(profilesWithSkills);
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
