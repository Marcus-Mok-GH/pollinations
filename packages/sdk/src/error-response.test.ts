import { describe, expect, it } from "vitest";
import { pollinationsErrorFromResponse } from "./error-response.js";
import { PollinationsError } from "./types.js";

describe("pollinationsErrorFromResponse", () => {
    it("keeps the request ID from the error body when both sources provide one", async () => {
        const response = new Response(
            JSON.stringify({
                error: {
                    message: "Request failed",
                    code: "BAD_REQUEST",
                    requestId: "body-request-id",
                },
            }),
            {
                status: 400,
                headers: { "X-Request-Id": "header-request-id" },
            },
        );

        const error = await pollinationsErrorFromResponse(response);

        expect(error).toBeInstanceOf(PollinationsError);
        expect(error.requestId).toBe("body-request-id");
    });

    it("uses X-Request-Id when the error body omits a request ID", async () => {
        const response = new Response(
            JSON.stringify({
                error: { message: "Request failed", code: "BAD_REQUEST" },
            }),
            {
                status: 400,
                headers: { "X-Request-Id": "header-request-id" },
            },
        );

        const error = await pollinationsErrorFromResponse(response);

        expect(error.requestId).toBe("header-request-id");
    });

    it("leaves the request ID undefined when neither source provides one", async () => {
        const response = new Response(
            JSON.stringify({
                error: { message: "Request failed", code: "BAD_REQUEST" },
            }),
            { status: 400 },
        );

        const error = await pollinationsErrorFromResponse(response);

        expect(error.requestId).toBeUndefined();
    });

    it("uses X-Request-Id for non-JSON error responses", async () => {
        const response = new Response("<html>Bad Gateway</html>", {
            status: 502,
            headers: { "X-Request-Id": "gateway-request-id" },
        });

        const error = await pollinationsErrorFromResponse(response);

        expect(error.requestId).toBe("gateway-request-id");
    });
});
