<script lang="ts">
  import CargoCrateView from "$lib/components/minigames/cargo-crate/CargoCrateView.svelte";

  const description =
    "Practice the NoPixel V cargo crate rhythm minigame: tap A, S and D as crates cross the judge line.";
</script>

<svelte:head>
  <title>Cargo Crate Trainer | NoPixel V</title>
  <meta name="description" content={description} />
  <meta property="og:title" content="Cargo Crate Trainer | NoPixel V" />
  <meta property="og:description" content={description} />
</svelte:head>

<CargoCrateView />
