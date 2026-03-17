// CSS module declarations for web-only components
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
