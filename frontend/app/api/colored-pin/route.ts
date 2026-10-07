// API endpoint to generate colored pin SVG
// Usage: /api/colored-pin?color=00A86B (hex without #)

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const color = searchParams.get('color') || '00A86B'; // Default: Engie green

  // Validate color format (3 or 6 hex digits)
  const isValidColor = /^[0-9A-Fa-f]{3,6}$/.test(color);
  const hexColor = isValidColor ? `#${color}` : '#00A86B';

  // SVG for a simple pin with the specified color
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="${hexColor}"
        stroke="#ffffff"
        stroke-width="1"
      />
      <circle cx="12" cy="9" r="3" fill="#ffffff" />
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // 1 year
    },
  });
}
