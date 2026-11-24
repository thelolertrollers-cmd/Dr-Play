const paths: Record<string, string> = {
  home: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1z",
  wrench: "M14.5 6.5a3.5 3.5 0 0 0-4.8 4.6L4 16.8 7.2 20l5.7-5.7a3.5 3.5 0 0 0 4.6-4.8L15 12l-3-3z",
  users: "M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm7 1a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 16 12zM3.5 19c.4-2.4 2.5-4 5.5-4s5.1 1.6 5.5 4M14 15c2.2.2 4 1.5 4.6 4",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z",
  coins: "M8 8h8a4 4 0 0 1 0 8H8zM8 12h9M6 16c0 2 2.5 3 6 3s6-1 6-3",
  sliders: "M4 8h10M18 8h2M4 16h2M10 16h10M14 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM6 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0z",
  tag: "M4 12V5h7l9 9-7 7zM8.5 8.5h.01",
  logout: "M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h10M11 9l3 3-3 3",
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? paths.home} />
    </svg>
  );
}
