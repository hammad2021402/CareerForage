import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './context/UserContext';

// --- Scoped LocalStorage for Multi-User Data Isolation ---
const originalGetItem = localStorage.getItem;
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

function getUserIdFromToken(): string | null {
  try {
    const token = originalGetItem.call(localStorage, 'nexuslearn_access_token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
}

function getScopedKey(key: string): string {
  if (
    key.startsWith('apex_') || 
    key.startsWith('assessmentAnswers') || 
    key.startsWith('lesson_notes_') ||
    key === 'lastVisit'
  ) {
    const userId = getUserIdFromToken();
    if (userId) {
      return `${key}_${userId}`;
    }
  }
  return key;
}

localStorage.getItem = function (key: string) {
  return originalGetItem.call(localStorage, getScopedKey(key));
};

localStorage.setItem = function (key: string, value: string) {
  originalSetItem.call(localStorage, getScopedKey(key), value);
};

localStorage.removeItem = function (key: string) {
  originalRemoveItem.call(localStorage, getScopedKey(key));
};
// ---------------------------------------------------------


import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <ThemeProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d0d1a',
              color: '#ffffff',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.60)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0a0a0a' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' },
            },
          }}
        />
      </ThemeProvider>
    </UserProvider>
  </React.StrictMode>
);