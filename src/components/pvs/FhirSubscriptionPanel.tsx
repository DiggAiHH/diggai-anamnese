// @ts-nocheck
/**
 * FHIR Subscription Panel
 * 
 * UI für Verwaltung von FHIR Subscriptions
 * 
 * @phase PHASE_7_FHIR_SUBSCRIPTIONS
 * @todo Requires useApi, useSocket, Select, and Checkbox components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell, Plus, Trash2, Activity, CheckCircle, XCircle,
  Clock, RefreshCw, User, FileText, Stethoscope, Pill, Clipboard
} from 'lucide-react';
// import { useApi } from '../../hooks/useApi';
// import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/Select';
// import { Checkbox } from '../ui/Checkbox';
import { cn } from '../../lib/utils';

// Types
interface FhirSubscription {
  id: string;
  resourceType: SubscriptionResource;
  events: SubscriptionEvent[];
  criteria?: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  lastEventAt?: string;
  errorCount: number;
}

type SubscriptionResource = 
  | 'Patient' 
  | 'Encounter' 
  | 'Observation' 
  | 'Condition' 
  | 'Procedure' 
  | 'MedicationStatement'
  | 'Composition';

type SubscriptionEvent = 'create' | 'update' | 'delete';

interface SubscriptionStats {
  total: number;
  active: number;
  inactive: number;
  error: number;
  byResource: Record<string, number>;
}

interface FhirSubscriptionPanelProps {
  connectionId: string;
  tenantId: string;
}

const RESOURCE_OPTIONS: { value: SubscriptionResource; label: string; icon: React.ReactNode }[] = [
  { value: 'Patient', label: 'Patient', icon: <User className="w-4 h-4" /> },
  { value: 'Encounter', label: 'Fallakte', icon: <FileText className="w-4 h-4" /> },
  { value: 'Observation', label: 'Beobachtung', icon: <Activity className="w-4 h-4" /> },
  { value: 'Condition', label: 'Diagnose', icon: <Stethoscope className="w-4 h-4" /> },
  { value: 'MedicationStatement', label: 'Medikation', icon: <Pill className="w-4 h-4" /> },
  { value: 'Composition', label: 'Dokument', icon: <Clipboard className="w-4 h-4" /> },
];

const EVENT_OPTIONS: { value: SubscriptionEvent; label: string }[] = [
  { value: 'create', label: 'Erstellt' },
  { value: 'update', label: 'Aktualisiert' },
  { value: 'delete', label: 'Gelöscht' },
];

export const FhirSubscriptionPanel: React.FC<FhirSubscriptionPanelProps> = ({
  connectionId,
  tenantId,
}) => {
  const { t } = useTranslation();
  const { get, post, del } = useApi();
  const { socket } = useSocket();

  const [subscriptions, setSubscriptions] = useState<FhirSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Array<{
    id: string;
    resourceType: string;
    event: string;
    resourceId: string;
    timestamp: string;
  }>>([]);

  // Form state
  const [selectedResource, setSelectedResource] = useState<SubscriptionResource>('Patient');
  const [selectedEvents, setSelectedEvents] = useState<SubscriptionEvent[]>(['create', 'update']);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await get(`/api/tomedo-bridge/subscriptions?connectionId=${connectionId}`);
      if (response.success) {
        setSubscriptions(response.subscriptions);
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  }, [get, connectionId]);

  // Initial load
  useEffect(() => {
    fetchSubscriptions();
    const interval = setInterval(fetchSubscriptions, 30000);
    return () => clearInterval(interval);
  }, [fetchSubscriptions]);

  // WebSocket notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (event: {
      subscriptionId: string;
      resourceType: string;
      event: string;
      resourceId: string;
      timestamp: string;
    }) => {
      setRecentNotifications(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          resourceType: event.resourceType,
          event: event.event,
          resourceId: event.resourceId,
          timestamp: event.timestamp,
        },
        ...prev.slice(0, 19), // Keep last 20
      ]);
    };

    socket.on('fhir:notification', handleNotification);
    return () => {
      socket.off('fhir:notification', handleNotification);
    };
  }, [socket]);

  // Create subscription
  const createSubscription = async () => {
    setIsCreating(true);
    try {
      const response = await post('/api/tomedo-bridge/subscriptions', {
        connectionId,
        tenantId,
        resourceType: selectedResource,
        events: selectedEvents,
      });

      if (response.success) {
        await fetchSubscriptions();
      }
    } catch (error) {
      console.error('Failed to create subscription:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete subscription
  const deleteSubscription = async (id: string) => {
    try {
      await del(`/api/tomedo-bridge/subscriptions/${id}`);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    }
  };

  // Toggle event selection
  const toggleEvent = (event: SubscriptionEvent) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get resource icon
  const getResourceIcon = (resourceType: string) => {
    const option = RESOURCE_OPTIONS.find(r => r.value === resourceType);
    return option?.icon || <Bell className="w-4 h-4" />;
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('pvs.fhirSubscriptions.title', 'FHIR Subscriptions')}
              </h2>
              <p className="text-sm text-indigo-100">
                {t('pvs.fhirSubscriptions.subtitle', 'Echtzeit-Updates von Tomedo')}
              </p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center space-x-4 text-white text-sm">
              <Badge className="bg-green-100 text-green-800">
                {stats.active} {t('pvs.fhirSubscriptions.active', 'Aktiv')}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Create New */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t('pvs.fhirSubscriptions.new', 'Neue Subscription')}
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {t('pvs.fhirSubscriptions.resourceType', 'Ressourcen-Typ')}
              </label>
              <Select
                value={selectedResource}
                onValueChange={(v) => setSelectedResource(v as SubscriptionResource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center space-x-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {t('pvs.fhirSubscriptions.events', 'Ereignisse')}
              </label>
              <div className="flex space-x-4">
                {EVENT_OPTIONS.map((event) => (
                  <label key={event.value} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedEvents.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                    />
                    <span className="text-sm text-gray-700">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={createSubscription}
              disabled={isCreating || selectedEvents.length === 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('pvs.fhirSubscriptions.create', 'Subscription erstellen')}
            </Button>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t('pvs.fhirSubscriptions.activeSubscriptions', 'Aktive Subscriptions')}
          </h3>

          {subscriptions.length > 0 ? (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getResourceIcon(sub.resourceType)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {sub.resourceType}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sub.events.join(', ')} • {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(sub.status)}>
                      {sub.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSubscription(sub.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {t('pvs.fhirSubscriptions.noSubscriptions', 'Keine Subscriptions aktiv')}
              </p>
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        {recentNotifications.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {t('pvs.fhirSubscriptions.recentNotifications', 'Letzte Benachrichtigungen')}
            </h3>
            <div className="space-y-1 max-h-40 overflow-auto">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-center justify-between p-2 text-sm border-l-2 border-indigo-500 bg-indigo-50"
                >
                  <div className="flex items-center space-x-2">
                    {getResourceIcon(notif.resourceType)}
                    <span className="font-medium">{notif.resourceType}</span>
                    <Badge variant="neutral" className="text-xs">
                      {notif.event}
                    </Badge>
                    <span className="text-gray-500 text-xs">{notif.resourceId}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">{t('pvs.fhirSubscriptions.total', 'Gesamt')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.active}</div>
              <div className="text-xs text-gray-500">{t('pvs.fhirSubscriptions.active', 'Aktiv')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">{stats.inactive}</div>
              <div className="text-xs text-gray-500">{t('pvs.fhirSubscriptions.inactive', 'Inaktiv')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.error}</div>
              <div className="text-xs text-gray-500">{t('pvs.fhirSubscriptions.errors', 'Fehler')}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FhirSubscriptionPanel;
