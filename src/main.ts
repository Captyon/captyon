import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { checkRepoUpdate } from './services/githubUpdate';

const app = createApp(App);
app.mount('#app');

// Run one-time GitHub update check on launch (non-blocking)
checkRepoUpdate().catch(() => {
  // Errors are already handled/logged inside checkRepoUpdate; swallow here to avoid unhandled rejections.
});
