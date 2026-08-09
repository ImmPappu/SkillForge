import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [userObj, setUserObj] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarPath, setAvatarPath] = useState(null);
    const [avatarCol, setAvatarCol] = useState("avatar_url");
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        college: "",
        branch: "",
        year: "",
        target_role: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ============================================
    // LOAD PROFILE
    // ============================================

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                setError("");

                // Get logged-in user
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) {
                    throw new Error(userError.message);
                }

                if (!user) {
                    navigate("/login", { replace: true });
                    return;
                }

                setUserObj(user);

                // Get profile from database
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileError) {
                    console.error("Profile fetch error:", profileError);
                }

                // Detect avatar column name in profiles table if present
                let detectedCol = "avatar_url";
                if (profileData) {
                    if ("avatar_url" in profileData) detectedCol = "avatar_url";
                    else if ("avatar" in profileData) detectedCol = "avatar";
                    else if ("avatar_path" in profileData) detectedCol = "avatar_path";
                    else if ("photo_url" in profileData) detectedCol = "photo_url";
                }
                setAvatarCol(detectedCol);

                // Check profiles table column or Auth user_metadata fallback
                const savedAvatar =
                    profileData?.[detectedCol] ||
                    profileData?.avatar_url ||
                    profileData?.avatar ||
                    user.user_metadata?.avatar_url ||
                    null;

                const savedPath =
                    user.user_metadata?.avatar_file_path ||
                    (savedAvatar
                        ? `${user.id}/avatar.${savedAvatar.split(".").pop()?.split("?")[0]}`
                        : null);

                setAvatarUrl(savedAvatar);
                setAvatarPath(savedPath);

                if (profileData) {
                    setFormData({
                        name: profileData.name || "",
                        email: profileData.email || user.email || "",
                        college: profileData.college || "",
                        branch: profileData.branch || "",
                        year: profileData.year || "",
                        target_role: profileData.target_role || "",
                    });
                }
            } catch (err) {
                console.error("Profile loading error:", err);
                setError(err.message || "Unable to load profile.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [navigate]);

    // ============================================
    // HANDLE FILE UPLOAD (PROFILE PHOTO)
    // ============================================

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !userObj) return;

        // Reset input value to allow re-selecting same file if needed
        e.target.value = "";

        setError("");
        setSuccess("");

        // 1. Validate file format (JPG, JPEG, PNG, WEBP)
        const fileExt = file.name.split(".").pop().toLowerCase();
        const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

        if (!allowedExtensions.includes(fileExt) || !allowedTypes.includes(file.type.toLowerCase())) {
            setError("Please select a valid image file (JPG, JPEG, PNG, or WEBP).");
            return;
        }

        // 2. Validate maximum file size (5 MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setError("File size exceeds 5 MB limit. Please select a smaller file.");
            return;
        }

        // 3. Immediate local preview
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);

        setUploading(true);

        try {
            // Upload Path: ${user.id}/avatar.${extension}
            const filePath = `${userObj.id}/avatar.${fileExt}`;

            // Upload image to Supabase Storage bucket 'avatars'
            let { data: uploadData, error: uploadErr } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

            if (uploadErr && (uploadErr.message?.includes("not found") || uploadErr.message?.includes("Bucket"))) {
                await supabase.storage.createBucket("avatars", { public: true });
                const retry = await supabase.storage
                    .from("avatars")
                    .upload(filePath, file, { upsert: true });
                uploadErr = retry.error;
                uploadData = retry.data;
            }

            if (uploadErr) {
                throw uploadErr;
            }

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            // Update existing profile row in database
            const updatePayload = { [avatarCol]: publicUrl };
            const { error: profileUpdateErr } = await supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", userObj.id);

            if (profileUpdateErr) {
                console.warn("Profiles update warning:", profileUpdateErr.message);
            }

            // Update Auth user metadata
            await supabase.auth.updateUser({
                data: {
                    ...userObj.user_metadata,
                    avatar_url: publicUrl,
                    avatar_file_path: filePath,
                },
            });

            // Immediate UI update
            setAvatarUrl(publicUrl);
            setAvatarPath(filePath);
            setSuccess("Profile photo updated successfully.");
        } catch (err) {
            console.error("Avatar upload error:", err);
            setError(err.message || "Unable to upload profile photo. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // ============================================
    // REMOVE PHOTO
    // ============================================

    const handleRemovePhoto = async () => {
        if (!userObj) return;

        setUploading(true);
        setError("");
        setSuccess("");

        try {
            // Delete file from avatars bucket
            const pathsToRemove = avatarPath
                ? [avatarPath]
                : [
                    `${userObj.id}/avatar.jpg`,
                    `${userObj.id}/avatar.jpeg`,
                    `${userObj.id}/avatar.png`,
                    `${userObj.id}/avatar.webp`,
                ];

            const { error: removeStorageErr } = await supabase.storage
                .from("avatars")
                .remove(pathsToRemove);

            if (removeStorageErr) {
                console.warn("Storage remove warning:", removeStorageErr.message);
            }

            // Clear avatar field in profiles table
            const clearPayload = { [avatarCol]: null };
            await supabase
                .from("profiles")
                .update(clearPayload)
                .eq("id", userObj.id);

            // Clear avatar field in Auth user metadata
            await supabase.auth.updateUser({
                data: {
                    ...userObj.user_metadata,
                    avatar_url: null,
                    avatar_file_path: null,
                },
            });

            // Immediate UI update
            setAvatarUrl(null);
            setAvatarPath(null);
            setSuccess("Profile photo removed successfully.");
        } catch (err) {
            console.error("Remove photo error:", err);
            setError(err.message || "Unable to remove profile photo.");
        } finally {
            setUploading(false);
        }
    };

    // ============================================
    // HANDLE INPUT
    // ============================================

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        setError("");
        setSuccess("");
    };

    // ============================================
    // SAVE PROFILE
    // ============================================

    const handleSave = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (
            !formData.name ||
            !formData.college ||
            !formData.branch ||
            !formData.year ||
            !formData.target_role
        ) {
            setError("Please fill all fields.");
            return;
        }

        setSaving(true);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw new Error(userError.message);
            }

            if (!user) {
                navigate("/login", { replace: true });
                return;
            }

            // Update profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    name: formData.name,
                    college: formData.college,
                    branch: formData.branch,
                    year: Number(formData.year),
                    target_role: formData.target_role,
                })
                .eq("id", user.id);

            if (updateError) {
                throw new Error(updateError.message);
            }

            setSuccess("Profile updated successfully.");

            // Go back to dashboard after short delay
            setTimeout(() => {
                navigate("/dashboard");
            }, 800);
        } catch (err) {
            console.error("Profile update error:", err);
            setError(err.message || "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <main className="main-content">
                    <div className="page-container" style={{ textAlign: "center", paddingTop: "80px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "18px" }}>Loading profile...</p>
                    </div>
                </main>
            </div>
        );
    }

    // ============================================
    // PROFILE PAGE
    // ============================================

    return (
        <div className="app-shell">
            <Sidebar />

            <main className="main-content">
                <div className="page-container">

                    {/* HEADER */}
                    <div className="page-header">
                        <div>
                            <span className="section-label">ACCOUNT SETTINGS</span>
                            <h1>Edit Profile</h1>
                            <p className="page-subtitle">
                                Update your SkillForge profile details and photo.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate("/dashboard")}
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {/* TOAST MESSAGES */}
                    {error && <div className="toast-message toast-error">⚠️ {error}</div>}
                    {success && <div className="toast-message toast-success">✓ {success}</div>}

                    {/* FORM CARD */}
                    <div className="card" style={{ maxWidth: "750px" }}>

                        {/* AVATAR SECTION */}
                        <div className="profile-avatar-section">
                            <div className="profile-avatar-circle">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile Avatar" className="profile-avatar-img" />
                                ) : (
                                    <span>{formData.name ? formData.name.charAt(0).toUpperCase() : "P"}</span>
                                )}
                            </div>

                            <div className="profile-avatar-info">
                                <div className="profile-avatar-buttons">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleFileSelect}
                                        style={{ display: "none" }}
                                    />

                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading || saving}
                                    >
                                        {uploading ? "Uploading..." : "Change Photo"}
                                    </button>

                                    {avatarUrl && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ color: "var(--danger)", borderColor: "rgba(220, 38, 38, 0.3)" }}
                                            onClick={handleRemovePhoto}
                                            disabled={uploading || saving}
                                        >
                                            Remove Photo
                                        </button>
                                    )}
                                </div>

                                <span className="profile-avatar-hint">
                                    JPG, JPEG, PNG or WEBP. Maximum 5 MB.
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="form-grid">

                            {/* FULL NAME */}
                            <div className="form-group full">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            {/* EMAIL (DISABLED) */}
                            <div className="form-group full">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <label htmlFor="email">Email Address</label>
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>🔒 Cannot be changed</span>
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    disabled
                                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                                />
                            </div>

                            {/* COLLEGE */}
                            <div className="form-group">
                                <label htmlFor="college">College / University</label>
                                <input
                                    type="text"
                                    id="college"
                                    name="college"
                                    value={formData.college}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            {/* BRANCH */}
                            <div className="form-group">
                                <label htmlFor="branch">Branch / Major</label>
                                <input
                                    type="text"
                                    id="branch"
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            {/* YEAR */}
                            <div className="form-group">
                                <label htmlFor="year">Graduation Year / Academic Year</label>
                                <input
                                    type="number"
                                    id="year"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            {/* TARGET ROLE */}
                            <div className="form-group">
                                <label htmlFor="target_role">Target Role</label>
                                <input
                                    type="text"
                                    id="target_role"
                                    name="target_role"
                                    placeholder="e.g. Full Stack Developer"
                                    value={formData.target_role}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            {/* ACTIONS */}
                            <div className="form-group full" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving Changes..." : "Save Changes"}
                                </button>

                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => navigate("/dashboard")}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                            </div>

                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default Profile;