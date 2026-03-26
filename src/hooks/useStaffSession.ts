import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { clearStoredStaffUser, getStoredStaffUser, setStoredStaffUser, type StaffUser } from '../lib/staffSession';

export const STAFF_SESSION_QUERY_KEY = ['staff-session'] as const;

export function useStaffSession() {
  const query = useQuery<StaffUser | null>({
    queryKey: STAFF_SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        const user = await api.arztMe();
        setStoredStaffUser(user);
        return user;
      } catch {
        clearStoredStaffUser();
        return null;
      }
    },
    initialData: getStoredStaffUser(),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (query.data === null) {
      clearStoredStaffUser();
    }
  }, [query.data]);

  return query;
}
