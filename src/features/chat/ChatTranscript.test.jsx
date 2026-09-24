import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChatTranscript from "./ChatTranscript";

it("preserves multiline replies and resolves contact links on the current route", () => {
  const onLinkClick = vi.fn();
  render(<MemoryRouter><ChatTranscript messages={[{ role: "bot", text: "Hello\nDetails", links: [{ href: "/#contact", label: "Contact" }, { href: "/products", label: "Products" }] }]} typing={false} pathname="/specs" send={vi.fn()} onLinkClick={onLinkClick} /></MemoryRouter>);
  expect(screen.getByText("Hello")).toHaveClass("hp-chat__line");
  expect(screen.getByText("Details")).toHaveClass("hp-chat__line");
  expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/specs#contact");
  expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
  fireEvent.click(screen.getByRole("link", { name: "Contact" }));
  expect(onLinkClick).toHaveBeenCalledOnce();
});

it("shows suggestions only on the latest eligible message and hides them while typing", () => {
  const send = vi.fn();
  const greeting = { role: "bot", text: "Welcome", showSuggestions: true };
  const view = (messages, typing = false) => <MemoryRouter><ChatTranscript messages={messages} typing={typing} pathname="/" send={send} onLinkClick={vi.fn()} /></MemoryRouter>;
  const { rerender } = render(view([greeting]));
  const chip = screen.getAllByRole("button")[0];
  fireEvent.click(chip);
  expect(send).toHaveBeenCalledWith(chip.textContent);
  rerender(view([greeting], true));
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByLabelText("Assistant is typing")).toBeInTheDocument();
  rerender(view([greeting, { role: "user", text: "Pricing?" }]));
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});
