import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // =====================================================
    // CHECK EXISTING SESSION
    // =====================================================

    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (!mounted) return;

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            // Already logged in
            if (session) {
                navigate("/dashboard", {
                    replace: true
                });
                return;
            }

            setLoading(false);
        };

        checkSession();

        // =================================================
        // LISTEN FOR AUTH CHANGES
        // =================================================

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            (event, session) => {

                if (!mounted) return;

                if (
                    event === "SIGNED_IN" &&
                    session
                ) {
                    navigate("/dashboard", {
                        replace: true
                    });
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [navigate]);

    // =====================================================
    // LOGIN
    // =====================================================

    const handleLogin = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError("");

        // Clean email
        const cleanEmail = email.trim().toLowerCase();

        // =================================================
        // VALIDATION
        // =================================================

        if (!cleanEmail) {
            setError("Please enter your email.");
            return;
        }

        if (!cleanEmail.includes("@")) {
            setError("Please enter a valid email.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            // =================================================
            // SUPABASE LOGIN
            // =================================================

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password
            });

            if (error) {
                const message = error.message.toLowerCase();

                // Email not confirmed
                if (
                    message.includes("email not confirmed")
                ) {
                    setError(
                        "Please verify your email before logging in."
                    );
                }

                // Invalid login
                else if (
                    message.includes("invalid login credentials")
                ) {
                    setError(
                        "Invalid email or password."
                    );
                }

                // Other Supabase errors
                else {
                    setError(error.message);
                }

                setLoading(false);
                return;
            }

            // =================================================
            // VERIFY SESSION
            // =================================================

            if (!data.session || !data.user) {
                setError(
                    "Login failed. Please try again."
                );

                setLoading(false);
                return;
            }

            // =================================================
            // SUCCESS
            // =================================================

            navigate("/dashboard", {
                replace: true
            });

        } catch (err) {

            setError(
                err?.message ||
                "Something went wrong. Please try again."
            );

            setLoading(false);
        }
    };

    // =====================================================
    // SIGNUP
    // =====================================================

    const handleSignup = () => {
        navigate("/signup");
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-header">
                    <div className="logo">
                        Skill<span>Forge</span>
                    </div>
                    <h2>Welcome back</h2>
                    <p>Enter your credentials to access your account</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError("");
                            }}
                            autoComplete="email"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                            }}
                            autoComplete="current-password"
                            disabled={loading}
                            required
                        />
                    </div>

                    {error && (
                        <div className="toast-message toast-error" style={{ margin: 0 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: "100%", padding: "14px", marginTop: "8px" }}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                <div className="auth-footer">
                    Don't have an account?{" "}
                    <button
                        type="button"
                        onClick={handleSignup}
                        disabled={loading}
                    >
                        Sign up
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Login;