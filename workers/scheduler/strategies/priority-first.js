// Returns groups sorted: is_priority=1 first, then by students descending
export function sortByPriority(groups) {
  return [...groups].sort((a, b) => {
    if (b.is_priority !== a.is_priority) return b.is_priority - a.is_priority;
    return b.students - a.students;
  });
}
