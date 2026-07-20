import { createContext, useContext, useEffect, useState, useMemo } from 'react';

const BrandingContext = createContext({
  schoolName: 'Quiz Competition',
  brandLogoUrl: null,
  brandColor: null,
  soundEffectsEnabled: true,
  refetchBranding: () => {},
});

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function buildBrandVars(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const lighten = (amt) => `rgb(${Math.min(255, r + amt)}, ${Math.min(255, g + amt)}, ${Math.min(255, b + amt)})`;
  const darken = (amt) => `rgb(${Math.max(0, r - amt)}, ${Math.max(0, g - amt)}, ${Math.max(0, b - amt)})`;
  return {
    '--color-secondary': hex,
    '--color-secondary-container': darken(60),
    '--color-on-secondary': darken(120),
    '--color-on-secondary-container': darken(120),
    '--color-brand-light': lighten(40),
  };
}

function applyBrandVars(hex) {
  const vars = buildBrandVars(hex);
  if (!vars) return;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

function clearBrandVars() {
  const root = document.documentElement;
  const vars = [
    '--color-secondary',
    '--color-secondary-container',
    '--color-on-secondary',
    '--color-on-secondary-container',
    '--color-brand-light',
  ];
  for (const prop of vars) {
    root.style.removeProperty(prop);
  }
}

function buildApiBase() {
  const v = import.meta.env.VITE_API_URL;
  if (v) return v.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:4000`;
  return '';
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    schoolName: 'Quiz Competition',
    brandLogoUrl: null,
    brandColor: null,
    soundEffectsEnabled: true,
  });

  const fetchBranding = () => {
    fetch(`${buildApiBase()}/api/settings/branding`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setBranding({
          schoolName: data.schoolName || 'Quiz Competition',
          brandLogoUrl: data.brandLogoUrl || null,
          brandColor: data.brandColor || null,
          soundEffectsEnabled: data.soundEffectsEnabled !== false,
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBranding();
    // Public-safe polling applies the admin's mute choice to every open screen.
    const interval = window.setInterval(fetchBranding, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (branding.brandColor) {
      applyBrandVars(branding.brandColor);
    } else {
      clearBrandVars();
    }
  }, [branding.brandColor]);

  const value = useMemo(
    () => ({ ...branding, refetchBranding: fetchBranding }),
    [branding.schoolName, branding.brandLogoUrl, branding.brandColor, branding.soundEffectsEnabled],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
