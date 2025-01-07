export type RPCMethod<C = unknown, P extends any[] = any[], R = unknown> = (
	context: C,
	...params: P
) => Promise<R>

export type RPCMethodMap<C = unknown> = {
	[key: string]: RPCMethod<C>
}

export class RpcError extends Error {
	constructor(
		public message: string,
		public code: number,
		public data?: unknown
	) {
		super(message)
		this.name = 'RpcError'
	}
}

export interface JsonRpcRequest {
	jsonrpc: '2.0'
	method: string
	params: unknown[]
	id: string
}

export interface JsonRpcSuccessResponse {
	jsonrpc: '2.0'
	result: unknown
	id: string
}

export interface JsonRpcErrorResponse {
	jsonrpc: '2.0'
	error: {
		code: number
		message: string
		data?: {
			stack?: string
			name?: string
			isRpcError?: boolean
			[key: string]: unknown
		}
	}
	id: string
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse
