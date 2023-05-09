
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// package.json
var require_package = __commonJS({
	"package.json"(exports, module) {
		module.exports = {
			name: "uploadthing",
			version: "2.0.5",
			license: "MIT",
			exports: {
				"./package.json": "./package.json",
				"./client": {
					import: "./dist/client.mjs",
					types: "./dist/client.d.ts"
				},
				"./server": {
					import: "./dist/server.mjs",
					types: "./dist/server.d.ts"
				}
			},
			files: [
				"dist"
			],
			typesVersions: {
				"*": {
					"*": [
						"dist/*"
					]
				}
			},
			scripts: {
				lint: "eslint *.ts* --max-warnings 0",
				build: "tsup",
				prebuild: "tsup",
				dev: "tsup --watch src/* --watch client.ts --watch server.ts",
				test: "vitest run",
				"test:watch": "vitest",
				typecheck: "tsc --noEmit"
			},
			devDependencies: {
				"@types/node": "18.16.0",
				"@uploadthing/eslint-config": "0.1.0",
				eslint: "^8.40.0",
				next: "13.4.1",
				tsup: "6.7.0",
				typescript: "5.1.0-beta",
				vitest: "^0.30.1"
			},
			publishConfig: {
				access: "public"
			}
		};
	}
});

// src/upload-builder.ts
function createBuilder(initDef = {}) {
	const _def = {
		fileTypes: ["image"],
		maxSize: "1MB",
		middleware: async () => ({}),
		...initDef
	};
	return {
		fileTypes(types) {
			return createBuilder({
				..._def,
				fileTypes: types
			});
		},
		maxSize(size) {
			return createBuilder({
				..._def,
				maxSize: size
			});
		},
		middleware(resolver) {
			return createBuilder({
				..._def,
				middleware: resolver
			});
		},
		onUploadComplete(resolver) {
			return {
				_def,
				resolver
			};
		}
	};
}

// src/types.ts
var unsetMarker = "unsetMarker";

// src/route-handler.ts
var UPLOADTHING_VERSION = require_package().version;
function fileSizeToBytes(size) {
	const sizeUnit = size.slice(-2);
	const sizeValue = parseInt(size.slice(0, -2), 10);
	let bytes;
	switch (sizeUnit) {
		case "B":
			bytes = sizeValue;
			break;
		case "KB":
			bytes = sizeValue * 1024;
			break;
		case "MB":
			bytes = sizeValue * 1024 * 1024;
			break;
		case "GB":
			bytes = sizeValue * 1024 * 1024 * 1024;
			break;
		default:
			if (size.slice(-1) === "B") {
				bytes = parseInt(size.slice(0, -1), 10);
				break;
			}
			throw new Error(`Invalid file size unit: ${sizeUnit}`);
	}
	return bytes;
}
var generateUploadThingURL = (path) => {
	const host = process.env.CUSTOM_INFRA_URL ?? "https://uploadthing.com";
	return `${host}${path}`;
};
if (process.env.NODE_ENV !== "development") {
	console.log("[UT] UploadThing dev server is now running!");
}
var isValidResponse = (response) => {
	if (!response.ok)
		return false;
	if (response.status >= 400)
		return false;
	if (!response.headers.has("x-uploadthing-version"))
		return false;
	return true;
};
var conditionalDevServer = async (fileKey) => {
	if (process.env.NODE_ENV !== "development")
		return;
	const queryUrl = generateUploadThingURL(`/api/pollUpload/${fileKey}`);
	let tries = 0;
	while (tries < 20) {
		const res = await fetch(queryUrl);
		const json = await res.json();
		const file = json.fileData;
		if (json.status === "done") {
			let callbackUrl = file.callbackUrl + `?slug=${file.callbackSlug}`;
			if (!callbackUrl.startsWith("http"))
				callbackUrl = "http://" + callbackUrl;

			console.log("[UT] SIMULATING FILE UPLOAD WEBHOOK CALLBACK", callbackUrl);
			const response = await fetch(callbackUrl, {
				method: "POST",
				body: JSON.stringify({
					status: "uploaded",
					metadata: JSON.parse(file.metadata ?? "{}"),
					file: {
						url: `https://uploadthing.com/f/${encodeURIComponent(
							fileKey ?? ""
						)}`,
						name: file.fileName
					}
				}),
				headers: {
					"uploadthing-hook": "callback"
				}
			});
			if (isValidResponse(response)) {
				console.log("[UT] Successfully simulated callback for file", fileKey);
			} else {
				console.error(
					"[UT] Failed to simulate callback for file. Is your webhook configured correctly?",
					fileKey
				);
			}
			return file;
		}
		tries++;
		await new Promise((r) => setTimeout(r, 1e3));
	}
	console.error(`[UT] Failed to simulate callback for file ${fileKey}`);
	throw new Error("File took too long to upload");
};
var GET_DEFAULT_URL = () => {
	const vcurl = process.env.VERCEL_URL;
	if (vcurl)
		return `https://${vcurl}/api/uploadthing`;
	return `http://localhost:${process.env.PORT ?? 3e3}/api/uploadthing`;
};

var buildRequestHandler = (opts) => {
	return async (input) => {
		const { router, config } = opts;
		const upSecret = (config == null ? void 0 : config.uploadthingId) ?? env.UPLOADTHING_SECRET;
		const { uploadthingHook, slug, req, res, actionType } = input;
		if (!slug)
			throw new Error("we need a slug");
		const uploadable = router[slug];
		if (!uploadable) {
			return { status: 404 };
		}
		const reqBody = "body" in req && typeof req.body === "string" ? JSON.parse(req.body) : await req.json();
		if (uploadthingHook && uploadthingHook === "callback") {
			uploadable.resolver({
				file: reqBody.file,
				metadata: reqBody.metadata
			});
			return { status: 200 };
		}
		if (!actionType || actionType !== "upload") {
			return { status: 404 };
		}
		try {
			const { files } = reqBody;
			const metadata = await uploadable._def.middleware(req, res);
			if (!Array.isArray(files) || !files.every((f) => typeof f === "string"))
				throw new Error("Need file array");
			const uploadthingApiResponse = await fetch(
				generateUploadThingURL("/api/prepareUpload"),
				{
					method: "POST",
					body: JSON.stringify({
						files,
						fileTypes: uploadable._def.fileTypes,
						metadata,
						callbackUrl: (config == null ? void 0 : config.callbackUrl) ?? GET_DEFAULT_URL(),
						callbackSlug: slug,
						maxFileSize: fileSizeToBytes(uploadable._def.maxSize ?? "16MB")
					}),
					headers: {
						"Content-Type": "application/json",
						"x-uploadthing-api-key": upSecret ?? ""
					}
				}
			);
			if (!uploadthingApiResponse.ok) {
				console.error("[UT] unable to get presigned urls");
				try {
					const error = await uploadthingApiResponse.json();
					console.error(error);
				} catch (e) {
					console.error("[UT] unable to parse response");
				}
				throw new Error("ending upload");
			}
			const parsedResponse = await uploadthingApiResponse.json();
			if (process.env.NODE_ENV === "development") {
				parsedResponse.forEach((file) => {
					conditionalDevServer(file.key);
				});
			}
			return { body: parsedResponse, status: 200 };
		} catch (e) {
			console.error("[UT] middleware failed to run");
			console.error(e);
			return { status: 400 };
		}
	};
};
var createNextRouteHandler = (opts) => {
	const requestHandler = buildRequestHandler(opts);
	const POST = async (req) => {
		const params = new URL(req.url).searchParams;
		const uploadthingHook = req.headers.get("uploadthing-hook") ?? void 0;
		const slug = params.get("slug") ?? void 0;
		const actionType = params.get("actionType") ?? void 0;
		const response = await requestHandler({
			uploadthingHook,
			slug,
			actionType,
			req
		});
		if (response.status === 200) {
			return new Response(JSON.stringify(response.body), {
				status: response.status,
				headers: {
					"x-uploadthing-version": UPLOADTHING_VERSION
				}
			});
		}
		return new Response("Error", {
			status: response.status,
			headers: {
				"x-uploadthing-version": UPLOADTHING_VERSION
			}
		});
	};
	return { POST };
};
var createNextPageApiHandler = (opts) => {
	const requestHandler = buildRequestHandler(opts);
	return async (req, res) => {
		const params = req.query;
		const uploadthingHook = req.headers["uploadthing-hook"];
		const slug = params["slug"];
		const actionType = params["actionType"];
		if (slug && typeof slug !== "string")
			return res.status(400).send("`slug` must not be an array");
		if (actionType && typeof actionType !== "string")
			return res.status(400).send("`actionType` must not be an array");
		if (uploadthingHook && typeof uploadthingHook !== "string")
			return res.status(400).send("`uploadthingHook` must not be an array");
		const response = await requestHandler({
			uploadthingHook,
			slug,
			actionType,
			req,
			res
		});
		res.status(response.status);
		res.setHeader("x-uploadthing-version", UPLOADTHING_VERSION);
		if (response.status === 200) {
			return res.json(response.body);
		}
		return res.send("Error");
	};
};
var createSvelteKitHandler = (opts) => {
	const requestHandler = buildRequestHandler(opts);
	const POST = async ({ request: req }) => {
		const params = new URL(req.url).searchParams;
		const uploadthingHook = req.headers.get("uploadthing-hook") ?? void 0;
		const slug = params.get("slug") ?? void 0;
		const actionType = params.get("actionType") ?? void 0;
		const response = await requestHandler({
			uploadthingHook,
			slug,
			actionType,
			req
		});
		if (response.status === 200) {
			return new Response(JSON.stringify(response.body), {
				status: response.status,
				headers: {
					"x-uploadthing-version": UPLOADTHING_VERSION
				}
			});
		}
		return new Response("Error", {
			status: response.status,
			headers: {
				"x-uploadthing-version": UPLOADTHING_VERSION
			}
		});
	};
	return { POST };
};

// server.ts
var createFilething = () => createBuilder();
export {
	createFilething,
	createNextPageApiHandler,
	createNextRouteHandler,
	createSvelteKitHandler,
	unsetMarker
};
//# sourceMappingURL=server.mjs.map