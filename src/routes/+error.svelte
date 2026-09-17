<svelte:head>
	<title>404 | NoPixel V</title>
	<meta
		name="description"
		content="The requested NoPixel V page could not be found."
	/>
</svelte:head>

<div
	class="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-white"
>
	<section class="w-full max-w-xl text-center" aria-labelledby="error-title">
		<h1
			id="error-title"
			class="text-5xl font-bold italic uppercase tracking-tight md:text-7xl"
		>
			Page Not Found
		</h1>
		<p
			class="mx-auto mt-5 max-w-md text-sm italic leading-relaxed text-neutral-500 md:text-base"
		>
			That route does not exist. Return to the launcher.
		</p>
		<nav aria-label="Error page navigation" class="mt-10">
			<a
				href="/"
				class="return-link inline-flex h-9 items-center justify-center border border-neutral-800 px-5 pb-0.5 text-sm font-semibold italic uppercase leading-none text-neutral-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
			>
				Return to Launcher
			</a>
		</nav>
	</section>
</div>

<style>
	.return-link:hover {
		background: #fff;
		border-color: #fff;
		color: #000;
	}
</style>
