/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paypal: {
          navy: '#001C60',        // PayPal deep navy header
          navyDark: '#001445',    // Deeper navy
          navyLight: '#002C8A',   // PayPal medium navy
          blue: '#0070BA',        // PayPal standard primary action blue
          blueHover: '#003087',   // PayPal dark blue hover
          blueLight: '#009CDE',   // PayPal light blue accent
          bluePale: '#F0F7FC',    // Subtle blue background
          blueBorder: '#C9E3F8',  // Soft blue border
          bg: '#F5F7FA',          // PayPal light grey page background
          card: '#FFFFFF',        // Pure white card background
          text: '#0C0C0D',        // High-contrast primary dark text
          textMuted: '#5E6573',   // Subtle body / label text
          textSubtle: '#8C94A0',  // Light secondary text
          border: '#E5EDF5',      // Card and container borders
          borderLight: '#EDF2F7', // Divider borders
          success: '#007934',     // Financial positive green
          successBg: '#EAF7EE',
          successBorder: '#B7E8C7',
          warning: '#D97706',     // Financial pending/undo amber
          warningBg: '#FFFBEB',
          warningBorder: '#FDE68A',
          danger: '#D9381E',      // Alert red
          dangerBg: '#FDF2F2',
          dangerBorder: '#FACDCD',
        },
        fintech: {
          dark: '#0C0C0D',
          navy: '#001C60',
          textMuted: '#5E6573',
          textSubtle: '#8C94A0',
          blue: '#0070BA',
          blueHover: '#003087',
          blueSoft: '#F0F7FC',
          blueBorder: '#C9E3F8',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          border: '#E5EDF5',
          borderLight: '#EDF2F7',
          success: '#007934',
          successBg: '#EAF7EE',
          successBorder: '#B7E8C7',
          danger: '#D9381E',
          dangerBg: '#FDF2F2',
          dangerBorder: '#FACDCD',
        }
      },
      fontFamily: {
        sans: [
          'PayPalSansBig',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      boxShadow: {
        'paypal': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'paypal-card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'paypal-dropdown': '0 6px 20px rgba(0, 28, 96, 0.12)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'elevated': '0 4px 12px -2px rgba(0, 28, 96, 0.08)',
        'dropdown': '0 8px 24px -4px rgba(0, 28, 96, 0.12)',
      }
    },
  },
  plugins: [],
}
