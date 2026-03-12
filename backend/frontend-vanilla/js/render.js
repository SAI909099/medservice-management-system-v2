export function renderTable(tableId, items, columns) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const header = `<tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
  const rows = items
    .map((item) => `<tr>${columns.map((c) => `<td>${c.render(item)}</td>`).join("")}</tr>`)
    .join("");
  table.innerHTML = header + rows;
}
