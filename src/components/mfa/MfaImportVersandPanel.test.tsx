import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MfaImportVersandPanel } from './MfaImportVersandPanel';
import { api } from '../../api/client';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('lucide-react', () => ({
  FileDown: () => <span data-testid="icon-filedown" />,
  FileJson: () => <span data-testid="icon-filejson" />,
  Mail: () => <span data-testid="icon-mail" />,
  Upload: () => <span data-testid="icon-upload" />,
  ChevronDown: () => <span data-testid="icon-chevrondown" />,
}));

vi.mock('../../api/client', () => ({
  api: {
    importEncryptedPackage: vi.fn(),
    sendPackageLink: vi.fn(),
    exportSessionTXT: vi.fn(),
    exportSessionPDF: vi.fn(),
  },
}));

vi.mock('../../hooks/useStaffApi', () => ({
  useMfaSessions: () => ({
    data: {
      sessions: [
        { id: 'session-1', selectedService: 'Termin / Anamnese' },
        { id: 'session-2', selectedService: 'Dokumente anfordern' },
      ],
    },
  }),
}));

describe('MfaImportVersandPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports encrypted packages and exposes send/export actions', async () => {
    vi.mocked(api.importEncryptedPackage).mockResolvedValue({
      status: 'imported',
      packageId: 'package-1',
      sessionId: 'session-1',
      preview: {
        patient: { name: 'Max Mustermann', email: 'patient@example.com' },
        service: 'Termin / Anamnese',
        answers: [{ atomId: '1001' }, { atomId: '1002' }],
      },
    } as never);
    vi.mocked(api.sendPackageLink).mockResolvedValue({
      sent: false,
      mailtoUrl: 'mailto:patient@example.com?subject=Download',
    } as never);

    const user = userEvent.setup();
    render(<MfaImportVersandPanel />);

    const fileInput = screen.getByLabelText('Verschlüsselte JSON-Datei');
    const file = new File(['{"version":"anamnese-package-v1"}'], 'secure-package.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /Paket importieren/i }));

    await screen.findByText('Das Paket wurde erfolgreich importiert.');
    expect(api.importEncryptedPackage).toHaveBeenCalledWith(file);
    expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument();
    expect(screen.getByText(/patient@example.com/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'TXT' }));
    await user.click(screen.getByRole('button', { name: 'PDF' }));
    await user.click(screen.getByRole('button', { name: /Sicheren Link senden/i }));

    expect(api.exportSessionTXT).toHaveBeenCalledWith('session-1');
    expect(api.exportSessionPDF).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(api.sendPackageLink).toHaveBeenCalledWith('session-1');
    });

    const fallbackLink = await screen.findByRole('link', { name: /mailto-Fallback öffnen/i });
    expect(fallbackLink).toHaveAttribute('href', 'mailto:patient@example.com?subject=Download');
  });
});
