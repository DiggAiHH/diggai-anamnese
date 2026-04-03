import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Euro, AlertCircle, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  pdfUrl: string | null;
  subscription: string | null;
}

interface UpcomingInvoice {
  amountDue: number;
  currency: string;
  periodStart: number;
  periodEnd: number;
}

interface InvoiceListProps {
  customerId?: string;
}

export function InvoiceList({ customerId: _customerId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data.invoices || []);
      setUpcoming(data.upcoming || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function getStatusIcon(status: string | null) {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'void':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  }

  function getStatusText(status: string | null): string {
    switch (status) {
      case 'paid':
        return 'Bezahlt';
      case 'open':
        return 'Offen';
      case 'void':
        return 'Storniert';
      case 'uncollectible':
        return 'Uneinbringlich';
      default:
        return 'Unbekannt';
    }
  }

  function getStatusClass(status: string | null): string {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'void':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Rechnungen</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchInvoices}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Upcoming Invoice */}
      {upcoming && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Nächste Abrechnung</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-700">
              <p>
                Zeitraum: {formatDate(upcoming.periodStart)} - {formatDate(upcoming.periodEnd)}
              </p>
            </div>
            <div className="font-semibold text-blue-900">
              {formatAmount(upcoming.amountDue, upcoming.currency)}
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Noch keine Rechnungen vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  {getStatusIcon(invoice.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {invoice.number || `Rechnung ${invoice.id.slice(-8)}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusClass(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(invoice.created)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {formatAmount(invoice.amountDue, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {invoice.pdfUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(invoice.pdfUrl!, '_blank')}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvoiceList;
