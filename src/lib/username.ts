export function generateUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20);
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${base}_${suffix}`;
}
