/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        camp: {
          orange: "#F59E0B",
          orangeHover: "#D97706",
          light: "#FEF3C7",
          mid: "#FCD34D",
          cream: "#FEFCF3",
          warm: "#FDE68A",
          muted: "#F5F5F0",
          input: "#F9F7EE",
          stone: "#1C1917",
          gray: "#78716C",
          subtle: "#A8A29E",
          border: "#E7E5E4",
          error: "#EF4444",
          errorBg: "#FEE2E2",
          success: "#22C55E",
          successBg: "#D1FAE5",
        },
      },
      fontFamily: {
        nunito: ["Nunito", "sans-serif"],
        display: ["Fredoka", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        camp: "0 20px 45px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.08)",
        "camp-btn": "0 4px 18px rgba(245,158,11,0.38)",
        "camp-btn-hover": "0 6px 24px rgba(245,158,11,0.45)",
        "camp-tab": "0 2px 8px rgba(0,0,0,0.08)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "70%": { transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        bounceSlow: {
          "0%, 100%": { transform: "translateY(0) rotate(-5deg)" },
          "50%": { transform: "translateY(-6px) rotate(5deg)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.2)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
        blobPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.12)" },
        },
      },
      animation: {
        shake: "shake 0.4s ease both",
        "fade-in-up": "fadeInUp 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "fade-in-down": "fadeInDown 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "pop-in": "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "spin-btn": "spin 0.7s linear infinite",
        "bounce-slow": "bounceSlow 2s ease-in-out infinite",
        "spin-slow": "spinSlow 6s linear infinite",
        blob: "blobPulse 8s ease-in-out infinite",
        "blob-delay": "blobPulse 8s ease-in-out infinite -4s",
      },
    },
  },
  plugins: [],
};
