import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile, uploadAvatar } from "../api/auth";
import { COURSE_MAP } from "../data/courses";
import "../styles/profile.css";

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password change
  const [showPwForm, setShowPwForm] = useState(false);

  // Avatar upload
  const avatarInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }

    getProfile()
      .then((data) => {
        setProfile(data);
        setNameInput(data.name || "");
      })
      .catch((err) => setError(err.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [navigate]);

  // --- Name save ---
  const handleNameSave = async () => {
    setNameSaving(true);
    setNameMsg("");
    try {
      const res = await updateProfile({ name: nameInput });
      setProfile((prev) => ({ ...prev, name: res.name }));
      setEditingName(false);
      setNameMsg("Name updated!");
    } catch (err) {
      setNameMsg(err.message || "Failed to update name.");
    } finally {
      setNameSaving(false);
    }
  };

  // --- Password save ---
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setPwSaving(true);
    setPwMsg({ text: "", type: "" });
    try {
      await updateProfile({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ text: "Password changed successfully!", type: "success" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setShowPwForm(false);
    } catch (err) {
      setPwMsg({ text: err.message || "Failed to change password.", type: "error" });
    } finally {
      setPwSaving(false);
    }
  };

  // --- Avatar upload ---
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarMsg("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        // Resize to max 200x200 using canvas
        const MAX = 200;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        setAvatarUploading(true);
        setAvatarMsg("");
        try {
          await uploadAvatar(dataUrl);
          setProfile((prev) => ({ ...prev, avatarData: dataUrl }));
          setAvatarMsg("Photo updated!");
        } catch (err) {
          setAvatarMsg(err.message || "Failed to upload photo.");
        } finally {
          setAvatarUploading(false);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Derive avatar initials
  const getInitials = () => {
    if (profile?.name?.trim()) {
      return profile.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    }
    return profile?.email?.[0]?.toUpperCase() || "?";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div className="profile-skeleton-avatar" />
          <div className="profile-skeleton-line" />
          <div className="profile-skeleton-line short" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile.avatarData
              ? <img src={profile.avatarData} alt="Profile photo" className="profile-avatar-img" />
              : getInitials()}
          </div>
          <button
            className="profile-avatar-change-btn"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            title="Change photo"
          >
            {avatarUploading ? "…" : "📷"}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
          {avatarMsg && <p className="profile-avatar-msg">{avatarMsg}</p>}
        </div>
        <div className="profile-header-info">
          {editingName ? (
            <div className="profile-name-edit">
              <input
                className="profile-name-input"
                value={nameInput}
                maxLength={60}
                autoFocus
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                placeholder="Your display name"
              />
              <button className="profile-btn-save" onClick={handleNameSave} disabled={nameSaving}>
                {nameSaving ? "Saving…" : "Save"}
              </button>
              <button className="profile-btn-cancel" onClick={() => { setEditingName(false); setNameInput(profile.name || ""); }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="profile-name-row">
              <h1 className="profile-display-name">
                {profile.name || "No name set"}
              </h1>
              <button className="profile-btn-edit" onClick={() => setEditingName(true)}>Edit</button>
            </div>
          )}
          {nameMsg && <p className="profile-inline-msg">{nameMsg}</p>}
          <p className="profile-email">{profile.email}</p>
          <p className="profile-joined">Member since {formatDate(profile.createdAt)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-num">{(profile.purchasedCourses?.filter((id) => !!COURSE_MAP[id])?.length) ?? 0}</span>
          <span className="profile-stat-label">Courses Owned</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-num">{profile.learnedLetters?.length ?? 0}</span>
          <span className="profile-stat-label">Letters Learned</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-num">{profile.subscriptionActive ? "Active" : "Free"}</span>
          <span className="profile-stat-label">Plan</span>
        </div>
      </div>

      {/* Purchased courses */}
      {profile.purchasedCourses?.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title">My Courses</h2>
          <div className="profile-courses-list">
            {profile.purchasedCourses.filter((id) => !!COURSE_MAP[id]).map((id) => (
              <div key={id} className="profile-course-chip">
                {COURSE_MAP[id]?.title || id}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account / Security */}
      <div className="profile-section">
        <h2 className="profile-section-title">Account &amp; Security</h2>

        {pwMsg.text && (
          <div className={`profile-msg ${pwMsg.type === "error" ? "profile-msg-error" : "profile-msg-success"}`}>
            {pwMsg.text}
          </div>
        )}

        {!showPwForm ? (
          <button className="profile-btn-secondary" onClick={() => setShowPwForm(true)}>
            Change Password
          </button>
        ) : (
          <form className="profile-pw-form" onSubmit={handlePasswordSave}>
            <label>Current Password
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password" />
            </label>
            <label>New Password
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required autoComplete="new-password" minLength={6} />
            </label>
            <label>Confirm New Password
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" minLength={6} />
            </label>
            <div className="profile-pw-actions">
              <button type="submit" className="profile-btn-save" disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Update Password"}
              </button>
              <button type="button" className="profile-btn-cancel" onClick={() => { setShowPwForm(false); setPwMsg({ text: "", type: "" }); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Navigation shortcuts */}
      <div className="profile-section profile-nav-shortcuts">
        <button className="profile-shortcut-btn" onClick={() => navigate("/my-courses")}>📚 My Courses</button>
        <button className="profile-shortcut-btn" onClick={() => navigate("/dashboard")}>🏠 Dashboard</button>
        <button className="profile-shortcut-btn" onClick={() => navigate("/alphabet-tigrinya")}>🔤 Alphabet Course</button>
      </div>
    </div>
  );
}
