const html = await loadHtml("../body.html");
const { __START_DOSBOX__ } = await load("./jsdos.js");

class DoomAppRuntime extends ThirdPartyAppProcess {
  jsdos;
  ci;

  constructor(pid, parentPid, app, operationId, workingDirectory, ...args) {
    super(pid, parentPid, app, operationId, workingDirectory);
  }

  async render() {
    const body = this.getBody();
    body.innerHTML = html;
    const player = body.querySelector(".player");

    let _paused = false;
    let paused = () => _paused;

    const bundle = await fs.direct(
      util.join(this.workingDirectory, "bin/doom.jsdos"),
    );
    const emulator = await fs.direct(
      util.join(this.workingDirectory, "js/wdosbox.js"),
    );

    this.handler.renderer.focusedPid.subscribe((v) => {
      if (this._disposed) return;

      if (v !== this.pid) {
        this.ci?.pause();
        _paused = true;
      } else {
        this.ci?.resume();
        _paused = false;
      }
    });

    __START_DOSBOX__(paused, emulator);

    this.jsdos = Dos(player, {
      autoStart: true,
      kiosk: true,
      noNetworking: true,
      noCloud: true,
      url: bundle,
      onEvent: (event, ci) => {
        if (this._disposed) return;

        if (event === "emu-ready") {
          const canvas = player.querySelector("canvas");
          player.append(canvas);
          player.querySelector(".window.absolute")?.remove();
          canvas.addEventListener("click", () => {
            if (this._disposed) return;

            this.handler.renderer.focusPid(this.pid);
          });
        } else if (event === "ci-ready") {
          this.ci = ci;
          ci.exitResolve = () => this.closeWindow();

          window.console.log(this.jsdos, ci);
        }
      },
    });
  }

  async onClose() {
    try {
      this.jsdos?.stop();
      return true;
    } catch {
      return true;
    }
  }
  stop = this.onClose;
}

return DoomAppRuntime;
