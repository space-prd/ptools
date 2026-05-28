export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Invoice {
  id: string;
  date: string;
  sender: string;
  forwarder: string;
  subject: string;
  amount: string;
  snippet: string;
  attachments: AttachmentMeta[];
}

// Helper to recursively extract attachments from email payload parts
const extractAttachments = (parts: any[]): AttachmentMeta[] => {
  let attachments: AttachmentMeta[] = [];
  if (!parts) return attachments;

  for (const part of parts) {
    if (part.filename && part.body && part.body.attachmentId) {
      const isPdf = part.mimeType === 'application/pdf' || part.filename.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }
    }
    if (part.parts) {
      attachments = attachments.concat(extractAttachments(part.parts));
    }
  }
  return attachments;
};

// Helper to extract text from email body
const extractBodyText = (part: any): string => {
  let text = '';
  if (part.body && part.body.data) {
    try {
      const b64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
      text += decodeURIComponent(escape(atob(b64))) + ' ';
    } catch (e) {
      try {
        text += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) + ' ';
      } catch (e2) {
        // ignore
      }
    }
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      text += extractBodyText(subPart);
    }
  }
  return text;
};

export const fetchInvoices = async (accessToken: string): Promise<Invoice[]> => {
  // 0. Fetch user labels to map Label IDs to Label Names
  let labelMap: Record<string, string> = {};
  try {
    const labelsResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (labelsResponse.ok) {
      const labelsData = await labelsResponse.json();
      labelsData.labels?.forEach((l: any) => {
        labelMap[l.id] = l.name.toLowerCase();
      });
    }
  } catch (e) {
    console.error('Failed to fetch labels', e);
  }

  // 1. Fetch list of messages with various invoice labels
  // We support the general 'invoice' tag, as well as specific ones like 'anthropic_invoice'
  const query = encodeURIComponent('label:invoice OR label:anthropic_invoice OR label:google_invoice OR label:kling_invoice OR label:klingai_invoice OR label:geminipro_invoice OR label:googleapi_invoice');
  const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listResponse.ok) {
    throw new Error('Failed to fetch messages list');
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // 2. Fetch details for each message (using format=full to get attachments)
  const invoicePromises = messages.map(async (msg: { id: string }) => {
    const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!detailResponse.ok) {
      return null;
    }

    const detailData = await detailResponse.json();
    const headers = detailData.payload.headers;
    
    let rawFrom = 'Unknown';
    let date = 'Unknown';
    let subject = 'No Subject';

    headers.forEach((header: any) => {
      if (header.name.toLowerCase() === 'from') rawFrom = header.value;
      if (header.name.toLowerCase() === 'date') date = header.value;
      if (header.name.toLowerCase() === 'subject') subject = header.value;
    });

    let forwarder = rawFrom;
    const fwMatch = forwarder.match(/^([^<]+)/);
    if (fwMatch) forwarder = fwMatch[1].trim().replace(/"/g, '');

    let sender = rawFrom;

    const snippet = detailData.snippet || '';
    const bodyText = detailData.payload ? extractBodyText(detailData.payload) : '';
    
    // Map label IDs to names to support tag-based identification
    const msgLabels = detailData.labelIds || [];
    const msgLabelNames = msgLabels.map((id: string) => labelMap[id] || '').join(' ');

    const textToSearch = (sender + ' ' + subject + ' ' + snippet + ' ' + bodyText + ' ' + msgLabelNames).toLowerCase();

    // Clean up sender name by looking at From, Subject, and Snippet (to catch forwarded emails)
    if (textToSearch.includes('claude') || textToSearch.includes('anthropic_invoice')) {
      sender = 'Anthropic Claude';
    } else if (textToSearch.includes('geminipro_invoice') || textToSearch.includes('google_invoice') || textToSearch.includes('google ai') || textToSearch.includes('google one')) {
      sender = 'Google AI Pro';
    } else if (textToSearch.includes('googleapi_invoice') || textToSearch.includes('google cloud')) {
      sender = 'Google API';
    } else if (textToSearch.includes('kling') || textToSearch.includes('kling_invoice') || textToSearch.includes('klingai_invoice')) {
      sender = 'Kling AI';
    } else {
      // Extract name from "Name <email>" format if it's not a known AI service
      const match = sender.match(/^([^<]+)/);
      if (match) sender = match[1].trim().replace(/"/g, '');
    }

    let amount = '-';
    
    // Combine snippet and body, then strip HTML tags and normalize spaces
    const rawText = snippet + ' ' + bodyText;
    const textForAmount = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // Look for Total: $XX.XX or THB XXX.XX or ฿XXX.XX first (for Gemini)
    const totalMatch = textForAmount.match(/Total:\s*((?:\$|THB\s*|฿)\s*\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    
    if (totalMatch) {
      amount = totalMatch[1];
    } else {
      // Fallback: Look for $XX.XX or THB XXX.XX or ฿XXX.XX anywhere
      const amountMatch = textForAmount.match(/(?:\$|THB\s*|฿)\s*\d+(?:,\d{3})*(?:\.\d{2})?/i);
      if (amountMatch) {
        amount = amountMatch[0];
      }
    }
    
    // Hardcode Kling AI amount as requested
    if (sender === 'Kling AI') {
      amount = '$32.56';
    }

    // Extract specific payment date from body
    // Supports Anthropic ("Paid April 24, 2026"), Gemini ("Order date: Apr 9, 2026")
    const paidMatch = textForAmount.match(/Paid\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
    const orderDateMatch = textForAmount.match(/Order date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
    
    // Supports Kling ("renew on May 10, 2026")
    const renewDateMatch = textForAmount.match(/renew\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
    
    // Supports GoogleAPI Thai date ("เมื่อวันที่ 26 พ.ค. 2569")
    const thaiDateMatch = textForAmount.match(/เมื่อวันที่\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})/);
    
    if (paidMatch) {
      date = paidMatch[1];
    } else if (orderDateMatch) {
      date = orderDateMatch[1];
    } else if (renewDateMatch) {
      date = renewDateMatch[1];
    } else if (thaiDateMatch) {
      const thaiMonthMap: Record<string, string> = {
        'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02',
        'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04',
        'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06',
        'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08',
        'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10',
        'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12'
      };
      const day = thaiDateMatch[1];
      const thaiMonth = thaiDateMatch[2];
      let year = parseInt(thaiDateMatch[3]);
      if (year > 2500) year -= 543; // Convert Buddhist year to Gregorian
      
      const month = thaiMonthMap[thaiMonth] || '01';
      date = `${day.padStart(2, '0')}/${month}/${year}`;
    }

    // Format date consistently
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toLocaleDateString('en-GB'); // e.g., 24/04/2026
      }
    } catch (e) {
      // ignore
    }

    // Extract attachments
    const attachments = detailData.payload.parts ? extractAttachments(detailData.payload.parts) : [];

    return {
      id: msg.id,
      date,
      sender,
      forwarder,
      subject,
      amount,
      snippet,
      attachments,
    } as Invoice;
  });

  const invoices = (await Promise.all(invoicePromises)).filter(Boolean) as Invoice[];
  
  // Sort by date descending (Newest to Oldest)
  return invoices.sort((a, b) => {
    const parseDate = (dateStr: string) => {
      if (dateStr.includes('/')) {
        // Parse DD/MM/YYYY to YYYY-MM-DD for correct Date object creation
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`).getTime();
      }
      return new Date(dateStr).getTime();
    };

    const timeA = parseDate(a.date) || 0;
    const timeB = parseDate(b.date) || 0;
    
    return timeB - timeA;
  });
};

export const downloadAttachment = async (messageId: string, attachmentId: string, accessToken: string) => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download attachment');
  }

  const data = await response.json();
  
  // Gmail API returns attachment data in base64url format
  // Convert base64url to base64 by replacing - with + and _ with /
  let base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  
  return base64;
};
