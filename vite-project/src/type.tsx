export type Todo = {
  title: string;
  readonly id: number;
  progress: number;
  startDate: string;
  dueDate: string;
  detail: string;
  delete_flg: boolean;
};

export type Filter = 'all' | 'current' | 'completed' | 'delete';
