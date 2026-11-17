// Runs before first paint (inlined into <head>) so the page never flashes the
// wrong theme: saved choice → system preference → dark.
// ⚠ If you change this string, update its sha256 in vercel.json's
//   Content-Security-Policy (the `npm test` CSP check prints the new value).
export const THEME_INIT_SCRIPT =
  "(function(){var d=document.documentElement,t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.setAttribute('data-theme',t);d.style.colorScheme=t})()"
