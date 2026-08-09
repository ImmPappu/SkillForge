import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Projects() {
    const [projects, setProjects] = useState([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [techStack, setTechStack] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [liveUrl, setLiveUrl] = useState("");
    const [status, setStatus] = useState("Not Started");
    const [progress, setProgress] = useState(0);

    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadProjects();
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
    // LOAD PROJECTS
    // =====================================================

    const loadProjects = async () => {
        setFetching(true);
        setError("");

        try {
            const user = await getCurrentUser();

            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw new Error(error.message);
            }

            setProjects(data || []);

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
        setTitle("");
        setDescription("");
        setTechStack("");
        setGithubUrl("");
        setLiveUrl("");
        setStatus("Not Started");
        setProgress(0);
        setEditingId(null);
    };

    // =====================================================
    // URL VALIDATION
    // =====================================================

    const isValidUrl = (value) => {
        if (!value.trim()) {
            return true;
        }

        try {
            const url = new URL(value);

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );
        } catch {
            return false;
        }
    };

    // =====================================================
    // FORM VALIDATION
    // =====================================================

    const validateForm = () => {
        if (!title.trim()) {
            return "Project title is required.";
        }

        if (title.trim().length > 100) {
            return "Project title cannot exceed 100 characters.";
        }

        if (description.length > 1000) {
            return "Description cannot exceed 1000 characters.";
        }

        if (techStack.length > 300) {
            return "Tech stack cannot exceed 300 characters.";
        }

        if (!isValidUrl(githubUrl)) {
            return "Please enter a valid GitHub URL.";
        }

        if (!isValidUrl(liveUrl)) {
            return "Please enter a valid live project URL.";
        }

        const progressNumber = Number(progress);

        if (
            Number.isNaN(progressNumber) ||
            progressNumber < 0 ||
            progressNumber > 100
        ) {
            return "Progress must be between 0 and 100.";
        }

        const validStatuses = [
            "Not Started",
            "In Progress",
            "Completed"
        ];

        if (!validStatuses.includes(status)) {
            return "Please select a valid status.";
        }

        return null;
    };

    // =====================================================
    // DUPLICATE PROJECT CHECK
    // =====================================================

    const projectAlreadyExists = (
        projectTitle,
        currentId = null
    ) => {
        return projects.some(
            (project) =>
                project.title.trim().toLowerCase() ===
                projectTitle.trim().toLowerCase() &&
                project.id !== currentId
        );
    };

    // =====================================================
    // ADD / UPDATE PROJECT
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

        const cleanTitle = title.trim();

        if (
            projectAlreadyExists(
                cleanTitle,
                editingId
            )
        ) {
            setError(
                "A project with this name already exists."
            );
            return;
        }

        setLoading(true);

        try {
            const user = await getCurrentUser();

            const projectData = {
                title: cleanTitle,
                description: description.trim(),
                tech_stack: techStack.trim(),
                github_url: githubUrl.trim() || null,
                live_url: liveUrl.trim() || null,
                status,
                progress: Number(progress),
                updated_at: new Date().toISOString()
            };

            // UPDATE
            if (editingId) {
                const { error } = await supabase
                    .from("projects")
                    .update(projectData)
                    .eq("id", editingId)
                    .eq("user_id", user.id);

                if (error) {
                    throw new Error(error.message);
                }

                setSuccess(
                    "Project updated successfully."
                );
            }

            // INSERT
            else {
                const { error } = await supabase
                    .from("projects")
                    .insert({
                        ...projectData,
                        user_id: user.id
                    });

                if (error) {
                    throw new Error(error.message);
                }

                setSuccess(
                    "Project added successfully."
                );
            }

            resetForm();
            await loadProjects();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // EDIT PROJECT
    // =====================================================

    const handleEdit = (project) => {
        setEditingId(project.id);

        setTitle(project.title || "");
        setDescription(project.description || "");
        setTechStack(project.tech_stack || "");
        setGithubUrl(project.github_url || "");
        setLiveUrl(project.live_url || "");
        setStatus(project.status || "Not Started");
        setProgress(project.progress || 0);

        setError("");
        setSuccess("");

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
    // DELETE PROJECT
    // =====================================================

    const handleDelete = async (projectId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this project?"
        );

        if (!confirmed) {
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const user = await getCurrentUser();

            const { error } = await supabase
                .from("projects")
                .delete()
                .eq("id", projectId)
                .eq("user_id", user.id);

            if (error) {
                throw new Error(error.message);
            }

            if (editingId === projectId) {
                resetForm();
            }

            setSuccess(
                "Project deleted successfully."
            );

            await loadProjects();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // STATUS CLASS
    // =====================================================

    const getStatusClass = (projectStatus) => {
        if (projectStatus === "Completed") {
            return "status-completed";
        }

        if (projectStatus === "In Progress") {
            return "status-in-progress";
        }

        return "status-not-started";
    };

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
                            <span className="section-label">PORTFOLIO & WORK</span>
                            <h1>Projects</h1>
                            <p className="page-subtitle">
                                Build, track and manage your projects.
                            </p>
                        </div>
                    </div>

                    {/* FORM CARD */}
                    <div className="card" style={{ marginBottom: "32px" }}>
                        <div className="card-header">
                            <div>
                                <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>
                                    {editingId ? "Edit Project" : "Add New Project"}
                                </h2>
                                {editingId && (
                                    <p style={{ color: "var(--accent-purple-light)", fontSize: "13px" }}>
                                        Editing existing project details
                                    </p>
                                )}
                            </div>
                        </div>

                        <form className="form-grid" onSubmit={handleSubmit} style={{ marginTop: "16px" }}>

                            {/* TITLE */}
                            <div className="form-group full">
                                <label htmlFor="projectTitle">Project Title</label>
                                <input
                                    id="projectTitle"
                                    type="text"
                                    placeholder="e.g. Hostel Management System"
                                    value={title}
                                    maxLength={100}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* DESCRIPTION */}
                            <div className="form-group full">
                                <label htmlFor="projectDesc">Description</label>
                                <textarea
                                    id="projectDesc"
                                    placeholder="Describe your project, key features and functionality..."
                                    value={description}
                                    maxLength={1000}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* TECH STACK */}
                            <div className="form-group">
                                <label htmlFor="projectTech">Tech Stack</label>
                                <input
                                    id="projectTech"
                                    type="text"
                                    placeholder="Java, Spring Boot, MySQL"
                                    value={techStack}
                                    maxLength={300}
                                    onChange={(e) => setTechStack(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* STATUS */}
                            <div className="form-group">
                                <label htmlFor="projectStatusSelect">Status</label>
                                <select
                                    id="projectStatusSelect"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="Not Started">Not Started</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            {/* GITHUB */}
                            <div className="form-group">
                                <label htmlFor="githubUrlInput">GitHub URL</label>
                                <input
                                    id="githubUrlInput"
                                    type="url"
                                    placeholder="https://github.com/username/project"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* LIVE */}
                            <div className="form-group">
                                <label htmlFor="liveUrlInput">Live Project URL</label>
                                <input
                                    id="liveUrlInput"
                                    type="url"
                                    placeholder="https://yourproject.com"
                                    value={liveUrl}
                                    onChange={(e) => setLiveUrl(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* PROGRESS */}
                            <div className="form-group full">
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <label htmlFor="projectProgressRange">Progress</label>
                                    <span style={{ color: "var(--accent-purple-light)", fontWeight: "bold" }}>
                                        {progress}%
                                    </span>
                                </div>
                                <input
                                    id="projectProgressRange"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    disabled={loading}
                                    style={{ accentColor: "var(--accent-purple)", cursor: "pointer" }}
                                />
                            </div>

                            {/* BUTTONS */}
                            <div className="form-group full" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : editingId ? "Update Project" : "Add Project"}
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

                    {/* SECTION HEADER */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>My Projects</h2>
                        <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                            {projects.length} {projects.length === 1 ? "Project" : "Projects"}
                        </span>
                    </div>

                    {/* PROJECTS GRID */}
                    <div className="projects-grid">
                        {fetching ? (
                            <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>
                                Loading projects...
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px" }}>
                                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚀</div>
                                <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No projects yet</h3>
                                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                                    Add your first project using the form above.
                                </p>
                            </div>
                        ) : (
                            projects.map((project) => (
                                <div className="project-card" key={project.id}>

                                    {/* TOP */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                                            {project.title}
                                        </h3>
                                        <span className={`status-badge ${getStatusClass(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    {/* DESCRIPTION */}
                                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", margin: "4px 0" }}>
                                        {project.description || "No description added."}
                                    </p>

                                    {/* TECH STACK */}
                                    <div className="tech-tags">
                                        {project.tech_stack
                                            ? project.tech_stack.split(",").map((tech, index) => (
                                                <span className="tech-tag" key={index}>
                                                    {tech.trim()}
                                                </span>
                                            ))
                                            : <span className="tech-tag">No tech stack</span>
                                        }
                                    </div>

                                    {/* PROGRESS */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Progress</span>
                                            <span style={{ color: "var(--accent-purple-light)", fontWeight: "bold" }}>
                                                {project.progress || 0}%
                                            </span>
                                        </div>
                                        <div className="progress-track">
                                            <div
                                                className="progress-fill-animated"
                                                style={{ width: `${Math.min(100, Math.max(0, Number(project.progress || 0)))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* LINKS */}
                                    {(project.github_url || project.live_url) && (
                                        <div className="project-links">
                                            {project.github_url && (
                                                <a className="project-link-btn" href={project.github_url} target="_blank" rel="noreferrer">
                                                    GitHub ↗
                                                </a>
                                            )}
                                            {project.live_url && (
                                                <a className="project-link-btn" href={project.live_url} target="_blank" rel="noreferrer">
                                                    Live Project ↗
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIONS */}
                                    <div className="skill-card-actions" style={{ marginTop: "auto" }}>
                                        <button
                                            type="button"
                                            className="action-btn edit"
                                            onClick={() => handleEdit(project)}
                                            disabled={loading}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn delete"
                                            onClick={() => handleDelete(project.id)}
                                            disabled={loading}
                                        >
                                            Delete
                                        </button>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}

export default Projects;