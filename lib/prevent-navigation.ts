"use client"

/**
 * Utility to prevent default navigation behavior on links and buttons
 * This helps avoid full page refreshes when using client-side navigation
 */
export function setupNavigationPrevention() {
  if (typeof window === 'undefined') return;
  
  // Add a global click handler to prevent default navigation
  document.addEventListener('click', (e) => {
    // Get the clicked element and check if it's an anchor or button
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    const button = target.closest('button');
    
    // Prevent default on anchors with href="#" or no href attribute
    if (anchor && (anchor.getAttribute('href') === '#' || !anchor.hasAttribute('href'))) {
      e.preventDefault();
      return;
    }
    
    // Handle internal navigation links (those starting with / but not external links)
    if (anchor && anchor.getAttribute('href')?.startsWith('/') && 
        !anchor.getAttribute('target') && 
        !anchor.hasAttribute('download') &&
        anchor.hostname === window.location.hostname) {
      // Let Next.js router handle these instead of browser navigation
      e.preventDefault();
      // The actual navigation should be handled by the navigation context
      // This just prevents the default browser navigation
    }
    
    // Prevent form submissions via buttons without explicit type
    if (button && !button.hasAttribute('type') && button.closest('form')) {
      // Buttons in forms without type default to 'submit' which causes page refresh
      button.setAttribute('type', 'button');
    }
  }, { capture: true });
  
  // Prevent form submissions that would cause page refresh
  document.addEventListener('submit', (e) => {
    // Only prevent default on forms without explicit action
    const form = e.target as HTMLFormElement;
    if (!form.hasAttribute('action')) {
      e.preventDefault();
    }
  }, { capture: true });
}
