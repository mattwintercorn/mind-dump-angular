// Type declarations for fake-indexeddb
declare module 'fake-indexeddb/lib/FDBKeyRange' {
  const IDBKeyRange: typeof globalThis.IDBKeyRange;
  export default IDBKeyRange;
}
