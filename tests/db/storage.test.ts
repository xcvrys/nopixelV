import { beforeEach, describe, expect, it } from "vitest";
import { deleteValue, getValue, setValue } from "../../src/lib/db/storage";

const TEST_KEY = "test_storage_value";

describe("Database storage utility", () => {
  beforeEach(async () => {
    await deleteValue(TEST_KEY);
  });

  it("persists, replaces, reads, and deletes typed values", async () => {
    await setValue(TEST_KEY, { enabled: true, count: 1 });
    expect(await getValue<{ enabled: boolean; count: number }>(TEST_KEY)).toEqual({
      enabled: true,
      count: 1,
    });

    await setValue(TEST_KEY, { enabled: false, count: 2 });
    expect(await getValue(TEST_KEY)).toEqual({ enabled: false, count: 2 });

    await deleteValue(TEST_KEY);
    expect(await getValue(TEST_KEY)).toBeUndefined();
  });
});
