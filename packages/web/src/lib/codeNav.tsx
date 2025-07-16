// Stub implementations for removed code navigation features

export interface SymbolDefinition {
    name: string;
    type: string;
    location: string;
    fileName: string;
    repoName: string;
    range: Record<string, unknown>;
}

export function SymbolHoverPopup() {
    // Code navigation feature removed - return null
    return null;
}

export const symbolHoverTargetsExtension = () => {
    // Code navigation feature removed - return empty extension
    return [];
};