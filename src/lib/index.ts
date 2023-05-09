import type { FileDropSelectEvent } from "filedrop-svelte";
import { get, writable, type Writable } from "svelte/store";
import { DANGEROUS__uploadFiles } from "uploadthing/client"
import type { FileRouter } from 'uploadthing/server';

const useUploadThing = <TRouter extends FileRouter>(endpoint: keyof TRouter extends string ? keyof TRouter : string) => {
	const files = writable<FullFile[]>([])
	const resetFiles = () => files.set([])

	const onDrop = async (e: CustomEvent<FileDropSelectEvent>) => {
		e.detail.files.accepted.forEach((file) => {
			const reader = new FileReader();
			reader.onabort = () => console.log("file reading was aborted");
			reader.onerror = () => console.log("file reading has failed");
			reader.onload = () => {
				const binaryStr = reader.result;
				if (typeof binaryStr === "object" || !binaryStr) return;
				console.log("file stuff?", file);

				files.set([...get(files), { file, contents: binaryStr }])
			};
			reader.readAsDataURL(file);
		});
	};


	const startUpload = async () => {
		const acceptedFiles = get(files);
		if (!acceptedFiles.length) return

		const resp = await DANGEROUS__uploadFiles(
			acceptedFiles.map((f) => f.file),
			endpoint
		);
		files.set([])

		return resp;
	};

	return {
		files,
		resetFiles,
		startUpload,
		onDrop
	}
}

export const generateSvelteKitHelpers = <TRouter extends FileRouter>(): SvelteKitHelpers<TRouter> => {
	return {
		useUploadThing,
		uploadFiles: DANGEROUS__uploadFiles
	}
}

type UploadThing<TRouter extends FileRouter> = (endpoint: keyof TRouter extends string ? keyof TRouter : string) => {
	readonly files: Writable<FullFile[]>;
	readonly resetFiles: () => void;
	readonly startUpload: () => Promise<any[] | void>;
	readonly onDrop: (e: CustomEvent<FileDropSelectEvent>) => void;
}

type SvelteKitHelpers<TRouter extends FileRouter> = {
	readonly useUploadThing: UploadThing<TRouter>
	readonly uploadFiles: (files: File[], endpoint: keyof TRouter extends string ? keyof TRouter : string, config?: {
		url?: string | undefined;
	} | undefined) => Promise<any[]>;
}

interface FileWithPath extends File {
	readonly path?: string;
}

type FullFile = {
	file: FileWithPath;
	contents: string;
};