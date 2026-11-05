"use client";

import { useState, type FormEvent } from "react";
import { accountApi, errorMessage } from "@/lib/api-client";

import { useAuthStore } from "@/stores/auth-store";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordForm() {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setMessage(null);
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setMessage({ type: "error", text: "Choose a password different from your current password" });
      return;
    }
    setIsSaving(true);
    try {
      const { data } = await accountApi.changePassword(form);
      useAuthStore.setState({ token: data.token });
      setForm(emptyForm);
      setMessage({ type: "success", text: "Password updated. Use your new password the next time you sign in." });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Could not update your password. Please try again.") });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby="password-heading" className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 id="password-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Password</h2>
        <p className="text-sm text-gray-500 mt-1">Update the password you use to sign in to your account.</p>
      </div>
      <fieldset disabled={isSaving} className="p-6 space-y-5">
        {message && (
          <p role={message.type === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        )}
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
          <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={200} value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} className="input-field" />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-help" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} className="input-field" />
          <p id="password-help" className="mt-1.5 text-xs text-gray-500">Use at least 8 characters and choose a different password.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className="input-field" />
        </div>
      </fieldset>
      <div className="px-6 py-4 border-t border-gray-100">
        <button type="submit" disabled={isSaving} className="btn-primary">{isSaving ? "Updating…" : "Update password"}</button>
      </div>
    </form>
  );
}
