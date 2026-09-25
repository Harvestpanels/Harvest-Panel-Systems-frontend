import { expect, it } from "vitest";
import { downloadName, fileExtension } from "./format";

it("reads the extension from the stored file, not the free-text title", () => {
  expect(fileExtension({ title: "1st upload", storage_path: "acct/uuid-Price_List.PDF" })).toBe("pdf");
  expect(fileExtension({ title: "notes", storage_path: "acct/uuid-notes" })).toBe("");
});

it("names downloads after the title, adding the extension only when missing", () => {
  expect(downloadName({ title: "1st upload", storage_path: "a/x-file.pdf" })).toBe("1st upload.pdf");
  expect(downloadName({ title: "Quote.pdf", storage_path: "a/x-quote.pdf" })).toBe("Quote.pdf");
  expect(downloadName({ title: "Q3: specs/v2", storage_path: "a/x-s.xlsx" })).toBe("Q3- specs-v2.xlsx");
});
