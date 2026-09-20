(() => {
  const WECHAT_ID = 'NSDG521';
  const track = (eventName, parameters = {}) => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, {
      page_path: window.location.pathname,
      ...parameters,
    });
  };

  document.querySelectorAll('[data-copy-wechat]').forEach((button) => {
    button.addEventListener('click', async () => {
      const panel = button.closest('.wechat-contact-panel');
      const status = panel?.querySelector('[data-copy-status]');

      try {
        await navigator.clipboard.writeText(WECHAT_ID);
        button.textContent = button.dataset.copiedLabel || '已复制微信号';
        if (status) status.textContent = button.dataset.copiedMessage || `微信号 ${WECHAT_ID} 已复制`;
        track('wechat_id_copy', { contact_method: 'wechat' });
      } catch {
        if (status) status.textContent = button.dataset.copyFallback || `请手动复制微信号：${WECHAT_ID}`;
        track('wechat_copy_fallback', { contact_method: 'wechat' });
      }
    });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const linkText = link.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);

    if (href === '#contact') {
      track('contact_cta_click', { link_text: linkText });
    } else if (href.startsWith('mailto:')) {
      track('contact_email_click', { contact_method: 'email' });
    } else if (href === '/yuyue/' || href.startsWith('/yuyue/?')) {
      track('booking_process_click', { link_text: linkText });
    }
  });
})();
