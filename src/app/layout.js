import './globals.css';
import CursorGlow from '@/components/CursorGlow';

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
        <CursorGlow />
        <div id="confetti-container"></div>
        {children}
      </body>
    </html>
  );
}
