Example on how to use use [UploadThing](https://uploadthing.com/) with SvelteKit.

- In [src\routes\api\uploadthing\+server.ts](https://github.com/MatsDK/uploadthing-sveltekit/blob/main/src/routes/api/uploadthing/%2Bserver.ts)
	- `uploadthingId` should be set.
	- `callbackUrl` should be set (SvelteKit does not set `env.PORT`, which is used for the callbacks), or set the port of the vite dev server to 3000.
	- `callbackUrl` must be set to `localhost`, `127.0.0.1` is not recognized as being hosted locally (you will get `{ status: 'THIS FILE WAS NOT MADE FROM LOCALHOST' }`).
- [svelte-filedrop](https://github.com/chanced/filedrop-svelte) should be installed.