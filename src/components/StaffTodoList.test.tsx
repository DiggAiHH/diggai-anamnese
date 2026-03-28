import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffTodoList, type TodoItem } from './StaffTodoList';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const currentUser = { id: 'staff-1', displayName: 'Dr. Ada', role: 'arzt' };

const todoFixture: TodoItem = {
  id: 'todo-1',
  text: 'Patient zurückrufen',
  completed: false,
  priority: 'high',
  category: 'followup',
  assignee: 'Dr. Ada',
  createdAt: '2026-03-26T10:00:00.000Z',
};

describe('StaffTodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fetched todos', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [todoFixture] } as never);

    render(<StaffTodoList currentUser={currentUser} />, { wrapper: createWrapper() });

    expect(await screen.findByText('Patient zurückrufen')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/todos');
  });

  it('creates a todo and closes the add form', async () => {
    const createdTodo: TodoItem = {
      ...todoFixture,
      id: 'todo-2',
      text: 'Labor prüfen',
      assignee: '',
      priority: 'medium',
      category: 'general',
    };

    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never);
    vi.mocked(apiClient.post).mockResolvedValue({ data: createdTodo } as never);

    render(<StaffTodoList currentUser={currentUser} />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByText('Neue Aufgabe'));
    fireEvent.change(screen.getByLabelText('Aufgabe beschreiben...'), {
      target: { value: 'Labor prüfen' },
    });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/todos', {
        text: 'Labor prüfen',
        priority: 'medium',
        category: 'general',
      });
    });

    expect(await screen.findByText('Labor prüfen')).toBeInTheDocument();
    expect(screen.queryByLabelText('Aufgabe beschreiben...')).not.toBeInTheDocument();
    expect(screen.getByText('→ Dr. Ada')).toBeInTheDocument();
  });

  it('keeps the todo visible when delete fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [todoFixture] } as never);
    vi.mocked(apiClient.delete).mockRejectedValue(new Error('delete failed') as never);

    render(<StaffTodoList currentUser={currentUser} />, { wrapper: createWrapper() });

    expect(await screen.findByText('Patient zurückrufen')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Löschen'));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/todos/todo-1');
    });

    expect(screen.getByText('Patient zurückrufen')).toBeInTheDocument();
    expect(await screen.findByText('Aufgabe konnte nicht gelöscht werden.')).toBeInTheDocument();
  });
});
