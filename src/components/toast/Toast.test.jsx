import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Notify from "./Notify";
import ToastProvider from "./ToastProvider";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function Harness({ onRetry = () => {} }) {
  const [error, setError] = useState(null);
  return (
    <ToastProvider>
      <button type="button" onClick={() => setError("That file could not be opened.")}>fail</button>
      <button type="button" onClick={() => setError(null)}>clear</button>
      <Notify text={error} action={{ label: "Try again", onClick: onRetry }} />
    </ToastProvider>
  );
}

it("pops an error into the notification stack and auto-dismisses it", () => {
  render(<Harness />);
  fireEvent.click(screen.getByText("fail"));
  expect(screen.getByRole("alert")).toHaveTextContent("That file could not be opened.");
  act(() => { vi.advanceTimersByTime(8000 + 200); });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("runs the action and can be dismissed by hand", () => {
  const onRetry = vi.fn();
  render(<Harness onRetry={onRetry} />);
  fireEvent.click(screen.getByText("fail"));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("clear"));
  fireEvent.click(screen.getByText("fail"));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  act(() => { vi.advanceTimersByTime(200); });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("falls back to an inline message outside a provider", () => {
  render(<Notify text="Upload failed" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
});
