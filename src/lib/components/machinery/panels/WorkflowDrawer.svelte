<script lang="ts">
  import { Drawer } from "vaul-svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { Database, Download, Upload, X } from "lucide-svelte";
  import { machineryStore, MAX_WORKFLOW_NAME_LENGTH } from "$lib/stores/machinery.svelte";
  import { cn } from "$lib/utils/cn";

  let open = $state(false);
  let workflows = $derived(machineryStore.savedWorkflows);
  let confirmDeleteId = $state<string | null>(null);
  let deleteTimer: ReturnType<typeof setTimeout> | undefined;
  let importError = $state("");
  let fileInput = $state<HTMLInputElement | null>(null);

  function clearDeleteConfirmation(): void {
    if (deleteTimer) clearTimeout(deleteTimer);
    deleteTimer = undefined;
    confirmDeleteId = null;
  }

  async function openDrawer(): Promise<void> {
    await machineryStore.refreshWorkflows();
    open = true;
  }

  async function deleteWorkflow(id: string): Promise<void> {
    if (confirmDeleteId !== id) {
      clearDeleteConfirmation();
      confirmDeleteId = id;
      deleteTimer = setTimeout(clearDeleteConfirmation, 4000);
      return;
    }
    clearDeleteConfirmation();
    await machineryStore.deleteWorkflow(id);
  }

  function exportBlueprint(): void {
    const blob = new Blob([machineryStore.exportBlueprint()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nopixel-v-blueprint-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importFile(event: Event): void {
    importError = "";
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !machineryStore.importBlueprint(reader.result)) {
        importError = "Invalid blueprint JSON format.";
        return;
      }
      open = false;
    };
    reader.readAsText(file);
  }
</script>

<Button
  onclick={openDrawer}
  title="Switch or manage workflows"
  class="rounded-none border-0 bg-neutral-950 px-3.5 py-1 text-base font-bold italic uppercase text-white hover:bg-white hover:text-black"
>
  <Database class="h-3.5 w-3.5" />
  <span>{machineryStore.activeWorkflowName}</span>
</Button>

<Drawer.Root
  bind:open
  onOpenChange={(value) => !value && clearDeleteConfirmation()}
  direction="right"
  shouldScaleBackground
>
  <Drawer.Portal>
    <Drawer.Overlay class="fixed inset-0 z-40 bg-black/70" />
    <Drawer.Content
      id="machinery-workflow-drawer"
      aria-label="Workflow management"
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-800 bg-black p-6 shadow-2xl outline-none"
    >
      <div class="flex items-start justify-between pb-5">
        <div class="flex items-center gap-2">
          <Database class="h-4 w-4 text-white" />
          <h2 class="text-xl font-black italic uppercase text-white">Workflows</h2>
        </div>
        <Drawer.Close
          aria-label="Close workflows"
          class="p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          ><X class="h-5 w-5" /></Drawer.Close
        >
      </div>

      <div class="flex-1 overflow-y-auto py-6">
        <label
          for="workflow-name-input"
          class="mb-2 block text-xs font-bold uppercase tracking-widest text-white"
          >Workflow Name</label
        >
        <input
          id="workflow-name-input"
          aria-label="Rename workflow"
          maxlength={MAX_WORKFLOW_NAME_LENGTH}
          value={machineryStore.activeWorkflowName}
          oninput={(event) =>
            machineryStore.renameWorkflow((event.currentTarget as HTMLInputElement).value)}
          placeholder="Workflow name..."
          class="mb-6 w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-bold italic uppercase text-white outline-none focus:border-white"
        />

        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-widest text-white">Switch workflow</h3>
          <Button
            onclick={async () => {
              await machineryStore.newWorkflow();
              open = false;
            }}
            class="border-neutral-700 text-white hover:bg-white hover:text-black"
          >
            New
          </Button>
        </div>
        {#if workflows.length > 0}
          <div class="space-y-1">
            {#each workflows as workflow (workflow.id)}
              {@const selected = workflow.id === machineryStore.activeWorkflowId}
              <div
                class={cn(
                  "relative flex min-h-14 items-center justify-end border bg-neutral-950 p-3",
                  selected ? "border-white" : "border-neutral-900 hover:border-neutral-700",
                )}
              >
                <Button
                  onclick={async () => {
                    await machineryStore.loadWorkflow(workflow.id);
                    open = false;
                  }}
                  class="absolute inset-0 z-0 h-full w-full justify-start px-3 pr-24 text-left hover:bg-neutral-900"
                >
                  <span class="truncate">{workflow.name}</span>
                </Button>
                <Button
                  variant="quiet"
                  onclick={() => deleteWorkflow(workflow.id)}
                  class={cn(
                    "relative z-10 ml-auto border-0 px-3 py-1.5",
                    confirmDeleteId === workflow.id
                      ? "bg-red-500 text-black hover:bg-red-500"
                      : "bg-black text-white hover:bg-red-500 hover:text-black",
                  )}
                >
                  {confirmDeleteId === workflow.id ? "Confirm" : "Delete"}
                </Button>
              </div>
            {/each}
          </div>
        {:else}
          <div
            class="border border-dashed border-neutral-900 bg-neutral-950 py-4 text-center text-xs italic text-neutral-500"
          >
            No workflows yet.
          </div>
        {/if}
      </div>

      <div class="pt-5">
        <div class="flex items-center gap-2">
          <Button
            variant="quiet"
            onclick={exportBlueprint}
            class="hover:!bg-white hover:!text-black"
          >
            <Download class="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button
            variant="quiet"
            onclick={() => fileInput?.click()}
            class="hover:!bg-white hover:!text-black"
          >
            <Upload class="h-3.5 w-3.5" />
            Import JSON
          </Button>
          <input
            type="file"
            accept=".json"
            bind:this={fileInput}
            onchange={importFile}
            class="hidden"
          />
        </div>
        {#if importError}<p class="mt-3 text-xs font-semibold text-red-400">
            {importError}
          </p>{/if}
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
