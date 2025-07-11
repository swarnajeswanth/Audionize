"use client";
import React, { useEffect, useState, useRef } from "react";

const DOT_COUNT = 10;
const ANIMATION_DURATION = 6; // seconds for up
const FADE_OUT_DURATION = 0.7; // seconds for fade out
const START_TOP = 90; // vh
const END_TOP = 0; // vh

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

const makeDot = (id) => ({
  id,
  left: getRandom(0, 100),
  progress: 0, // 0 = bottom, 1 = top
  fadingOut: false,
  resetting: false,
  size: getRandom(8, 14),
  delay: getRandom(0, 2),
});

const BlueDots = () => {
  const [dots, setDots] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const timeouts = useRef([]);

  // Initialize dots only on client side to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    setDots(Array.from({ length: DOT_COUNT }).map((_, i) => makeDot(i)));
  }, []);

  useEffect(() => {
    if (!isClient || dots.length === 0) return;

    let isMounted = true;

    function animateDot(dotId) {
      // Move up and fade in
      setDots((prev) =>
        prev.map((dot) =>
          dot.id === dotId
            ? { ...dot, progress: 1, fadingOut: false, resetting: false }
            : dot
        )
      );
      // After up animation, fade out at top
      const fadeTimeout = setTimeout(() => {
        if (!isMounted) return;
        setDots((prev) =>
          prev.map((dot) =>
            dot.id === dotId ? { ...dot, fadingOut: true } : dot
          )
        );
        // After fade out, reset to bottom and start again
        const resetTimeout = setTimeout(() => {
          if (!isMounted) return;
          // Instantly move to bottom (resetting: true)
          setDots((prev) =>
            prev.map((dot) =>
              dot.id === dotId
                ? {
                    ...dot,
                    left: getRandom(0, 100),
                    size: getRandom(8, 14),
                    progress: 0,
                    fadingOut: false,
                    resetting: true,
                  }
                : dot
            )
          );
          // After a short delay, start animating up again (resetting: false)
          setTimeout(() => animateDot(dotId), 50);
        }, FADE_OUT_DURATION * 1000);
        timeouts.current.push(resetTimeout);
      }, ANIMATION_DURATION * 1000);
      timeouts.current.push(fadeTimeout);
    }

    // Start all dots
    dots.forEach((dot, i) => {
      const startTimeout = setTimeout(() => {
        animateDot(dot.id);
      }, dot.delay * 1000);
      timeouts.current.push(startTimeout);
    });

    return () => {
      isMounted = false;
      timeouts.current.forEach(clearTimeout);
    };
  }, [isClient, dots.length]);

  return (
    <div className="blue-dots-overlay">
      {isClient &&
        dots.map((dot) => {
          const top = START_TOP + (END_TOP - START_TOP) * dot.progress;
          // Smoother fade-in at the bottom
          let opacity = 1;
          if (dot.fadingOut) {
            opacity = 0;
          } else if (dot.progress === 0) {
            opacity = 0;
          } else if (dot.progress < 0.1) {
            opacity = dot.progress * 10; // fade in from 0 to 1 as progress goes 0 to 0.1
          }
          // Use fast transition for top when resetting, slow otherwise
          const topTransition = dot.resetting
            ? "top 0.01s linear"
            : `top ${ANIMATION_DURATION}s linear`;
          return (
            <div
              key={dot.id}
              className={`blue-dot-anim${
                dot.fadingOut ? " blue-dot-fadeout" : ""
              }`}
              style={{
                left: `${dot.left}vw`,
                top: `${top}vh`,
                width: dot.size,
                height: dot.size,
                opacity,
                transform: dot.fadingOut
                  ? "scale(0.7)"
                  : dot.progress === 1
                  ? "scale(1.08)"
                  : "scale(0.7)",
                transition: `${topTransition}, opacity ${FADE_OUT_DURATION}s cubic-bezier(0.4,0,0.2,1), transform ${FADE_OUT_DURATION}s cubic-bezier(0.4,1.4,0.2,1)`,
                pointerEvents: "none",
              }}
            ></div>
          );
        })}
    </div>
  );
};

export default BlueDots;
