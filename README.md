# @awilixify/pino

Native Pino loggers with automatic consumer context for Awilixify.

## Install

```sh
npm install @awilixify/pino awilixify awilix pino
```

Pino is a peer dependency. The application creates and owns its logger, destinations, and transports.

## Create one shared logging module

```ts
// logging.ts
import { PinoModule } from "@awilixify/pino";
import pino from "pino";

export const LoggingModule = PinoModule({
  logger: pino({
    level: "info",
    redact: ["password", "authorization"],
  }),
});
```

```ts
// users.module.ts
import { createModule, type ModuleDef } from "awilixify";
import { LoggingModule } from "./logging.js";

type UsersDef = ModuleDef<{
  imports: [typeof LoggingModule];
  providers: { usersService: UsersService };
}>;

class UsersService {
  constructor(private readonly logger: UsersDef["deps"]["logger"]) {}

  find(id: string) {
    this.logger.info({ userId: id }, "Finding user");
  }
}

export const UsersModule = createModule<UsersDef>({
  name: "UsersModule",
  imports: [LoggingModule],
  providers: { usersService: UsersService },
});
```

The log includes `context: "UsersService"` automatically:

```json
{
  "level": 30,
  "context": "UsersService",
  "userId": "42",
  "msg": "Finding user"
}
```

The module can also be supplied through `AsyncDIContext.create`'s `globalModules` option instead of explicit imports.

## How context works

`injectInquirer` defaults to `true`. The `logger` provider uses Awilixify's inquirer injection with a transient lifetime. It reads the consuming prototype's constructor name and calls `.child({ context: name })` on the supplied logger. The injected value is the native Pino instance, not a wrapper.

## Custom consumer bindings

Use `getBindings` to replace the default `{ context: className }` binding:

```ts
const LoggingModule = PinoModule({
  logger,
  getBindings: (inquirer) => ({
    service: inquirer.constructor.name,
    component: "billing",
  }),
});
```

## Disable automatic context

```ts
const LoggingModule = PinoModule({
  logger,
  injectInquirer: false,
});
```

With `injectInquirer: false`, the supplied logger is registered unchanged as a shared value. No transient provider or inquirer tracking is added by this module, and consumers receive the same instance without automatic context fields.

## Custom provider names

Use explicit names when importing multiple loggers:

```ts
const AuditModule = PinoModule({
  logger: auditLogger,
  providerName: "auditLogger",
});
```

`providerName` must be a non-empty string literal and defaults to `"logger"`.

## Development

```sh
npm ci
npm run lint
npm run check-types
npm test
npm run build
```
# awilixify-pino
