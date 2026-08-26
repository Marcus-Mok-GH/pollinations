import type { ModelPrice } from "./types.ts";

export const MODEL_CATEGORIES = [
    "all",
    "image",
    "video",
    "3d",
    "audio",
    "realtime",
    "text",
    "embedding",
    "agent",
] as const;
export type ModelCategory = (typeof MODEL_CATEGORIES)[number];
export const MODEL_SCOPES = ["pollinations", "community"] as const;
export type ModelScope = (typeof MODEL_SCOPES)[number];
export const MODEL_SORTS = [
    "newest",
    "oldest",
    "price-low",
    "price-high",
    "title",
    "title-desc",
    "brand",
    "brand-desc",
] as const;
export type ModelSort = (typeof MODEL_SORTS)[number];
export type ModelSearch = {
    scope?: ModelScope;
    category?: ModelCategory;
    q?: string;
    sort?: ModelSort;
};

const MODEL_FILTER_KEYS = [
    "access",
    "owner",
    "id",
    "type",
    "capability",
] as const;
type ModelFilterKey = (typeof MODEL_FILTER_KEYS)[number];
type ModelFilter = {
    key: ModelFilterKey;
    value: string;
};

export type ParsedModelQuery = {
    filters: ModelFilter[];
    terms: string[];
};

function includes<T extends string>(
    values: readonly T[],
    value: unknown,
): value is T {
    return typeof value === "string" && values.includes(value as T);
}

function isModelFilterKey(value: string): value is ModelFilterKey {
    return includes(MODEL_FILTER_KEYS, value);
}

export function validateModelSearch(
    search: Record<string, unknown>,
): ModelSearch {
    const scope = includes(MODEL_SCOPES, search.scope)
        ? search.scope
        : "pollinations";
    const category = includes(MODEL_CATEGORIES, search.category)
        ? search.category
        : "all";
    const sort = includes(MODEL_SORTS, search.sort) ? search.sort : "newest";
    const query = typeof search.q === "string" ? search.q.trim() : "";
    return {
        scope: scope === "community" ? scope : undefined,
        category:
            category !== "all" &&
            (scope === "community"
                ? category === "text" ||
                  category === "image" ||
                  category === "agent"
                : category !== "agent")
                ? category
                : undefined,
        q: query || undefined,
        sort: sort === "newest" ? undefined : sort,
    };
}

/**
 * Separates a search string into supported `key:value` filters and free-text
 * terms. Unknown `key:value` tokens remain free text so a typo cannot silently
 * broaden a search.
 */
export function parseModelQuery(query: string): ParsedModelQuery {
    const filters: ModelFilter[] = [];
    const terms: string[] = [];

    for (const token of query.trim().split(/\s+/)) {
        if (!token) continue;

        const colonIndex = token.indexOf(":");
        const key = token.slice(0, colonIndex).toLowerCase();
        const value = token.slice(colonIndex + 1).toLowerCase();

        if (colonIndex > 0 && value && isModelFilterKey(key)) {
            filters.push({ key, value });
        } else {
            terms.push(token.toLowerCase());
        }
    }

    return { filters, terms };
}

function getModelAccess(model: ModelPrice): "free" | "paid" | "quest" {
    if (model.paidOnly) return "paid";
    if (model.free) return "free";
    return "quest";
}

function getCommunityOwner(model: ModelPrice): string | undefined {
    if (!model.community) return undefined;

    const separatorIndex = model.name.indexOf("/");
    return separatorIndex > 0 ? model.name.slice(0, separatorIndex) : undefined;
}

function hasModelType(model: ModelPrice, value: string): boolean {
    return (
        model.type.toLowerCase() === value ||
        (model.agent === true && value === "agent")
    );
}

function matchesFilter(model: ModelPrice, filter: ModelFilter): boolean {
    switch (filter.key) {
        case "access":
            return getModelAccess(model) === filter.value;
        case "owner":
            return getCommunityOwner(model)?.toLowerCase() === filter.value;
        case "id":
            return model.name.toLowerCase().includes(filter.value);
        case "type":
            return hasModelType(model, filter.value);
        case "capability":
            return model.capabilities.some(
                (capability) => capability.toLowerCase() === filter.value,
            );
    }
}

function getModelSearchText(model: ModelPrice): string {
    return [
        model.name,
        model.displayName ?? "",
        model.description ?? "",
        model.brand ?? "",
        model.baseModel ?? "",
        ...(model.inputModalities ?? []),
        ...(model.outputModalities ?? []),
        ...model.capabilities,
    ]
        .join(" ")
        .toLowerCase();
}

/**
 * Matches every supported filter and every free-text term in a query. Free
 * text covers the dashboard metadata already loaded for each model.
 */
export function matchesQuery(model: ModelPrice, query: string): boolean {
    const { filters, terms } = parseModelQuery(query);

    if (!filters.every((filter) => matchesFilter(model, filter))) {
        return false;
    }

    const searchText = getModelSearchText(model);
    return terms.every((term) => searchText.includes(term));
}
