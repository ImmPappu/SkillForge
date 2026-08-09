import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

function Signup() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        college: "",
        branch: "",
        year: "",
        target_role: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        setError("");

        if (
            !formData.name ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword ||
            !formData.college ||
            !formData.branch ||
            !formData.year ||
            !formData.target_role
        ) {
            setError("Please fill all fields.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        // Create Auth account
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (!data.user) {
            setError("Something went wrong. Please try again.");
            setLoading(false);
            return;
        }

        // Create profile
        const { error: profileError } = await supabase
            .from("profiles")
            .insert({
                id: data.user.id,
                name: formData.name,
                email: formData.email,
                college: formData.college,
                branch: formData.branch,
                year: Number(formData.year),
                target_role: formData.target_role,
            });

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
        }

        navigate("/dashboard");

        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card wide">

                <div className="auth-header">
                    <div className="logo">
                        Skill<span>Forge</span>
                    </div>
                    <h2>Create your account</h2>
                    <p>Start your personalized technical learning journey</p>
                </div>

                <form onSubmit={handleSignup}>

                    <div className="form-grid">

                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="college">College / University</label>
                            <input
                                type="text"
                                id="college"
                                name="college"
                                placeholder="e.g. Stanford University"
                                value={formData.college}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="branch">Branch / Major</label>
                            <input
                                type="text"
                                id="branch"
                                name="branch"
                                placeholder="Computer Science"
                                value={formData.branch}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="year">Academic Year / Graduation Year</label>
                            <input
                                type="number"
                                id="year"
                                name="year"
                                placeholder="2026"
                                value={formData.year}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="target_role">Target Role</label>
                            <input
                                type="text"
                                id="target_role"
                                name="target_role"
                                placeholder="Full Stack Engineer"
                                value={formData.target_role}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="At least 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                    </div>

                    {error && (
                        <div className="toast-message toast-error" style={{ marginTop: "20px", marginBottom: 0 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: "100%", padding: "14px", marginTop: "24px" }}
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>

                </form>

                <div className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login">Login</Link>
                </div>

            </div>
        </div>
    );
}

export default Signup;