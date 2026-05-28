import { useState } from 'react';
import type { Invoice, AttachmentMeta } from '../services/gmail';
import { downloadAttachment } from '../services/gmail';
import { Receipt, Search, Download, FileText, X, Loader2 } from 'lucide-react';

interface Props {
  invoices: Invoice[];
}

const InvoiceTable: React.FC<Props> = ({ invoices }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (invoices.length === 0) {
    return (
      <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
        <Search size={32} style={{ color: 'var(--text-secondary)' }} />
        <h3 style={{ fontSize: '1.25rem' }}>No Invoices Found</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          We couldn't find any emails tagged with "Invoice" in your Gmail.
        </p>
      </div>
    );
  }

  const handleDownload = async (attachment: AttachmentMeta) => {
    if (!selectedInvoice) return;
    
    setDownloadingId(attachment.id);
    try {
      const token = localStorage.getItem('gmail_token');
      if (!token) throw new Error('Not authenticated');

      const base64Data = await downloadAttachment(selectedInvoice.id, attachment.id, token);
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.mimeType });
      
      // Create object URL and download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download attachment.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', margin: 0 }}>
            <Receipt size={24} style={{ color: 'var(--primary-color)' }} />
            Recent Invoices
          </h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Service</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>From</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Subject</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--surface-border)', transition: 'background 0.2s ease' }} 
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>{inv.date}</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      background: 'rgba(99, 102, 241, 0.1)', 
                      color: 'var(--primary-hover)',
                      fontSize: '0.85rem'
                    }}>
                      {inv.sender}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.forwarder}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.subject}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '1.05rem' }}>
                    {inv.amount}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    {inv.attachments && inv.attachments.length > 0 && (
                      <button 
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                        title="Download Attachments"
                      >
                        <Download size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attachments Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'rgba(15, 23, 42, 0.95)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Attachments</h3>
              <button 
                onClick={() => setSelectedInvoice(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Select a file to download from <strong>{selectedInvoice.sender}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedInvoice.attachments.map(att => (
                <div key={att.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                  border: '1px solid var(--surface-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <FileText size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {att.filename}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {(att.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload(att)}
                    disabled={downloadingId === att.id}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {downloadingId === att.id ? (
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InvoiceTable;
