/**
 * jsdom does not implement `HTMLDialogElement.showModal` / `close`. Install
 * minimal prototype stubs (open attribute only) on the current global.
 */
export function installDialogStub(): void {
  const proto = (globalThis as any).HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', 'open')
    }
  }
  if (!proto.close) {
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
}
