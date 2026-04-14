import './globals.css';

export const metadata = {
  title: 'SeatSync — Smart Seat Booking System',
  description: 'Organizational seat booking system for maximum space utilization with smart batch rotation scheduling.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪑</text></svg>" />
      </head>
      <body>
        <div id="cursor-glow"></div>
        <div id="confetti-container"></div>
        {children}
        <CursorGlowScript />
      </body>
    </html>
  );
}

// Client-side script for cursor glow trail
function CursorGlowScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        // We'll use a simplified version of the cursor glow here, 
        // ideally this should be a client component but this keeps layout clean.
        document.addEventListener('DOMContentLoaded', () => {
          const glow = document.getElementById('cursor-glow');
          if (!glow) return;
          let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
          document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
          function animate() {
            glowX += (mouseX - glowX) * 0.18;
            glowY += (mouseY - glowY) * 0.18;
            glow.style.left = glowX + 'px';
            glow.style.top = glowY + 'px';
            requestAnimationFrame(animate);
          }
          animate();
        });
      })();
    `}} />
  );
}
