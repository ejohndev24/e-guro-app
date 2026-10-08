/*
 * Copyright (c) Emil John Benitez, 2026. All rights reserved. This computer
 * program is protected by copyright laws  and international treaties, and it
 * or any part thereof, may not be copied,  reproduced, utilized, distributed
 * or an adaptation thereof be made,  without the prior authority and consent
 * of PharmaServ Express.  Any unauthorized use of this program will be dealt
 * with and  prosecuted to the maximum extent possible under  the law and may
 * result in civil and criminal liabilities.
 */
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const parseCsv = (contents: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = contents.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

const columnWidths = (rows: string[][]) => {
  const columns = Math.max(0, ...rows.map((row) => row.length));
  return Array.from({ length: columns }, (_, column) => ({
    wch: Math.min(
      48,
      Math.max(11, ...rows.map((row) => String(row[column] ?? "").length + 2)),
    ),
  }));
};

export const xlsxName = (fileName: string) =>
  fileName.replace(/\.csv$/i, ".xlsx");

export const saveAutoSizedWorkbook = async (
  directoryUri: string,
  fileName: string,
  csvContents: string,
  sheetName = "Report",
) => {
  const rows = parseCsv(csvContents);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = columnWidths(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
    directoryUri,
    xlsxName(fileName),
    EXCEL_MIME,
  );
  const base64 = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "base64",
    compression: true,
  });
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return xlsxName(fileName);
};
