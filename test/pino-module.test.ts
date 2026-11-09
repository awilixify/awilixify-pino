import { InjectionMode } from "awilix";
import { DIContext } from "awilixify";
import pino, { type Logger } from "pino";
import { describe, expect, it, vi } from "vitest";
import { PinoModule } from "../index.js";

class Service {
	constructor(public readonly logger: Logger) {}
}

class OtherService {
	constructor(public readonly logger: Logger) {}
}

function createTestLogger() {
	const logger = pino({ enabled: false });

	return { logger, child: vi.spyOn(logger, "child") };
}

describe("PinoModule", () => {
	it("globally injects native children with each consumer's class name", () => {
		const { logger, child } = createTestLogger();
		const { scope } = DIContext.create(
			{ name: "App", providers: { service: Service, other: OtherService } },
			{ globalModules: [PinoModule({ logger })] },
		);

		expect(child).not.toHaveBeenCalled();
		const service = scope.resolve<Service>("service");
		const other = scope.resolve<OtherService>("other");
		expect(child.mock.calls).toEqual([
			[{ context: "Service" }],
			[{ context: "OtherService" }],
		]);
		expect(service.logger).toBe(child.mock.results[0]?.value);
		expect(other.logger).toBe(child.mock.results[1]?.value);
	});

	it("passes the consuming prototype to getBindings instead of adding default context", () => {
		const { logger, child } = createTestLogger();
		const bindings = { service: "billing" };
		const getBindings = vi.fn(() => bindings);
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger, getBindings })],
			providers: { service: Service },
		});
		scope.resolve("service");

		expect(getBindings).toHaveBeenCalledExactlyOnceWith(Service.prototype);
		expect(child).toHaveBeenCalledExactlyOnceWith(bindings);
	});

	it("returns the supplied logger without calling getBindings when there is no consumer", () => {
		const { logger, child } = createTestLogger();
		const getBindings = vi.fn(() => ({}));
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger, getBindings })],
		});

		expect(scope.resolve("logger")).toBe(logger);
		expect(getBindings).not.toHaveBeenCalled();
		expect(child).not.toHaveBeenCalled();
	});

	it("injects the supplied logger without creating bindings when injectInquirer is false", () => {
		const { logger, child } = createTestLogger();
		const getBindings = vi.fn(() => ({}));
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger, injectInquirer: false, getBindings })],
			providers: { service: Service },
		});

		expect(scope.resolve<Service>("service").logger).toBe(logger);
		expect(getBindings).not.toHaveBeenCalled();
		expect(child).not.toHaveBeenCalled();
	});

	it("creates a separate child for each transient consumer", () => {
		const { logger, child } = createTestLogger();
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger })],
			providers: { service: { useClass: Service, lifetime: "TRANSIENT" } },
		});
		const first = scope.resolve<Service>("service");
		const second = scope.resolve<Service>("service");

		expect(child).toHaveBeenCalledTimes(2);
		expect(first.logger).not.toBe(second.logger);
	});

	it("resolves the consumer context with deferred PROXY injection", () => {
		const { logger, child } = createTestLogger();
		class ProxyService {
			constructor(public readonly deps: { logger: Logger }) {}
		}
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger })],
			containerOptions: { injectionMode: InjectionMode.PROXY },
			providers: { service: ProxyService },
		});

		const service = scope.resolve<ProxyService>("service");
		expect(child).not.toHaveBeenCalled();

		const injected = service.deps.logger;

		expect(child).toHaveBeenCalledExactlyOnceWith({ context: "ProxyService" });
		expect(injected).toBe(child.mock.results[0]?.value);
	});

	it("exports the logger under a custom provider name", () => {
		const { logger, child } = createTestLogger();
		class AuditService {
			constructor(public readonly auditLogger: Logger) {}
		}
		const { scope } = DIContext.create({
			name: "App",
			imports: [PinoModule({ logger, providerName: "auditLogger" })],
			providers: { service: AuditService },
		});

		expect(scope.resolve<AuditService>("service").auditLogger).toBe(
			child.mock.results[0]?.value,
		);
		expect(child).toHaveBeenCalledExactlyOnceWith({ context: "AuditService" });
	});

	it.each(["", null, 42])(
		"rejects invalid providerName: %s",
		(providerName) => {
			expect(() =>
				// @ts-expect-error Exercise runtime validation of invalid JavaScript input.
				PinoModule({ logger: pino({ enabled: false }), providerName }),
			).toThrow("Provider name must be a non-empty string");
		},
	);

	it.each([null, "false", 0])(
		"rejects invalid injectInquirer: %s",
		(injectInquirer) => {
			expect(() =>
				// @ts-expect-error Exercise runtime validation of invalid JavaScript input.
				PinoModule({ logger: pino({ enabled: false }), injectInquirer }),
			).toThrow("injectInquirer must be a boolean");
		},
	);
});
