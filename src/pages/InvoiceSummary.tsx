import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { LogIn, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { fetchInvoices } from '../services/gmail';
import InvoiceTable from '../components/InvoiceTable';
import { InvoiceDashboard } from '../components/InvoiceDashboard';

const InvoiceSummary = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadInvoices = async (token: string) => {
    setIsAuthenticated(true);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices(token);
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoices');
      // If unauthorized, token is likely expired or invalid
      if (err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('gmail_token');
    const expiry = localStorage.getItem('gmail_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) {
      loadInvoices(token);
    } else {
      handleLogout();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('gmail_token');
    localStorage.removeItem('gmail_token_expiry');
    setIsAuthenticated(false);
    setInvoices([]);
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const expiry = Date.now() + (tokenResponse.expires_in * 1000);
      localStorage.setItem('gmail_token', tokenResponse.access_token);
      localStorage.setItem('gmail_token_expiry', expiry.toString());
      loadInvoices(tokenResponse.access_token);
    },
    onError: () => {
      setError('Login Failed');
    },
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Invoice Summary</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your subscriptions from Google AI Pro, Anthropic Claude, and Kling AI.
          </p>
        </div>

        {!isAuthenticated ? (
          <button onClick={() => login()} className="btn btn-primary">
            <LogIn size={18} />
            Connect Gmail
          </button>
        ) : (
          <button onClick={handleLogout} className="btn btn-secondary">
            <LogOut size={18} />
            Logout
          </button>
        )}
      </div>

      {error && (
        <div className="glass-panel" style={{ 
          padding: '1rem', 
          marginBottom: '2rem', 
          borderLeft: '4px solid var(--danger-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle color="var(--danger-color)" size={20} />
          <span>{error}</span>
        </div>
      )}

      {isAuthenticated ? (
        loading ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Scanning Gmail for Invoices...</p>
          </div>
        ) : (
          <>
            <InvoiceDashboard invoices={invoices} />
            <InvoiceTable invoices={invoices} />
          </>
        )
      ) : (
        <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '50%' }}>
            <LogIn size={32} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem' }}>Connect your Gmail</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
            Please authenticate with your Google account to allow this tool to search for your tagged invoices.
          </p>
          <button onClick={() => login()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Sign in with Google
          </button>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InvoiceSummary;
