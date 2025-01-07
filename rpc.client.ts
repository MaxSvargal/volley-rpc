import type { RPCMethodMap, JsonRpcRequest, JsonRpcResponse } from './rpc.common'
import { RpcError } from './rpc.common'

type ClientOptions = {
	url: string
	credentials?: RequestCredentials
	getHeaders?(): Record<string, string> | Promise<Record<string, string>> | undefined
}

type MessageOptions = {
	sync?: boolean
}

export type JsonRpcMessage = {
	method: string
	params: unknown[]
} & MessageOptions

type ClientMethods<T extends RPCMethodMap<any>> = {
	[K in keyof T]: (
		...args: Parameters<T[K]> extends [any, ...infer P] ? P : never
	) => ReturnType<T[K]>
}

type ClientMessageMethods<T extends RPCMethodMap<any>> = {
	[K in keyof T]: (
		...args: [...(Parameters<T[K]> extends [any, ...infer P] ? P : never), MessageOptions?]
	) => JsonRpcMessage
}

export function createRPCClient<T extends RPCMethodMap<any>>(options: ClientOptions) {
	let batchQueue: JsonRpcRequest[] = []
	let batchPromise: Promise<Map<string, unknown>> | null = null

	const createJsonRpcRequest = (method: string, params: unknown[]): JsonRpcRequest => ({
		jsonrpc: '2.0',
		method,
		params,
		id: Math.random().toString(36).substring(2, 9)
	})

	const fetchRpc = async (
		req: JsonRpcRequest | JsonRpcRequest[]
	): Promise<JsonRpcResponse | JsonRpcResponse[]> => {
		const headers = options.getHeaders ? await options.getHeaders() : {}
		const res = await fetch(options.url, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...headers
			},
			body: JSON.stringify(req),
			credentials: options.credentials
		})

		if (!res.ok) {
			throw new RpcError(res.statusText, res.status)
		}

		return res.json()
	}

	const flushQueue = async (): Promise<Map<string, unknown>> => {
		const queue = batchQueue
		batchQueue = []
		batchPromise = null

		const response = await fetchRpc(queue)

		const processResponse = (res: JsonRpcResponse): unknown => {
			if ('error' in res) {
				const { message, code, data } = res.error
				if (data && typeof data === 'object' && 'stack' in data) {
					const error = data.isRpcError ? new RpcError(message, code, data) : new Error(message)
					error.stack = `Server stack:\n${data.stack}\n${'='.repeat(50)}\nClient stack:\n${error.stack}`
					if (data.isRpcError) {
						;(error as RpcError).code = code
					}
					throw error
				}
				throw new RpcError(message, code, data)
			}
			return res.result
		}

		const resultMap = new Map<string, unknown>()

		if (Array.isArray(response)) {
			response.forEach((res) => {
				resultMap.set(res.id, processResponse(res))
			})
		} else {
			resultMap.set(response.id, processResponse(response))
		}

		return resultMap
	}

	const createMethod =
		(method: string) =>
		async (...params: unknown[]): Promise<unknown> => {
			const request = createJsonRpcRequest(method, params)
			batchQueue.push(request)

			if (!batchPromise) {
				batchPromise = new Promise((resolve) => queueMicrotask(() => resolve(flushQueue())))
			}
			return batchPromise.then((resultMap) => resultMap.get(request.id))
		}

	const message = new Proxy({} as ClientMessageMethods<T>, {
		get: (_, prop) => {
			if (typeof prop === 'string') {
				return (...args: unknown[]): JsonRpcMessage => {
					const lastArg = args[args.length - 1]
					const messageOptions =
						typeof lastArg === 'object' && lastArg !== null && 'sync' in lastArg
							? (args.pop() as MessageOptions)
							: undefined

					return {
						method: prop,
						params: args,
						...(messageOptions?.sync && { sync: true })
					}
				}
			}
		}
	})

	const client = new Proxy({} as ClientMethods<T>, {
		get: (target, prop) => {
			if (prop === 'message') {
				return message
			}
			if (typeof prop === 'string') {
				return createMethod(prop)
			}
			return target[prop as keyof typeof target]
		}
	}) as ClientMethods<T> & { message: ClientMessageMethods<T> }

	return client
}
