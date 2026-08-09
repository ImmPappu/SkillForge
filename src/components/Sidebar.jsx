import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../lib/supabase";

function Sidebar({ onLogout }) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogoutClick = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await supabase.auth.signOut();
            window.location.href = "/login";
        }
    };

    const navItems = [
        { path: "/dashboard", label: "Dashboard", icon: "🏠" },
        { path: "/skills", label: "My Skills", icon: "💡" },
        { path: "/roadmap", label: "Roadmap", icon: "🗺️" },
        { path: "/projects", label: "Projects", icon: "🚀" },
        { path: "/assessments", label: "Assessments", icon: "📄" },
        { path: "/profile", label: "Profile", icon: "👤" },
    ];

    return (
        <>
            {/* MOBILE TOP BAR */}
            <div className="mobile-top-bar">
                <div className="logo">
                    Skill<span>Forge</span>
                </div>
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle Navigation"
                >
                    {mobileOpen ? "✕" : "☰"}
                </button>
            </div>

            {/* SIDEBAR CONTAINER */}
            <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-brand">
                    <Link to="/dashboard" className="logo">
                        Skill<span>Forge</span>
                    </Link>
                    <span className="brand-badge">PRO</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? "active" : ""}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                                {isActive && <span className="nav-indicator" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="logout-btn"
                        onClick={handleLogoutClick}
                    >
                        <span className="nav-icon">🚪</span>
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE OVERLAY */}
            {mobileOpen && (
                <div
                    className="sidebar-mobile-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </>
    );
}

export default Sidebar;
