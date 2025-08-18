export function Button({ children, variant = 'default', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'destructive' }) {
    const base = 'inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium focus:outline-none transition w-full'
    const variants = {
      default: 'bg-[#3ECC89] text-white hover:bg-green-600',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100',
      destructive: 'bg-red-500 text-white hover:bg-red-600'
    }
  
    return <button {...props} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  }