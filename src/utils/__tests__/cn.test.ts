import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('merges simple class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes via falsy values', () => {
    const condition = false;
    expect(cn('a', condition && 'b', 'c')).toBe('a c');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('resolves Tailwind color conflicts', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('p-2', 'mx-4')).toBe('p-2 mx-4');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles array inputs via clsx', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('handles object inputs via clsx', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c');
  });
});
