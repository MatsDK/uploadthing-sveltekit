<script lang="ts">
	import FileDrop from "filedrop-svelte";
	import { useUploadThing } from "$lib/uploadthing";

	let loading = false;

	const { files, resetFiles, startUpload, onDrop } =
		useUploadThing("imageUploader");

	const upload = async () => {
		loading = true;
		const res = await startUpload();
		console.log(res);
		loading = false;
	};

	// File size formatter
	const byteValueNumberFormatter = Intl.NumberFormat("en", {
		notation: "compact",
		style: "unit",
		unit: "byte",
		unitDisplay: "narrow",
	});
</script>

<FileDrop
	accept={[
		".png",
		".jpeg",
		".jpg",
		".gif",
		".mp4",
		".webm",
		".mov",
		".mp3",
		".ogg",
		".wav",
		".webm",
	]}
	on:filedrop={onDrop}
>
	Click here to upload files
</FileDrop>

{#if loading}
	<span>Loading...</span>
{/if}

<h3>Selected files</h3>
<ul>
	{#each $files as { file }}
		<li>
			{file.name} - {byteValueNumberFormatter.format(file.size)}
		</li>
	{/each}
</ul>
<button disabled={loading} on:click={resetFiles}>Clear files</button>
<button disabled={loading} on:click={upload}>Start upload</button>
