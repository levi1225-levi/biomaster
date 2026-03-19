/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#050b18', card: 'rgba(15,23,42,0.6)', card2: 'rgba(15,23,42,0.8)' },
        accent: { DEFAULT: '#22c55e', dark: '#16a34a', light: '#4ade80' },
        topic: { tissues: '#a78bfa', digestive: '#f59e0b', respiratory: '#3b82f6', circulatory: '#ef4444', interactions: '#22c55e' }
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.3s ease-out both',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'shake': 'shake 0.4s ease-in-out',
        'pulse-green': 'pulseGreen 0.6s ease-in-out',
        'combo-pop': 'comboPop 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'confetti': 'confettiDrop 2.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%': { transform: 'translateX(-8px)' }, '40%': { transform: 'translateX(8px)' }, '60%': { transform: 'translateX(-4px)' }, '80%': { transform: 'translateX(4px)' } },
        pulseGreen: { '0%,100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.4)' }, '50%': { boxShadow: '0 0 0 12px rgba(34,197,94,0)' } },
        comboPop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.5)' }, '100%': { transform: 'scale(1)' } },
        glow: { '0%,100%': { boxShadow: '0 0 8px rgba(34,197,94,0.3)' }, '50%': { boxShadow: '0 0 24px rgba(34,197,94,0.6)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        confettiDrop: { '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' }, '100%': { opacity: '0', transform: 'translateY(100vh) rotate(720deg)' } },
      },
      backdropBlur: { glass: '16px' },
    }
  },
  plugins: [],
}
