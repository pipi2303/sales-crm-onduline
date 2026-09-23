// Dimuat sebelum tiap file test (lihat vitest.config.ts setupFiles) --
// nambah matcher DOM (toBeInTheDocument, dst) dari @testing-library/jest-dom
// ke `expect` milik Vitest.
import '@testing-library/jest-dom/vitest';
