import "@testing-library/jest-dom/vitest";

// jsdom does not implement object URLs, which image previews use.
URL.createObjectURL ??= () => "blob:preview";
URL.revokeObjectURL ??= () => undefined;
