// ---------- design tokens: Modernist / Swiss dark ----------
export const COLORS = {
  bg: "#141311",
  surface: "#1D1B17",
  surface2: "#242119",
  border: "#38342A",
  borderStrong: "#4C4737",
  ink: "#F2EEE4",
  inkSoft: "#9A927E",
  accent: "#C63A2E",
  accentBright: "#E2543E",
  warm: "#D9A44E",
  cold: "#7C8894",
};

// Client-facing kiosk is deliberately inverted from the dark agent app --
// light and warm, since a stranger walking up shouldn't meet a black screen.
export const KIOSK = {
  bg: "#F2EEE4",
  surface: "#FFFFFF",
  border: "#E4DDC9",
  ink: "#1C1B17",
  soft: "#7A7460",
  input: "#FBF9F3",
};

export const CARD = {
  background: COLORS.surface,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
};

export const CARD_SM = {
  background: COLORS.surface,
  borderRadius: 6,
  border: `1px solid ${COLORS.border}`,
  boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
};

export const inputStyle = {
  background: COLORS.surface2,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.ink,
  borderRadius: 5,
};

export const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600&family=Space+Mono:wght@500;700&display=swap');
  * { box-sizing: border-box; }
  ::selection { background: ${COLORS.accent}55; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 2px ${COLORS.accent}33; }
  button:focus-visible { outline: 2px solid ${COLORS.accent}; outline-offset: 2px; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:translateY(0);} }
  @keyframes slideInRight { from { opacity:0; transform: translateX(28px);} to {opacity:1; transform:translateX(0);} }
  @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
  @keyframes popIn { from {opacity:0; transform: scale(0.92) translateY(6px);} to {opacity:1; transform:scale(1) translateY(0);} }
  @keyframes pulse { 0%,100% {opacity:.35} 50% {opacity:.75} }
  .anim-fadeup { opacity:0; animation: fadeUp 420ms cubic-bezier(.16,1,.3,1) forwards; }
  .anim-slidein { animation: slideInRight 380ms cubic-bezier(.16,1,.3,1); }
  .anim-fadein { animation: fadeIn 260ms ease-out; }
  .anim-popin { animation: popIn 480ms cubic-bezier(.34,1.56,.64,1); }
  .skeleton-pulse { animation: pulse 1.4s ease-in-out infinite; }
  .press { transition: transform 150ms cubic-bezier(.34,1.56,.64,1), opacity 200ms ease; }
  .press:active { transform: scale(0.96); }
  .mark { position: relative; overflow: hidden; transition: border-color 220ms ease, box-shadow 220ms ease; }
  .mark::before { content:''; position:absolute; left:0; top:0; bottom:0; width:0; background:${COLORS.accent}; transition: width 220ms cubic-bezier(.16,1,.3,1); }
  .mark:hover::before { width:3px; }
  .mark:hover { border-color: ${COLORS.borderStrong}; box-shadow: 0 12px 28px rgba(0,0,0,0.45); }
  .navtab { position:relative; transition: color 200ms ease; }
  .navtab::after { content:''; position:absolute; left:0; right:0; bottom:-1px; height:2px; background:${COLORS.accent}; transform: scaleX(0); transition: transform 260ms cubic-bezier(.16,1,.3,1); }
  .navtab.active::after { transform: scaleX(1); }
`;
