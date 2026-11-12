// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog.jsx";

function Example({ onConfirm = () => {} }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <ConfirmDialog
          title="Are you sure?"
          confirmLabel="Yes"
          onConfirm={() => {
            onConfirm();
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        >
          Body text
        </ConfirmDialog>
      )}
    </>
  );
}

function open() {
  const opener = screen.getByText("Open");
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("is a labelled modal dialog with focus inside", () => {
    render(<Example />);
    open();
    const dialog = screen.getByRole("dialog", { name: "Are you sure?" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByText("Cancel"));
  });

  it("confirms and returns focus to the opener", () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    const opener = open();
    fireEvent.click(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on Esc without confirming", () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    open();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the dialog", () => {
    render(<Example />);
    open();
    const dialog = screen.getByRole("dialog");
    screen.getByText("Yes").focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("Cancel"));
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText("Yes"));
  });
});
