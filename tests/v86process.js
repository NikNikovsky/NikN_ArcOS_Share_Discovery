// process.js - Adapted for v86 with Polling for Responsiveness and App Close Shortcut

const html = await loadHtml("body.html");

/**
 * Represents the process for the v86 for ArcOS third-party application.
 * This class extends the ArcOS-provided `ThirdPartyAppProcess` to manage
 * the application's lifecycle and rendering within the ArcOS environment.
 */
class proc extends ThirdPartyAppProcess {
    /**
     * @type {number | null}
     */
    resizePollIntervalId = null; // To store the interval ID for polling
    /**
     * Stores the last known dimensions of the parent body element.
     */
    lastParentWidth = 0;
    lastParentHeight = 0;

    /**
     * @type {HTMLElement | null}
     */
    appWrapper = null; // Reference to the main app container
    /**
     * @type {HTMLIFrameElement | null}
     */
    v86Frame = null; // Reference to the iframe
    /**
     * @type {ResizeObserver | null}
     */
    resizeObserver = null; // For responsive design

    constructor(handler, pid, parentPid, app, workingDirectory, ...args) {
        super(handler, pid, parentPid, app, workingDirectory);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Renders the application's user interface.
     * This method is called by ArcOS when the application needs to display its content.
     */
    async render() {
        if (this._disposed) return;

        const body = this.getBody();
        body.innerHTML = html; // This line injects the content from body.html

        this.Log("v86 rendered.", LogLevel.info);

        // Get references to the elements AFTER they are rendered into the DOM
        this.appWrapper = document.getElementById('app-wrapper');
        this.v86Frame = document.getElementById('v86-frame');

        if (this.v86Frame && this.appWrapper) {
            // Responsive resizing using ResizeObserver if available
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => {
                    this.handleResize();
                });
                this.resizeObserver.observe(this.getBody());
            } else {
                // Fallback: Polling for responsiveness
                if (this.resizePollIntervalId) {
                    clearInterval(this.resizePollIntervalId);
                }
                this.resizePollIntervalId = setInterval(() => {
                    if (this._disposed) {
                        clearInterval(this.resizePollIntervalId);
                        return;
                    }
                    const bodyElement = this.getBody();
                    const currentWidth = bodyElement.clientWidth;
                    const currentHeight = bodyElement.clientHeight;
                    if (currentWidth !== this.lastParentWidth || currentHeight !== this.lastParentHeight) {
                        this.Log(`[Polling Detected] Dimensions changed: ${currentWidth}x${currentHeight}`, LogLevel.info);
                        this.lastParentWidth = currentWidth;
                        this.lastParentHeight = currentHeight;
                        this.handleResize();
                    }
                }, 100);
            }

            // Initial sizing
            this.handleResize();

            // Initial diagnostic logs (keep these to verify initial state)
            this.Log(`[Render] window.innerWidth: ${window.innerWidth}, window.innerHeight: ${window.innerHeight}`, LogLevel.info);
            if (this.app && this.app.size) {
                this.Log(`[Render] this.app.size properties: w=${this.app.size.w}, h=${this.app.size.h}`, LogLevel.info);
                if (typeof this.app.size.subscribe === 'function') {
                    this.Log(`[Render] this.app.size HAS a 'subscribe' method (potential ReadableStore).`, LogLevel.info);
                } else {
                    this.Log(`[Render] this.app.size DOES NOT have a 'subscribe' method.`, LogLevel.info);
                }
            } else {
                this.Log(`[Render] this.app or this.app.size is undefined at render.`, LogLevel.warning);
            }
        } else {
            this.Log("Required elements (iframe or app-wrapper) not found after render.", LogLevel.error);
        }
    }

    /**
     * Sets the iframe size based on the parent body element's client dimensions.
     */
    handleResize() {
        if (this._disposed || !this.v86Frame) return;
        const bodyElement = this.getBody();
        const parentWidth = bodyElement.clientWidth;
        const parentHeight = bodyElement.clientHeight;
        this.v86Frame.style.width = `${parentWidth}px`;
        this.v86Frame.style.height = `${parentHeight}px`;
        this.lastParentWidth = parentWidth;
        this.lastParentHeight = parentHeight;
    }

    /**
     * Overriding the dispose method to ensure clean up of polling interval and iframe.
     */
    dispose() {
        if (this.resizePollIntervalId) {
            clearInterval(this.resizePollIntervalId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        const v86Frame = document.getElementById('v86-frame');
        if (v86Frame) {
            try {
                v86Frame.src = 'about:blank';
                setTimeout(() => {
                    if (v86Frame.parentNode) {
                        v86Frame.parentNode.removeChild(v86Frame);
                    }
                }, 100);
            } catch (e) {
                // Log any errors during iframe cleanup, but don't prevent dispose
            }
        }
        super.dispose();
    }
}

return { proc };
