import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Assessments() {
    const navigate = useNavigate();

    // =========================
    // USER
    // =========================

    const [user, setUser] = useState(null);

    // =========================
    // ASSESSMENTS
    // =========================

    const [assessments, setAssessments] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    // =========================
    // QUESTIONS
    // =========================

    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);

    // =========================
    // CURRENT ATTEMPT
    // =========================

    const [attemptId, setAttemptId] = useState(null);
    const [answers, setAnswers] = useState({});

    // =========================
    // PREVIOUS ATTEMPTS
    // =========================

    const [attempts, setAttempts] = useState([]);

    // =========================
    // RESULT
    // =========================

    const [result, setResult] = useState(null);

    // =========================
    // LOADING / ERROR
    // =========================

    const [loading, setLoading] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [savingAnswer, setSavingAnswer] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // =========================================================
    // INITIALIZE
    // =========================================================

    useEffect(() => {
        initialize();
    }, []);

    const initialize = async () => {
        setLoading(true);
        setError("");

        try {
            // -------------------------
            // GET LOGGED-IN USER
            // -------------------------

            const {
                data: { user: currentUser },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!currentUser) {
                navigate("/login");
                return;
            }

            setUser(currentUser);

            // -------------------------
            // LOAD ASSESSMENTS
            // -------------------------

            const {
                data: assessmentData,
                error: assessmentError,
            } = await supabase
                .from("assessments")
                .select("*")
                .order("created_at", {
                    ascending: true,
                });

            if (assessmentError) {
                throw assessmentError;
            }

            setAssessments(assessmentData || []);

            // -------------------------
            // LOAD USER ATTEMPTS
            // -------------------------

            const {
                data: attemptData,
                error: attemptError,
            } = await supabase
                .from("assessment_attempts")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", {
                    ascending: false,
                });

            if (attemptError) {
                console.log(
                    "Attempt history error:",
                    attemptError
                );
            } else {
                setAttempts(attemptData || []);
            }
        } catch (err) {
            console.error("Initialization error:", err);
            setError(
                err?.message ||
                "Failed to load assessments."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // LOAD ASSESSMENT
    // =========================================================

    const loadAssessment = async (assessment) => {
        if (!user || !assessment) {
            return;
        }

        setLoadingQuestions(true);
        setError("");
        setResult(null);

        setSelectedAssessment(assessment);
        setQuestions([]);
        setAnswers({});
        setAttemptId(null);
        setCurrentQuestion(0);

        try {
            // -------------------------
            // LOAD QUESTIONS
            // -------------------------

            const {
                data: questionData,
                error: questionError,
            } = await supabase
                .from("assessment_questions")
                .select(
                    `
                    id,
                    assessment_id,
                    question,
                    options,
                    correct_answer,
                    question_order,
                    created_at
                    `
                )
                .eq("assessment_id", assessment.id)
                .order("question_order", {
                    ascending: true,
                });

            if (questionError) {
                throw questionError;
            }

            const loadedQuestions = questionData || [];

            setQuestions(loadedQuestions);

            // No questions
            if (loadedQuestions.length === 0) {
                setLoadingQuestions(false);
                return;
            }

            // -------------------------
            // CHECK UNFINISHED ATTEMPT
            // -------------------------

            const {
                data: previousAttempt,
                error: previousAttemptError,
            } = await supabase
                .from("assessment_attempts")
                .select("*")
                .eq("user_id", user.id)
                .eq("assessment_id", assessment.id)
                .is("completed_at", null)
                .order("created_at", {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle();

            if (previousAttemptError) {
                console.log(
                    "Previous attempt error:",
                    previousAttemptError
                );
            }

            // -------------------------
            // RESUME ATTEMPT
            // -------------------------

            if (previousAttempt) {
                setAttemptId(previousAttempt.id);

                setAnswers(
                    previousAttempt.answers &&
                        typeof previousAttempt.answers ===
                        "object"
                        ? previousAttempt.answers
                        : {}
                );

                setLoadingQuestions(false);
                return;
            }

            // -------------------------
            // CREATE NEW ATTEMPT
            // -------------------------

            const {
                data: newAttempt,
                error: newAttemptError,
            } = await supabase
                .from("assessment_attempts")
                .insert({
                    user_id: user.id,
                    assessment_id: assessment.id,

                    score: 0,
                    total_questions:
                        loadedQuestions.length,
                    correct_answers: 0,
                    percentage: 0,
                    passed: false,

                    answers: {},

                    started_at:
                        new Date().toISOString(),

                    completed_at: null,
                })
                .select()
                .single();

            if (newAttemptError) {
                throw newAttemptError;
            }

            setAttemptId(newAttempt.id);
            setAnswers({});
            setCurrentQuestion(0);
        } catch (err) {
            console.error(
                "Load assessment error:",
                err
            );

            setError(
                err?.message ||
                "Failed to load assessment."
            );
        } finally {
            setLoadingQuestions(false);
        }
    };

    // =========================================================
    // SELECT ANSWER
    // =========================================================

    const handleAnswer = async (answerIndex) => {
        const question = questions[currentQuestion];

        if (!question || !attemptId || !user) {
            return;
        }

        // Make sure index is numeric
        const numericAnswer = Number(answerIndex);

        if (Number.isNaN(numericAnswer)) {
            return;
        }

        // -------------------------
        // UPDATE LOCAL ANSWERS
        // -------------------------

        const updatedAnswers = {
            ...answers,
            [question.id]: numericAnswer,
        };

        setAnswers(updatedAnswers);

        // -------------------------
        // SAVE TO SUPABASE
        // -------------------------

        setSavingAnswer(true);
        setError("");

        try {
            const { error: saveError } =
                await supabase
                    .from("assessment_attempts")
                    .update({
                        answers: updatedAnswers,
                    })
                    .eq("id", attemptId)
                    .eq("user_id", user.id)
                    .is("completed_at", null);

            if (saveError) {
                throw saveError;
            }
        } catch (err) {
            console.error(
                "Answer save error:",
                err
            );

            setError(
                err?.message ||
                "Failed to save answer."
            );
        } finally {
            setSavingAnswer(false);
        }
    };

    // =========================================================
    // NEXT
    // =========================================================

    const handleNext = () => {
        if (
            currentQuestion <
            questions.length - 1
        ) {
            setCurrentQuestion(
                (previous) => previous + 1
            );
        }
    };

    // =========================================================
    // PREVIOUS
    // =========================================================

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(
                (previous) => previous - 1
            );
        }
    };

    // =========================================================
    // SUBMIT ASSESSMENT
    // =========================================================

    const handleSubmit = async () => {
        if (
            !user ||
            !selectedAssessment ||
            !attemptId ||
            questions.length === 0
        ) {
            return;
        }

        // -------------------------
        // CHECK ALL ANSWERS
        // -------------------------

        const unanswered = questions.filter(
            (question) =>
                answers[question.id] === undefined ||
                answers[question.id] === null
        );

        if (unanswered.length > 0) {
            setError(
                `Please answer all questions. ${unanswered.length} question(s) remaining.`
            );
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            // -------------------------
            // CALCULATE SCORE
            // -------------------------

            let correctAnswers = 0;

            questions.forEach((question) => {
                const userAnswer = Number(
                    answers[question.id]
                );

                const correctAnswer = Number(
                    question.correct_answer
                );

                if (
                    !Number.isNaN(userAnswer) &&
                    !Number.isNaN(correctAnswer) &&
                    userAnswer === correctAnswer
                ) {
                    correctAnswers++;
                }
            });

            const totalQuestions =
                questions.length;

            const percentage =
                totalQuestions > 0
                    ? Math.round(
                        (correctAnswers /
                            totalQuestions) *
                        100
                    )
                    : 0;

            // IMPORTANT:
            // Use selectedAssessment, NOT assessment
            const passingScore = Number(
                selectedAssessment.passing_score
            );

            const passed =
                percentage >= passingScore;

            // -------------------------
            // SAVE FINAL RESULT
            // -------------------------

            const {
                data: updatedAttempt,
                error: updateError,
            } = await supabase
                .from("assessment_attempts")
                .update({
                    score: correctAnswers,

                    total_questions:
                        totalQuestions,

                    correct_answers:
                        correctAnswers,

                    percentage: percentage,

                    passed: passed,

                    answers: answers,

                    completed_at:
                        new Date().toISOString(),
                })
                .eq("id", attemptId)
                .eq("user_id", user.id)
                .is("completed_at", null)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            // -------------------------
            // SHOW RESULT
            // -------------------------

            setResult({
                score: correctAnswers,
                total: totalQuestions,
                percentage: percentage,
                passed: passed,
                attempt: updatedAttempt,
            });

            // -------------------------
            // REFRESH ATTEMPTS
            // -------------------------

            await loadAttempts();
        } catch (err) {
            console.error(
                "Submit error:",
                err
            );

            setError(
                err?.message ||
                "Failed to submit assessment."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // =========================================================
    // LOAD ATTEMPTS
    // =========================================================

    const loadAttempts = async () => {
        if (!user) {
            return;
        }

        try {
            const {
                data,
                error: attemptError,
            } = await supabase
                .from("assessment_attempts")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false,
                });

            if (attemptError) {
                throw attemptError;
            }

            setAttempts(data || []);
        } catch (err) {
            console.error(
                "Attempt history error:",
                err
            );
        }
    };

    // =========================================================
    // RETAKE
    // =========================================================

    const handleRetake = async () => {
        if (
            !user ||
            !selectedAssessment ||
            questions.length === 0
        ) {
            return;
        }

        setLoadingQuestions(true);
        setError("");

        try {
            // -------------------------
            // CREATE FRESH ATTEMPT
            // -------------------------

            const {
                data: newAttempt,
                error: newAttemptError,
            } = await supabase
                .from("assessment_attempts")
                .insert({
                    user_id: user.id,

                    assessment_id:
                        selectedAssessment.id,

                    score: 0,

                    total_questions:
                        questions.length,

                    correct_answers: 0,

                    percentage: 0,

                    passed: false,

                    answers: {},

                    started_at:
                        new Date().toISOString(),

                    completed_at: null,
                })
                .select()
                .single();

            if (newAttemptError) {
                throw newAttemptError;
            }

            setAttemptId(newAttempt.id);
            setAnswers({});
            setCurrentQuestion(0);
            setResult(null);

            await loadAttempts();
        } catch (err) {
            console.error(
                "Retake error:",
                err
            );

            setError(
                err?.message ||
                "Failed to start retake."
            );
        } finally {
            setLoadingQuestions(false);
        }
    };

    // =========================================================
    // BACK TO ASSESSMENTS
    // =========================================================

    const handleBackToAssessments = () => {
        setSelectedAssessment(null);
        setQuestions([]);
        setAnswers({});
        setAttemptId(null);
        setResult(null);
        setCurrentQuestion(0);
        setError("");
    };

    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <div className="page-header">
                            <div>
                                <span className="section-label">ASSESSMENTS</span>
                                <h1>Assessments</h1>
                                <p className="page-subtitle">Test your knowledge and track your progress.</p>
                            </div>
                        </div>

                        <div className="assessments-grid">
                            <div className="card" style={{ opacity: 0.6 }}>
                                <div style={{ height: "24px", background: "var(--bg-surface)", borderRadius: "6px", width: "60%", marginBottom: "12px" }} />
                                <div style={{ height: "16px", background: "var(--bg-surface)", borderRadius: "4px", width: "90%", marginBottom: "20px" }} />
                                <div style={{ height: "40px", background: "var(--bg-surface)", borderRadius: "8px" }} />
                            </div>
                            <div className="card" style={{ opacity: 0.6 }}>
                                <div style={{ height: "24px", background: "var(--bg-surface)", borderRadius: "6px", width: "60%", marginBottom: "12px" }} />
                                <div style={{ height: "16px", background: "var(--bg-surface)", borderRadius: "4px", width: "90%", marginBottom: "20px" }} />
                                <div style={{ height: "40px", background: "var(--bg-surface)", borderRadius: "8px" }} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // MAIN ERROR
    // =========================================================

    if (error && !selectedAssessment) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <div className="card" style={{ maxWidth: "500px", margin: "40px auto", textAlign: "center" }}>
                            <h2>Something went wrong</h2>
                            <p className="toast-message toast-error" style={{ margin: "16px 0" }}>{error}</p>
                            <button className="btn-primary" onClick={initialize}>
                                Try Again
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // ASSESSMENT LIST
    // =========================================================

    if (!selectedAssessment) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />

                <main className="main-content">
                    <div className="page-container">

                        {/* HEADER */}
                        <div className="page-header">
                            <div>
                                <span className="section-label">ASSESSMENTS</span>
                                <h1>Assessments</h1>
                                <p className="page-subtitle">
                                    Test your knowledge and track your progress.
                                </p>
                            </div>
                        </div>

                        {/* AVAILABLE ASSESSMENTS GRID */}
                        <div style={{ marginBottom: "40px" }}>
                            {assessments.length === 0 ? (
                                <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
                                    <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
                                        No assessments available right now.
                                    </p>
                                </div>
                            ) : (
                                <div className="assessments-grid">
                                    {assessments.map((assessment) => {
                                        const assessmentAttempts = attempts.filter(
                                            (attempt) => attempt.assessment_id === assessment.id
                                        );

                                        const completedAttempts = assessmentAttempts.filter(
                                            (attempt) => attempt.completed_at
                                        );

                                        const bestAttempt =
                                            completedAttempts.length > 0
                                                ? Math.max(
                                                    ...completedAttempts.map((attempt) =>
                                                        Number(attempt.percentage)
                                                    )
                                                )
                                                : null;

                                        return (
                                            <div className="assessment-card" key={assessment.id}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                                    <h3 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                                                        {assessment.title}
                                                    </h3>
                                                </div>

                                                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", margin: "8px 0 14px" }}>
                                                    {assessment.description}
                                                </p>

                                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                                                    <span className="tech-tag" style={{ color: "var(--accent-purple-light)", fontWeight: "600" }}>
                                                        [ {assessment.category} ]
                                                    </span>
                                                    <span className="level-badge level-intermediate">
                                                        [ {assessment.difficulty} ]
                                                    </span>
                                                </div>

                                                <div className="assessment-meta" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "12px 0", marginBottom: "16px" }}>
                                                    <div>
                                                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "12px" }}>Passing Score</span>
                                                        <strong style={{ fontSize: "15px" }}>{assessment.passing_score}%</strong>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "12px" }}>Best Score</span>
                                                        <strong style={{ fontSize: "15px", color: bestAttempt !== null ? (bestAttempt >= Number(assessment.passing_score) ? "var(--success)" : "var(--warning)") : "var(--text-secondary)" }}>
                                                            {bestAttempt !== null ? `${bestAttempt}%` : "--"}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn-primary"
                                                    style={{ width: "100%", marginTop: "auto" }}
                                                    onClick={() => loadAssessment(assessment)}
                                                >
                                                    {completedAttempts.length > 0
                                                        ? "Retake Assessment"
                                                        : "Start Assessment"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* PREVIOUS ATTEMPTS */}
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
                                Previous Attempts
                            </h2>

                            {attempts.length === 0 ? (
                                <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                                    <p style={{ color: "var(--text-muted)" }}>
                                        No assessment attempts yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="attempts-list">
                                    {attempts.map((attempt) => {
                                        const assessment = assessments.find(
                                            (item) => item.id === attempt.assessment_id
                                        );

                                        return (
                                            <div className="attempt-row" key={attempt.id}>
                                                <div>
                                                    <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>
                                                        {assessment ? assessment.title : "Assessment"}
                                                    </strong>
                                                    <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                                                        {attempt.completed_at
                                                            ? new Date(attempt.completed_at).toLocaleString()
                                                            : "Not completed"}
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                                    <div style={{ textAlign: "right" }}>
                                                        <span style={{ display: "block", fontSize: "15px", fontWeight: "700" }}>
                                                            Score: {attempt.score} / {attempt.total_questions}
                                                        </span>
                                                        <small style={{ color: "var(--accent-purple-light)", fontWeight: "600" }}>
                                                            {attempt.percentage}%
                                                        </small>
                                                    </div>

                                                    <span className={`status-badge ${
                                                        attempt.completed_at
                                                            ? attempt.passed
                                                                ? "status-completed"
                                                                : "status-not-started"
                                                            : "status-in-progress"
                                                    }`}>
                                                        {attempt.completed_at
                                                            ? attempt.passed
                                                                ? "Passed"
                                                                : "Not Passed"
                                                            : "In Progress"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // LOADING QUESTIONS
    // =========================================================

    if (loadingQuestions) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container" style={{ textAlign: "center", paddingTop: "80px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "18px" }}>Loading assessment questions...</p>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // ASSESSMENT ERROR
    // =========================================================

    if (error) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <div className="card" style={{ maxWidth: "500px", margin: "40px auto", textAlign: "center" }}>
                            <h2>Something went wrong</h2>
                            <p className="toast-message toast-error" style={{ margin: "16px 0" }}>{error}</p>
                            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                <button className="btn-primary" onClick={() => loadAssessment(selectedAssessment)}>
                                    Try Again
                                </button>
                                <button className="btn-secondary" onClick={handleBackToAssessments}>
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // RESULT
    // =========================================================

    if (result) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <div className="quiz-container">
                            <div className="card" style={{ textAlign: "center", padding: "40px 30px" }}>
                                <span className="section-label">{selectedAssessment.title}</span>
                                <h1 style={{ fontSize: "28px", margin: "10px 0" }}>Assessment Completed</h1>

                                <div style={{
                                    display: "inline-block",
                                    padding: "8px 20px",
                                    borderRadius: "30px",
                                    background: result.passed ? "var(--success-bg)" : "var(--danger-bg)",
                                    color: result.passed ? "var(--success)" : "var(--danger)",
                                    fontSize: "18px",
                                    fontWeight: "800",
                                    margin: "16px 0 24px"
                                }}>
                                    {result.passed ? "✓ Passed" : "✕ Not Passed"}
                                </div>

                                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", margin: "20px 0 30px" }}>
                                    <div className="stat-card">
                                        <div>
                                            <p>Score</p>
                                            <h3>{result.score} / {result.total}</h3>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div>
                                            <p>Percentage</p>
                                            <h3>{result.percentage}%</h3>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div>
                                            <p>Passing Mark</p>
                                            <h3>{selectedAssessment.passing_score}%</h3>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                    <button className="btn-primary" onClick={handleRetake}>
                                        Retake Assessment
                                    </button>
                                    <button className="btn-secondary" onClick={handleBackToAssessments}>
                                        All Assessments
                                    </button>
                                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                                        Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // NO QUESTIONS
    // =========================================================

    if (questions.length === 0) {
        return (
            <div className="app-shell">
                <Sidebar onLogout={handleLogout} />
                <main className="main-content">
                    <div className="page-container">
                        <div className="card" style={{ maxWidth: "500px", margin: "40px auto", textAlign: "center" }}>
                            <h1>{selectedAssessment.title}</h1>
                            <p style={{ color: "var(--text-secondary)", margin: "16px 0" }}>
                                No questions available for this assessment.
                            </p>
                            <button className="btn-secondary" onClick={handleBackToAssessments}>
                                Back to Assessments
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================
    // CURRENT QUESTION
    // =========================================================

    const question = questions[currentQuestion];
    const selectedAnswer = answers[question.id];

    let options = [];
    if (Array.isArray(question.options)) {
        options = question.options;
    } else if (typeof question.options === "string") {
        try {
            const parsed = JSON.parse(question.options);
            if (Array.isArray(parsed)) {
                options = parsed;
            }
        } catch (err) {
            console.error("Options parse error:", err);
        }
    }

    // =========================================================
    // QUESTION UI
    // =========================================================

    return (
        <div className="app-shell">
            <Sidebar onLogout={handleLogout} />

            <main className="main-content">
                <div className="page-container">
                    <div className="quiz-container">

                        <button
                            className="btn-secondary"
                            onClick={handleBackToAssessments}
                            style={{ marginBottom: "24px", padding: "8px 16px" }}
                        >
                            ← Exit Assessment
                        </button>

                        <div className="card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <span className="section-label">{selectedAssessment.title}</span>
                                <span style={{ color: "var(--accent-purple-light)", fontWeight: "bold", fontSize: "14px" }}>
                                    Question {currentQuestion + 1} of {questions.length}
                                </span>
                            </div>

                            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px" }}>
                                {question.question}
                            </h2>

                            {options.length === 0 ? (
                                <p style={{ color: "var(--text-muted)" }}>
                                    No options available for this question.
                                </p>
                            ) : (
                                <div className="options-list">
                                    {options.map((option, index) => {
                                        const isSelected = Number(selectedAnswer) === index;
                                        return (
                                            <button
                                                key={index}
                                                className={`option-btn ${isSelected ? "selected" : ""}`}
                                                onClick={() => handleAnswer(index)}
                                                type="button"
                                            >
                                                <strong style={{ marginRight: "10px", color: isSelected ? "var(--accent-purple-light)" : "var(--text-muted)" }}>
                                                    {String.fromCharCode(65 + index)}.
                                                </strong>
                                                {option}
                                                {isSelected && <span style={{ float: "right", color: "var(--accent-purple-light)" }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {savingAnswer && (
                                <small style={{ color: "var(--text-muted)", display: "block", marginBottom: "12px" }}>
                                    Saving answer...
                                </small>
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
                                <button
                                    className="btn-secondary"
                                    onClick={handlePrevious}
                                    disabled={currentQuestion === 0}
                                >
                                    Previous
                                </button>

                                {currentQuestion < questions.length - 1 ? (
                                    <button
                                        className="btn-primary"
                                        onClick={handleNext}
                                        disabled={savingAnswer}
                                    >
                                        Next Question →
                                    </button>
                                ) : (
                                    <button
                                        className="btn-primary"
                                        onClick={handleSubmit}
                                        disabled={submitting || savingAnswer}
                                        style={{ background: "linear-gradient(135deg, var(--success), #22c55e)" }}
                                    >
                                        {submitting ? "Submitting..." : "Submit Assessment"}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

export default Assessments;