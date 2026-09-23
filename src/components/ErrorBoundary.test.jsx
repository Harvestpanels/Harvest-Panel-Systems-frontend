import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Boom() {
  throw new Error("kaboom");
}

// React logs the caught error itself, and the boundary logs it again on
// purpose. Silenced so a passing run is not full of red noise.
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(<ErrorBoundary><p>All good</p></ErrorBoundary>);
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a recovery screen instead of a blank page when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /homepage/i })).toBeInTheDocument();
  });

  it("logs the error so the stack is not lost entirely", () => {
    // There is no reporting service wired up yet, so the console is the only
    // record a crash leaves. If that ever stops happening, we lose it.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(spy).toHaveBeenCalledWith(
      "Unhandled render error:",
      expect.objectContaining({ message: "kaboom" }),
      expect.anything()
    );
  });
});
