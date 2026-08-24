export function normalizeEffort(value: unknown): string | undefined {
    return typeof value === "string" ? value.toLowerCase() : undefined;
}
