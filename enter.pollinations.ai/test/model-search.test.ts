import { describe, expect, it } from "vitest";
import {
    matchesQuery,
    parseModelQuery,
} from "../frontend/src/components/models/model-search.ts";
import type { ModelPrice } from "../frontend/src/components/models/types.ts";

function model(overrides: Partial<ModelPrice> = {}): ModelPrice {
    return {
        name: "acme/vision-pro",
        type: "image",
        capabilities: [],
        prices: [],
        ...overrides,
    };
}

describe("Models search query", () => {
    it("parses supported filters and free-text terms case-insensitively", () => {
        expect(
            parseModelQuery(
                "Vision ACCESS:FREE owner:Acme capability:Reasoning",
            ),
        ).toEqual({
            filters: [
                { key: "access", value: "free" },
                { key: "owner", value: "acme" },
                { key: "capability", value: "reasoning" },
            ],
            terms: ["vision"],
        });
    });

    it("keeps unknown and incomplete filter tokens as free text", () => {
        expect(parseModelQuery("unknown:value access:")).toEqual({
            filters: [],
            terms: ["unknown:value", "access:"],
        });
    });

    it("searches every supported metadata field with AND semantics", () => {
        const visionModel = model({
            name: "openai/gpt-vision",
            displayName: "Vision Oracle",
            description: "Fast multimodal image understanding",
            brand: "OpenAI",
            baseModel: "gpt-4.1",
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            capabilities: ["reasoning", "tool_calling"],
        });

        expect(
            matchesQuery(
                visionModel,
                "openai oracle multimodal gpt-4.1 image tool_calling",
            ),
        ).toBe(true);
        expect(matchesQuery(visionModel, "oracle missing")).toBe(false);
    });

    it("filters models by access tier", () => {
        expect(matchesQuery(model({ free: true }), "access:free")).toBe(true);
        expect(matchesQuery(model({ paidOnly: true }), "access:paid")).toBe(
            true,
        );
        expect(matchesQuery(model(), "access:quest")).toBe(true);
        expect(matchesQuery(model({ free: true }), "access:paid")).toBe(false);
    });

    it("filters community models by their public owner login", () => {
        const communityModel = model({
            name: "Acme/vision-pro",
            community: true,
        });

        expect(matchesQuery(communityModel, "owner:acme")).toBe(true);
        expect(matchesQuery(communityModel, "owner:other")).toBe(false);
        expect(
            matchesQuery(model({ name: "acme/vision-pro" }), "owner:acme"),
        ).toBe(false);
    });

    it("filters by canonical ID, category, agent category, and capability", () => {
        const agentModel = model({
            name: "openai/reasoning-agent",
            type: "text",
            agent: true,
            capabilities: ["reasoning", "tool_calling"],
        });

        expect(matchesQuery(agentModel, "id:reasoning-agent")).toBe(true);
        expect(matchesQuery(agentModel, "id:another-model")).toBe(false);
        expect(matchesQuery(agentModel, "type:text")).toBe(true);
        expect(matchesQuery(agentModel, "type:agent")).toBe(true);
        expect(matchesQuery(agentModel, "type:image")).toBe(false);
        expect(matchesQuery(agentModel, "capability:REASONING")).toBe(true);
        expect(matchesQuery(agentModel, "capability:web_search")).toBe(false);
    });

    it("requires every structured filter and free-text term to match", () => {
        const communityModel = model({
            name: "acme/vision-pro",
            community: true,
            capabilities: ["reasoning"],
        });

        expect(
            matchesQuery(
                communityModel,
                "vision owner:acme access:quest type:image capability:reasoning",
            ),
        ).toBe(true);
        expect(
            matchesQuery(
                communityModel,
                "vision owner:acme type:text capability:reasoning",
            ),
        ).toBe(false);
    });
});
