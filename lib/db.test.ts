import { describe, it, expect } from "vitest";
import { buildPoolConfig } from "./db";

describe("buildPoolConfig", () => {
  it("caps the pool at one connection per instance", () => {
    const config = buildPoolConfig("postgresql://localhost/snip");

    expect(config.max).toBe(1);
  });

  it("passes the connection string and timeout through", () => {
    const config = buildPoolConfig("postgresql://localhost/snip");

    expect(config.connectionString).toBe("postgresql://localhost/snip");
    expect(config.connectionTimeoutMillis).toBe(10000);
  });

  it("enables verified TLS when the connection string requires SSL", () => {
    const config = buildPoolConfig(
      "postgresql://u:p@ep-x-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
    );

    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("leaves SSL off for a local connection string", () => {
    const config = buildPoolConfig("postgresql://localhost/snip");

    expect(config.ssl).toBeUndefined();
  });

  it("tolerates an undefined connection string", () => {
    const config = buildPoolConfig(undefined);

    expect(config.connectionString).toBeUndefined();
    expect(config.max).toBe(1);
  });
});
