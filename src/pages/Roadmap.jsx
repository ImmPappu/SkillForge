import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Roadmap() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadRoadmap();
    }, []);

    const loadRoadmap = async () => {
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
            setError("You are not logged in.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("roadmap_items")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("order_number", { ascending: true });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setItems(data || []);
        setLoading(false);
    };

    const getStatusClass = (status) => {
        if (status === "completed") return "completed";
        if (status === "current") return "current";
        return "locked";
    };

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <main className="main-content">
                    <div className="page-container" style={{ textAlign: "center", paddingTop: "80px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "18px" }}>Loading your roadmap...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Sidebar />

            <main className="main-content">
                <div className="page-container">

                    {/* HEADER */}
                    <div className="page-header">
                        <div>
                            <span className="section-label">YOUR LEARNING PATH</span>
                            <h1>Learning Roadmap</h1>
                            <p className="page-subtitle">
                                Follow your personalized path toward your target role.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="toast-message toast-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {items.length === 0 ? (
                        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
                            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Your roadmap is not ready yet</h2>
                            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                                Your personalized learning roadmap will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="roadmap-timeline">
                            {items.map((item) => {
                                const statusClass = getStatusClass(item.status);
                                return (
                                    <div
                                        className={`roadmap-item ${statusClass}`}
                                        key={item.id}
                                    >
                                        <div className="timeline-node">
                                            {item.status === "completed" ? "✓" : item.order_number}
                                        </div>

                                        <div className="roadmap-card">
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                                <div>
                                                    <span className="section-label" style={{ fontSize: "11px", marginBottom: "4px" }}>
                                                        {item.category}
                                                    </span>
                                                    <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "0" }}>
                                                        {item.title}
                                                    </h2>
                                                </div>

                                                <span className={`status-badge ${
                                                    item.status === "completed" 
                                                        ? "status-completed" 
                                                        : item.status === "current" 
                                                            ? "status-in-progress" 
                                                            : "status-not-started"
                                                }`} style={{ textTransform: "capitalize" }}>
                                                    {item.status}
                                                </span>
                                            </div>

                                            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "18px" }}>
                                                {item.description}
                                            </p>

                                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Progress</span>
                                                    <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{item.progress}%</span>
                                                </div>
                                                <div className="progress-track">
                                                    <div
                                                        className="progress-fill-animated"
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                            </div>
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

export default Roadmap;