import type { ModuleDef } from "awilixify";
import pino, { type Logger } from "pino";
import { describe, expect, test } from "tstyche";
import { PinoModule } from "../index.js";

const logger = pino();
const customLogger = pino({
	customLevels: { audit: 35 },
	useOnlyCustomLevels: true,
});
declare const injectInquirer: boolean;

describe("Pino module types", () => {
	test("exports a native logger under the default name", () => {
		const module = PinoModule({ logger });
		type Def = ModuleDef<{ imports: [typeof module] }>;

		expect<Def["deps"]["logger"]>().type.toBe<Logger>();
	});

	test("infers the provider name and getBindings parameter", () => {
		const module = PinoModule({
			logger,
			providerName: "auditLogger",
			getBindings: (inquirer) => {
				expect(inquirer).type.toBe<object>();

				return { service: inquirer.constructor.name };
			},
		});
		type Def = ModuleDef<{ imports: [typeof module] }>;

		expect<Def["deps"]["auditLogger"]>().type.toBe<Logger>();
	});

	test("infers the injected logger type from injectInquirer", () => {
		const contextual = PinoModule({ logger: customLogger });
		const explicit = PinoModule({ logger: customLogger, injectInquirer: true });
		const shared = PinoModule({ logger: customLogger, injectInquirer: false });
		const dynamic = PinoModule({ logger: customLogger, injectInquirer });
		type Contextual = ModuleDef<{ imports: [typeof contextual] }>;
		type Explicit = ModuleDef<{ imports: [typeof explicit] }>;
		type Shared = ModuleDef<{ imports: [typeof shared] }>;
		type Dynamic = ModuleDef<{ imports: [typeof dynamic] }>;

		expect<Contextual["deps"]["logger"]>().type.toBe<Logger<"audit">>();
		expect<Explicit["deps"]["logger"]>().type.toBe<Logger<"audit">>();
		expect<Shared["deps"]["logger"]>().type.toBe<typeof customLogger>();
		expect<Dynamic["deps"]["logger"]>().type.toBe<
			typeof customLogger | Logger<"audit">
		>();
	});

	test("rejects invalid options and generics without matching runtime values", () => {
		const wide = "logger" as string;
		const union = "logger" as "first" | "second";
		const pattern = "logger" as `logger_${number}`;
		expect(PinoModule).type.not.toBeCallableWith({
			logger,
			providerName: wide,
		});
		expect(PinoModule).type.not.toBeCallableWith({
			logger,
			providerName: union,
		});
		expect(PinoModule).type.not.toBeCallableWith({
			logger,
			providerName: pattern,
		});
		expect(PinoModule).type.not.toBeCallableWith({ logger, providerName: "" });
		expect(PinoModule).type.not.toBeCallableWith({
			logger,
			injectInquirer: "false",
		});
		expect(PinoModule<never, boolean, "custom">).type.not.toBeCallableWith({
			logger,
		});
		expect(
			PinoModule<never, boolean, "logger", false>,
		).type.not.toBeCallableWith({ logger });
	});
});
