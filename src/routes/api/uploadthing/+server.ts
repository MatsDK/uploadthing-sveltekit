import { ourFileRouter } from "../../../lib/uploadthing";
import { createSvelteKitHandler } from "../../../lib/server.mjs"

import { env } from '$env/dynamic/private'

const { POST } = createSvelteKitHandler({
	router: ourFileRouter,
	config: {
		uploadthingId: env.UPLOADTHING_SECRET,
		callbackUrl: "http://localhost:5173/api/uploadthing"
	}
})

export { POST }