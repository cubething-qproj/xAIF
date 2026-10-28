<!--
  Pick a value from a list, with "other…" for anything else. Shows a select
  while the value is one of the options, and a text box (with ▾ to go back
  to the list) once "other…" is chosen or the value isn't in the list.
-->
<script lang="ts">
  let {
    options,
    value,
    onchange,
    title = '',
  }: {
    options: readonly string[];
    value: string;
    onchange: (value: string) => void;
    title?: string;
  } = $props();

  const OTHER = '\u0000other';
  let other = $state(false);
  let input: HTMLInputElement | undefined = $state();
  const free = $derived(other || (value !== '' && !options.includes(value)));

  $effect(() => {
    if (other) input?.focus();
  });
</script>

{#if free}
  <span class="choice">
    <input bind:this={input} {value} {title} placeholder="other…" oninput={(e) => onchange(e.currentTarget.value)} />
    <button
      title="choose from the list"
      onclick={() => {
        other = false;
        onchange(options[0] ?? '');
      }}>▾</button
    >
  </span>
{:else}
  <select
    {value}
    {title}
    onchange={(e) => {
      if (e.currentTarget.value === OTHER) other = true;
      else onchange(e.currentTarget.value);
    }}
  >
    {#each options as o (o)}<option value={o}>{o}</option>{/each}
    <option value={OTHER}>other…</option>
  </select>
{/if}

<style>
  .choice {
    display: inline-flex;
    gap: 2px;
    width: 100%;
  }
  input,
  select {
    flex: 1;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    font: inherit;
  }
  button {
    flex: none;
    padding: 0 4px;
  }
</style>
