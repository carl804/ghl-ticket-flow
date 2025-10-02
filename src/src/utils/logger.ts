// Iframe compatibility fix
if (typeof window !== 'undefined') {
  // Fix for GHL iframe
  (window as any).we = (window as any).we || { 
    warn: console.warn || function() {},
    log: console.log || function() {},
    error: console.error || function() {}
  };
  
  // Fix for Lovable.dev iframe  
  (window as any).logger = (window as any).logger || { 
    warn: console.warn || function() {},
    log: console.log || function() {},
    error: console.error || function() {}
  };
}

// Safe logger export
const safeLogger = {
  log: (...args: any[]) => {
    if (typeof console !== 'undefined' && console.log) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (typeof console !== 'undefined' && console.error) {
      console.error(...args);
    }
  }
};

export default safeLogger;
