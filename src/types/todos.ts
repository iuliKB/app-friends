/**
 * To-Dos feature — TypeScript contract layer (Phase 29.1).
 *
 * Mirrors the column shapes from migration 0024 (todos, chat_todo_lists,
 * chat_todo_items) and the row shapes returned by `get_my_todos(date)` (Mine
 * section, D-04) and `get_chat_todos(date)` (From chats section, D-04 + D-13).
 *
 * Field names stay snake_case to match Postgres column names so components
 * destructure RPC payloads directly without remapping.
 */

export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;        // 'YYYY-MM-DD' local; nullable per D-12
  notes: string | null;
  priority: TodoPriority;
  completed_at: string | null;    // null until marked done
  created_at: string;
}

export interface ChatTodoList {
  id: string;
  group_channel_id: string;
  message_id: string;             // links to the chat-bubble message_type='todo' row
  created_by: string;
  assignee_id: string;
  title: string;
  is_list: boolean;               // false = single-item flavor (D-09); true = list flavor (D-13)
  created_at: string;
}

export interface ChatTodoItem {
  id: string;
  list_id: string;
  position: number;               // 0-indexed ordering
  title: string;
  due_date: string | null;
  completed_at: string | null;
}

/**
 * Row returned by get_my_todos(p_today date) — personal "Mine" section (D-04).
 * Note: live RPC does NOT return user_id (the row is implicitly scoped to the
 * caller). Intersecting with Todo would falsely promise user_id; we restate
 * the open fields explicitly here.
 */
export interface MyTodoRow {
  id: string;
  title: string;
  due_date: string | null;
  notes: string | null;
  priority: TodoPriority;
  completed_at: string | null;
  created_at: string;
  is_overdue: boolean;            // computed: due_date < p_today AND completed_at IS NULL
  is_due_today: boolean;          // computed: due_date = p_today AND completed_at IS NULL
}

/**
 * Row returned by get_chat_todos(p_today date) — "From chats" section
 * (D-04, D-13). One row per chat_todo_list assigned to the caller; child
 * items resolved client-side when expanded.
 *
 * Shape mirrors the live RPC return columns in migration 0024.
 */
export interface ChatTodoRow {
  list_id: string;
  group_channel_id: string;
  message_id: string;
  created_by: string;
  title: string;
  is_list: boolean;
  created_at: string;
  total_count: number;            // sum of chat_todo_items in this list
  done_count: number;             // sum of chat_todo_items WHERE completed_at IS NOT NULL
  next_due_date: string | null;   // min(due_date) across incomplete items, or null
  is_overdue: boolean;            // next_due_date < p_today AND items remain
  is_due_today: boolean;          // next_due_date = p_today AND items remain
}
