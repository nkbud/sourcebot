// Placeholder implementation for symbol info hook
// This is a stub to resolve build issues - full implementation would be part of enterprise edition

export interface SymbolDefinition {
  name: string;
  type: string;
  location?: string;
  // Add other fields as needed
}

export function useHoveredOverSymbolInfo() {
  // Stub implementation - return null
  return {
    symbolInfo: null,
    isLoading: false,
    error: null,
  };
}