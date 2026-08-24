export function parseImageList(value: string): string[] {
    if (!value) return [];
    return value.includes("|") ? value.split("|") : value.split(",");
}
