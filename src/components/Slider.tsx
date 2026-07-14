interface SliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  /** fired when the user releases the slider — use for persistence */
  onCommit?: () => void
  format?: (value: number) => string
}

export function Slider({ label, min, max, step, value, onChange, onCommit, format }: SliderProps) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1">
        <span className="field-label mb-0">{label}</span>
        <span className="text-sm font-bold text-accent-deep dark:text-accent tabular-nums">
          {format ? format(value) : value}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        className="w-full h-11 accent-accent touch-none cursor-pointer"
      />
    </label>
  )
}
