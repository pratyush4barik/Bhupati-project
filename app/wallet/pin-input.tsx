"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function PinInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  autoFocus = false,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, "").slice(0, length).split("");

  const focusInput = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[clamped]?.focus();
    },
    [length],
  );

  useEffect(() => {
    if (autoFocus) {
      focusInput(0);
    }
  }, [autoFocus, focusInput]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = [...digits];
    arr[index] = char;
    const newValue = arr.join("").replace(/[^\d]/g, "");
    onChange(newValue);
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        handleChange(index, "");
      } else if (index > 0) {
        focusInput(index - 1);
        handleChange(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusInput(Math.min(pasted.length, length - 1));
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-14 w-12 rounded-lg border-2 bg-background text-center text-xl font-bold transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
          autoComplete="off"
        />
      ))}
    </div>
  );
}
