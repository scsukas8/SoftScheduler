export const mockTasks = [
  {
    id: '1',
    name: 'Replace Contacts',
    interval_days: 14,
    wiggle_room: 1, // +/- 1 day
    completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (4 days left)
    color: 'var(--color-green)'
  },
  {
    id: '2',
    name: 'Change Sheets',
    interval_days: 14,
    wiggle_room: 2,
    completed_at: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(), // today (14 days left = 2 weeks)
    color: 'var(--color-purple)'
  },
  {
    id: '3',
    name: 'Hair wash',
    interval_days: 3,
    wiggle_room: 0,
    completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago (1 day overdue)
    color: 'var(--color-pink)'
  },
  {
    id: '4',
    name: 'Wash Sheets',
    interval_days: 7,
    wiggle_room: 1,
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (5 days left)
    color: 'var(--color-blue)'
  }
];
