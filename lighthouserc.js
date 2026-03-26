module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/anamnese',
        'http://localhost:5173/arzt-dashboard',
        'http://localhost:5173/login',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        emulatedFormFactor: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    assert: {
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Accessibility (must be perfect for medical application)
        'categories:accessibility': ['error', { minScore: 1 }],
        
        // Best Practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        
        // SEO
        'categories:seo': ['error', { minScore: 0.9 }],
        'meta-viewport': 'error',
        'document-title': 'error',
        'meta-description': 'error',
        
        // PWA (optional but recommended)
        'categories:pwa': ['warn', { minScore: 0.7 }],
        'service-worker': 'warn',
        'installable-manifest': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
  
  // Desktop configuration
  desktop: {
    extends: 'ci',
    collect: {
      settings: {
        emulatedFormFactor: 'desktop',
      },
    },
  },
  
  // Mobile configuration
  mobile: {
    extends: 'ci',
    collect: {
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          // Simulate mid-tier mobile device
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 1600,
          uploadThroughputKbps: 768,
          rttMs: 150,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 4500 }],
      },
    },
  },
};
