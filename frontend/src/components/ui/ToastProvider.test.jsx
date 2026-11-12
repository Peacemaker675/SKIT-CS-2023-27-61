// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { TOAST_MS, ToastProvider, useToast } from "./ToastProvider.jsx";

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved")}>ok</button>
      <button onClick={() => toast.error("Failed")}>bad</button>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  render(
    <ToastProvider>
      <Buttons />
    </ToastProvider>,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("toasts", () => {
  it("shows success and error toasts in a polite live region", () => {
    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByText("bad"));
    expect(screen.getByText("Saved").className).toContain("toast-success");
    expect(screen.getByText("Failed").className).toContain("toast-error");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it("hides a toast after 4s", () => {
    fireEvent.click(screen.getByText("ok"));
    act(() => vi.advanceTimersByTime(TOAST_MS - 1));
    expect(screen.queryByText("Saved")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
