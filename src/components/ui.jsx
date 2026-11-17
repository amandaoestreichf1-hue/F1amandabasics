import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Section({ title, kicker, children, defaultOpen = true, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-desk-700/70">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-desk-850 transition-colors"
      >
        {kicker && <span className="font-mono text-[10px] text-marker tracking-widest">{kicker}</span>}
        <span className="font-anton uppercase tracking-wide text-[15px] text-newsprint flex-1">{title}</span>
        {right}
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-desk-600 text-xs">▶</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Label({ children, hint }) {
  return (
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">{children}</span>
      {hint !== undefined && <span className="font-mono text-[11px] text-stone-500">{hint}</span>}
    </div>
  );
}

export function TextInput({ label, value, onChange, multiline, suggestions, placeholder }) {
  const cls = 'w-full bg-desk-800 border border-desk-700 rounded-md px-3 py-2 text-sm text-newsprint focus:outline-none focus:border-marker/70 placeholder:text-stone-600';
  const listId = useRef('dl' + Math.random().toString(36).slice(2)).current;
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      {multiline ? (
        <textarea rows={3} className={cls + ' resize-y'} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <>
          <input className={cls} value={value ?? ''} placeholder={placeholder} list={suggestions ? listId : undefined} onChange={(e) => onChange(e.target.value)} />
          {suggestions && (
            <datalist id={listId}>
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          )}
        </>
      )}
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step, fmt }) {
  return (
    <label className="block">
      <Label hint={fmt ? fmt(value) : value}>{label}</Label>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function Toggle({ label, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-1 group">
      <span className="text-[13px] text-stone-300 group-hover:text-newsprint">{label}</span>
      <span className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? 'bg-marker' : 'bg-desk-700'}`} style={{ height: 22 }}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 35 }}
          className="absolute top-[3px] w-4 h-4 rounded-full bg-newsprint shadow"
          style={{ left: value ? 21 : 3 }}
        />
      </span>
    </button>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-desk-800 border border-desk-700 rounded-md px-3 py-2 text-sm text-newsprint focus:outline-none focus:border-marker/70"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

export function ColorInput({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 bg-desk-800 border border-desk-700 rounded-md px-2 py-1.5 cursor-pointer hover:border-desk-600">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 cursor-pointer" />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] text-stone-300 leading-tight truncate">{label}</span>
        <span className="block font-mono text-[10px] text-stone-500 leading-tight">{value}</span>
      </span>
    </label>
  );
}

export function Btn({ children, onClick, variant = 'ghost', className = '', disabled, title }) {
  const v = {
    primary: 'bg-marker text-white hover:bg-[#ff5247] shadow-[3px_3px_0_#000]',
    paper: 'bg-newsprint text-desk-950 hover:bg-white shadow-[3px_3px_0_#000]',
    ghost: 'bg-desk-800 text-stone-200 hover:bg-desk-700 border border-desk-700',
    danger: 'bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30',
  }[variant];
  return (
    <motion.button
      type="button"
      title={title}
      whileTap={{ scale: 0.95, x: 1, y: 1 }}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function FileButton({ accept, multiple, onFiles, children, variant = 'ghost', className = '' }) {
  const ref = useRef(null);
  return (
    <>
      <Btn variant={variant} className={className} onClick={() => ref.current?.click()}>{children}</Btn>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files || [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex bg-desk-800 border border-desk-700 rounded-md p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`relative flex-1 px-2 py-1.5 text-[12px] font-semibold rounded ${value === v ? 'text-white' : 'text-stone-400 hover:text-stone-200'}`}
        >
          {value === v && <motion.span layoutId={'seg-' + options.map((o) => o[0]).join('')} className="absolute inset-0 bg-marker rounded" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}
