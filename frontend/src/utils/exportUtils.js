/**
 * Utility for exporting data to CSV with full UTF-8 support and Blob handling.
 * Resolves browser truncation issues caused by '#' characters in data: URIs.
 */

/**
 * Format a cell according to RFC 4180:
 * - Wrap with double quotes
 * - Escape internal double quotes by doubling them ("" -> """")
 * - Handle null / undefined gracefully
 */
export const formatCSVCell = (cell) => {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Triggers a browser download of a CSV file using Blob and URL.createObjectURL.
 * Includes UTF-8 BOM (\uFEFF) for immediate compatibility with Excel and spreadsheet tools.
 *
 * @param {string} filename - The name of the file to download (e.g. 'bookings.csv')
 * @param {Array<string>} headers - Array of column header titles
 * @param {Array<Array<any>>} rows - 2D array of row cells
 */
export const downloadCSV = (filename, headers, rows) => {
  const headerLine = headers.map(formatCSVCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCSVCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default downloadCSV;
