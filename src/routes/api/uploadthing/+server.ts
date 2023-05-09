import { env } from "$env/dynamic/private";
import { createSvelteKitHandler } from "../../../lib/server.mjs";
import { ourFileRouter } from "../../../lib/uploadthing";

const { POST } = createSvelteKitHandler({
    router: ourFileRouter,
    config: {
        uploadthingId: env.UPLOADTHING_SECRET,
        // callbackUrl: "http://localhost:5173/api/uploadthing",
    },
});

export { POST };
