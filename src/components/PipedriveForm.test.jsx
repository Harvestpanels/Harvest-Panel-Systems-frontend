import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import PipedriveForm from './PipedriveForm';
import { reportError } from '../utils/errorReporting';
vi.mock('../utils/errorReporting', () => ({ reportError: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('Pipedrive contact fallback', () => {
  it('always offers email and reports loader failure', () => {
    const { container } = render(<PipedriveForm />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'mailto:Sales@harvestpanels.com');
    fireEvent.error(container.querySelector('script'));
    expect(screen.getByRole('status')).toHaveTextContent('email us instead');
    expect(reportError).toHaveBeenCalledWith('pipedrive_load_error');
  });
  it('times out even when the script loads but no working frame arrives', () => {
    vi.useFakeTimers();
    const { container } = render(<PipedriveForm />);
    fireEvent.load(container.querySelector('script'));
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith('pipedrive_timeout');
  });
  it('clears the timeout after frame load and keeps email available', async () => {
    vi.useFakeTimers();
    const { container } = render(<PipedriveForm />);
    const frame = document.createElement('iframe');
    await act(async () => { container.querySelector('.pipedriveWebForms').appendChild(frame); });
    fireEvent.load(frame);
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
  });
  it('cleans up pending timers and loader on unmount', () => {
    vi.useFakeTimers();
    const { unmount, container } = render(<PipedriveForm />);
    unmount(); act(() => vi.advanceTimersByTime(15000));
    expect(container.querySelector('script')).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });
});
