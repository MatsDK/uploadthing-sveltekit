import type { RequestHandler } from "@sveltejs/kit";
import { createNextRouteHandler, type FileRouter } from "uploadthing/server";

type RouterWithConfig<TRouter extends FileRouter> = {
    router: TRouter;
    config?: {
        callbackUrl?: string;
        uploadthingId?: string;
        uploadthingSecret?: string;
    };
};

// It would be better if this called `buildRequestHandler` instead of the next handler.
// But, buildRequestHandler is not exported in `uploadthing/server`.
export const createSvelteKitHandler = <TRouter extends FileRouter>(
    opts: RouterWithConfig<TRouter>,
) => {
    const handler = createNextRouteHandler(opts);
    const POST: RequestHandler = async ({ request }) => handler.POST(request);

    return { POST };
};
