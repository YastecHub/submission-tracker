import { useEffect, useMemo } from 'react';

const FLOWERS = ['🌸', '🌷', '🌹', '💐', '🌼', '🌺', '🎉', '🎂'];

/** Flowers fall over the screen for a few seconds on the student's birthday. Tap anywhere to close. */
export default function FlowerShower({ name, onDone }: { name: string; onDone: () => void }) {
  const petals = useMemo(() => Array.from({ length: 36 }, (_, index) => ({
    flower: FLOWERS[index % FLOWERS.length],
    left: Math.random() * 100,
    delay: Math.random() * 2.2,
    duration: 3.2 + Math.random() * 2.4,
    size: 1.4 + Math.random() * 1.4,
  })), []);

  useEffect(() => {
    const timer = setTimeout(onDone, 6500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black/60 flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-label={`Happy birthday, ${name}`} onClick={onDone}>
      <style>{`
        @keyframes nx-petal-fall { from { transform: translateY(-12vh) rotate(0deg); opacity: 1; } to { transform: translateY(112vh) rotate(320deg); opacity: .9; } }
        @keyframes nx-pop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .nx-petal { display: none; } .nx-pop { animation: none !important; } }
      `}</style>
      {petals.map((petal, index) => (
        <span key={index} aria-hidden="true" className="nx-petal absolute top-0 select-none"
          style={{ left: `${petal.left}%`, fontSize: `${petal.size}rem`, animation: `nx-petal-fall ${petal.duration}s linear ${petal.delay}s both` }}>
          {petal.flower}
        </span>
      ))}
      <div className="nx-pop card-base relative max-w-sm w-full p-6 text-center" style={{ animation: 'nx-pop .45s ease-out both' }}>
        <p className="text-5xl" aria-hidden="true">💐</p>
        <h2 className="text-2xl font-semibold mt-3">Happy birthday, {name}!</h2>
        <p className="text-sm text-muted mt-2">These flowers are from all of Class Nexium. Have a wonderful day 🎂</p>
        <button type="button" className="btn-primary w-full mt-5" onClick={onDone}>Thank you!</button>
      </div>
    </div>
  );
}
