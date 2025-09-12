"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getApiUrl } from "../../lib/config";
import { apiFetch } from "../../lib/api";
import AvatarUpload from "./AvatarUpload";

interface User {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarBlob: string | null;
  email: string | null;
  emailVerified?: boolean;
  role: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    email: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [otp, setOtp] = useState<string>("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendAttempts, setResendAttempts] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await apiFetch("/auth/me");
      const data = await res.json();
      console.log("data", data);
      if (data.user) {
        setUser(data.user);
        setFormData({
          username: data.user.username || "",
          displayName: data.user.displayName || "",
          bio: data.user.bio || "",
          email: data.user.email || "",
        });

        // Set avatar preview if blob exists
        if (data.user.avatarBlob) {
          setAvatarPreview(data.user.avatarBlob);
        } else if (data.user.avatarUrl) {
          setAvatarPreview(data.user.avatarUrl);
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate before submit
      const currentErrors = validate(formData);
      setErrors(currentErrors);
      if (Object.keys(currentErrors).length > 0) {
        setSaving(false);
        toast.error("Please fix the highlighted fields");
        return;
      }

      const priorEmail = user?.email || "";
      const emailChanged = priorEmail !== formData.email;

      let avatarData = {};

      // Process avatar if a new file was selected
      if (avatarFile) {
        const reader = new FileReader();
        const avatarBlob = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });

        // Extract base64 data (remove data:...;base64, prefix)
        const base64Data = avatarBlob.split(",")[1];
        avatarData = { avatarBlob: base64Data };
      }

      // ——— REMOVAL HANDLED SEPARATELY ———
      // We rely on handleRemoveAvatar() for removal, not here

      // Update user data
      const res = await apiFetch("/auth/update", {
        method: "PUT",
        body: JSON.stringify({ ...formData, ...avatarData }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setAvatarFile(null); // Clear file state
        setFormData({
          username: data.user.username || "",
          displayName: data.user.displayName || "",
          bio: data.user.bio || "",
          email: data.user.email || "",
        });

        // Update avatar preview
        if (data.user.avatarBlob) {
          setAvatarPreview(data.user.avatarBlob);
        } else if (data.user.avatarUrl) {
          setAvatarPreview(data.user.avatarUrl);
        } else {
          setAvatarPreview(null);
        }

        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const validate = (values: typeof formData) => {
    const newErrors: { [key: string]: string } = {};

    // Username: optional, no constraints
    // Display name: optional, no constraints

    // Bio: max 280
    if (values.bio && values.bio.length > 280) {
      newErrors.bio = "Bio cannot exceed 280 characters";
    }

    // Email: optional, validate only if provided
    if (values.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        newErrors.email = "Enter a valid email";
      }
    }

    return newErrors;
  };

  useEffect(() => {
    setErrors(validate(formData));
  }, [formData]);

  useEffect(() => {
    if (!showVerifyModal || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showVerifyModal, resendCooldown]);

  // ✅ Called by AvatarUpload when file changes or is removed
  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.onerror = () => {
        toast.error("Failed to load image preview");
        setAvatarPreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      // User removed avatar via FilePond UI
      setAvatarPreview(null);
      handleRemoveAvatar(); // Sync with server immediately
    }
  };

  // ✅ Handles avatar removal via button OR FilePond
  const handleRemoveAvatar = async () => {
    // Don't remove if already removed
    if (!user?.avatarBlob && !user?.avatarUrl) return;

    try {
      // Clear whichever field exists
      const avatarData = user?.avatarBlob
        ? { avatarBlob: null }
        : user?.avatarUrl
        ? { avatarUrl: null }
        : {};

      const res = await apiFetch("/auth/update", {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          ...avatarData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setAvatarPreview(null);
        setAvatarFile(null);
        toast.success("Avatar removed successfully!");
      } else {
        toast.error(data.error || "Failed to remove avatar");
      }
    } catch (error) {
      console.error("Remove avatar error:", error);
      toast.error("Failed to remove avatar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Please log in to access settings.</div>
      </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "'LisaStyle', monospace" }}>
            ⚙️ Settings
          </h1>
          <p className="text-center text-sm text-gray-600 mb-6">Manage your profile, account, and preferences</p>

          <div className="mb-6 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-[#f0f0f0] border border-[#c8c8c8] text-xs text-gray-700">
              Wallet: {user.walletAddress}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <h2 className="text-lg font-semibold mb-2">Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      maxLength={20}
                      className={`w-full p-3 border-2 rounded bg-[#f7f7f7] focus:bg-white focus:outline-none ${errors.username && touched.username ? "border-red-500 focus:border-red-500" : "border-[#808080] focus:border-[#0000ff]"}`}
                      placeholder="Enter your username"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-red-600">{touched.username && errors.username}</span>
                      <span className="text-xs text-gray-500">{formData.username.length}/20</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Display Name</label>
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      maxLength={50}
                      className={`w-full p-3 border-2 rounded bg-[#f7f7f7] focus:bg-white focus:outline-none ${errors.displayName && touched.displayName ? "border-red-500 focus:border-red-500" : "border-[#808080] focus:border-[#0000ff]"}`}
                      placeholder="Enter your display name"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-red-600">{touched.displayName && errors.displayName}</span>
                      <span className="text-xs text-gray-500">{formData.displayName.length}/50</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      maxLength={280}
                      className={`w-full p-3 border-2 rounded bg-[#f7f7f7] focus:bg-white focus:outline-none resize-none ${errors.bio && touched.bio ? "border-red-500 focus:border-red-500" : "border-[#808080] focus:border-[#0000ff]"}`}
                      placeholder="Tell us about yourself"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-red-600">{touched.bio && errors.bio}</span>
                      <span className="text-xs text-gray-500">{formData.bio.length}/280</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold">Email</label>
                      <div className="flex items-center gap-2">
                        {formData.email && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${user?.email === formData.email && user?.emailVerified ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}`}>
                            {user?.email === formData.email && user?.emailVerified ? "Verified" : "Unverified"}
                          </span>
                        )}
                        {(() => {
                          const emailChanged = user?.email !== formData.email;
                          const shouldShowVerify = !!formData.email && (emailChanged || !user?.emailVerified);
                          if (!shouldShowVerify) return null;
                          return (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  // If email changed, save it first
                                  if (emailChanged) {
                                    const saveRes = await apiFetch("/auth/update", {
                                      method: "PUT",
                                      body: JSON.stringify({ ...formData }),
                                    });
                                    const saveOut = await saveRes.json();
                                    if (!saveRes.ok) {
                                      toast.error(saveOut.error || "Failed to save email");
                                      return;
                                    }
                                    setUser(saveOut.user);
                                  }
                                  setOtpSending(true);
                                  const r = await apiFetch("/auth/email/request", { method: "POST", body: JSON.stringify({ email: formData.email }) });
                                  const out = await r.json();
                                  if (!r.ok) {
                                    toast.error(out.error || "Failed to send OTP");
                                  } else {
                                    toast.success("Verification code sent to your email");
                                    setShowVerifyModal(true);
                                  }
                                } catch (err) {
                                  toast.error("Failed to initiate verification");
                                } finally {
                                  setOtpSending(false);
                                }
                              }}
                              disabled={otpSending}
                              className="text-xs lisa-button lisa-button-primary disabled:opacity-50"
                            >
                              {otpSending ? "Sending..." : "Verify email"}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full p-3 border-2 rounded bg-[#f7f7f7] focus:bg-white focus:outline-none ${errors.email && touched.email ? "border-red-500 focus:border-red-500" : "border-[#808080] focus:border-[#0000ff]"}`}
                      placeholder="name@example.com"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-red-600">{touched.email && errors.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold mb-2">Avatar</h2>
                {((user?.avatarBlob || user?.avatarUrl) || avatarPreview) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove Avatar
                  </button>
                )}
              </div>
              <div className="border-2 border-dashed border-[#c8c8c8] rounded p-3 bg-[#fafafa]">
                <AvatarUpload
                  onUpdate={handleAvatarChange}
                  currentAvatarUrl={avatarPreview || ""}
                />
              </div>
            </section>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 lisa-button lisa-button-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 lisa-button lisa-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    {showVerifyModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md bg-white border-2 border-[#808080] rounded-lg p-6 shadow-xl">
          <h3 className="text-xl font-semibold mb-2">Verify your email</h3>
          <p className="text-sm text-gray-600 mb-4">We sent a 6-digit code to {formData.email}. Enter it below to verify.</p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="flex-1 p-3 border-2 border-[#808080] rounded bg-[#f7f7f7] focus:bg-white focus:outline-none focus:border-[#0000ff]"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  setOtpVerifying(true);
                  if (!otp || otp.length !== 6) {
                    toast.error("Enter the 6-digit OTP");
                    return;
                  }
                  const res = await apiFetch("/auth/email/verify", { method: "POST", body: JSON.stringify({ otp }) });
                  const out = await res.json();
                  if (!res.ok) {
                    toast.error(out.error || "OTP verification failed");
                  } else {
                    toast.success("Email verified");
                    setShowVerifyModal(false);
                    setOtp("");
                    await fetchUser();
                  }
                } catch (err) {
                  toast.error("OTP verification failed");
                } finally {
                  setOtpVerifying(false);
                }
              }}
              disabled={otpVerifying}
              className="lisa-button lisa-button-primary disabled:opacity-50"
            >
              {otpVerifying ? "Verifying..." : "Verify"}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  if (resendCooldown > 0) return;
                  setOtpSending(true);
                  const r = await apiFetch("/auth/email/request", { method: "POST", body: JSON.stringify({ email: formData.email }) });
                  const out = await r.json();
                  if (!r.ok) {
                    toast.error(out.error || "Failed to resend OTP");
                  } else {
                    toast.success("Code resent");
                    const nextCooldown = resendAttempts === 0 ? 30 : 60;
                    setResendCooldown(nextCooldown);
                    setResendAttempts((n) => n + 1);
                  }
                } catch (err) {
                  toast.error("Failed to resend OTP");
                } finally {
                  setOtpSending(false);
                }
              }}
              disabled={otpSending || resendCooldown > 0}
              className="lisa-button lisa-button-primary disabled:opacity-50"
            >
              {otpSending ? "Resending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}