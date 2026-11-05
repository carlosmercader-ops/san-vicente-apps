let installPrompt;
const installButton = document.getElementById('install');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installButton.textContent = 'Instalar SVP Apps'; });
installButton.addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.textContent = 'Cómo instalar'; } else { document.getElementById('instructions').showModal(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
