// Writes public/templates/campaign-items.xlsx, the template a seller fills in
// to import a pre-order round's products (see import-items-button.tsx).
// Run once and commit the result: node scripts/make-campaign-template.mjs
import writeExcelFile from "write-excel-file/node";

const bold = (value) => ({ value, fontWeight: "bold" });

const rows = [
  [
    bold("Tên (Name)"),
    bold("Giá (Price)"),
    bold("Đơn vị (Unit)"),
    bold("Mô tả (Description)"),
  ],
  ["Bánh bao chay", 15000, null, "Nấm, đậu hũ"],
  ["Bánh bao nhân thịt", 18000, null, null],
  ["Sữa đậu nành", 12000, "chai", "330 ml"],
];

await writeExcelFile(rows, {
  columns: [{ width: 30 }, { width: 14 }, { width: 16 }, { width: 36 }],
}).toFile("public/templates/campaign-items.xlsx");
