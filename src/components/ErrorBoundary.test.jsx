import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { reportError } from '../utils/errorReporting';
vi.mock('../utils/errorReporting', () => ({ reportError: vi.fn() }));
function Boom() { throw new Error('private customer information'); }
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });
describe('ErrorBoundary', () => {
  it('renders healthy children', () => {
    render(<ErrorBoundary><p>All good</p></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
  it('offers recovery and reports only a fixed category', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /homepage/i })).toHaveAttribute('href', '/');
    expect(reportError.mock.calls).toEqual([['render_error']]);
  });
});
