import { RpcError } from './rpc.common'
import type { RPCMethodMap, JsonRpcRequest, JsonRpcResponse } from './rpc.common'

export function createRPCServer<C, T extends RPCMethodMap<C> = RPCMethodMap<C>>(methods: T) {
	return {
		handle: async (body: unknown, context: C): Promise<JsonRpcResponse | JsonRpcResponse[]> => {
			const request = body as JsonRpcRequest | JsonRpcRequest[]
			const handleSingle = async (req: JsonRpcRequest): Promise<JsonRpcResponse> => {
				const method = methods[req.method]
				if (!method) {
					return {
						jsonrpc: '2.0',
						error: { code: -32601, message: 'Method not found' },
						id: req.id
					}
				}
				try {
					const result = await method(context, ...req.params)
					return { jsonrpc: '2.0', result, id: req.id }
				} catch (error) {
					const isRpcError = error instanceof RpcError
					return {
						jsonrpc: '2.0',
						error: {
							code: isRpcError && error.code ? error.code : -32000,
							message: (error as Error).message,
							// TODO M: Can be disabled for prod
							data: {
								stack: (error as Error).stack,
								name: (error as Error).name,
								isRpcError
							}
						},
						id: req.id
					}
				}
			}

			if (Array.isArray(request)) {
				return Promise.all(request.map(handleSingle))
			}
			return handleSingle(request)
		}
	}
}
