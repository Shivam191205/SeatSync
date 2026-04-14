'use client';

import { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const glowRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const glowPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => glowRef.current?.classList.add('clicking');
    const handleMouseUp = () => glowRef.current?.classList.remove('clicking');

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let animationFrame;
    const animate = () => {
      glowPos.current.x += (mousePos.current.x - glowPos.current.x) * 0.15;
      glowPos.current.y += (mousePos.current.y - glowPos.current.y) * 0.15;

      if (glowRef.current) {
        glowRef.current.style.left = `${glowPos.current.x}px`;
        glowRef.current.style.top = `${glowPos.current.y}px`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <div id="cursor-glow" ref={glowRef}></div>;
}
