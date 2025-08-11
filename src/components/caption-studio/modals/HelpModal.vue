<template>
  <dialog id="helpModal">
    <div class="modal-head">
      <h3 style="margin:0">Help</h3>
      <button class="btn small" data-close="helpModal" @click="close">✕</button>
    </div>
    <div class="modal-body">
      <p>This is a migrated mock. Drag in images plus matching .txt files to populate captions. Name pairs must match, like <code>cat_01.jpg</code> and <code>cat_01.txt</code>.</p>
      <ul>
        <li>Projects are stored locally via IndexedDB. Export JSON to back up or move.</li>
        <li>Ollama requires a local server. Some setups block browser calls due to CORS. If the test fails, run a small local proxy or configure CORS for Ollama.</li>
        <li>Nothing is uploaded anywhere.</li>
      </ul>
    </div>
  </dialog>
</template>

<script setup lang="ts">
function close() {
  try { (document.getElementById('helpModal') as HTMLDialogElement | null)?.close(); } catch {}
}
</script>
