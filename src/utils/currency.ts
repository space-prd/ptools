export const USD_TO_THB_RATE = 32.0;

export const parseAmountToTHB = (amountStr: string): number => {
  if (!amountStr || amountStr === 'Unknown') return 0;
  
  // Remove spaces and commas
  const cleanedStr = amountStr.replace(/[\s,]/g, '');
  
  // Match number part
  const numMatch = cleanedStr.match(/[\d.]+/);
  if (!numMatch) return 0;
  
  const num = parseFloat(numMatch[0]);
  
  // Check if USD
  if (cleanedStr.includes('$') || cleanedStr.toLowerCase().includes('usd')) {
    return num * USD_TO_THB_RATE;
  }
  
  // Assume THB for ฿ or THB or anything else
  return num;
};

// Format a number back to beautiful THB string
export const formatTHB = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
};
