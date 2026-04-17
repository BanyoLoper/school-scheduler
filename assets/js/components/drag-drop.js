// Standalone drag-drop utilities used outside the schedule grid.
// The main schedule drag logic lives in schedule-grid.js.

export function makeDraggable(el, getData) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('application/json', JSON.stringify(getData()));
    e.dataTransfer.effectAllowed = 'move';
  });
}

export function makeDropTarget(el, onDrop) {
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', ()  => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop(data, el);
    } catch { /* ignore malformed data */ }
  });
}
