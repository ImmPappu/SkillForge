import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Dashboard() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [skills, setSkills] = useState([]);
    const [projects, setProjects] = useState([]);
    const [roadmap, setRoadmap] = useState([]);
    const [assessmentAttempts, setAssessmentAttempts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [currentUser, setCurrentUser] = useState(null);

    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    const loadDashboard = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            setError("");

            // =========================================
            // CURRENT USER
            // =========================================

            const {
                data: { user },
                error: userError
            } = await supabase.auth.getUser();

            if (userError) {
                throw new Error(userError.message);
            }

            if (!user) {
                navigate("/login", {
                    replace: true
                });
                return;
            }

            setCurrentUser(user);

            // =========================================
            // FETCH ALL DASHBOARD DATA
            // =========================================


            const [
                profileResult,
                skillsResult,
                projectsResult,
                roadmapResult,
                attemptsResult
            ] = await Promise.all([
                // Profile
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single(),

                // Skills
                supabase
                    .from("skills")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false
                    }),

                // Projects
                supabase
                    .from("projects")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false
                    }),

                // Roadmap
                supabase
                    .from("roadmap_items")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("order_number", {
                        ascending: true
                    }),

                // Assessment attempts
                supabase
                    .from("assessment_attempts")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false
                    })
            ]);

            if (profileResult.error) {
                throw new Error(profileResult.error.message);
            }

            if (skillsResult.error) {
                throw new Error(skillsResult.error.message);
            }

            if (projectsResult.error) {
                throw new Error(projectsResult.error.message);
            }

            if (roadmapResult.error) {
                throw new Error(roadmapResult.error.message);
            }

            if (attemptsResult.error) {
                throw new Error(attemptsResult.error.message);
            }

            setProfile(profileResult.data);
            setSkills(skillsResult.data || []);
            setProjects(projectsResult.data || []);
            setRoadmap(roadmapResult.data || []);
            setAssessmentAttempts(attemptsResult.data || []);

        } catch (err) {
            console.error("Dashboard error:", err);

            setError(
                err?.message ||
                "Unable to load dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!mounted) return;
            await loadDashboard(true);
        };

        load();

        // ================================================
        // AUTH STATE LISTENER
        // ================================================

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (
                    event === "SIGNED_OUT" ||
                    !session
                ) {
                    navigate("/login", {
                        replace: true
                    });
                }
            }
        );

        // Refresh dashboard when user returns from another page
        const handleFocus = () => {
            loadDashboard(false);
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            window.removeEventListener("focus", handleFocus);
        };
    }, [navigate]);

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = async () => {
        setError("");

        const { error } =
            await supabase.auth.signOut();

        if (error) {
            setError(error.message);
            return;
        }

        navigate("/login", {
            replace: true
        });
    };

    // =====================================================
    // CALCULATE OVERALL PROGRESS
    // =====================================================

    const calculateOverallProgress = () => {
        if (roadmap.length === 0) {
            return 0;
        }

        const totalProgress = roadmap.reduce(
            (total, item) =>
                total + Number(item.progress || 0),
            0
        );

        return Math.round(
            totalProgress / roadmap.length
        );
    };

    // =====================================================
    // ASSESSMENT DATA
    // =====================================================

    const completedAssessments = assessmentAttempts.filter(
        (attempt) => attempt.completed_at
    );

    const latestAssessment = completedAssessments[0] || null;

    // =====================================================
    // ROADMAP PREVIEW
    // =====================================================

    const roadmapPreview = roadmap.slice(0, 4);

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container" style={{ textAlign: "center", paddingTop: "80px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "18px" }}>Loading dashboard...</p>
                    </div>
                </main>
            </div>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (error && !profile) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <h1>Unable to load dashboard</h1>
                        <p className="toast-message toast-error">{error}</p>
                        <button className="btn-primary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // =====================================================
    // PROFILE NOT FOUND
    // =====================================================

    if (!profile) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <h1>Profile not found</h1>
                        <p style={{ color: "var(--text-secondary)" }}>Your profile could not be loaded.</p>
                        <button className="btn-primary" onClick={handleLogout} style={{ marginTop: "20px" }}>
                            Logout
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // =====================================================
    // DASHBOARD
    // =====================================================

    return (
        <div
            className="app-shell"
            data-assessment-attempts={assessmentAttempts.length}
            data-completed-assessments={completedAssessments.length}
            data-latest-assessment-score={latestAssessment?.percentage ?? 0}
        >
            <Sidebar onLogout={handleLogout} />

            <main className="main-content">
                <div className="page-container">

                    {/* TOP HEADER */}
                    <header className="page-header">
                        <div>
                            <span className="section-label">OVERVIEW</span>
                            <h1>Dashboard</h1>
                            <p className="page-subtitle">Your learning journey at a glance.</p>
                        </div>

                        <div className="profile-mini-bar">
                            <div className="avatar">
                                {(profile?.avatar_url || profile?.avatar || profile?.photo_url || currentUser?.user_metadata?.avatar_url) ? (
                                    <img
                                        src={profile?.avatar_url || profile?.avatar || profile?.photo_url || currentUser?.user_metadata?.avatar_url}
                                        alt={profile?.name || "User Avatar"}
                                        className="avatar-img"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                            if (e.currentTarget.parentElement) {
                                                e.currentTarget.parentElement.innerText = profile?.name ? profile.name.charAt(0).toUpperCase() : "P";
                                            }
                                        }}
                                    />
                                ) : (
                                    <span>{profile?.name ? profile.name.charAt(0).toUpperCase() : "P"}</span>
                                )}
                            </div>
                            <div>
                                <strong style={{ display: "block", color: "var(--text-primary)" }}>
                                    {profile?.name}
                                </strong>
                                <small style={{ color: "var(--text-muted)" }}>
                                    {profile?.target_role}
                                </small>
                            </div>
                        </div>
                    </header>

                    {error && <div className="toast-message toast-error">{error}</div>}

                    {/* WELCOME */}
                    <section className="welcome-card">
                        <div>
                            <span className="section-label">WELCOME BACK</span>
                            <h2>Hello, {profile.name?.split(" ")[0]} 👋</h2>
                            <p>
                                Keep learning and build your path toward becoming a{" "}
                                <strong style={{ color: "var(--accent-purple-light)" }}>
                                    {profile.target_role}
                                </strong>.
                            </p>
                        </div>
                        <div className="welcome-icon">🚀</div>
                    </section>

                    {/* STATS GRID */}
                    <section className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon-wrapper">🎯</div>
                            <div>
                                <p>Target Role</p>
                                <h3>{profile.target_role}</h3>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon-wrapper">📚</div>
                            <div>
                                <p>Skills</p>
                                <h3>{skills.length}</h3>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon-wrapper">🚀</div>
                            <div>
                                <p>Projects</p>
                                <h3>{projects.length}</h3>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon-wrapper">📊</div>
                            <div>
                                <p>Progress</p>
                                <h3>{calculateOverallProgress()}%</h3>
                            </div>
                        </div>
                    </section>

                    {/* CONTENT GRID */}
                    <section className="dashboard-content-grid">

                        {/* PROFILE CARD */}
                        <div className="card">
                            <div className="card-header">
                                <h2>Your Profile</h2>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: "6px 14px", fontSize: "13px" }}
                                    onClick={() => navigate("/profile")}
                                >
                                    Edit Profile
                                </button>
                            </div>

                            <div className="profile-info">
                                <div className="profile-info-row">
                                    <span>Name</span>
                                    <strong>{profile.name}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Email</span>
                                    <strong>{profile.email}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>College</span>
                                    <strong>{profile.college}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Branch</span>
                                    <strong>{profile.branch}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Year</span>
                                    <strong>{profile.year}</strong>
                                </div>
                            </div>
                        </div>

                        {/* ROADMAP PREVIEW CARD */}
                        <div className="card">
                            <div className="card-header">
                                <h2>Learning Roadmap</h2>
                                <Link
                                    to="/roadmap"
                                    className="btn-secondary"
                                    style={{ padding: "6px 14px", fontSize: "13px" }}
                                >
                                    View All
                                </Link>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {roadmapPreview.length === 0 ? (
                                    <p style={{ color: "var(--text-muted)" }}>
                                        No roadmap available yet.
                                    </p>
                                ) : (
                                    roadmapPreview.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "14px",
                                                padding: "12px 14px",
                                                borderRadius: "12px",
                                                background: "var(--bg-surface)",
                                                border: "1px solid var(--border-subtle)"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    background: item.status === "completed" ? "var(--success-bg)" : "var(--bg-card)",
                                                    color: item.status === "completed" ? "var(--success)" : "var(--text-muted)",
                                                    border: "1px solid " + (item.status === "completed" ? "var(--success)" : "var(--border-subtle)"),
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "13px",
                                                    fontWeight: "bold"
                                                }}
                                            >
                                                {item.status === "completed" ? "✓" : item.order_number}
                                            </div>
                                            <div>
                                                <strong style={{ display: "block", fontSize: "14px", color: "var(--text-primary)" }}>
                                                    {item.title}
                                                </strong>
                                                <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                                                    {item.category} • {item.progress}%
                                                </small>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </section>

                </div>
            </main>
        </div>
    );
}

export default Dashboard;
