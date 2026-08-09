import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function MySkills() {
    const [skills, setSkills] = useState([]);

    const [skillName, setSkillName] = useState("");
    const [level, setLevel] = useState("Beginner");
    const [progress, setProgress] = useState(0);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Edit states
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadSkills();
    }, []);

    // =====================================================
    // GET CURRENT USER
    // =====================================================

    const getCurrentUser = async () => {
        const {
            data: { user },
            error
        } = await supabase.auth.getUser();

        if (error) {
            throw new Error(error.message);
        }

        if (!user) {
            throw new Error("You are not logged in.");
        }

        return user;
    };

    // =====================================================
    // LOAD SKILLS
    // =====================================================

    const loadSkills = async () => {
        setFetching(true);
        setError("");

        try {
            const user = await getCurrentUser();

            const { data, error } = await supabase
                .from("skills")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw new Error(error.message);
            }

            setSkills(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setFetching(false);
        }
    };

    // =====================================================
    // RESET FORM
    // =====================================================

    const resetForm = () => {
        setSkillName("");
        setLevel("Beginner");
        setProgress(0);
        setEditingId(null);
    };

    // =====================================================
    // VALIDATION
    // =====================================================

    const validateForm = () => {
        const name = skillName.trim();
        const progressNumber = Number(progress);

        if (!name) {
            return "Please enter a skill name.";
        }

        if (name.length > 50) {
            return "Skill name cannot be more than 50 characters.";
        }

        if (
            progress === "" ||
            Number.isNaN(progressNumber) ||
            progressNumber < 0 ||
            progressNumber > 100
        ) {
            return "Progress must be between 0 and 100.";
        }

        const validLevels = [
            "Beginner",
            "Intermediate",
            "Advanced"
        ];

        if (!validLevels.includes(level)) {
            return "Please select a valid level.";
        }

        return null;
    };

    // =====================================================
    // CHECK DUPLICATE SKILL
    // =====================================================

    const skillAlreadyExists = (name, currentId = null) => {
        return skills.some(
            (skill) =>
                skill.skill_name.trim().toLowerCase() ===
                name.trim().toLowerCase() &&
                skill.id !== currentId
        );
    };

    // =====================================================
    // ADD / UPDATE SKILL
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        const name = skillName.trim();
        const progressNumber = Number(progress);

        if (skillAlreadyExists(name, editingId)) {
            setError("This skill already exists.");
            return;
        }

        setLoading(true);

        try {
            const user = await getCurrentUser();

            // =================================================
            // UPDATE EXISTING SKILL
            // =================================================

            if (editingId) {
                const { error } = await supabase
                    .from("skills")
                    .update({
                        skill_name: name,
                        level: level,
                        progress: progressNumber
                    })
                    .eq("id", editingId)
                    .eq("user_id", user.id);

                if (error) {
                    throw new Error(error.message);
                }

                setSuccess("Skill updated successfully.");
            }

            // =================================================
            // ADD NEW SKILL
            // =================================================

            else {
                const { error } = await supabase
                    .from("skills")
                    .insert({
                        user_id: user.id,
                        skill_name: name,
                        level: level,
                        progress: progressNumber
                    });

                if (error) {
                    throw new Error(error.message);
                }

                setSuccess("Skill added successfully.");
            }

            resetForm();

            await loadSkills();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // START EDIT
    // =====================================================

    const handleEdit = (skill) => {
        setError("");
        setSuccess("");

        setEditingId(skill.id);
        setSkillName(skill.skill_name);
        setLevel(skill.level);
        setProgress(skill.progress);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // =====================================================
    // CANCEL EDIT
    // =====================================================

    const handleCancelEdit = () => {
        resetForm();
        setError("");
        setSuccess("");
    };

    // =====================================================
    // DELETE SKILL
    // =====================================================

    const handleDelete = async (skillId) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this skill?"
        );

        if (!confirmDelete) {
            return;
        }

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const user = await getCurrentUser();

            const { error } = await supabase
                .from("skills")
                .delete()
                .eq("id", skillId)
                .eq("user_id", user.id);

            if (error) {
                throw new Error(error.message);
            }

            // If deleted skill was being edited
            if (editingId === skillId) {
                resetForm();
            }

            setSuccess("Skill deleted successfully.");

            await loadSkills();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // COMPUTED STATS
    // =====================================================

    const totalSkills = skills.length;
    const completedSkills = skills.filter(
        (s) => Number(s.progress) === 100
    ).length;
    const inProgressSkills = skills.filter(
        (s) => Number(s.progress) > 0 && Number(s.progress) < 100
    ).length;

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="app-shell">
            <Sidebar />

            <main className="main-content">
                <div className="page-container">

                    {/* HEADER */}
                    <div className="page-header">
                        <div>
                            <span className="section-label">YOUR DEVELOPMENT</span>
                            <h1>My Skills</h1>
                            <p className="page-subtitle">
                                Track your technical skills and monitor your progress.
                            </p>
                        </div>

                        <div className="skills-stats-summary">
                            <div className="stat-pill">
                                <span className="stat-pill-label">Total Skills</span>
                                <span className="stat-pill-value">{totalSkills}</span>
                            </div>

                            <div className="stat-pill">
                                <span className="stat-pill-label">Completed</span>
                                <span className="stat-pill-value highlight-success">{completedSkills}</span>
                            </div>

                            <div className="stat-pill">
                                <span className="stat-pill-label">In Progress</span>
                                <span className="stat-pill-value highlight-accent">{inProgressSkills}</span>
                            </div>
                        </div>
                    </div>

                    {/* ADD / EDIT FORM */}
                    <div className="card" style={{ marginBottom: "32px" }}>
                        <div className="card-header">
                            <div>
                                <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>
                                    {editingId ? "Edit Skill" : "Add New Skill"}
                                </h2>
                                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                                    {editingId
                                        ? "Update skill details and target level"
                                        : "Add a new technical skill to track your progress"}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
                            <div className="form-grid">

                                {/* SKILL NAME */}
                                <div className="form-group">
                                    <label htmlFor="skillNameInput">Skill Name</label>
                                    <input
                                        id="skillNameInput"
                                        type="text"
                                        placeholder="e.g. React, Python, Docker"
                                        value={skillName}
                                        maxLength={50}
                                        onChange={(e) => setSkillName(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                {/* LEVEL */}
                                <div className="form-group">
                                    <label htmlFor="levelSelect">Level</label>
                                    <select
                                        id="levelSelect"
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                {/* PROGRESS */}
                                <div className="form-group full">
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <label htmlFor="progressRange">Progress</label>
                                        <span style={{ color: "var(--accent-purple-light)", fontWeight: "bold" }}>
                                            {progress}%
                                        </span>
                                    </div>
                                    <input
                                        id="progressRange"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={progress}
                                        onChange={(e) => setProgress(e.target.value)}
                                        disabled={loading}
                                        style={{ accentColor: "var(--accent-purple)", cursor: "pointer" }}
                                    />
                                </div>

                            </div>

                            {/* BUTTONS */}
                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : editingId ? "Save Changes" : "Add Skill"}
                                </button>

                                {editingId && (
                                    <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* TOASTS */}
                    {error && <div className="toast-message toast-error">⚠️ {error}</div>}
                    {success && <div className="toast-message toast-success">✓ {success}</div>}

                    {/* SKILLS SECTION HEADER */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Your Skills</h2>
                        <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                            {skills.length} {skills.length === 1 ? "skill" : "skills"} total
                        </span>
                    </div>

                    {/* LOADING / EMPTY / SKILLS GRID */}
                    {fetching ? (
                        <div className="skills-grid">
                            <div className="skill-card" style={{ opacity: 0.5 }}>
                                <div style={{ height: "20px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                                <div style={{ height: "12px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                                <div style={{ height: "8px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                            </div>
                            <div className="skill-card" style={{ opacity: 0.5 }}>
                                <div style={{ height: "20px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                                <div style={{ height: "12px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                                <div style={{ height: "8px", background: "var(--bg-surface)", borderRadius: "4px" }} />
                            </div>
                        </div>
                    ) : skills.length === 0 ? (
                        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚡</div>
                            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No skills added yet</h3>
                            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                                Start building your skill profile by adding your first skill.
                            </p>
                        </div>
                    ) : (
                        <div className="skills-grid">
                            {skills.map((skill) => {
                                const skillProgress = Number(skill.progress) || 0;
                                const statusLabel =
                                    skillProgress === 100
                                        ? "Completed"
                                        : skillProgress > 0
                                            ? "In Progress"
                                            : "Not Started";

                                const statusClass =
                                    skillProgress === 100
                                        ? "status-completed"
                                        : skillProgress > 0
                                            ? "status-in-progress"
                                            : "status-not-started";

                                const levelBadgeClass = `level-badge level-${(skill.level || "beginner").toLowerCase()}`;

                                return (
                                    <div className="skill-card" key={skill.id}>
                                        {/* HEADER */}
                                        <div className="skill-card-header">
                                            <div className="skill-title-group">
                                                <h3>{skill.skill_name}</h3>
                                                <span className={levelBadgeClass}>{skill.level}</span>
                                            </div>
                                            <span className={`status-badge ${statusClass}`}>
                                                {statusLabel}
                                            </span>
                                        </div>

                                        {/* PROGRESS SECTION */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                                <span style={{ color: "var(--text-muted)" }}>Progress</span>
                                                <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{skill.progress}%</span>
                                            </div>
                                            <div className="progress-track">
                                                <div
                                                    className="progress-fill-animated"
                                                    style={{ width: `${Math.min(100, Math.max(0, skillProgress))}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="skill-card-actions">
                                            <button
                                                type="button"
                                                className="action-btn edit"
                                                onClick={() => handleEdit(skill)}
                                                disabled={loading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="action-btn delete"
                                                onClick={() => handleDelete(skill.id)}
                                                disabled={loading}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

export default MySkills;
