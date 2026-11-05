import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App, { CodeBlock } from './App';

describe('App', () => {
  it('renders the explorer header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Angie SDK Explorer' })).toBeInTheDocument();
  });

  it('switches to MCP features section', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'MCP features' }));
    expect(screen.getByRole('heading', { name: 'MCP feature matrix' })).toBeInTheDocument();
  });
});

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  });

  it('copies code to the clipboard', async () => {
    render(<CodeBlock label="npm" code="npm install example" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('npm install example');
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
