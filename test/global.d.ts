/// <reference types="bun/test" />

declare module '*.json' {
  const value: unknown
  export default value
}
