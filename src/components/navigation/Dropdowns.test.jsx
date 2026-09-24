import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NavDropdown from "./NavDropdown";
import MobileDropdownGroup from "./MobileDropdownGroup";

const items = [{ label: "Products", to: "/products" }, { label: "Contact", onClick: vi.fn() }];
const wrap = (children) => <MemoryRouter>{children}<button>After menu</button></MemoryRouter>;
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it("skips collapsed mobile items and enables them only while both menus are open", async () => {
  const user = userEvent.setup();
  const props = { label: "Menu", items, navigate: vi.fn(), onNavigate: vi.fn(), tabIndex: 0 };
  const { rerender } = render(wrap(<MobileDropdownGroup {...props} />));
  await user.tab();
  expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "After menu" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Menu" }));
  await user.tab();
  expect(screen.getByRole("link", { name: "Products" })).toHaveFocus();
  rerender(wrap(<MobileDropdownGroup {...props} tabIndex={-1} />));
  expect(screen.getByText("Products")).toHaveAttribute("tabindex", "-1");
  expect(screen.getByText("Products").closest('.hp-nav__mobile-group-panel')).toHaveAttribute("inert");
});

it("preserves delayed mobile routing and action callbacks", () => {
  vi.useFakeTimers();
  const navigate = vi.fn(), onNavigate = vi.fn(), onExpandedChange = vi.fn();
  render(wrap(<MobileDropdownGroup label="Menu" items={items} navigate={navigate} onNavigate={onNavigate} onExpandedChange={onExpandedChange} tabIndex={0} />));
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  expect(onExpandedChange).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole("link", { name: "Products" }));
  expect(onNavigate).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(380));
  expect(navigate).toHaveBeenCalledWith("/products");
  fireEvent.click(screen.getByRole("button", { name: "Contact" }));
  expect(items[1].onClick).toHaveBeenCalledOnce();
});

it("preserves desktop keyboard navigation and disables items during animated close", () => {
  vi.useFakeTimers();
  render(wrap(<NavDropdown label="Menu" items={items} />));
  const trigger = screen.getByRole("button", { name: "Menu" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const link = screen.getByRole("link", { name: "Products" });
  expect(link).toHaveFocus();
  fireEvent.keyDown(link, { key: "End" });
  expect(screen.getByRole("button", { name: "Contact" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(link).toHaveAttribute("tabindex", "-1");
  expect(link.closest('.hp-nav__menu-panel')).toHaveAttribute("inert");
  act(() => vi.advanceTimersByTime(160));
  expect(link).not.toBeInTheDocument();
});
