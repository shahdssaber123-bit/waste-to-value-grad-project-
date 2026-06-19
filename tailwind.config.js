/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				dark: 'hsl(var(--primary-dark))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			main: 'hsl(var(--text-main))',
  			'secondary-text': 'hsl(var(--text-secondary))',
  			'muted-text': 'hsl(var(--text-muted))',
  			surface: {
  				soft: 'hsl(var(--surface-soft))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  safelist: [
    // status / category colours used dynamically in dashboards
    'bg-green-50', 'bg-green-100', 'text-green-600', 'text-green-700',
    'bg-blue-50', 'text-blue-600', 'text-blue-700', 'text-blue-800', 'border-blue-200',
    'bg-amber-50', 'text-amber-600', 'text-amber-700', 'text-amber-800', 'border-amber-200', 'bg-amber-500',
    'bg-red-50', 'text-red-500', 'text-red-600', 'text-red-700',
    'bg-sky-50', 'text-sky-700', 'text-sky-800', 'border-sky-200',
    'bg-orange-50', 'text-orange-700', 'text-orange-800', 'border-orange-200',
    'bg-slate-50', 'text-slate-700', 'text-slate-800', 'border-slate-200', 'bg-slate-700',
    'bg-stone-50', 'text-stone-700', 'text-stone-800', 'border-stone-200',
    'bg-emerald-50', 'text-emerald-600', 'text-emerald-700', 'text-emerald-800', 'border-emerald-200', 'bg-emerald-600',
    'bg-violet-50', 'text-violet-700', 'text-violet-800', 'border-violet-200',
    'bg-teal-50', 'text-teal-700', 'text-teal-800', 'border-teal-200',
    'bg-blue-600', 'bg-blue-50', 'text-blue-800',
    // gradient stops used in role icons
    'from-blue-600', 'to-blue-700',
    'from-amber-600', 'to-amber-700',
    'from-emerald-600', 'to-emerald-700',
    'from-slate-600', 'to-slate-700',
    'from-teal-600', 'to-teal-700',
    'from-teal-700', 'to-teal-800',
    'from-emerald-700', 'to-emerald-800',
  ],
  plugins: [require("tailwindcss-animate")],
}