# 🌐 ⚡️ 📡 Volley RPC

A lightweight, type-safe RPC (Remote Procedure Call) implementation for TypeScript. Features JSON-RPC 2.0 protocol compliance, request batching.

## Features

- 🔒 **Fully Type-Safe**: End-to-end type safety for your RPC methods
- 🚀 **Request Batching**: Support for batched RPC requests
- 💼 **Context Support**: Pure use cases. Pass session and context data to your RPC methods
- ⚡ **Frameworks Integration**: Ready to use with common full-stack framework endpoints
- 📝 **JSON-RPC 2.0**: Compliant with the JSON-RPC 2.0 specification

## Installation

```bash
npm install volley-rpc
```

## Usage

### 1. Define Your RPC Methods

```typescript
// methods.ts
import type { RPCMethodMap } from 'volley-rpc'

export type RPCContext = {
  session: {
    userId: string
  }
}

export const methods = {
  getMyData: async (context: RPCContext, arg1: string, arg2: number) => {
    return { result: `Data for ${arg1} and ${arg2}, user: ${context.session.userId}` }
  }
} satisfies RPCMethodMap<RPCContext>

export type ServerRPCMethods = typeof methods
```

### 2. Set Up the Client

```typescript
// client.ts
import { createRPCClient } from 'volley-rpc'
import type { ServerRPCMethods } from './methods'

export const rpc = createRPCClient<ServerRPCMethods>({
  url: '/api/rpc'
  // Optional: Add custom headers or credentials
})
```

### 3. Create the Server Endpoint (SvelteKit)

```typescript
// routes/api/rpc/+server.ts
import { createRPCServer } from 'volley-rpc'
import { json } from '@sveltejs/kit'
import { RPCContext, methods } from './methods'
import type { RequestHandler } from '@sveltejs/kit'

export const rpcServer = createRPCServer<RPCContext>(methods)

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json()
    const context: RPCContext = {
      session: {
        userId: locals.userId // From your auth system
      }
    }

    const result = await rpcServer.handle(body, context)
    return json(result)
  } catch (error) {
    console.error(error)
    return json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 500 }
    )
  }
}
```

### 4. Use in Your Components

```typescript
// In your Svelte component
import { rpc } from './client'

// Single RPC call
const result = await rpc.getMyData('test', 123)
```

## Automatic Request Batching

Volley RPC automatically batches multiple RPC calls into a single HTTP request. This optimization happens transparently without any special syntax:

```typescript
// These consecutive calls will be automatically batched into one request
const result1 = await rpc.getData('id-1')
const result2 = await rpc.getData('id-2')
const result3 = await rpc.getData('id-3')

// Works with Promise.all too
const [data1, data2, data3] = await Promise.all([
  rpc.getData('id-1'),
  rpc.getData('id-2'),
  rpc.getData('id-3')
])

// Batching works anywhere in your application
async function fetchUserData() {
  const profile = await rpc.getProfile('user-1')
  const settings = await rpc.getSettings('user-1')
  return { profile, settings }
}
```
The batching is implemented using a microtask queue. Each request is added to a batchQueue. A microtask is scheduled to flush the queue.
All requests made within the same microtask cycle are automatically batched together.

The batching mechanism automatically combines consecutive RPC calls into a single HTTP request, reducing network overhead and improving application performance. This works seamlessly throughout your application without requiring any special handling.

## Message Creation

For advanced use cases, the client provides a way to create JSON-RPC message objects:

```typescript
const message = rpc.message.getMyData('test', 123)
// Result: { method: 'getMyData', params: ['test', 123] }
```

## Error Handling

The server implements standard JSON-RPC 2.0 error codes:

- `-32700`: Parse error
- `-32603`: Internal error
- Other custom error codes as needed

## Type Safety

The library provides full type safety:

- Method names are checked at compile time
- Arguments are type-checked
- Return types are inferred
- Context type is enforced

## License

MIT © Max Vierd
