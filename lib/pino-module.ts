import type { AnyModule, InquirerContext, Module } from "awilixify";
import type { Bindings, Logger } from "pino";

import type { LiteralName } from "./types.js";

type PinoModuleOptions<
	CustomLevels extends string,
	UseOnlyCustomLevels extends boolean,
	Name extends string,
	InjectInquirer extends boolean,
> = {
	logger: Logger<CustomLevels, UseOnlyCustomLevels>;
	providerName?: Name & LiteralName<Name>;
	/** Defaults to true. Disable to inject the supplied logger unchanged. */
	injectInquirer?: InjectInquirer;
	/** Replaces the default class-name binding. Called only for an available inquirer. */
	getBindings?: (inquirer: NonNullable<InquirerContext>) => Bindings;
} & ([Name] extends ["logger"] ? unknown : { providerName: Name }) &
	(true extends InjectInquirer ? unknown : { injectInquirer: InjectInquirer });

type PinoModuleDef<Name extends string, Value> = {
	providers: Record<Name, Value>;
	exports: Record<Name, Value>;
	exportKeys: [Name];
};

type InjectedLogger<
	CustomLevels extends string,
	UseOnlyCustomLevels extends boolean,
	InjectInquirer extends boolean,
> = InjectInquirer extends false
	? Logger<CustomLevels, UseOnlyCustomLevels>
	: Logger<CustomLevels>;

let nextId = 0;

export function PinoModule<
	CustomLevels extends string = never,
	UseOnlyCustomLevels extends boolean = boolean,
	const Name extends string = "logger",
	const InjectInquirer extends boolean = true,
>(
	options: PinoModuleOptions<
		CustomLevels,
		UseOnlyCustomLevels,
		Name,
		InjectInquirer
	>,
): NoInfer<
	Module<
		PinoModuleDef<
			Name,
			InjectedLogger<CustomLevels, UseOnlyCustomLevels, InjectInquirer>
		>
	>
> {
	const {
		logger,
		providerName = "logger",
		injectInquirer = true,
		getBindings = (inquirer: NonNullable<InquirerContext>) => {
			const context = inquirer.constructor.name;

			return context ? { context } : undefined;
		},
	} = options;

	if (typeof providerName !== "string" || !providerName) {
		throw new Error("Provider name must be a non-empty string");
	}
	if (typeof injectInquirer !== "boolean") {
		throw new Error("injectInquirer must be a boolean");
	}

	class ContextualLogger {
		constructor(inquirer: InquirerContext) {
			const bindings = inquirer ? getBindings(inquirer) : undefined;
			// biome-ignore lint/correctness/noConstructorReturn: Inquirer injection requires a class; return Pino's native instance without a wrapper.
			return bindings ? logger.child(bindings) : logger;
		}
	}

	const module: AnyModule = {
		name: `PinoModule_${++nextId}`,
		providers: {
			[providerName]: injectInquirer
				? {
						useClass: ContextualLogger,
						injectInquirer: true,
						lifetime: "TRANSIENT",
					}
				: logger,
		},
		exports: [providerName],
	};

	// Computed provider keys widen to string; restore the inferred literal name.
	return module as unknown as Module<
		PinoModuleDef<
			Name,
			InjectedLogger<CustomLevels, UseOnlyCustomLevels, InjectInquirer>
		>
	>;
}
