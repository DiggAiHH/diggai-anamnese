import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SubmittedPage } from './SubmittedPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="icon-check" />,
  Download: () => <span data-testid="icon-download" />,
  Home: () => <span data-testid="icon-home" />,
  Clock: () => <span data-testid="icon-clock" />,
  ShieldCheck: () => <span data-testid="icon-shield" />,
  Mail: () => <span data-testid="icon-mail" />,
}));

describe('SubmittedPage', () => {
  it('fires all patient handoff actions', async () => {
    const onReset = vi.fn();
    const onPDF = vi.fn();
    const onSecurePackage = vi.fn();
    const onSendPackageLink = vi.fn();
    const user = userEvent.setup();

    render(
      <SubmittedPage
        sessionId="abcd1234-session"
        patientName="Max Mustermann"
        selectedService="Termin / Anamnese"
        onReset={onReset}
        onPDF={onPDF}
        onSecurePackage={onSecurePackage}
        onSendPackageLink={onSendPackageLink}
        canSendPackageLink
      />,
    );

    await user.click(screen.getByRole('button', { name: /Datei herunterladen/i }));
    await user.click(screen.getByRole('button', { name: /PDF-Bericht herunterladen/i }));
    await user.click(screen.getByRole('button', { name: /Download-Link per E-Mail/i }));
    await user.click(screen.getByRole('button', { name: /Start/i }));

    expect(onSecurePackage).toHaveBeenCalledTimes(1);
    expect(onPDF).toHaveBeenCalledTimes(1);
    expect(onSendPackageLink).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/ABCD1234/i)).toBeInTheDocument();
  });

  it('hides the mail action when no send callback is available', () => {
    render(
      <SubmittedPage
        sessionId="abcd1234-session"
        onReset={() => undefined}
        onPDF={() => undefined}
        onSecurePackage={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Download-Link per E-Mail/i })).not.toBeInTheDocument();
  });
});
