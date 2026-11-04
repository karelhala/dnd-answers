import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="confirm-title" aria-describedby="confirm-scope" onCancel={(event) => {
      event.preventDefault();
      onCancel();
    }}>
      <h2 id="confirm-title">{title}</h2>
      <div id="confirm-scope">{children}</div>
      <div className="choices">
        <button type="button" ref={cancel} onClick={onCancel}>Cancel</button>
        <button type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
