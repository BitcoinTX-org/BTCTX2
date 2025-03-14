import React, { useState } from "react";
import axios from "axios"; // to use `axios.isAxiosError`
import api from "../api"; // Your centralized API client (with baseURL="/api")
import "../styles/settings.css";

interface ApiErrorResponse {
  detail?: string;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // -------------------------------------------------------
  // 1) Logout
  // -------------------------------------------------------
  const handleLogout = async (): Promise<void> => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    try {
      // baseURL="/api" => final: POST /api/logout
      await api.post("/logout", {});
      setMessage("You have been logged out.");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setMessage("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // 2) Reset Username & Password (without deleting transactions)
  // -------------------------------------------------------
  const handleResetCredentials = async (): Promise<void> => {
    const confirmed = window.confirm(
      "This will reset your username and password, but keep existing transactions.\n\nContinue?"
    );
    if (!confirmed) return;
  
    setLoading(true);
    setMessage("");
    try {
      // => GET /api/users
      const usersResp = await api.get("/users");
      const users = usersResp.data as { id: number; username: string }[];
  
      if (users.length > 0) {
        const userId = users[0].id;
  
        const newUsername = prompt("Enter new username", "NewUser");
        if (!newUsername) {
          setMessage("Username reset canceled.");
          setLoading(false);
          return;
        }
  
        const newPassword = prompt("Enter new password", "Pass1234!");
        if (!newPassword) {
          setMessage("Password reset canceled.");
          setLoading(false);
          return;
        }
  
        // => PATCH /api/users/{userId}
        await api.patch(`/users/${userId}`, {
          username: newUsername,
          password: newPassword,
        });
  
        setMessage("Username & password have been reset. Please log in with your new credentials.");
      } else {
        setMessage("No user found to reset credentials.");
      }
    } catch (error) {
      console.error("Reset credentials error:", error);
  
      if (axios.isAxiosError(error)) {
        // The server might return an object/array in error.response?.data
        const responseData = error.response?.data;
        // We ensure setMessage() always gets a string:
        if (responseData && typeof responseData === "object") {
          // Convert object/array to a string so React doesn't crash
          setMessage(JSON.stringify(responseData));
        } else {
          // Fallback: a plain string from detail or the error message
          const detailMsg = (responseData as ApiErrorResponse)?.detail;
          setMessage(detailMsg ?? String(responseData ?? error.message ?? "Unknown error occurred."));
        }
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("An unknown error occurred while resetting credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // 3) Delete All Transactions (keeps user & credentials)
  // -------------------------------------------------------
  const handleDeleteTransactions = async (): Promise<void> => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL transactions? This action cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    try {
      // => DELETE /api/transactions/delete_all
      await api.delete("/transactions/delete_all");
      setMessage("All transactions have been successfully deleted.");
    } catch (error) {
      console.error("Error deleting transactions:", error);
      if (axios.isAxiosError(error)) {
        const detailMsg = (error.response?.data as ApiErrorResponse)?.detail;
        const fallbackMsg = error.message || "Failed to delete transactions.";
        setMessage(detailMsg ?? fallbackMsg);
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("An unknown error occurred while deleting transactions.");
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // 4) Reset Account
  //    - Delete all transactions
  //    - Delete the single user
  //    - Redirect to /register
  // -------------------------------------------------------
  const handleResetAccount = async (): Promise<void> => {
    const confirmed = window.confirm(
      "This will delete ALL transactions AND remove the user account.\n\n" +
      "Are you sure you want to completely reset?\n\n" +
      "You will be redirected to the registration page afterward."
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    try {
      // => DELETE /api/transactions/delete_all
      await api.delete("/transactions/delete_all");

      // => GET /api/users
      const usersResp = await api.get("/users");
      const users = usersResp.data as { id: number; username: string }[];

      if (users.length > 0) {
        const userId = users[0].id;
        // => DELETE /api/users/{userId}
        await api.delete(`/users/${userId}`);
      }

      setMessage("Account fully reset. Ready for new registration.");
      window.location.href = "/register";
    } catch (error) {
      console.error("Reset account error:", error);
      if (axios.isAxiosError(error)) {
        const detailMsg = (error.response?.data as ApiErrorResponse)?.detail;
        setMessage(detailMsg ?? "Failed to reset account. Check console for more details.");
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("An unknown error occurred while resetting the account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>

      {/* =========================
         ACCOUNT Section
      ========================== */}
      <div className="settings-section">
        <h3>Account</h3>

        {/* 1) Logout */}
        <div className="settings-option">
          <div>
            <span className="settings-option-title">Logout</span>
            <p className="settings-option-subtitle">Sign out of your account.</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="settings-button"
          >
            {loading ? "Processing..." : "Logout"}
          </button>
        </div>

        {/* 2) Reset Username & Password */}
        <div className="settings-option">
          <div>
            <span className="settings-option-title">Reset Username & Password</span>
            <p className="settings-option-subtitle">
              Change your username and password without deleting transactions.
            </p>
          </div>
          <button
            onClick={handleResetCredentials}
            disabled={loading}
            className="settings-button"
          >
            {loading ? "Processing..." : "Reset Credentials"}
          </button>
        </div>
      </div>

      {/* =========================
         DATA MANAGEMENT Section
      ========================== */}
      <div className="settings-section">
        <h3>Data Management</h3>

        {/* 3) Delete All Transactions */}
        <div className="settings-option">
          <div>
            <span className="settings-option-title">Delete All Transactions</span>
            <p className="settings-option-subtitle">
              Removes all transaction history. This cannot be undone.
            </p>
          </div>
          <button
            onClick={handleDeleteTransactions}
            disabled={loading}
            className="settings-button danger"
          >
            {loading ? "Processing..." : "Delete Transactions"}
          </button>
        </div>

        {/* 4) Reset Account */}
        <div className="settings-option">
          <div>
            <span className="settings-option-title">Reset Account</span>
            <p className="settings-option-subtitle">
              Delete all transactions AND remove the user account, allowing new registration.
            </p>
          </div>
          <button
            onClick={handleResetAccount}
            disabled={loading}
            className="settings-button danger"
          >
            {loading ? "Processing..." : "Reset Account"}
          </button>
        </div>
      </div>

      {/* =========================
         APPLICATION Section
      ========================== */}
      <div className="settings-section">
        <h3>Application</h3>
        <div className="settings-option">
          <div>
            <span className="settings-option-title">Uninstall</span>
            <p className="settings-option-subtitle">Remove the application. (Placeholder)</p>
          </div>
          <button className="settings-button danger">Uninstall</button>
        </div>
      </div>

      {/* Display any status/error messages */}
      {message && <p className="settings-message">{message}</p>}
    </div>
  );
};

export default Settings;
