(() => {
  const WECHAT_ID = 'NSDG521';

  document.querySelectorAll('[data-copy-wechat]').forEach((button) => {
    button.addEventListener('click', async () => {
      const panel = button.closest('.wechat-contact-panel');
      const status = panel?.querySelector('[data-copy-status]');

      try {
        await navigator.clipboard.writeText(WECHAT_ID);
        button.textContent = button.dataset.copiedLabel || '已复制微信号';
        if (status) status.textContent = button.dataset.copiedMessage || `微信号 ${WECHAT_ID} 已复制`;
      } catch {
        if (status) status.textContent = button.dataset.copyFallback || `请手动复制微信号：${WECHAT_ID}`;
      }
    });
  });
})();
