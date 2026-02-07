// Browser fingerprinting for Daily Zen anti-abuse system
// Enhanced with VM/VPN/VPS detection signals

interface FingerprintData {
  hash: string;
  signals: {
    isVM: boolean;
    isHeadless: boolean;
    hasInconsistencies: boolean;
    riskScore: number;
    vmIndicators: string[];
  };
}

/**
 * Detect Virtual Machine indicators from browser properties
 */
const detectVMIndicators = (): string[] => {
  const indicators: string[] = [];
  
  try {
    // Check WebGL renderer for VM signatures
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)?.toLowerCase() || '';
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)?.toLowerCase() || '';
        
        // VM-specific GPU signatures
        const vmGpuSignatures = [
          'vmware', 'virtualbox', 'vbox', 'hyper-v', 'parallels',
          'qemu', 'virtual', 'llvmpipe', 'swiftshader', 'softpipe',
          'mesa', 'microsoft basic', 'google swiftshader'
        ];
        
        for (const sig of vmGpuSignatures) {
          if (renderer.includes(sig) || vendor.includes(sig)) {
            indicators.push(`gpu:${sig}`);
          }
        }
      }
    }
  } catch {
    // WebGL not available
  }
  
  // Check for very low hardware specs (common in VMs)
  const cores = navigator.hardwareConcurrency || 0;
  if (cores > 0 && cores <= 2) {
    indicators.push('low_cores');
  }
  
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory && nav.deviceMemory <= 2) {
    indicators.push('low_memory');
  }
  
  // Check for headless browser indicators
  if (!navigator.plugins || navigator.plugins.length === 0) {
    indicators.push('no_plugins');
  }
  
  if (!navigator.mimeTypes || navigator.mimeTypes.length === 0) {
    indicators.push('no_mimetypes');
  }
  
  // Webdriver detection (automation tools)
  const navAny = navigator as Navigator & { webdriver?: boolean };
  if (navAny.webdriver) {
    indicators.push('webdriver');
  }
  
  // Check for phantom/nightmare/puppeteer
  const win = window as Window & { 
    phantom?: unknown; 
    __nightmare?: unknown;
    callPhantom?: unknown;
    _phantom?: unknown;
  };
  if (win.phantom || win.__nightmare || win.callPhantom || win._phantom) {
    indicators.push('automation');
  }
  
  // Screen size anomalies (VMs often have unusual sizes)
  const screenRatio = screen.width / screen.height;
  if (screenRatio < 1 || screenRatio > 2.5) {
    indicators.push('unusual_screen_ratio');
  }
  
  // Check color depth (VMs sometimes have reduced color)
  if (screen.colorDepth < 24) {
    indicators.push('low_color_depth');
  }
  
  // Touch points on desktop (inconsistency)
  if (navigator.maxTouchPoints > 0 && !('ontouchstart' in window)) {
    indicators.push('touch_mismatch');
  }
  
  return indicators;
};

/**
 * Detect timezone/locale inconsistencies (VPN indicator)
 */
const detectTimezoneInconsistencies = async (): Promise<boolean> => {
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserLang = navigator.language.split('-')[1] || navigator.language;
    
    // Get date format locale hints
    const dateFormat = new Intl.DateTimeFormat().resolvedOptions().locale;
    
    // Check if timezone and language seem mismatched
    // This is a basic check - VPNs often cause TZ/language mismatches
    const tzRegionMap: Record<string, string[]> = {
      'America': ['en', 'es', 'pt', 'fr'],
      'Europe': ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'ru'],
      'Asia': ['zh', 'ja', 'ko', 'hi', 'th', 'vi', 'id'],
      'Africa': ['en', 'fr', 'ar', 'sw'],
      'Australia': ['en'],
      'Pacific': ['en'],
    };
    
    const tzRegion = browserTz.split('/')[0];
    const langCode = navigator.language.split('-')[0].toLowerCase();
    const expectedLangs = tzRegionMap[tzRegion] || [];
    
    // If timezone region doesn't match expected languages, might be VPN
    if (expectedLangs.length > 0 && !expectedLangs.includes(langCode)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Generate enhanced fingerprint with risk signals
 */
export const generateFingerprint = async (): Promise<string> => {
  const components: string[] = [];

  // Screen properties
  components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`avail:${screen.availWidth}x${screen.availHeight}`);
  
  // Timezone
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  
  // Language
  components.push(`lang:${navigator.language}`);
  components.push(`langs:${navigator.languages?.join(',') || navigator.language}`);
  
  // Platform
  components.push(`platform:${navigator.platform}`);
  
  // Hardware concurrency (CPU cores)
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  
  // Device memory (if available)
  const nav = navigator as Navigator & { deviceMemory?: number };
  components.push(`memory:${nav.deviceMemory || 'unknown'}`);
  
  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('WOI Endgame Zen', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Daily Reward v2', 4, 17);
      components.push(`canvas:${canvas.toDataURL().slice(-100)}`);
    }
  } catch {
    components.push('canvas:unavailable');
  }
  
  // WebGL renderer (important for VM detection)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        components.push(`webgl:${vendor}|${renderer}`);
      }
    }
  } catch {
    components.push('webgl:unavailable');
  }
  
  // Touch support
  components.push(`touch:${navigator.maxTouchPoints || 0}`);
  
  // Plugins count
  components.push(`plugins:${navigator.plugins?.length || 0}`);
  
  // Audio fingerprint (using OfflineAudioContext to avoid ScriptProcessorNode deprecation)
  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      components.push(`audio:${audioCtx.sampleRate}`);
      audioCtx.close();
    } else {
      components.push('audio:unavailable');
    }
  } catch {
    components.push('audio:unavailable');
  }
  
  // Add VM detection signals to fingerprint
  const vmIndicators = detectVMIndicators();
  components.push(`vm:${vmIndicators.length > 0 ? vmIndicators.join(',') : 'none'}`);
  
  // Timezone inconsistency check
  const tzInconsistent = await detectTimezoneInconsistencies();
  components.push(`tz_check:${tzInconsistent ? 'suspect' : 'ok'}`);
  
  // Create hash from components
  const fingerprint = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Get detailed fingerprint with risk assessment
 */
export const getDetailedFingerprint = async (): Promise<FingerprintData> => {
  const hash = await generateFingerprint();
  const vmIndicators = detectVMIndicators();
  const tzInconsistent = await detectTimezoneInconsistencies();
  
  // Calculate risk score (0-100)
  let riskScore = 0;
  
  // VM indicators add significant risk
  riskScore += vmIndicators.length * 15;
  
  // Timezone inconsistency suggests VPN
  if (tzInconsistent) riskScore += 20;
  
  // Headless browser indicators
  const navAny = navigator as Navigator & { webdriver?: boolean };
  if (navAny.webdriver) riskScore += 50;
  if (!navigator.plugins || navigator.plugins.length === 0) riskScore += 10;
  
  // Low hardware specs
  if ((navigator.hardwareConcurrency || 0) <= 2) riskScore += 10;
  
  return {
    hash,
    signals: {
      isVM: vmIndicators.length >= 2,
      isHeadless: navAny.webdriver === true || navigator.plugins?.length === 0,
      hasInconsistencies: tzInconsistent,
      riskScore: Math.min(riskScore, 100),
      vmIndicators,
    },
  };
};
